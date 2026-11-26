
import { validOrigin } from "../_utils/session.js";

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

  for (const cookie of cookieHeader.split(";")) {
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

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) {
    return Response.json(
      { error: "Origine invalidă." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const expiredCookie = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "Secure",
    "SameSite=Lax"
  ].join("; ");

  const headers = {
    "Set-Cookie": expiredCookie,
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

    if (token && /^[a-f0-9]{64}$/i.test(token)) {
      const tokenHash = await hashToken(token);

      await env.DB.prepare(`
        DELETE FROM sessions
        WHERE token_hash = ?
      `).bind(tokenHash).run();
    }

    return Response.json(
      {
        ok: true,
        message: "Logged out successfully."
      },
      {
        status: 200,
        headers
      }
    );

  } catch (error) {
    return Response.json(
      { error: "Logout failed." },
      { status: 500, headers }
    );
  }
}
