
const COOKIE_NAME = "__Host-comunity_session";

async function hashToken(token) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getSessionToken(request) {
  const cookieHeader = request.headers.get("Cookie") || "";

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");

    if (separator === -1) continue;

    const name = cookie.slice(0, separator).trim();
    const value = cookie.slice(separator + 1).trim();

    if (name === COOKIE_NAME) {
      return value;
    }
  }

  return null;
}

export async function onRequestGet({ request, env }) {
  const headers = {
    "Cache-Control": "no-store"
  };

  if (!env.DB) {
    return Response.json(
      { error: "Database unavailable" },
      { status: 503, headers }
    );
  }

  try {
    const token = getSessionToken(request);

    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      return Response.json(
        { authenticated: false },
        { status: 401, headers }
      );
    }

    const tokenHash = await hashToken(token);

    const user = await env.DB.prepare(`
      SELECT
        users.id,
        users.email,
        users.display_name,
        users.role
      FROM sessions
      INNER JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ?
        AND sessions.expires_at > ?
        AND users.verified = 1
      LIMIT 1
    `).bind(
      tokenHash,
      new Date().toISOString()
    ).first();

    if (!user) {
      return Response.json(
        { authenticated: false },
        { status: 401, headers }
      );
    }

    return Response.json(
      {
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          role: user.role
        }
      },
      { status: 200, headers }
    );

  } catch (error) {
    return Response.json(
      { error: "Session verification failed." },
      { status: 500, headers }
    );
  }
}
