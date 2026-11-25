import { requireUser, validOrigin } from "../_utils/session.js";

const COOKIE_NAME = "__Host-comunity_session";

function fromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function verifyPassword(password, storedHash) {
  const parts = String(storedHash || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2" || Number(parts[1]) !== 100000) return false;
  try {
    const salt = fromBase64(parts[2]);
    const expected = fromBase64(parts[3]);
    if (salt.length !== 16 || expected.length !== 32) return false;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
    const actual = new Uint8Array(bits);
    let difference = 0;
    for (let i = 0; i < expected.length; i++) difference |= actual[i] ^ expected[i];
    return difference === 0;
  } catch {
    return false;
  }
}

function randomHex(length = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost({ request, env }) {
  const expiredCookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
  const headers = { "Cache-Control": "no-store" };

  if (!env.DB) return Response.json({ error: "Serviciul nu este disponibil." }, { status: 503, headers });
  if (!validOrigin(request)) return Response.json({ error: "Solicitare nepermisă." }, { status: 403, headers });
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "Content-Type trebuie să fie application/json." }, { status: 415, headers });
  }

  const auth = await requireUser(request, env);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status, headers });

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Date JSON invalide." }, { status: 400, headers }); }

  const password = typeof body?.password === "string" ? body.password : "";
  const confirmation = typeof body?.confirmation === "string" ? body.confirmation : "";
  if (password.length < 1 || password.length > 128 || confirmation !== "ȘTERGE CONTUL") {
    return Response.json({ error: "Confirmarea sau parola nu este validă." }, { status: 400, headers });
  }

  try {
    const user = await env.DB.prepare(
      "SELECT id, password_hash, role FROM users WHERE id = ? LIMIT 1"
    ).bind(auth.user.id).first();

    if (!user) return Response.json({ error: "Contul nu a fost găsit." }, { status: 404, headers });

    if (user.role === "admin") {
      return Response.json({
        error: "Conturile de administrator nu pot fi șterse. Transferă mai întâi rolul de administrator către alt cont.",
        code: "ADMIN_TRANSFER_REQUIRED"
      }, { status: 403, headers });
    }

    if (!await verifyPassword(password, user.password_hash)) {
      return Response.json({ error: "Parola introdusă este incorectă." }, { status: 401, headers });
    }

    const deletedEmail = `deleted+${crypto.randomUUID()}@account.invalid`;
    const disabledPasswordHash = `disabled$${randomHex(48)}`;
    const guard = "EXISTS (SELECT 1 FROM users WHERE id = ? AND email = ? AND display_name = 'Membru anonim' AND role = 'user' AND verified = 0)";

    const statements = [
      env.DB.prepare(`
        UPDATE users
        SET email = ?, password_hash = ?, display_name = 'Membru anonim',
            role = 'user', verified = 0
        WHERE id = ? AND role != 'admin' AND password_hash = ?
      `).bind(deletedEmail, disabledPasswordHash, user.id, user.password_hash),

      env.DB.prepare(`DELETE FROM messages WHERE (sender_id = ? OR receiver_id = ?) AND ${guard}`)
        .bind(user.id, user.id, user.id, deletedEmail),

      env.DB.prepare(`DELETE FROM sessions WHERE user_id = ? AND ${guard}`)
        .bind(user.id, user.id, deletedEmail),

      env.DB.prepare(`DELETE FROM password_reset_tokens WHERE user_id = ? AND ${guard}`)
        .bind(user.id, user.id, deletedEmail),

      env.DB.prepare(`DELETE FROM email_verification_tokens WHERE user_id = ? AND ${guard}`)
        .bind(user.id, user.id, deletedEmail),

      env.DB.prepare(`DELETE FROM registration_acceptances WHERE user_id = ? AND ${guard}`)
        .bind(user.id, user.id, deletedEmail),

      env.DB.prepare(`DELETE FROM user_profiles WHERE user_id = ? AND ${guard}`)
        .bind(user.id, user.id, deletedEmail),

      env.DB.prepare(`DELETE FROM notifications WHERE user_id = ? AND ${guard}`)
        .bind(user.id, user.id, deletedEmail),

      env.DB.prepare(`UPDATE notifications SET actor_id = NULL WHERE actor_id = ? AND ${guard}`)
        .bind(user.id, user.id, deletedEmail),

      env.DB.prepare(`UPDATE audit_logs SET details = NULL WHERE admin_id = ? AND ${guard}`)
        .bind(user.id, user.id, deletedEmail)
    ];

    const results = await env.DB.batch(statements);
    if (!results?.[0]?.meta?.changes) {
      return Response.json({ error: "Contul și-a schimbat starea. Reîncarcă pagina și încearcă din nou." }, { status: 409, headers });
    }

    return Response.json({
      ok: true,
      message: "Datele personale au fost anonimizate, iar mesajele private au fost șterse."
    }, { status: 200, headers: { ...headers, "Set-Cookie": expiredCookie } });
  } catch (error) {
    console.error("COM-Unity account deletion failed:", error?.name || "Error");
    return Response.json({ error: "Contul nu a putut fi anonimizat. Încearcă din nou." }, { status: 500, headers });
  }
}
