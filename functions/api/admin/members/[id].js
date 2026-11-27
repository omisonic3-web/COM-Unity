import { requireUser, json } from "../../_utils/session.js";

export async function onRequestGet({ request, env, params }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  if (auth.user.role !== "admin") return json({ error: "Acces rezervat administratorilor." }, 403);

  const memberId = typeof params?.id === "string" ? params.id.trim() : "";
  if (!memberId || memberId.length > 100) return json({ error: "Membru invalid." }, 400);

  try {
    const member = await env.DB.prepare(
      "SELECT id, display_name, role, verified FROM users WHERE id = ? LIMIT 1"
    ).bind(memberId).first();
    if (!member) return json({ error: "Membrul nu a fost găsit." }, 404);

    const activity = await env.DB.prepare(`
      SELECT activity_type, title, status, created_at
      FROM (
        SELECT 'Cerere de ajutor' AS activity_type, title, status, created_at
        FROM help_requests WHERE user_id = ?
        UNION ALL
        SELECT 'Ofertă de ajutor' AS activity_type, title, status, created_at
        FROM help_offers WHERE user_id = ?
        UNION ALL
        SELECT 'Proiect comunitar' AS activity_type, title, status, created_at
        FROM projects WHERE user_id = ?
      )
      ORDER BY created_at DESC
      LIMIT 50
    `).bind(memberId, memberId, memberId).all();

    return json({
      member,
      activity: activity.results || [],
      limited: (activity.results || []).length === 50
    });
  } catch (error) {
    console.error("COM-Unity admin member activity read failed:", error);
    return json({ error: "Activitatea membrului nu a putut fi încărcată." }, 500);
  }
}
