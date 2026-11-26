import { requireUser, json, validOrigin } from "../_utils/session.js";

async function ensureCatalog(env) {
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
  const defaults = [
    ["Comunitate","both"],["Educație","both"],["Sănătate","both"],
    ["Alimente și bunuri","both"],["Transport","both"],["Locuință","both"],
    ["Tehnologie","both"],["Altele","both"],["Reparații și servicii","offer"]
  ];
  for (const [name, kind] of defaults) {
    await env.DB.prepare("INSERT OR IGNORE INTO admin_categories (id,name,kind) VALUES (?,?,?)")
      .bind(crypto.randomUUID(), name, kind).run();
  }
}

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  if (auth.user.role !== "admin") return json({ error: "Acces rezervat administratorilor." }, 403);
  try {
    await ensureCatalog(env);
    const [categories, zones] = await Promise.all([
      env.DB.prepare("SELECT id,name,kind,active FROM admin_categories ORDER BY name COLLATE NOCASE").all(),
      env.DB.prepare("SELECT id,name,active FROM admin_zones ORDER BY name COLLATE NOCASE").all()
    ]);
    return json({ categories: categories.results || [], zones: zones.results || [] });
  } catch (error) {
    console.error("Admin catalog read failed:", error);
    return json({ error: "Nu am putut încărca temele și zonele." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  if (auth.user.role !== "admin") return json({ error: "Acces rezervat administratorilor." }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }
  const type = body.type === "zone" ? "zone" : body.type === "category" ? "category" : "";
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (!type) return json({ error: "Tip de element invalid." }, 400);
  if (name.length < 2 || name.length > 80) return json({ error: "Numele trebuie să aibă între 2 și 80 de caractere." }, 400);
  const kind = ["both","request","offer"].includes(body.kind) ? body.kind : "both";
  try {
    await ensureCatalog(env);
    const id = crypto.randomUUID();
    if (type === "category") {
      await env.DB.prepare("INSERT INTO admin_categories (id,name,kind) VALUES (?,?,?)").bind(id,name,kind).run();
    } else {
      await env.DB.prepare("INSERT INTO admin_zones (id,name) VALUES (?,?)").bind(id,name).run();
    }
    return json({ ok: true, id }, 201);
  } catch (error) {
    if (String(error).includes("UNIQUE")) return json({ error: "Există deja un element cu acest nume." }, 409);
    console.error("Admin catalog create failed:", error);
    return json({ error: "Elementul nu a putut fi salvat." }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  if (auth.user.role !== "admin") return json({ error: "Acces rezervat administratorilor." }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }
  if (!body.id || !["category","zone"].includes(body.type)) return json({ error: "Element invalid." }, 400);
  try {
    await ensureCatalog(env);
    const table = body.type === "category" ? "admin_categories" : "admin_zones";
    await env.DB.prepare(`UPDATE ${table} SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?`).bind(body.id).run();
    return json({ ok: true });
  } catch (error) {
    console.error("Admin catalog toggle failed:", error);
    return json({ error: "Starea elementului nu a putut fi modificată." }, 500);
  }
}
