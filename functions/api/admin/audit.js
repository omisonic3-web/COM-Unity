import { requireUser, json } from "../_utils/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  if (auth.user.role !== "admin") return json({ error: "Acces rezervat administratorilor." }, 403);

  try {
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") || 50);
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(100, Math.max(1, requestedLimit))
      : 50;

    const result = await env.DB.prepare(`
      SELECT id, action, admin_id, details, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(limit).all();

    return json({
      logs: (result.results || []).map(row => ({
        id: row.id,
        action: String(row.action || "").slice(0, 120),
        adminId: row.admin_id,
        details: String(row.details || "").slice(0, 1000),
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    console.error("Admin audit log read failed:", error);
    return json({ error: "Jurnalul de activitate nu a putut fi încărcat." }, 500);
  }
}
