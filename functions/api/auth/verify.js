import { validOrigin, hasJsonContentType } from "../_utils/session.js";

async function hashToken(token) {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) {
    return Response.json(
      { error: "Originea cererii nu este permisă." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!env.DB) {
    return Response.json(
      { error: "Database unavailable" },
      { status: 503 }
    );
  }

  try {
    if (!hasJsonContentType(request)) {
      return Response.json(
        { error: "Content-Type must be application/json" },
        { status: 415, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await request.json();
    const token = String(body.token || "").toLowerCase();

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return Response.json(
        { error: "Invalid or expired verification link." },
        { status: 400 }
      );
    }

    const tokenHash = await hashToken(token);

    const record = await env.DB.prepare(`
      SELECT id, user_id
      FROM email_verification_tokens
      WHERE token_hash = ?
        AND consumed_at IS NULL
        AND expires_at > ?
    `).bind(tokenHash, new Date().toISOString()).first();

    if (!record) {
      return Response.json(
        { error: "Invalid or expired verification link." },
        { status: 400 }
      );
    }

    // Marker unic pentru consumarea tokenului
    const consumedAt =
      new Date().toISOString() + ":" + crypto.randomUUID();

    const results = await env.DB.batch([
      env.DB.prepare(`
        UPDATE email_verification_tokens
        SET consumed_at = ?
        WHERE id = ?
          AND consumed_at IS NULL
          AND expires_at > ?
      `).bind(consumedAt, record.id, new Date().toISOString()),

      env.DB.prepare(`
        UPDATE users
        SET verified = 1
        WHERE id = ?
          AND EXISTS (
            SELECT 1
            FROM email_verification_tokens
            WHERE id = ?
              AND consumed_at = ?
          )
      `).bind(record.user_id, record.id, consumedAt)
    ]);

    if (!results[0]?.meta?.changes || !results[1]?.meta?.changes) {
      return Response.json(
        { error: "Verification link already used or expired." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    return Response.json(
      {
        ok: true,
        message: "Email verified successfully."
      },
      { headers: { "Cache-Control": "no-store" } }
    );

  } catch (error) {
    return Response.json(
      { error: "Verification failed." },
      { status: 500 }
    );
  }
}
