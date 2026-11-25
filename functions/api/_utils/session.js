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
