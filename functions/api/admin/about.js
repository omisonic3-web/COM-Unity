import { requireUser, json, validOrigin } from "../_utils/session.js";

const defaults = {
  title: "Despre COM-Unity",
  intro: "COM-Unity este un spațiu digital dedicat oamenilor care cred în puterea colaborării și a solidarității.",
  mission: "Să conectăm oamenii care au nevoie de sprijin cu cei care pot oferi ajutor, timp, experiență sau resurse.",
  vision: "O comunitate în care implicarea, încrederea și cooperarea transformă inițiativele individuale în schimbări pozitive.",
  values: "Solidaritate • Respect • Încredere • Implicare • Cooperare",
  contact_email: "",
  contact_location: ""
};

async function ensureAbout(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS about_content (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    title TEXT NOT NULL,
    intro TEXT NOT NULL,
    mission TEXT NOT NULL,
    vision TEXT NOT NULL,
    values_text TEXT NOT NULL,
    contact_email TEXT NOT NULL DEFAULT '',
    contact_location TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`INSERT OR IGNORE INTO about_content
    (id,title,intro,mission,vision,values_text,contact_email,contact_location)
    VALUES (1,?,?,?,?,?,?,?)`)
    .bind(defaults.title, defaults.intro, defaults.mission, defaults.vision, defaults.values, defaults.contact_email, defaults.contact_location).run();
}

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  if (auth.user.role !== "admin") return json({ error: "Acces rezervat administratorilor." }, 403);
  try {
    await ensureAbout(env);
    const content = await env.DB.prepare("SELECT title,intro,mission,vision,values_text,contact_email,contact_location,updated_at FROM about_content WHERE id=1").first();
    return json({ content });
  } catch (error) {
    console.error("Admin about content read failed:", error);
    return json({ error: "Informațiile Despre noi nu au putut fi încărcate." }, 500);
  }
}

export async function onRequestPatch({ request, env }) {
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  if (auth.user.role !== "admin") return json({ error: "Acces rezervat administratorilor." }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }
  const fields = {};
  for (const key of ["title","intro","mission","vision","values","contact_email","contact_location"]) {
    fields[key] = typeof body[key] === "string" ? body[key].trim() : "";
  }
  if (fields.title.length < 2 || fields.title.length > 100) return json({ error: "Titlul trebuie să aibă între 2 și 100 de caractere." }, 400);
  if (fields.intro.length < 10 || fields.intro.length > 1200) return json({ error: "Prezentarea trebuie să aibă între 10 și 1.200 de caractere." }, 400);
  for (const key of ["mission","vision","values"]) {
    if (fields[key].length > 1200) return json({ error: "Fiecare secțiune poate avea maximum 1.200 de caractere." }, 400);
  }
  if (fields.contact_email.length > 160 || (fields.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.contact_email))) {
    return json({ error: "Adresa de email de contact nu este validă." }, 400);
  }
  if (fields.contact_location.length > 160) return json({ error: "Locația poate avea maximum 160 de caractere." }, 400);
  try {
    await ensureAbout(env);
    await env.DB.prepare(`UPDATE about_content SET title=?,intro=?,mission=?,vision=?,values=?,contact_email=?,contact_location=?,updated_at=CURRENT_TIMESTAMP WHERE id=1`)
      .bind(fields.title,fields.intro,fields.mission,fields.vision,fields.values,fields.contact_email,fields.contact_location).run();
    return json({ ok: true });
  } catch (error) {
    console.error("Admin about content update failed:", error);
    return json({ error: "Informațiile nu au putut fi salvate." }, 500);
  }
}
