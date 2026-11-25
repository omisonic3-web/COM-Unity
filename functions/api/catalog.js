import { requireUser, json } from "./_utils/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  try {
    await env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_categories (
        id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        kind TEXT NOT NULL DEFAULT 'both', active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_zones (
        id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`)
    ]);
    const defaults = [["Comunitate","both"],["Educație","both"],["Sănătate","both"],["Alimente și bunuri","both"],["Transport","both"],["Locuință","both"],["Tehnologie","both"],["Altele","both"],["Reparații și servicii","offer"]];
    for (const [name,kind] of defaults) await env.DB.prepare("INSERT OR IGNORE INTO admin_categories (id,name,kind) VALUES (?,?,?)").bind(crypto.randomUUID(),name,kind).run();
    const [categories,zones] = await Promise.all([
      env.DB.prepare("SELECT name,kind FROM admin_categories WHERE active=1 ORDER BY name COLLATE NOCASE").all(),
      env.DB.prepare("SELECT name FROM admin_zones WHERE active=1 ORDER BY name COLLATE NOCASE").all()
    ]);
    return json({ categories: categories.results || [], zones: zones.results || [] });
  } catch (error) {
    console.error("Catalog read failed:",error);
    return json({ error: "Catalogul nu a putut fi încărcat." },500);
  }
}
