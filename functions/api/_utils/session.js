const COOKIE_NAME = "__Host-comunity_session";

async function hashToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function getToken(request) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === COOKIE_NAME) return part.slice(index + 1).trim();
  }
  return null;
}

export async function requireUser(request, env) {
  if (!env.DB) return { error: "Database unavailable", status: 503 };
  const token = getToken(request);
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) return { error: "Autentificare necesară.", status: 401 };
  const tokenHash = await hashToken(token);
  const user = await env.DB.prepare(`
    SELECT users.id, users.role
    FROM sessions
    INNER JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.verified = 1
    LIMIT 1
  `).bind(tokenHash, new Date().toISOString()).first();
  return user ? { user } : { error: "Sesiune invalidă sau expirată.", status: 401 };
}

export function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function validOrigin(request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}


export function hasJsonContentType(request) {
  const contentType = request.headers.get("Content-Type") || "";
  return contentType.split(";")[0].trim().toLowerCase() === "application/json";
}


export async function checkRateLimit(env, scope, userId, maxAttempts, windowSeconds) {
  if (!env?.DB) return { allowed: false, retryAfter: 60, unavailable: true };
  const rawKey = `${scope}:${userId}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawKey));
  const keyHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS api_rate_limits (
    key_hash TEXT PRIMARY KEY,
    window_started_at INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  )`).run();
  const row = await env.DB.prepare(`
    INSERT INTO api_rate_limits (key_hash, window_started_at, attempts, updated_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(key_hash) DO UPDATE SET
      attempts = CASE WHEN api_rate_limits.window_started_at <= ? THEN 1 ELSE api_rate_limits.attempts + 1 END,
      window_started_at = CASE WHEN api_rate_limits.window_started_at <= ? THEN excluded.window_started_at ELSE api_rate_limits.window_started_at END,
      updated_at = excluded.updated_at
    RETURNING attempts, window_started_at
  `).bind(keyHash, now, now, now - windowSeconds, now - windowSeconds).first();
  const retryAfter = Math.max(1, windowSeconds - (now - Number(row?.window_started_at || now)));
  return { allowed: Number(row?.attempts || 0) <= maxAttempts, retryAfter };
}


export function rateLimitResponse(limit) {
  const status = limit?.unavailable ? 503 : 429;
  return new Response(JSON.stringify({
    error: limit?.unavailable ? "Protecția anti-abuz nu este disponibilă momentan." : "Ai atins limita de acțiuni. Încearcă din nou mai târziu."
  }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Retry-After": String(limit?.retryAfter || 60)
    }
  });
}
