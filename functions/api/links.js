import { requireUser, json } from "./_utils/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  try {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS useful_links (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();
    const result = await env.DB.prepare("SELECT id,title,url,description FROM useful_links WHERE active=1 ORDER BY title COLLATE NOCASE").all();
    return json({ links: result.results || [] });
  } catch (error) {
    console.error("Useful links read failed:", error);
    return json({ error: "Linkurile utile nu au putut fi încărcate." }, 500);
  }
}
