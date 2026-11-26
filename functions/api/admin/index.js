import { requireUser, json } from "../_utils/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  if (auth.user.role !== "admin") return json({ error: "Acces rezervat administratorilor." }, 403);

  try {
    const [users, requests, offers, projects, activeMembers, members] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS total FROM users").first(),
      env.DB.prepare("SELECT COUNT(*) AS total FROM help_requests").first(),
      env.DB.prepare("SELECT COUNT(*) AS total FROM help_offers").first(),
      env.DB.prepare("SELECT COUNT(*) AS total FROM projects").first(),
      env.DB.prepare("SELECT COUNT(DISTINCT user_id) AS total FROM (SELECT user_id FROM help_requests UNION SELECT user_id FROM help_offers UNION SELECT user_id FROM projects) WHERE user_id IS NOT NULL").first(),
      env.DB.prepare("SELECT u.id, u.display_name, u.email, u.role, u.verified, ra.accepted_at AS registered_at FROM users u LEFT JOIN registration_acceptances ra ON ra.user_id = u.id ORDER BY u.display_name COLLATE NOCASE LIMIT 200").all()
    ]);
    return json({
      stats: {
        users: users?.total || 0,
        requests: requests?.total || 0,
        offers: offers?.total || 0,
        projects: projects?.total || 0,
        activeMembers: activeMembers?.total || 0
      },
      members: members.results || []
    });
  } catch (error) {
    console.error("COM-Unity admin overview failed:", error);
    return json({ error: "Nu am putut încărca datele de administrare." }, 500);
  }
}
