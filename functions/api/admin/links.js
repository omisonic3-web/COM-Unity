import { requireUser, json, validOrigin, hasJsonContentType, writeAuditLog } from "../_utils/session.js";

async function ensureLinks(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS useful_links (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

function cleanLink(body) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (title.length < 2 || title.length > 100) return { error: "Titlul trebuie să aibă între 2 și 100 de caractere." };
  if (url.length > 2048) return { error: "Adresa linkului este prea lungă." };
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("protocol");
  } catch { return { error: "Introdu o adresă web validă, care începe cu https:// sau http://." }; }
  if (description.length > 300) return { error: "Descrierea poate avea maximum 300 de caractere." };
  return { title, url, description };
}

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  if (auth.user.role !== "admin") return json({ error: "Acces rezervat administratorilor." }, 403);
  try {
    await ensureLinks(env);
    const result = await env.DB.prepare("SELECT id,title,url,description,active,created_at FROM useful_links ORDER BY created_at DESC").all();
    return json({ links: result.results || [] });
  } catch (error) {
    console.error("Admin useful links read failed:", error);
    return json({ error: "Linkurile utile nu au putut fi încărcate." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!hasJsonContentType(request)) return json({ error: "Content-Type trebuie să fie application/json." }, 415);
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  if (auth.user.role !== "admin") return json({ error: "Acces rezervat administratorilor." }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }
  const fields = cleanLink(body);
  if (fields.error) return json({ error: fields.error }, 400);
  try {
    await ensureLinks(env);
    const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO useful_links (id,title,url,description) VALUES (?,?,?,?)")
      .bind(id, fields.title, fields.url, fields.description).run();
    await writeAuditLog(env, auth.user.id, "links.create", { itemId: id });
    return json({ ok: true, id }, 201);
  } catch (error) {
    console.error("Useful link create failed:", error);
    return json({ error: "Linkul nu a putut fi salvat." }, 500);
  }
}

export async function onRequestPatch({ request, env }) {
  if (!hasJsonContentType(request)) return json({ error: "Content-Type trebuie să fie application/json." }, 415);
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  if (auth.user.role !== "admin") return json({ error: "Acces rezervat administratorilor." }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }
  if (typeof body.id !== "string" || !body.id) return json({ error: "Link invalid." }, 400);
  try {
    await ensureLinks(env);
    if (typeof body.active === "boolean") {
      await env.DB.prepare("UPDATE useful_links SET active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(body.active ? 1 : 0, body.id).run();
      await writeAuditLog(env, auth.user.id, "links.toggle", { itemId: body.id, active: body.active });
    } else {
      const fields = cleanLink(body);
      if (fields.error) return json({ error: fields.error }, 400);
      await env.DB.prepare("UPDATE useful_links SET title=?,url=?,description=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(fields.title, fields.url, fields.description, body.id).run();
      await writeAuditLog(env, auth.user.id, "links.update", { itemId: body.id });
    }
    return json({ ok: true });
  } catch (error) {
    console.error("Useful link update failed:", error);
    return json({ error: "Linkul nu a putut fi actualizat." }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  if (!hasJsonContentType(request)) return json({ error: "Content-Type trebuie să fie application/json." }, 415);
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  if (auth.user.role !== "admin") return json({ error: "Acces rezervat administratorilor." }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }
  if (typeof body.id !== "string" || !body.id) return json({ error: "Link invalid." }, 400);
  try {
    await ensureLinks(env);
    await env.DB.prepare("DELETE FROM useful_links WHERE id=?").bind(body.id).run();
    await writeAuditLog(env, auth.user.id, "links.delete", { itemId: body.id });
    return json({ ok: true });
  } catch (error) {
    console.error("Useful link delete failed:", error);
    return json({ error: "Linkul nu a putut fi șters." }, 500);
  }
}
