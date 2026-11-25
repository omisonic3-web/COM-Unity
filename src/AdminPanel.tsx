import { useEffect, useState } from 'react';
import { Users, HandHeart, HeartHandshake, FolderKanban, RefreshCw, ShieldCheck } from 'lucide-react';

type Member = { id: string; display_name: string; email: string; role: string; verified: number };
type Stats = { users: number; requests: number; offers: number; projects: number };

function AdminPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin', { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Datele nu au putut fi încărcate.');
      setStats(data.stats);
      setMembers(data.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A apărut o eroare.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const cards = [
    { label: 'Membri înregistrați', value: stats?.users, icon: Users },
    { label: 'Cereri de ajutor', value: stats?.requests, icon: HandHeart },
    { label: 'Oferte de ajutor', value: stats?.offers, icon: HeartHandshake },
    { label: 'Proiecte comunitare', value: stats?.projects, icon: FolderKanban }
  ];

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div><span className="admin-kicker"><ShieldCheck size={14} /> ACCES ADMINISTRATOR</span><h2>Panou central</h2><p>Monitorizează activitatea și gestionează comunitatea COM-Unity.</p></div>
        <button className="button button-outline" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Reîmprospătează</button>
      </div>

      {error && <div className="requests-alert error" role="alert">{error}</div>}

      <div className="admin-stat-grid">
        {cards.map(card => { const Icon = card.icon; return <article className="admin-stat-card" key={card.label}><span><Icon size={19} /></span><strong>{loading ? '—' : card.value ?? 0}</strong><small>{card.label}</small></article>; })}
      </div>

      <section className="dashboard-panel admin-members">
        <div className="panel-heading"><div><h2>Membrii platformei</h2><p>Conturi înregistrate și roluri atribuite.</p></div><Users size={19} /></div>
        {loading ? <p className="admin-muted">Se încarcă membrii...</p> : members.length === 0 ? <p className="admin-muted">Nu există membri de afișat.</p> : (
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Nume</th><th>Email</th><th>Rol</th><th>Cont</th></tr></thead><tbody>
            {members.map(member => <tr key={member.id}><td>{member.display_name}</td><td>{member.email}</td><td><span className={`admin-role ${member.role === 'admin' ? 'is-admin' : ''}`}>{member.role === 'admin' ? 'Administrator' : member.role === 'moderator' ? 'Moderator' : 'Membru'}</span></td><td>{member.verified ? 'Confirmat' : 'Neconfirmat'}</td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <div className="admin-coming-grid">
        <article className="dashboard-panel"><span className="admin-feature-icon"><HandHeart size={20} /></span><h3>Teme și zone geografice</h3><p>Configurarea categoriilor și a zonelor în care comunitatea este activă.</p><span className="admin-feature-status">Modul următor</span></article>
        <article className="dashboard-panel"><span className="admin-feature-icon"><ShieldCheck size={20} /></span><h3>Moderare</h3><p>Instrumente pentru verificarea și gestionarea conținutului publicat.</p><span className="admin-feature-status">Modul următor</span></article>
        <article className="dashboard-panel"><span className="admin-feature-icon"><FolderKanban size={20} /></span><h3>Linkuri utile</h3><p>Administrarea resurselor și legăturilor afișate comunității.</p><span className="admin-feature-status">Modul următor</span></article>
        <article className="dashboard-panel"><span className="admin-feature-icon"><HeartHandshake size={20} /></span><h3>Despre noi</h3><p>Editarea prezentării publice și a informațiilor despre COM-Unity.</p><span className="admin-feature-status">Modul următor</span></article>
      </div>
    </section>
  );
}

export default AdminPanel;
