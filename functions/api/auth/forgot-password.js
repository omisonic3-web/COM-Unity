import { validOrigin, hasJsonContentType } from "../_utils/session.js";
const WINDOW = 15 * 60;
const MAX_ATTEMPTS = 3;
function hex(bytes) { return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join(""); }
async function digest(value) { const result = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return hex(new Uint8Array(result)); }
async function rateLimit(env, request, email, now) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = await digest("com-unity-password-reset-v1|" + ip + "|" + email);
  const row = await env.DB.prepare(`
    INSERT INTO auth_login_attempts (key_hash, window_started_at, attempts, updated_at) VALUES (?, ?, 1, ?)
    ON CONFLICT(key_hash) DO UPDATE SET
      attempts = CASE WHEN excluded.updated_at - auth_login_attempts.window_started_at >= ? THEN 1 ELSE auth_login_attempts.attempts + 1 END,
      window_started_at = CASE WHEN excluded.updated_at - auth_login_attempts.window_started_at >= ? THEN excluded.window_started_at ELSE auth_login_attempts.window_started_at END,
      updated_at = excluded.updated_at RETURNING attempts, window_started_at
  `).bind(key, now, now, WINDOW, WINDOW).first();
  return { attempts: Number(row?.attempts || 0), retry: Math.max(1, WINDOW - (now - Number(row?.window_started_at || now))) };
}
async function sendEmail(email, token, apiKey, origin) {
  const url = origin + "/reset-password.html?token=" + encodeURIComponent(token);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "COM-Unity <noreply@mail.com-unity.ro>",
      to: [email],
      subject: "Resetare parolă — COM-Unity",
      html: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#253044;padding:24px"><h1 style="color:#2457a6">Resetare parolă COM-Unity</h1><p>Am primit o solicitare de resetare a parolei contului tău.</p><p><a href="' + url + '" style="background:#2457a6;color:white;padding:14px 24px;text-decoration:none;border-radius:8px;display:inline-block">Alege o parolă nouă</a></p><p>Linkul este valabil 30 de minute și poate fi folosit o singură dată.</p><p>Dacă nu ai solicitat resetarea, ignoră acest mesaj.</p></div>',
      text: "Pentru resetarea parolei COM-Unity accesează: " + url + ". Linkul expiră în 30 de minute și poate fi folosit o singură dată."
    })
  });
  if (!response.ok) throw new Error("Email delivery failed");
}
export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) return Response.json({ error: "Originea cererii nu este permisă." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (!env.DB || !env.RESEND_API_KEY) return Response.json({ error: "Serviciul de recuperare nu este disponibil." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  try {
    if (!hasJsonContentType(request)) return Response.json({ error: "Content-Type must be application/json" }, { status: 415, headers: { "Cache-Control": "no-store" } });
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return Response.json({ error: "Adresa de email nu este validă." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    const now = Math.floor(Date.now() / 1000);
    const limit = await rateLimit(env, request, email, now);
    if (limit.attempts > MAX_ATTEMPTS) return Response.json({ error: "Prea multe solicitări. Încearcă din nou peste 15 minute." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(limit.retry) } });
    const user = await env.DB.prepare("SELECT id, email FROM users WHERE email = ? AND verified = 1 LIMIT 1").bind(email).first();
    if (user) {
      const token = hex(crypto.getRandomValues(new Uint8Array(32)));
      const tokenHash = await digest(token);
      const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await env.DB.prepare("DELETE FROM auth_password_resets WHERE user_id = ?").bind(user.id).run();
      await env.DB.prepare("INSERT INTO auth_password_resets (id, user_id, token_hash, expires_at, consumed_at) VALUES (?, ?, ?, ?, NULL)").bind(crypto.randomUUID(), user.id, tokenHash, expires).run();
      try { await sendEmail(user.email, token, env.RESEND_API_KEY, new URL(request.url).origin); }
      catch (error) { await env.DB.prepare("DELETE FROM auth_password_resets WHERE token_hash = ?").bind(tokenHash).run(); console.error("COM-Unity reset email failed:", error?.name || "Error"); }
    }
    return Response.json({ ok: true, message: "Dacă există un cont verificat cu această adresă, vei primi un email cu instrucțiunile de resetare." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("COM-Unity forgot-password failed:", error?.name || "Error");
    return Response.json({ error: "Solicitarea nu a putut fi procesată. Încearcă din nou mai târziu." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}