
const ITERATIONS = 310000;
const TOKEN_EXPIRY_HOURS = 24;

function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function toHex(bytes) {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
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

async function hashToken(token) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );

  return toHex(new Uint8Array(digest));
}

async function sendVerificationEmail(email, displayName, token, apiKey, siteUrl) {
  const verificationUrl =
    `${siteUrl}/verify-email.html?token=${encodeURIComponent(token)}`;

  const safeName = escapeHtml(displayName);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "COM-Unity <noreply@mail.com-unity.ro>",
      to: [email],
      subject: "Confirmă adresa de email — COM-Unity",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#253044;padding:24px">
          <h1 style="color:#2457a6">Bun venit în COM-Unity!</h1>
          <p>Salut, ${safeName}!</p>
          <p>Îți mulțumim că te-ai alăturat comunității COM-Unity.</p>
          <p>Pentru activarea contului, confirmă adresa de email apăsând butonul de mai jos:</p>
          <p style="margin:32px 0">
            <a href="${verificationUrl}"
               style="background:#2457a6;color:white;padding:14px 24px;text-decoration:none;border-radius:8px;display:inline-block">
              Confirmă adresa de email
            </a>
          </p>
          <p>Linkul expiră în 24 de ore.</p>
          <p>Dacă nu ai solicitat crearea unui cont, poți ignora acest mesaj.</p>
          <hr style="border:0;border-top:1px solid #ddd;margin:28px 0">
          <p style="font-size:12px;color:#777">COM-Unity — Comunitate, solidaritate și ajutor reciproc.</p>
        </div>
      `,
      text: `Salut, ${displayName}! Pentru confirmarea contului COM-Unity accesează: ${verificationUrl}. Linkul expiră în 24 de ore.`
    })
  });

  if (!response.ok) {
    throw new Error("Email delivery failed");
  }

  return await response.json();
}

export async function onRequestPost({ request, env }) {
  let stage = "environment_check";
  let failureStage = null;
  const isPreview = new URL(request.url).hostname.endsWith(".com-unity.pages.dev");

  if (!env.DB || !env.RESEND_API_KEY) {
    return Response.json(
      { error: "Registration service unavailable." },
      { status: 503 }
    );
  }

  try {
    stage = "parse_request";
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

    if (body.website) {
      return Response.json({ ok: true });
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254
    ) {
      return Response.json(
        { error: "Invalid email address." },
        { status: 400 }
      );
    }

    if (displayName.length < 2 || displayName.length > 80) {
      return Response.json(
        { error: "Name must contain 2-80 characters." },
        { status: 400 }
      );
    }

    if (password.length < 12 || password.length > 128) {
      return Response.json(
        { error: "Password must contain 12-128 characters." },
        { status: 400 }
      );
    }

    stage = "hash_password";
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = toHex(tokenBytes);
    const tokenHash = await hashToken(token);

    const expiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    ).toISOString();

    stage = "insert_user";
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

    try {
      stage = "insert_verification_token";
      await env.DB.prepare(`
        INSERT INTO email_verification_tokens (
          id,
          user_id,
          token_hash,
          expires_at
        )
        VALUES (?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        id,
        tokenHash,
        expiresAt
      ).run();

      stage = "send_verification_email";
      await sendVerificationEmail(
        email,
        displayName,
        token,
        env.RESEND_API_KEY,
        new URL(request.url).origin
      );

    } catch (error) {
      failureStage = stage;
      console.error("COM-Unity registration failure during token/email step:", stage, error?.name || "Error", error?.message || "Unknown error");
      stage = "rollback_registration";
      await env.DB.batch([
        env.DB.prepare(`
          DELETE FROM email_verification_tokens
          WHERE user_id = ?
            AND token_hash = ?
        `).bind(id, tokenHash),

        env.DB.prepare(`
          DELETE FROM users
          WHERE id = ?
            AND verified = 0
        `).bind(id)
      ]);

      throw error;
    }

    return Response.json(
      {
        ok: true,
        status: "pending_verification",
        message: "Account created. Check your email to verify your account."
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    const diagnosticStage = failureStage || stage;
    console.error("COM-Unity registration request failed:", diagnosticStage, error?.name || "Error", error?.message || "Unknown error");
    if (error.message?.includes("UNIQUE constraint failed")) {
      return Response.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    return Response.json(
      {
        error: "Registration failed. Please try again later.",
        ...(isPreview ? { diagnostic: diagnosticStage } : {})
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
