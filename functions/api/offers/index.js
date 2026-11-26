import { requireUser, json, validOrigin, hasJsonContentType, checkRateLimit, rateLimitResponse } from "../_utils/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  try {
    const rows = await env.DB.prepare(`
      SELECT o.id, o.user_id, o.title, o.description, o.category, o.location, o.status, o.created_at,
             u.display_name AS author_name
      FROM help_offers o
      INNER JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
      LIMIT 100
    `).all();
    return json({ offers: rows.results || [] });
  } catch {
    return json({ error: "Nu am putut încărca ofertele." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!hasJsonContentType(request)) return json({ error: "Content-Type trebuie să fie application/json." }, 415);
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  const limit = await checkRateLimit(env, "offer_create", auth.user.id, 5, 3600);
  if (!limit.allowed) return rateLimitResponse(limit);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  if (title.length < 5 || title.length > 120) return json({ error: "Titlul trebuie să aibă între 5 și 120 de caractere." }, 400);
  if (description.length < 20 || description.length > 5000) return json({ error: "Descrierea trebuie să aibă între 20 și 5.000 de caractere." }, 400);
  if (!category || category.length > 60) return json({ error: "Alege o categorie validă." }, 400);
  if (location.length > 120) return json({ error: "Localitatea este prea lungă." }, 400);
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(`
      INSERT INTO help_offers (id, user_id, title, description, category, location, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).bind(id, auth.user.id, title, description, category, location || null).run();
    return json({ ok: true, id }, 201);
  } catch {
    return json({ error: "Oferta nu a putut fi publicată." }, 500);
  }
}
