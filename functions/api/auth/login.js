
const SESSION_DAYS = 30;
const COOKIE_NAME = "__Host-comunity_session";

function fromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function toHex(bytes) {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashToken(token) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );

  return toHex(new Uint8Array(digest));
}

async function verifyPassword(password, storedHash) {
  const parts = storedHash.split("$");

  if (parts.length !== 4 || parts[0] !== "pbkdf2") {
    return false;
  }

  const iterations = Number(parts[1]);

  if (
    !Number.isInteger(iterations) ||
    iterations < 100000 ||
    iterations > 1000000
  ) {
    return false;
  }

  try {
    const salt = fromBase64(parts[2]);
    const expected = fromBase64(parts[3]);

    if (salt.length !== 16 || expected.length !== 32) {
      return false;
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: "SHA-256"
      },
      key,
      256
    );

    const actual = new Uint8Array(bits);

    let difference = 0;

    for (let i = 0; i < expected.length; i++) {
      difference |= actual[i] ^ expected[i];
    }

    return difference === 0;
  } catch {
    return false;
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return Response.json(
      { error: "Database unavailable" },
      { status: 503 }
    );
  }

  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return Response.json(
        { error: "Content-Type must be application/json" },
        { status: 415 }
      );
    }

    const body = await request.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      password.length < 1 ||
      password.length > 128
    ) {
      return Response.json(
        { error: "Invalid email or password." },
        { status: 400 }
      );
    }

    const user = await env.DB.prepare(`
      SELECT
        id,
        email,
        password_hash,
        display_name,
        role,
        verified
      FROM users
      WHERE email = ?
      LIMIT 1
    `).bind(email).first();

    if (!user) {
      return Response.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const passwordValid = await verifyPassword(
      password,
      user.password_hash
    );

    if (!passwordValid) {
      return Response.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (user.verified !== 1) {
      return Response.json(
        {
          error: "Email address not verified.",
          code: "EMAIL_NOT_VERIFIED"
        },
        { status: 403 }
      );
    }

    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = toHex(tokenBytes);
    const tokenHash = await hashToken(token);

    const sessionId = crypto.randomUUID();

    const expiresAt = new Date(
      Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    await env.DB.prepare(`
      INSERT INTO sessions (
        id,
        user_id,
        token_hash,
        expires_at
      )
      VALUES (?, ?, ?, ?)
    `).bind(
      sessionId,
      user.id,
      tokenHash,
      expiresAt
    ).run();

    const cookie = [
      `${COOKIE_NAME}=${token}`,
      "Path=/",
      `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
      "HttpOnly",
      "Secure",
      "SameSite=Lax"
    ].join("; ");

    return Response.json(
      {
        ok: true,
        message: "Login successful.",
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          role: user.role
        }
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": cookie,
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    return Response.json(
      { error: "Login failed." },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
