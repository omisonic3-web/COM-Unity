import { requireUser, json } from "./_utils/session.js";

async function ensureLeaderboardTables(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS user_profiles (user_id TEXT PRIMARY KEY, avatar_id TEXT NOT NULL DEFAULT 'person-1', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)").run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS project_ratings (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      reviewee_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, reviewer_id, reviewee_id),
      CHECK (reviewer_id != reviewee_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();
}

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);

  try {
    await ensureLeaderboardTables(env);
    const result = await env.DB.prepare(`
      WITH completed_participation AS (
        SELECT p.user_id AS user_id, p.id AS project_id
        FROM projects p
        WHERE p.status = 'completed'
        UNION
        SELECT pm.user_id AS user_id, p.id AS project_id
        FROM project_members pm
        INNER JOIN projects p ON p.id = pm.project_id
        WHERE p.status = 'completed'
      ),
      project_totals AS (
        SELECT user_id, COUNT(DISTINCT project_id) AS completed_projects
        FROM completed_participation
        GROUP BY user_id
      ),
      rating_totals AS (
        SELECT reviewee_id AS user_id, COUNT(*) AS rating_count, ROUND(AVG(rating), 1) AS rating_average
        FROM project_ratings
        GROUP BY reviewee_id
      )
      SELECT u.id, u.display_name,
             COALESCE(up.avatar_id, 'person-1') AS avatar_id,
             COALESCE(pt.completed_projects, 0) AS completed_projects,
             COALESCE(rt.rating_count, 0) AS rating_count,
             COALESCE(rt.rating_average, 0) AS rating_average
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN project_totals pt ON pt.user_id = u.id
      LEFT JOIN rating_totals rt ON rt.user_id = u.id
      WHERE COALESCE(u.role, 'user') != 'admin'
      ORDER BY completed_projects DESC, rating_average DESC, rating_count DESC, u.display_name COLLATE NOCASE ASC
      LIMIT 500
    `).all();

    return json({
      members: (result.results || []).map(row => ({
        id: row.id,
        displayName: row.display_name || "Membru COM-Unity",
        avatarId: row.avatar_id || "person-1",
        completedProjects: Number(row.completed_projects || 0),
        ratingCount: Number(row.rating_count || 0),
        ratingAverage: Number(row.rating_average || 0)
      })),
      currentUserId: auth.user.id
    });
  } catch (error) {
    console.error("COM-Unity leaderboard read failed:", error);
    return json({ error: "Clasamentul nu a putut fi încărcat." }, 500);
  }
}
