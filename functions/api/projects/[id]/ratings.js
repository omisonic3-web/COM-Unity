import { requireUser, json, validOrigin, hasJsonContentType, checkRateLimit, rateLimitResponse } from "../../_utils/session.js";

function projectId(request) {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(parts.at(-2) || "");
}

async function ensureRatingsTable(env) {
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

async function participants(env, id) {
  const rows = await env.DB.prepare(`
    SELECT p.user_id AS id, COALESCE(u.display_name, 'Organizator') AS name, 'organizer' AS role
    FROM projects p INNER JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
    UNION
    SELECT pm.user_id AS id, COALESCE(u.display_name, 'Membru') AS name, 'member' AS role
    FROM project_members pm INNER JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
  `).bind(id, id).all();
  return rows.results || [];
}

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  const id = projectId(request);
  try {
    await ensureRatingsTable(env);
    const project = await env.DB.prepare("SELECT id, status FROM projects WHERE id = ?").bind(id).first();
    if (!project) return json({ error: "Proiectul nu a fost găsit." }, 404);
    const people = await participants(env, id);
    const isParticipant = people.some(person => person.id === auth.user.id);
    if (!isParticipant) return json({ error: "Evaluările acestui proiect sunt vizibile doar participanților." }, 403);
    const ratings = await env.DB.prepare(`
      SELECT r.id, r.reviewer_id, r.reviewee_id, r.rating, r.comment, r.created_at,
             reviewer.display_name AS reviewer_name, reviewee.display_name AS reviewee_name
      FROM project_ratings r
      INNER JOIN users reviewer ON reviewer.id = r.reviewer_id
      INNER JOIN users reviewee ON reviewee.id = r.reviewee_id
      WHERE r.project_id = ?
      ORDER BY r.created_at DESC
    `).bind(id).all();
    return json({
      status: project.status,
      canReview: project.status === "completed" && isParticipant,
      participants: people.filter(person => person.id !== auth.user.id),
      ratings: ratings.results || [],
      myId: auth.user.id
    });
  } catch (error) {
    console.error("COM-Unity project ratings read failed:", error);
    return json({ error: "Evaluările nu au putut fi încărcate." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!hasJsonContentType(request)) return json({ error: "Content-Type trebuie să fie application/json." }, 415);
  if (!validOrigin(request)) return json({ error: "Solicitare nepermisă." }, 403);
  const auth = await requireUser(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  const limit = await checkRateLimit(env, "project_rating", auth.user.id, 10, 3600);
  if (!limit.allowed) return rateLimitResponse(limit);
  const id = projectId(request);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date JSON invalide." }, 400); }
  const revieweeId = typeof body?.revieweeId === "string" ? body.revieweeId : "";
  const rating = Number(body?.rating);
  const comment = typeof body?.comment === "string" ? body.comment.trim() : "";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json({ error: "Alege un scor între 1 și 5 stele." }, 400);
  if (comment.length > 1000) return json({ error: "Comentariul poate avea maximum 1.000 de caractere." }, 400);
  if (!revieweeId || revieweeId === auth.user.id) return json({ error: "Evaluator invalid." }, 400);

  try {
    await ensureRatingsTable(env);
    const project = await env.DB.prepare("SELECT id, title, status FROM projects WHERE id = ?").bind(id).first();
    if (!project) return json({ error: "Proiectul nu a fost găsit." }, 404);
    if (project.status !== "completed") return json({ error: "Evaluările sunt disponibile doar după finalizarea proiectului." }, 409);
    const people = await participants(env, id);
    if (!people.some(person => person.id === auth.user.id) || !people.some(person => person.id === revieweeId)) {
      return json({ error: "Doar participanții proiectului se pot evalua între ei." }, 403);
    }
    const ratingId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO project_ratings (id, project_id, reviewer_id, reviewee_id, rating, comment)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(ratingId, id, auth.user.id, revieweeId, rating, comment).run();

    await env.DB.prepare(`
      INSERT INTO notifications (id, user_id, actor_id, type, title, message, entity_type, entity_id)
      VALUES (?, ?, ?, 'project_rating', 'Ai primit o evaluare', ?, 'project', ?)
    `).bind(
      crypto.randomUUID(), revieweeId, auth.user.id,
      `Ai primit o evaluare pentru proiectul „${project.title}”.`, id
    ).run();
    return json({ ok: true, id: ratingId }, 201);
  } catch (error) {
    if (String(error?.message || "").includes("UNIQUE")) {
      return json({ error: "Ai evaluat deja acest participant pentru proiectul respectiv." }, 409);
    }
    console.error("COM-Unity project rating create failed:", error);
    return json({ error: "Evaluarea nu a putut fi salvată." }, 500);
  }
}
