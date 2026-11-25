import { requireUser, json, validOrigin } from "../_utils/session.js";

function getOfferId(request) {
  return new URL(request.url).pathname.split("/").filter(Boolean).pop();
}

export async function onRequestPatch({ request, env }) {
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }
  if (body.status !== "active" && body.status !== "inactive") {
    return json({ error: "Stare invalidă." }, 400);
  }
  try {
    const result = await env.DB.prepare(
      "UPDATE help_offers SET status = ? WHERE id = ? AND user_id = ?"
    ).bind(body.status, getOfferId(request), auth.user.id).run();
    if (!result.meta?.changes) return json({ error: "Oferta nu a fost găsită sau nu îți aparține." }, 404);
    return json({ ok: true });
  } catch {
    return json({ error: "Oferta nu a putut fi actualizată." }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  try {
    const result = await env.DB.prepare(
      "DELETE FROM help_offers WHERE id = ? AND user_id = ?"
    ).bind(getOfferId(request), auth.user.id).run();
    if (!result.meta?.changes) return json({ error: "Oferta nu a fost găsită sau nu îți aparține." }, 404);
    return json({ ok: true });
  } catch {
    return json({ error: "Oferta nu a putut fi ștearsă." }, 500);
  }
}
