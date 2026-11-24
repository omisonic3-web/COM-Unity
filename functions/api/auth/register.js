
const ITERATIONS = 310000;

function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));

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
      iterations: ITERATIONS,
      hash: "SHA-256"
    },
    key,
    256
  );

  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(new Uint8Array(bits))}`;
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
    const displayName = String(body.displayName || "").trim();
    const password = String(body.password || "");

    // Honeypot anti-spam
    if (body.website) {
      return Response.json({ ok: true });
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254
    ) {
      return Response.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    if (displayName.length < 2 || displayName.length > 80) {
      return Response.json(
        { error: "Name must contain 2-80 characters" },
        { status: 400 }
      );
    }

    if (password.length < 12 || password.length > 128) {
      return Response.json(
        { error: "Password must contain 12-128 characters" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const id = crypto.randomUUID();

    await env.DB.prepare(`
      INSERT INTO users (
        id,
        email,
        password_hash,
        display_name,
        role,
        verified
      )
      VALUES (?, ?, ?, ?, 'user', 0)
    `).bind(
      id,
      email,
      passwordHash,
      displayName
    ).run();

    return Response.json(
      {
        ok: true,
        status: "pending_verification",
        message: "Account created. Email verification is not yet enabled."
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      return Response.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    return Response.json(
      { error: "Registration failed." },
      { status: 500 }
    );
  }
}
