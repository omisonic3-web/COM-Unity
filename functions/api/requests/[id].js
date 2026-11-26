import { requireUser, json, validOrigin, hasJsonContentType } from "../_utils/session.js";

function requestId(request) {
  return decodeURIComponent(new URL(request.url).pathname.split("/").filter(Boolean).pop() || "");
}

export async function onRequestPatch({ request, env }) {
  if (!hasJsonContentType(request)) return json({ error: "Content-Type trebuie să fie application/json." }, 415);
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  const id = requestId(request);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }
  const status = body.status;
  if (!["open", "closed"].includes(status)) return json({ error: "Stare invalidă." }, 400);
  try {
    const result = await env.DB.prepare("UPDATE help_requests SET status = ? WHERE id = ? AND user_id = ?")
      .bind(status, id, auth.user.id).run();
    if (!result.meta?.changes) return json({ error: "Cererea nu există sau nu îți aparține." }, 404);
    return json({ ok: true });
  } catch {
    return json({ error: "Nu am putut actualiza cererea." }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  const id = requestId(request);
  try {
    const result = await env.DB.prepare("DELETE FROM help_requests WHERE id = ? AND user_id = ?")
      .bind(id, auth.user.id).run();
    if (!result.meta?.changes) return json({ error: "Cererea nu există sau nu îți aparține." }, 404);
    return json({ ok: true });
  } catch {
    return json({ error: "Nu am putut șterge cererea." }, 500);
  }
}
