import { requireUser, json, validOrigin } from "./_utils/session.js";

export async function onRequestPatch({ request, env }) {
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "Content-Type trebuie să fie application/json." }, 415);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Date JSON invalide." }, 400);
  }

  const displayName = typeof body?.displayName === "string" ? body.displayName.trim().replace(/\\s+/g, " ") : "";
  if (displayName.length < 2 || displayName.length > 80) {
    return json({ error: "Numele trebuie să aibă între 2 și 80 de caractere." }, 400);
  }

  try {
    await env.DB.prepare("UPDATE users SET display_name = ? WHERE id = ?")
      .bind(displayName, auth.user.id)
      .run();

    return json({ ok: true, user: { displayName } });
  } catch (error) {
    console.error("COM-Unity profile update failed:", error);
    return json({ error: "Numele nu a putut fi salvat." }, 500);
  }
}
