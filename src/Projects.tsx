import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, RefreshCw, CalendarDays, Trash2, Users, X, FolderKanban, UserPlus, UserMinus, CheckCircle2, Circle } from "lucide-react";

type Project = {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  status: "active" | "completed" | "closed";
  created_at: string;
  author_name: string;
  member_count: number;
  is_member: boolean;
};

function Projects({ userId }: { userId: string }) {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState<"all" | "mine" | "joined">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/projects", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nu am putut încărca proiectele.");
      setItems(data.projects || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la încărcare.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      title: String(form.get("title") || ""),
      description: String(form.get("description") || "")
    };
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Proiectul nu a putut fi publicat.");
      formElement.reset();
      setShowForm(false);
      setSuccess("Proiectul a fost publicat.");
      setFilter("all");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la publicare.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(project: Project) {
    const status = project.status === "active" ? "completed" : "active";
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Starea proiectului nu a putut fi schimbată.");
      setSuccess(status === "completed" ? "Proiect marcat ca finalizat." : "Proiect redeschis.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la actualizare.");
    }
  }

  async function toggleMembership(project: Project) {
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}/join`, {
        method: project.is_member ? "DELETE" : "POST",
        credentials: "same-origin"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Acțiunea nu a putut fi efectuată.");
      setSuccess(project.is_member ? "Te-ai retras din proiect." : "Te-ai înscris la proiect. Mulțumim pentru implicare!");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la înscriere.");
    }
  }

  async function deleteProject(project: Project) {
    if (!window.confirm("Sigur vrei să ștergi definitiv acest proiect? Înscrierile asociate vor fi eliminate.")) return;
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
        method: "DELETE",
        credentials: "same-origin"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Proiectul nu a putut fi șters.");
      setSuccess("Proiectul a fost șters.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la ștergere.");
    }
  }

  const visible = items.filter(project =>
    filter === "mine" ? project.user_id === userId :
    filter === "joined" ? project.is_member : true
  );

  return <section className="help-requests-module">
    <div className="requests-toolbar">
      <div className="requests-filters">
        <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>Toate</button>
        <button className={filter === "mine" ? "selected" : ""} onClick={() => setFilter("mine")}>Proiectele mele</button>
        <button className={filter === "joined" ? "selected" : ""} onClick={() => setFilter("joined")}>Particip</button>
      </div>
      <div className="requests-toolbar-actions">
        <button className="requests-refresh" onClick={() => void load()} disabled={loading} aria-label="Reîncarcă"><RefreshCw size={17} /></button>
        <button className="button button-primary" onClick={() => { setShowForm(!showForm); setError(""); }}><Plus size={17} /> Propune un proiect</button>
      </div>
    </div>

    {error && <div className="requests-alert error" role="alert">{error}</div>}
    {success && <div className="requests-alert success">{success}<button onClick={() => setSuccess("")} aria-label="Închide"><X size={15} /></button></div>}

    {showForm && <form className="request-form dashboard-panel" onSubmit={createProject}>
      <div className="request-form-heading"><div><h2>Propune un proiect comunitar</h2><p>Prezintă ideea și invită comunitatea să se implice.</p></div><button type="button" onClick={() => setShowForm(false)} aria-label="Închide"><X /></button></div>
      <label>Titlul proiectului<input name="title" minLength={5} maxLength={120} placeholder="Ex.: Amenajarea unui spațiu verde" required /></label>
      <label>Descriere<textarea name="description" minLength={20} maxLength={5000} rows={5} placeholder="Descrie scopul, activitățile și sprijinul de care este nevoie..." required /></label>
      <div className="request-form-footer"><span>Nu include date personale sensibile.</span><button className="button button-primary" disabled={saving}>{saving ? "Se publică..." : "Publică proiectul"}</button></div>
    </form>}

    {loading ? <div className="requests-empty">Se încarcă proiectele...</div> : visible.length === 0 ?
      <div className="dashboard-panel requests-empty"><div className="empty-icon"><FolderKanban size={24} /></div><h2>Nu există proiecte de afișat</h2><p>{filter === "mine" ? "Nu ai publicat încă niciun proiect." : filter === "joined" ? "Nu participi încă la niciun proiect." : "Fii primul care propune o inițiativă comunitară."}</p></div> :
      <div className="requests-list">{visible.map(project => <article className="dashboard-panel request-card" key={project.id}>
        <div className="request-card-top"><span className={project.status === "active" ? "request-status open" : "request-status closed"}>{project.status === "active" ? "În desfășurare" : project.status === "completed" ? "Finalizat" : "Închis"}</span><span className="request-category">Proiect comunitar</span></div>
        <h2>{project.title}</h2>
        <p className="request-description">{project.description}</p>
        <div className="request-meta"><span>Organizat de {project.author_name}</span><span><Users size={14} />{project.member_count} participanți</span><span><CalendarDays size={14} />{new Date(project.created_at).toLocaleDateString("ro-RO")}</span></div>
        <div className="request-card-actions">
          {project.user_id === userId ? <>
            <button onClick={() => void changeStatus(project)}>{project.status === "active" ? <><CheckCircle2 size={15} /> Marchează finalizat</> : <><Circle size={15} /> Redeschide proiectul</>}</button>
            <button className="danger" onClick={() => void deleteProject(project)}><Trash2 size={15} /> Șterge</button>
          </> : project.status === "active" ? (
            <button onClick={() => void toggleMembership(project)}>{project.is_member ? <><UserMinus size={15} /> Retrage înscrierea</> : <><UserPlus size={15} /> Participă la proiect</>}</button>
          ) : <span>Înscrierile sunt închise.</span>}
        </div>
      </article>)}</div>
    }
  </section>;
}

export default Projects;