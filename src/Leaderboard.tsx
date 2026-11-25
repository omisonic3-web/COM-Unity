import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, RefreshCw, Star, Trophy, Users } from "lucide-react";

type Member = {
  id: string;
  displayName: string;
  avatarId: string;
  completedProjects: number;
  ratingCount: number;
  ratingAverage: number;
};

type Props = { userId: string };

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
}

function Leaderboard({ userId }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState(userId);
  const [mode, setMode] = useState<"active" | "appreciated">("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/leaderboard", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Clasamentul nu a putut fi încărcat.");
      setMembers(data.members || []);
      setCurrentUserId(data.currentUserId || userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "A apărut o eroare la încărcare.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const ranked = useMemo(() => {
    const eligible = mode === "appreciated" ? members.filter(member => member.ratingCount > 0) : members.filter(member => member.completedProjects > 0);
    return [...eligible].sort((a, b) => mode === "active"
      ? b.completedProjects - a.completedProjects || b.ratingAverage - a.ratingAverage || b.ratingCount - a.ratingCount || a.displayName.localeCompare(b.displayName, "ro")
      : b.ratingAverage - a.ratingAverage || b.ratingCount - a.ratingCount || b.completedProjects - a.completedProjects || a.displayName.localeCompare(b.displayName, "ro")
    ).slice(0, 10);
  }, [members, mode]);

  return <section className="leaderboard-module">
    <div className="leaderboard-intro dashboard-panel">
      <div className="leaderboard-intro-icon"><Trophy size={25} /></div>
      <div>
        <h2>O comunitate construită prin implicare</h2>
        <p>Descoperă membrii care contribuie la proiecte și pe cei apreciați de comunitate. Clasamentul se actualizează automat pe baza proiectelor finalizate și a evaluărilor primite.</p>
      </div>
      <button type="button" className="requests-refresh" onClick={() => void load()} disabled={loading} aria-label="Reîncarcă clasamentul"><RefreshCw size={17} /></button>
    </div>

    <div className="leaderboard-tabs" role="tablist" aria-label="Tipul clasamentului">
      <button type="button" role="tab" aria-selected={mode === "active"} className={mode === "active" ? "selected" : ""} onClick={() => setMode("active")}><Users size={16} /> Cei mai activi</button>
      <button type="button" role="tab" aria-selected={mode === "appreciated"} className={mode === "appreciated" ? "selected" : ""} onClick={() => setMode("appreciated")}><Star size={16} /> Cei mai apreciați</button>
    </div>

    {error && <div className="requests-alert error" role="alert">{error}</div>}
    {loading ? <div className="dashboard-panel requests-empty">Se încarcă clasamentul...</div> :
      ranked.length === 0 ? <div className="dashboard-panel requests-empty"><div className="empty-icon"><Award size={24} /></div><h2>Clasamentul se construiește</h2><p>{mode === "active" ? "Finalizarea proiectelor va aduce membrii în acest clasament." : "Membrii vor apărea aici după ce primesc primele evaluări."}</p></div> :
      <div className="leaderboard-list">
        {ranked.map((member, index) => <article className={`leaderboard-card dashboard-panel ${member.id === currentUserId ? "is-current-user" : ""}`} key={member.id}>
          <div className={`leaderboard-position ${index < 3 ? `top-${index + 1}` : ""}`}>{index + 1}</div>
          <div className={`leaderboard-avatar avatar-${member.avatarId}`} aria-hidden="true">{initials(member.displayName)}</div>
          <div className="leaderboard-member">
            <strong>{member.displayName}{member.id === currentUserId && <span className="leaderboard-you">Tu</span>}</strong>
            <small>{member.completedProjects} {member.completedProjects === 1 ? "proiect finalizat" : "proiecte finalizate"}</small>
          </div>
          <div className="leaderboard-score">
            {mode === "active" ? <><strong>{member.completedProjects}</strong><small>proiecte</small></> :
              <><strong><Star size={14} fill="currentColor" /> {member.ratingAverage.toFixed(1)}</strong><small>{member.ratingCount} {member.ratingCount === 1 ? "evaluare" : "evaluări"}</small></>}
          </div>
        </article>)}
      </div>
    }
    <p className="leaderboard-note">Clasamentul afișează numele public și statisticile comunitare. Nu sunt afișate adresele de e-mail sau alte date private.</p>
  </section>;
}

export default Leaderboard;
