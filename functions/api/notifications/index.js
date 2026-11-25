import { requireUser, json, validOrigin } from "../_utils/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  try {
    const rows = await env.DB.prepare(`
      SELECT n.id, n.type, n.title, n.message, n.entity_type, n.entity_id,
             n.read_at, n.created_at, COALESCE(u.display_name, 'Membru') AS actor_name
      FROM notifications n
      LEFT JOIN users u ON u.id = n.actor_id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `).bind(auth.user.id).all();
    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL"
    ).bind(auth.user.id).first();
    return json({ notifications: rows.results || [], unread_count: count?.count || 0 });
  } catch (error) {
    console.error("COM-Unity notifications list failed:", error);
    return json({ error: "Nu am putut încărca notificările." }, 500);
  }
}

export async function onRequestPatch({ request, env }) {
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }
  try {
    if (body?.all === true) {
      await env.DB.prepare(
        "UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL"
      ).bind(auth.user.id).run();
    } else if (typeof body?.id === "string" && body.id.length <= 100) {
      await env.DB.prepare(
        "UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND read_at IS NULL"
      ).bind(body.id, auth.user.id).run();
    } else {
      return json({ error: "Notificare invalidă." }, 400);
    }
    return json({ ok: true });
  } catch (error) {
    console.error("COM-Unity notification update failed:", error);
    return json({ error: "Notificarea nu a putut fi actualizată." }, 500);
  }
}
