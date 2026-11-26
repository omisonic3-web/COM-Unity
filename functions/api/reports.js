import { requireUser, json, validOrigin, hasJsonContentType, checkRateLimit, rateLimitResponse, writeAuditLog } from "./_utils/session.js";

async function ensureReports(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL,
    category TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    target_type TEXT,
    target_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
  )`).run();
}

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  try {
    await ensureReports(env);
    const isModerator = auth.user.role === "admin" || auth.user.role === "moderator";
    const query = isModerator ? `
      SELECT r.*, u.display_name AS reporter_name
      FROM reports r INNER JOIN users u ON u.id = r.reporter_id
      ORDER BY CASE r.status WHEN 'pending' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, r.created_at DESC
      LIMIT 300
    ` : `
      SELECT r.id, r.reporter_id, r.category, r.reason, r.details,
             r.target_type, r.target_id, r.status, r.created_at, r.updated_at,
             'Echipa COM-Unity' AS reporter_name
      FROM reports r WHERE r.reporter_id = ?
      ORDER BY r.created_at DESC LIMIT 100
    `;
    const result = isModerator ? await env.DB.prepare(query).all() : await env.DB.prepare(query).bind(auth.user.id).all();
    const reports = result.results || [];
    if (isModerator) {
      await Promise.all(reports.map(async report => {
        if (!report.target_id) return;
        let target = null;
        if (report.target_type === "request") {
          target = await env.DB.prepare("SELECT title FROM help_requests WHERE id = ?").bind(report.target_id).first();
        } else if (report.target_type === "offer") {
          target = await env.DB.prepare("SELECT title FROM help_offers WHERE id = ?").bind(report.target_id).first();
        } else if (report.target_type === "project") {
          target = await env.DB.prepare("SELECT title FROM projects WHERE id = ?").bind(report.target_id).first();
        }
        report.target_title = typeof target?.title === "string" ? target.title : null;
      }));
    }
    return json({ reports });
  } catch (error) {
    console.error("COM-Unity reports list failed:", error);
    return json({ error: "Sesizările nu au putut fi încărcate." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!hasJsonContentType(request)) return json({ error: "Content-Type trebuie să fie application/json." }, 415);
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  const limit = await checkRateLimit(env, "report_create", auth.user.id, 5, 3600);
  if (!limit.allowed) return rateLimitResponse(limit);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }
  const allowedCategories = ["harassment", "spam", "fraud", "inappropriate", "fake", "other"];
  const allowedTargets = ["user", "request", "offer", "project", "message"];
  const category = typeof body?.category === "string" ? body.category : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  const details = typeof body?.details === "string" ? body.details.trim() : "";
  const targetType = typeof body?.targetType === "string" ? body.targetType : null;
  const targetId = typeof body?.targetId === "string" ? body.targetId.trim() : null;
  if (!allowedCategories.includes(category)) return json({ error: "Selectează o categorie validă." }, 400);
  if (reason.length < 5 || reason.length > 160) return json({ error: "Descrierea scurtă trebuie să aibă între 5 și 160 de caractere." }, 400);
  if (details.length > 2000) return json({ error: "Detaliile pot avea maximum 2.000 de caractere." }, 400);
  if (targetType && !allowedTargets.includes(targetType)) return json({ error: "Tipul elementului raportat nu este valid." }, 400);
  if (targetId && (!targetType || targetId.length > 100)) return json({ error: "Referința elementului raportat nu este validă." }, 400);
  try {
    await ensureReports(env);
    const id = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO reports (id, reporter_id, category, reason, details, target_type, target_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, auth.user.id, category, reason, details, targetType, targetId).run();
    return json({ ok: true, id }, 201);
  } catch (error) {
    console.error("COM-Unity report create failed:", error);
    return json({ error: "Sesizarea nu a putut fi salvată." }, 500);
  }
}

export async function onRequestPatch({ request, env }) {
  if (!hasJsonContentType(request)) return json({ error: "Content-Type trebuie să fie application/json." }, 415);
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  if (auth.user.role !== "admin" && auth.user.role !== "moderator") return json({ error: "Acces rezervat echipei de moderare." }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }
  const statuses = ["reviewing", "resolved", "dismissed"];
  const hasStatus = typeof body?.status === "string";
  const hasNote = typeof body?.adminNote === "string";
  if (typeof body?.id !== "string" || !body.id || (!hasStatus && !hasNote)) return json({ error: "Actualizare invalidă." }, 400);
  if (hasStatus && !statuses.includes(body.status)) return json({ error: "Starea selectată nu este validă." }, 400);
  if (hasNote && body.adminNote.length > 1000) return json({ error: "Nota internă poate avea maximum 1.000 de caractere." }, 400);
  try {
    await ensureReports(env);
    const existing = await env.DB.prepare("SELECT id FROM reports WHERE id = ?").bind(body.id).first();
    if (!existing) return json({ error: "Sesizarea nu a fost găsită." }, 404);
    if (hasStatus) {
      await env.DB.prepare("UPDATE reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(body.status, body.id).run();
      await writeAuditLog(env, auth.user.id, "moderation.report_status", { reportId: body.id, status: body.status });
    }
    if (hasNote) {
      await env.DB.prepare("UPDATE reports SET admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(body.adminNote.trim(), body.id).run();
      await writeAuditLog(env, auth.user.id, "moderation.report_note", { reportId: body.id });
    }
    return json({ ok: true });
  } catch (error) {
    console.error("COM-Unity report moderation update failed:", error);
    return json({ error: "Modificarea sesizării nu a putut fi salvată." }, 500);
  }
}
