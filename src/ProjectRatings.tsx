import { useEffect, useState } from "react";
import { Star, Send, Users, MessageSquare } from "lucide-react";

type Participant = { id: string; name: string; role: string };
type Rating = {
  id: string; reviewer_id: string; reviewee_id: string; rating: number;
  comment: string; created_at: string; reviewer_name: string; reviewee_name: string;
};

function ProjectRatings({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [myId, setMyId] = useState("");
  const [selected, setSelected] = useState("");
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/ratings`, {
        credentials: "same-origin", cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Evaluările nu au putut fi încărcate.");
      setParticipants(data.participants || []);
      setRatings(data.ratings || []);
      setCanReview(Boolean(data.canReview));
      setMyId(data.myId || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la încărcarea evaluărilor.");
    } finally { setLoading(false); }
  }

  useEffect(() => { if (open) void load(); }, [open, projectId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(selected); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/ratings`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revieweeId: selected, rating: score, comment })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Evaluarea nu a putut fi salvată.");
      setSuccess("Evaluarea a fost trimisă.");
      setSelected(""); setScore(5); setComment("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la salvare.");
    } finally { setSaving(""); }
  }

  const myRatings = new Set(ratings.filter(item => item.reviewer_id === myId).map(item => item.reviewee_id));
  const received = ratings.filter(item => item.reviewee_id === myId);

  return <div className="project-ratings">
    <button type="button" className="project-ratings-toggle" onClick={() => setOpen(value => !value)}>
      <Star size={16} /> Evaluări și reputație <span>{ratings.length}</span>
      <span className="project-ratings-chevron">{open ? "−" : "+"}</span>
    </button>
    {open && <div className="project-ratings-content">
      {loading ? <p>Se încarcă evaluările...</p> : <>
        {error && <p className="project-rating-message error">{error}</p>}
        {success && <p className="project-rating-message success">{success}</p>}
        {canReview && participants.length > 0 && <form className="project-rating-form" onSubmit={submit}>
          <h3>Evaluează un participant</h3>
          <label>Participant
            <select value={selected} onChange={event => setSelected(event.target.value)} required>
              <option value="">Alege persoana...</option>
              {participants.filter(person => !myRatings.has(person.id)).map(person =>
                <option key={person.id} value={person.id}>{person.name}{person.role === "organizer" ? " · Organizator" : ""}</option>
              )}
            </select>
          </label>
          {selected && <>
            <div className="project-rating-stars" role="group" aria-label="Acordă un scor de la 1 la 5 stele">
              {[1, 2, 3, 4, 5].map(value => <button key={value} type="button" onClick={() => setScore(value)} aria-label={`${value} stele`} aria-pressed={score === value} className={value <= score ? "active" : ""}><Star size={23} fill={value <= score ? "currentColor" : "none"} /></button>)}
              <span>{score}/5</span>
            </div>
            <label>Comentariu (opțional)
              <textarea value={comment} onChange={event => setComment(event.target.value)} maxLength={1000} rows={3} placeholder="Descrie pe scurt experiența colaborării..." />
            </label>
            <button className="button button-primary" type="submit" disabled={Boolean(saving)}><Send size={15} /> {saving ? "Se trimite..." : "Trimite evaluarea"}</button>
          </>}
          {participants.every(person => myRatings.has(person.id)) && <p>Ai evaluat deja toți ceilalți participanți.</p>}
        </form>}
        {canReview && participants.length === 0 && <p>Nu există alți participanți de evaluat.</p>}
        {!canReview && <p className="project-rating-hint">Evaluările pot fi trimise de participanți după finalizarea proiectului.</p>}
        <div className="project-rating-summary">
          <h3><Users size={16}/> Evaluările primite de tine</h3>
          {received.length === 0 ? <p>Nu ai primit încă evaluări pentru acest proiect.</p> : received.map(item => <article key={item.id}>
            <strong>{item.reviewer_name}</strong><span className="project-rating-value">{"★".repeat(item.rating)}{"☆".repeat(5-item.rating)}</span>
            {item.comment && <p>{item.comment}</p>}
          </article>)}
        </div>
        <div className="project-rating-summary">
          <h3><MessageSquare size={16}/> Evaluări în cadrul proiectului</h3>
          {ratings.length === 0 ? <p>Nu există încă evaluări.</p> : ratings.map(item => <article key={item.id}>
            <strong>{item.reviewer_name} <span>→</span> {item.reviewee_name}</strong>
            <span className="project-rating-value">{"★".repeat(item.rating)}{"☆".repeat(5-item.rating)}</span>
            {item.comment && <p>{item.comment}</p>}
          </article>)}
        </div>
      </>}
    </div>}
  </div>;
}

export default ProjectRatings;
