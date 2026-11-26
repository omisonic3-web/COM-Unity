import { requireUser, json, validOrigin, hasJsonContentType } from "../_utils/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  try {
    const rows = await env.DB.prepare(`
      SELECT p.id, p.user_id, p.title, p.description, p.status, p.created_at,
             COALESCE(u.display_name, 'Membru') AS author_name,
             (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) AS member_count,
             EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?) AS is_member
      FROM projects p
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
      LIMIT 100
    `).bind(auth.user.id).all();
    return json({ projects: rows.results || [] });
  } catch (error) {
    console.error("COM-Unity projects list failed:", error);
    return json({ error: "Nu am putut încărca proiectele." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!hasJsonContentType(request)) return json({ error: "Content-Type trebuie să fie application/json." }, 415);
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (title.length < 5 || title.length > 120) return json({ error: "Titlul trebuie să aibă între 5 și 120 de caractere." }, 400);
  if (description.length < 20 || description.length > 5000) return json({ error: "Descrierea trebuie să aibă între 20 și 5.000 de caractere." }, 400);
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(
      "INSERT INTO projects (id, title, description, status, user_id) VALUES (?, ?, ?, 'active', ?)"
    ).bind(id, title, description, auth.user.id).run();
    return json({ ok: true, id }, 201);
  } catch (error) {
    console.error("COM-Unity project create failed:", error);
    return json({ error: "Proiectul nu a putut fi publicat." }, 500);
  }
}