import { requireUser, json, validOrigin } from "../_utils/session.js";

function offerId(request) {
  return decodeURIComponent(new URL(request.url).pathname.split("/").filter(Boolean).pop() || "");
}

export async function onRequestPatch({ request, env }) {
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);

  const id = offerId(request);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }
  if (!body || (body.status !== "active" && body.status !== "inactive")) {
    return json({ error: "Stare invalidă." }, 400);
  }

  try {
    const result = await env.DB.prepare(
      "UPDATE help_offers SET status = ? WHERE id = ? AND user_id = ?"
    ).bind(body.status, id, auth.user.id).run();
    if (!result.meta?.changes) return json({ error: "Oferta nu există sau nu îți aparține." }, 404);
    return json({ ok: true });
  } catch (error) {
    console.error("COM-Unity offers status update failed:", error);
    return json({ error: "Actualizarea ofertei a eșuat în baza de date.", diagnostic: error instanceof Error ? error.message : String(error) }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);

  const id = offerId(request);
  try {
    const result = await env.DB.prepare(
      "DELETE FROM help_offers WHERE id = ? AND user_id = ?"
    ).bind(id, auth.user.id).run();
    if (!result.meta?.changes) return json({ error: "Oferta nu există sau nu îți aparține." }, 404);
    return json({ ok: true });
  } catch (error) {
    console.error("COM-Unity offer delete failed:", error);
    return json({ error: "Oferta nu a putut fi ștearsă." }, 500);
  }
}
