import { requireUser, json, validOrigin } from "../_utils/session.js";

function projectId(request) {
  return decodeURIComponent(new URL(request.url).pathname.split("/").filter(Boolean).pop() || "");
}

export async function onRequestPatch({ request, env }) {
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  const id = projectId(request);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }

  const status = body?.status;
  if (!["active", "completed", "closed"].includes(status)) {
    return json({ error: "Stare invalidă." }, 400);
  }
  try {
    const result = await env.DB.prepare(
      "UPDATE projects SET status = ? WHERE id = ? AND user_id = ?"
    ).bind(status, id, auth.user.id).run();
    if (!result.meta?.changes) return json({ error: "Proiectul nu există sau nu îți aparține." }, 404);
    return json({ ok: true });
  } catch (error) {
    console.error("COM-Unity project update failed:", error);
    return json({ error: "Proiectul nu a putut fi actualizat." }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  const id = projectId(request);
  try {
    const owned = await env.DB.prepare(
      "SELECT id FROM projects WHERE id = ? AND user_id = ?"
    ).bind(id, auth.user.id).first();
    if (!owned) return json({ error: "Proiectul nu există sau nu îți aparține." }, 404);
    await env.DB.prepare("DELETE FROM project_members WHERE project_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").bind(id, auth.user.id).run();
    return json({ ok: true });
  } catch (error) {
    console.error("COM-Unity project delete failed:", error);
    return json({ error: "Proiectul nu a putut fi șters." }, 500);
  }
}