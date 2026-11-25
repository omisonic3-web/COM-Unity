
import { requireUser, json, validOrigin } from "./_utils/session.js";

const AVATAR_IDS = new Set(["person-1", "person-2", "person-3", "person-4", "person-5", "person-6", "person-7", "person-8", "person-9"]);

async function ensureProfileTable(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS user_profiles (user_id TEXT PRIMARY KEY, avatar_id TEXT NOT NULL DEFAULT 'person-1', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)").run();
}

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  try {
    await ensureProfileTable(env);
    const row = await env.DB.prepare("SELECT avatar_id FROM user_profiles WHERE user_id = ?").bind(auth.user.id).first();
    let reputation = { average: 0, count: 0 };
    try { reputation = await env.DB.prepare("SELECT ROUND(AVG(rating), 1) AS average, COUNT(*) AS count FROM project_ratings WHERE reviewee_id = ?").bind(auth.user.id).first() || reputation; } catch { /* tabela apare la prima accesare a evaluărilor */ }
    return json({ ok: true, user: { avatarId: row?.avatar_id || "person-1", ratingAverage: reputation.average || 0, ratingCount: reputation.count || 0 } }, 200);
  } catch (error) {
    console.error("COM-Unity profile read failed:", error);
    return json({ error: "Profilul nu a putut fi încărcat." }, 500);
  }
}

export async function onRequestPatch({ request, env }) {
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Content-Type trebuie să fie application/json." }, 415);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }

  const hasName = Object.prototype.hasOwnProperty.call(body || {}, "displayName");
  const hasAvatar = Object.prototype.hasOwnProperty.call(body || {}, "avatarId");
  if (!hasName && !hasAvatar) return json({ error: "Nu există modificări de salvat." }, 400);
  const displayName = hasName && typeof body.displayName === "string" ? body.displayName.trim().replace(/\s+/g, " ") : "";
  if (hasName && (displayName.length < 2 || displayName.length > 80)) return json({ error: "Numele trebuie să aibă între 2 și 80 de caractere." }, 400);
  if (hasAvatar && (typeof body.avatarId !== "string" || !AVATAR_IDS.has(body.avatarId))) return json({ error: "Avatar invalid." }, 400);

  try {
    await ensureProfileTable(env);
    if (hasName) await env.DB.prepare("UPDATE users SET display_name = ? WHERE id = ?").bind(displayName, auth.user.id).run();
    if (hasAvatar) {
      await env.DB.prepare("INSERT INTO user_profiles (user_id, avatar_id, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET avatar_id = excluded.avatar_id, updated_at = CURRENT_TIMESTAMP").bind(auth.user.id, body.avatarId).run();
    }
    const row = await env.DB.prepare("SELECT avatar_id FROM user_profiles WHERE user_id = ?").bind(auth.user.id).first();
    return json({ ok: true, user: { ...(hasName ? { displayName } : {}), avatarId: row?.avatar_id || "person-1" } });
  } catch (error) {
    console.error("COM-Unity profile update failed:", error);
    return json({ error: "Profilul nu a putut fi actualizat." }, 500);
  }
}
