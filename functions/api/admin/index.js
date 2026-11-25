import { requireUser, json } from "../_utils/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  if (auth.user.role !== "admin") return json({ error: "Acces rezervat administratorilor." }, 403);

  try {
    const [users, requests, offers, projects, members] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS total FROM users").first(),
      env.DB.prepare("SELECT COUNT(*) AS total FROM help_requests").first(),
      env.DB.prepare("SELECT COUNT(*) AS total FROM help_offers").first(),
      env.DB.prepare("SELECT COUNT(*) AS total FROM projects").first(),
      env.DB.prepare("SELECT id, display_name, email, role, verified FROM users ORDER BY display_name COLLATE NOCASE LIMIT 200").all()
    ]);
    return json({
      stats: {
        users: users?.total || 0,
        requests: requests?.total || 0,
        offers: offers?.total || 0,
        projects: projects?.total || 0
      },
      members: members.results || []
    });
  } catch (error) {
    console.error("COM-Unity admin overview failed:", error);
    return json({ error: "Nu am putut încărca datele de administrare." }, 500);
  }
}
