import { requireUser, json } from "../_utils/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  try {
    const rows = await env.DB.prepare(`
      SELECT id, display_name
      FROM users
      WHERE verified = 1 AND id <> ?
      ORDER BY display_name COLLATE NOCASE
      LIMIT 200
    `).bind(auth.user.id).all();
    return json({ members: rows.results || [] });
  } catch (error) {
    console.error("COM-Unity members list failed:", error);
    return json({ error: "Nu am putut încărca membrii." }, 500);
  }
}
