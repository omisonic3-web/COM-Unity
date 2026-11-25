import { requireUser, json, validOrigin } from "../../_utils/session.js";

function projectId(request) {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(parts.at(-2) || "");
}

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  const id = projectId(request);
  try {
    const project = await env.DB.prepare(
      "SELECT id, status, user_id FROM projects WHERE id = ?"
    ).bind(id).first();
    if (!project) return json({ error: "Proiectul nu a fost găsit." }, 404);
    if (project.status !== "active") return json({ error: "Înscrierile sunt închise pentru acest proiect." }, 409);
    if (project.user_id === auth.user.id) return json({ error: "Ești organizatorul acestui proiect." }, 409);
    await env.DB.prepare(
      "INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)"
    ).bind(id, auth.user.id).run();
    return json({ ok: true });
  } catch (error) {
    console.error("COM-Unity project join failed:", error);
    return json({ error: "Nu te-am putut înscrie la proiect." }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  const id = projectId(request);
  try {
    await env.DB.prepare(
      "DELETE FROM project_members WHERE project_id = ? AND user_id = ?"
    ).bind(id, auth.user.id).run();
    return json({ ok: true });
  } catch (error) {
    console.error("COM-Unity project leave failed:", error);
    return json({ error: "Nu te-am putut retrage din proiect." }, 500);
  }
}