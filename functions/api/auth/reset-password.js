import { validOrigin, hasJsonContentType } from "../_utils/session.js";
const ITERATIONS = 100000;
function base64(bytes) { let value = ""; for (const b of bytes) value += String.fromCharCode(b); return btoa(value); }
function hex(bytes) { return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join(""); }
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" }, key, 256);
  return "pbkdf2$" + ITERATIONS + "$" + base64(salt) + "$" + base64(new Uint8Array(bits));
}
async function hashToken(token) { const value = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)); return hex(new Uint8Array(value)); }
export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) return Response.json({ error: "Originea cererii nu este permisă." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (!env.DB) return Response.json({ error: "Serviciul nu este disponibil." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  try {
    if (!hasJsonContentType(request)) return Response.json({ error: "Content-Type must be application/json" }, { status: 415, headers: { "Cache-Control": "no-store" } });
    const body = await request.json();
    const token = String(body.token || "");
    const password = String(body.password || "");
    if (!/^[a-f0-9]{64}$/i.test(token)) return Response.json({ error: "Linkul de resetare este invalid sau a expirat. Solicită unul nou." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    if (password.length < 12 || password.length > 128) return Response.json({ error: "Parola trebuie să conțină între 12 și 128 de caractere." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    const tokenHash = await hashToken(token);
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = (SELECT user_id FROM auth_password_resets WHERE token_hash = ? AND expires_at > ? AND consumed_at IS NULL LIMIT 1) RETURNING id").bind(passwordHash, tokenHash, now),
      env.DB.prepare("UPDATE auth_password_resets SET consumed_at = ? WHERE token_hash = ? AND expires_at > ? AND consumed_at IS NULL").bind(now, tokenHash, now),
      env.DB.prepare("DELETE FROM sessions WHERE user_id = (SELECT user_id FROM auth_password_resets WHERE token_hash = ? AND consumed_at = ? LIMIT 1)").bind(tokenHash, now),
      env.DB.prepare("DELETE FROM auth_password_resets WHERE user_id = (SELECT user_id FROM auth_password_resets WHERE token_hash = ? AND consumed_at = ? LIMIT 1) AND token_hash <> ?").bind(tokenHash, now, tokenHash)
    ]);
    const userId = results?.[0]?.results?.[0]?.id;
    if (!userId) return Response.json({ error: "Linkul de resetare este invalid sau a expirat. Solicită unul nou." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    return Response.json({ ok: true, message: "Parola a fost schimbată. Te poți autentifica folosind noua parolă." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("COM-Unity reset-password failed:", error?.name || "Error");
    return Response.json({ error: "Nu am putut schimba parola. Încearcă din nou." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}