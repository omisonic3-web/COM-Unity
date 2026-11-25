import { requireUser, json, validOrigin } from "../_utils/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  const url = new URL(request.url);
  const otherId = url.searchParams.get("with");
  try {
    if (url.searchParams.get("unread") === "1") {
      const latest = await env.DB.prepare("SELECT m.id, m.message, m.created_at, m.sender_id, u.display_name AS sender_name FROM messages m INNER JOIN users u ON u.id = m.sender_id WHERE m.receiver_id = ? AND m.read_at IS NULL ORDER BY m.created_at DESC LIMIT 1").bind(auth.user.id).first();
      const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM messages WHERE receiver_id = ? AND read_at IS NULL").bind(auth.user.id).first();
      return json({ unread_count: count?.count || 0, latest: latest || null });
    }
    if (otherId) {
      await env.DB.prepare("UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE sender_id = ? AND receiver_id = ? AND read_at IS NULL").bind(otherId, auth.user.id).run();
      const rows = await env.DB.prepare(`
        SELECT m.id, m.sender_id, m.receiver_id, m.message, m.created_at,
               u.display_name AS sender_name
        FROM messages m
        INNER JOIN users u ON u.id = m.sender_id
        WHERE (m.sender_id = ? AND m.receiver_id = ?)
           OR (m.sender_id = ? AND m.receiver_id = ?)
        ORDER BY m.created_at ASC
        LIMIT 500
      `).bind(auth.user.id, otherId, otherId, auth.user.id).all();
      return json({ messages: rows.results || [] });
    }
    const rows = await env.DB.prepare(`
      SELECT m.id, m.sender_id, m.receiver_id, m.message, m.created_at,
             CASE WHEN m.sender_id = ? THEN receiver.display_name ELSE sender.display_name END AS other_name,
             CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS other_id,
             (SELECT COUNT(*) FROM messages unread WHERE unread.sender_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AND unread.receiver_id = ? AND unread.read_at IS NULL) AS unread_count
      FROM messages m
      INNER JOIN users sender ON sender.id = m.sender_id
      INNER JOIN users receiver ON receiver.id = m.receiver_id
      WHERE m.sender_id = ? OR m.receiver_id = ?
      ORDER BY m.created_at DESC
      LIMIT 300
    `).bind(auth.user.id, auth.user.id, auth.user.id, auth.user.id, auth.user.id, auth.user.id).all();
    const conversations = [];
    const seen = new Set();
    for (const row of rows.results || []) {
      if (!seen.has(row.other_id)) {
        seen.add(row.other_id);
        conversations.push({ user_id: row.other_id, display_name: row.other_name, last_message: row.message, created_at: row.created_at, unread_count: row.unread_count || 0 });
      }
    }
    return json({ conversations });
  } catch (error) {
    console.error("COM-Unity messages read failed:", error);
    return json({ error: "Nu am putut încărca mesajele." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }
  const receiverId = typeof body?.receiver_id === "string" ? body.receiver_id.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!receiverId || receiverId === auth.user.id) return json({ error: "Alege un destinatar valid." }, 400);
  if (message.length < 1 || message.length > 5000) return json({ error: "Mesajul trebuie să aibă maximum 5.000 de caractere." }, 400);
  try {
    const receiver = await env.DB.prepare("SELECT id FROM users WHERE id = ? AND verified = 1").bind(receiverId).first();
    if (!receiver) return json({ error: "Destinatarul nu există sau nu are contul confirmat." }, 404);
    const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO messages (id, sender_id, receiver_id, message) VALUES (?, ?, ?, ?)").bind(id, auth.user.id, receiverId, message).run();
    return json({ ok: true, id }, 201);
  } catch (error) {
    console.error("COM-Unity message send failed:", error);
    return json({ error: "Mesajul nu a putut fi trimis." }, 500);
  }
}
