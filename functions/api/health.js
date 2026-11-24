
export async function onRequestGet({ env }) {
  if (!env.DB) {
    return Response.json(
      {
        ok: false,
        error: "Database binding DB is missing"
      },
      { status: 500 }
    );
  }

  try {
    await env.DB
      .prepare("SELECT 1 AS connected")
      .first();

    return Response.json(
      {
        ok: true,
        service: "COM-Unity API",
        database: "connected"
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: "Database connection failed"
      },
      { status: 503 }
    );
  }
}
