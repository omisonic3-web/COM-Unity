import { useEffect, useState, type FormEvent } from 'react';
import { Users, HandHeart, HeartHandshake, FolderKanban, RefreshCw, ShieldCheck, Plus, MapPin, Tags, Power } from 'lucide-react';

type Member = { id: string; display_name: string; email: string; role: string; verified: number };
type Stats = { users: number; requests: number; offers: number; projects: number };
type Category = { id: string; name: string; kind: 'both' | 'request' | 'offer'; active: number };
type Zone = { id: string; name: string; active: number };

function AdminPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryKind, setCategoryKind] = useState<'both' | 'request' | 'offer'>('both');
  const [zoneName, setZoneName] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const [overviewResponse, catalogResponse] = await Promise.all([
        fetch('/api/admin', { credentials: 'same-origin', cache: 'no-store' }),
        fetch('/api/admin/catalog', { credentials: 'same-origin', cache: 'no-store' })
      ]);
      const overview = await overviewResponse.json().catch(() => ({}));
      const catalog = await catalogResponse.json().catch(() => ({}));
      if (!overviewResponse.ok) throw new Error(overview.error || 'Datele nu au putut fi încărcate.');
      if (!catalogResponse.ok) throw new Error(catalog.error || 'Temele și zonele nu au putut fi încărcate.');
      setStats(overview.stats);
      setMembers(overview.members || []);
      setCategories(catalog.categories || []);
      setZones(catalog.zones || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A apărut o eroare.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function addItem(event: FormEvent<HTMLFormElement>, type: 'category' | 'zone') {
    event.preventDefault();
    const name = type === 'category' ? categoryName.trim() : zoneName.trim();
    if (!name) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin/catalog', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name, kind: categoryKind })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Elementul nu a putut fi adăugat.');
      if (type === 'category') setCategoryName(''); else setZoneName('');
      setSuccess(type === 'category' ? 'Tema a fost adăugată.' : 'Zona geografică a fost adăugată.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'A apărut o eroare.'); }
    finally { setSaving(false); }
  }

  async function toggleItem(type: 'category' | 'zone', id: string) {
    setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin/catalog', {
        method: 'DELETE', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Starea nu a putut fi modificată.');
      setSuccess('Modificarea a fost salvată.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'A apărut o eroare.'); }
  }

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
      {success && <div className="requests-alert success" role="status">{success}</div>}
      <div className="admin-stat-grid">
        {cards.map(card => { const Icon = card.icon; return <article className="admin-stat-card" key={card.label}><span><Icon size={19} /></span><strong>{loading ? '—' : card.value ?? 0}</strong><small>{card.label}</small></article>; })}
      </div>

      <section className="dashboard-panel admin-catalog">
        <div className="panel-heading"><div><h2><Tags size={18} /> Teme / categorii</h2><p>Gestionează categoriile folosite la publicarea cererilor și ofertelor.</p></div></div>
        <form className="admin-catalog-form" onSubmit={event => void addItem(event, 'category')}>
          <input value={categoryName} onChange={event => setCategoryName(event.target.value)} minLength={2} maxLength={80} placeholder="Ex.: Sprijin pentru vârstnici" required />
          <select value={categoryKind} onChange={event => setCategoryKind(event.target.value as 'both' | 'request' | 'offer')} aria-label="Tipul categoriei">
            <option value="both">Cereri și oferte</option><option value="request">Doar cereri</option><option value="offer">Doar oferte</option>
          </select>
          <button className="button button-primary" disabled={saving}><Plus size={16} /> Adaugă tema</button>
        </form>
        <div className="admin-catalog-list">
          {categories.map(item => <div className={item.active ? 'admin-catalog-item' : 'admin-catalog-item is-inactive'} key={item.id}>
            <div><strong>{item.name}</strong><small>{item.kind === 'both' ? 'Cereri și oferte' : item.kind === 'request' ? 'Doar cereri' : 'Doar oferte'} · {item.active ? 'Activă' : 'Inactivă'}</small></div>
            <button type="button" className="admin-catalog-toggle" onClick={() => void toggleItem('category', item.id)} title={item.active ? 'Dezactivează' : 'Reactivează'}><Power size={15}/><span>{item.active ? 'Dezactivează' : 'Reactivează'}</span></button>
          </div>)}
          {!loading && categories.length === 0 && <p className="admin-muted">Nu există teme configurate.</p>}
        </div>
      </section>

      <section className="dashboard-panel admin-catalog">
        <div className="panel-heading"><div><h2><MapPin size={18} /> Zone geografice</h2><p>Adaugă localități, orașe sau zone în care comunitatea este activă.</p></div></div>
        <form className="admin-catalog-form zone-form" onSubmit={event => void addItem(event, 'zone')}>
          <input value={zoneName} onChange={event => setZoneName(event.target.value)} minLength={2} maxLength={80} placeholder="Ex.: Târgu Jiu, Gorj" required />
          <button className="button button-primary" disabled={saving}><Plus size={16} /> Adaugă zona</button>
        </form>
        <div className="admin-catalog-list">
          {zones.map(item => <div className={item.active ? 'admin-catalog-item' : 'admin-catalog-item is-inactive'} key={item.id}>
            <div><strong>{item.name}</strong><small>{item.active ? 'Activă' : 'Inactivă'}</small></div>
            <button type="button" className="admin-catalog-toggle" onClick={() => void toggleItem('zone', item.id)} title={item.active ? 'Dezactivează' : 'Reactivează'}><Power size={15}/><span>{item.active ? 'Dezactivează' : 'Reactivează'}</span></button>
          </div>)}
          {!loading && zones.length === 0 && <p className="admin-muted">Nu ai adăugat încă zone geografice.</p>}
        </div>
      </section>

      <section className="dashboard-panel admin-members">
        <div className="panel-heading"><div><h2>Membrii platformei</h2><p>Conturi înregistrate și roluri atribuite.</p></div><Users size={19} /></div>
        {loading ? <p className="admin-muted">Se încarcă membrii...</p> : members.length === 0 ? <p className="admin-muted">Nu există membri de afișat.</p> : (
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Nume</th><th>Email</th><th>Rol</th><th>Cont</th></tr></thead><tbody>
            {members.map(member => <tr key={member.id}><td>{member.display_name}</td><td>{member.email}</td><td><span className={`admin-role ${member.role === 'admin' ? 'is-admin' : ''}`}>{member.role === 'admin' ? 'Administrator' : member.role === 'moderator' ? 'Moderator' : 'Membru'}</span></td><td>{member.verified ? 'Confirmat' : 'Neconfirmat'}</td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <div className="admin-coming-grid">
        <article className="dashboard-panel"><span className="admin-feature-icon"><ShieldCheck size={20} /></span><h3>Moderare</h3><p>Instrumente pentru verificarea și gestionarea conținutului publicat.</p><span className="admin-feature-status">Modul următor</span></article>
        <article className="dashboard-panel"><span className="admin-feature-icon"><FolderKanban size={20} /></span><h3>Linkuri utile</h3><p>Administrarea resurselor și legăturilor afișate comunității.</p><span className="admin-feature-status">Modul următor</span></article>
        <article className="dashboard-panel"><span className="admin-feature-icon"><HeartHandshake size={20} /></span><h3>Despre noi</h3><p>Editarea prezentării publice și a informațiilor despre COM-Unity.</p><span className="admin-feature-status">Modul următor</span></article>
      </div>
    </section>
  );
}

export default AdminPanel;
