import { requireUser, json } from "./_utils/session.js";

const defaults = {
  title: "Despre COM-Unity",
  intro: "COM-Unity este un spațiu digital dedicat oamenilor care cred în puterea colaborării și a solidarității.",
  mission: "Să conectăm oamenii care au nevoie de sprijin cu cei care pot oferi ajutor, timp, experiență sau resurse.",
  vision: "O comunitate în care implicarea, încrederea și cooperarea transformă inițiativele individuale în schimbări pozitive.",
  values_text: "Solidaritate • Respect • Încredere • Implicare • Cooperare",
  contact_email: "",
  contact_location: ""
};

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  try {
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
      .bind(defaults.title,defaults.intro,defaults.mission,defaults.vision,defaults.values_text,defaults.contact_email,defaults.contact_location).run();
    const content = await env.DB.prepare("SELECT title,intro,mission,vision,values_text,contact_email,contact_location,updated_at FROM about_content WHERE id=1").first();
    return json({ content });
  } catch (error) {
    console.error("About content read failed:", error);
    return json({ error: "Informațiile Despre noi nu au putut fi încărcate." }, 500);
  }
}
