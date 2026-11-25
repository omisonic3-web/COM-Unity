import { requireUser, json, validOrigin } from "../../_utils/session.js";

function requestId(request) {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(parts.at(-2) || "");
}

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  const id = requestId(request);
  try {
    const rows = await env.DB.prepare(`
      SELECT r.id, r.user_id, r.message, r.created_at,
             COALESCE(u.display_name, 'Membru') AS author_name
      FROM help_request_responses r
      INNER JOIN users u ON u.id = r.user_id
      WHERE r.request_id = ?
      ORDER BY r.created_at ASC
      LIMIT 100
    `).bind(id).all();
    return json({ responses: rows.results || [] });
  } catch (error) {
    console.error("COM-Unity request responses list failed:", error);
    return json({ error: "Nu am putut încărca răspunsurile." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  const id = requestId(request);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (message.length < 10 || message.length > 2000) {
    return json({ error: "Mesajul trebuie să aibă între 10 și 2.000 de caractere." }, 400);
  }

  try {
    const helpRequest = await env.DB.prepare(
      "SELECT id, user_id, title, status FROM help_requests WHERE id = ?"
    ).bind(id).first();
    if (!helpRequest) return json({ error: "Cererea nu a fost găsită." }, 404);
    if (helpRequest.status !== "open") return json({ error: "Cererea nu mai este deschisă." }, 409);
    const responseId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO help_request_responses (id, request_id, user_id, message)
      VALUES (?, ?, ?, ?)
    `).bind(responseId, id, auth.user.id, message).run();

    if (auth.user.id === helpRequest.user_id) {
      await env.DB.prepare(`
        INSERT INTO notifications
          (id, user_id, actor_id, type, title, message, entity_type, entity_id)
        SELECT ?, r.user_id, ?, 'request_response', 'Ai primit un mesaj în conversație', ?, 'request', ?
        FROM help_request_responses r
        WHERE r.request_id = ? AND r.user_id != ?
        GROUP BY r.user_id
      `).bind(
        crypto.randomUUID(),
        auth.user.id,
        `Autorul a răspuns în conversația „${helpRequest.title}”.`,
        id,
        id,
        auth.user.id
      ).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO notifications
          (id, user_id, actor_id, type, title, message, entity_type, entity_id)
        VALUES (?, ?, ?, 'request_response', 'Ai primit un răspuns la cererea ta', ?, 'request', ?)
      `).bind(
        crypto.randomUUID(),
        helpRequest.user_id,
        auth.user.id,
        `Un membru ți-a răspuns la cererea „${helpRequest.title}”.`,
        id
      ).run();
    }

    return json({ ok: true, id: responseId }, 201);
  } catch (error) {
    console.error("COM-Unity request response create failed:", error);
    return json({ error: "Răspunsul nu a putut fi trimis." }, 500);
  }
}
