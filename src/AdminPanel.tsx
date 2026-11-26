import { useEffect, useState, type FormEvent } from 'react';
import { Users, HandHeart, HeartHandshake, FolderKanban, RefreshCw, ShieldCheck, ScrollText, Plus, MapPin, Tags, Power, Link2, Pencil, Trash2, Info, Save } from 'lucide-react';

type Member = { id: string; display_name: string; email: string; role: string; verified: number };
type Stats = { users: number; requests: number; offers: number; projects: number };
type Category = { id: string; name: string; kind: 'both' | 'request' | 'offer'; active: number };
type Zone = { id: string; name: string; active: number };
type UsefulLink = { id: string; title: string; url: string; description: string; active: number };
type AboutContent = { title: string; intro: string; mission: string; vision: string; values_text: string; contact_email: string; contact_location: string };\ntype AuditLog = { id: string; action: string; adminId: string | null; details: string; createdAt: string };

function AdminPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [members, setMembers] = useState<Member[]>([]);\n  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [links, setLinks] = useState<UsefulLink[]>([]);
  const [about, setAbout] = useState<AboutContent>({ title: '', intro: '', mission: '', vision: '', values_text: '', contact_email: '', contact_location: '' });
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDescription, setLinkDescription] = useState('');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
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
      const [overviewResponse, catalogResponse, linksResponse, aboutResponse, auditResponse] = await Promise.all([
        fetch('/api/admin', { credentials: 'same-origin', cache: 'no-store' }),
        fetch('/api/admin/catalog', { credentials: 'same-origin', cache: 'no-store' }),
        fetch('/api/admin/links', { credentials: 'same-origin', cache: 'no-store' }),
        fetch('/api/admin/about', { credentials: 'same-origin', cache: 'no-store' }),\n        fetch('/api/admin/audit?limit=50', { credentials: 'same-origin', cache: 'no-store' })
      ]);
      const overview = await overviewResponse.json().catch(() => ({}));
      const catalog = await catalogResponse.json().catch(() => ({}));
      const linkData = await linksResponse.json().catch(() => ({}));
      const aboutData = await aboutResponse.json().catch(() => ({}));\n      const auditData = await auditResponse.json().catch(() => ({}));
      if (!overviewResponse.ok) throw new Error(overview.error || 'Datele nu au putut fi încărcate.');
      if (!catalogResponse.ok) throw new Error(catalog.error || 'Temele și zonele nu au putut fi încărcate.');
      if (!linksResponse.ok) throw new Error(linkData.error || 'Linkurile utile nu au putut fi încărcate.');
      if (!aboutResponse.ok) throw new Error(aboutData.error || 'Prezentarea Despre noi nu a putut fi încărcată.');\n      if (!auditResponse.ok) throw new Error(auditData.error || 'Jurnalul de activitate nu a putut fi încărcat.');
      setStats(overview.stats);
      setMembers(overview.members || []);\n      setAuditLogs(auditData.logs || []);
      setCategories(catalog.categories || []);
      setZones(catalog.zones || []);
      setLinks(linkData.links || []);
      setAbout(aboutData.content || { title: '', intro: '', mission: '', vision: '', values_text: '', contact_email: '', contact_location: '' });
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

  async function saveLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin/links', {
        method: editingLinkId ? 'PATCH' : 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingLinkId, title: linkTitle, url: linkUrl, description: linkDescription })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Linkul nu a putut fi salvat.');
      setLinkTitle(''); setLinkUrl(''); setLinkDescription(''); setEditingLinkId(null);
      setSuccess(editingLinkId ? 'Linkul a fost actualizat.' : 'Linkul a fost adăugat.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'A apărut o eroare.'); }
    finally { setSaving(false); }
  }

  async function toggleLink(link: UsefulLink) {
    setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin/links', {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: link.id, active: !link.active })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Starea linkului nu a putut fi modificată.');
      setSuccess('Starea linkului a fost actualizată.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'A apărut o eroare.'); }
  }

  async function deleteLink(id: string) {
    if (!window.confirm('Sigur vrei să ștergi acest link?')) return;
    setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin/links', {
        method: 'DELETE', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Linkul nu a putut fi șters.');
      setSuccess('Linkul a fost șters.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'A apărut o eroare.'); }
  }


  async function saveAbout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin/about', {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(about)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Prezentarea nu a putut fi salvată.');
      setSuccess('Prezentarea Despre noi a fost salvată.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'A apărut o eroare.'); }
    finally { setSaving(false); }
  }

  function updateAbout(field: keyof AboutContent, value: string) {
    setAbout(current => ({ ...current, [field]: value }));
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

      <section className="dashboard-panel admin-catalog">
        <div className="panel-heading"><div><h2><Link2 size={18} /> Linkuri utile</h2><p>Resurse și pagini recomandate pentru membrii comunității.</p></div></div>
        <form className="admin-links-form" onSubmit={event => void saveLink(event)}>
          <input value={linkTitle} onChange={event => setLinkTitle(event.target.value)} minLength={2} maxLength={100} placeholder="Titlul linkului" required />
          <input type="url" value={linkUrl} onChange={event => setLinkUrl(event.target.value)} placeholder="https://exemplu.ro" required />
          <input value={linkDescription} onChange={event => setLinkDescription(event.target.value)} maxLength={300} placeholder="Descriere scurtă (opțional)" />
          <div className="admin-links-form-actions">
            {editingLinkId && <button type="button" className="button button-outline" onClick={() => { setEditingLinkId(null); setLinkTitle(''); setLinkUrl(''); setLinkDescription(''); }}>Anulează editarea</button>}
            <button className="button button-primary" disabled={saving}><Plus size={16} /> {editingLinkId ? 'Salvează modificările' : 'Adaugă link'}</button>
          </div>
        </form>
        <div className="admin-catalog-list">
          {links.map(link => <div className={link.active ? 'admin-catalog-item admin-link-item' : 'admin-catalog-item admin-link-item is-inactive'} key={link.id}>
            <div><strong>{link.title}</strong><small>{link.url}</small>{link.description && <small>{link.description}</small>}<small>{link.active ? 'Vizibil membrilor' : 'Dezactivat'}</small></div>
            <div className="admin-link-actions">
              <button type="button" className="admin-catalog-toggle" onClick={() => { setEditingLinkId(link.id); setLinkTitle(link.title); setLinkUrl(link.url); setLinkDescription(link.description || ''); }} title="Editează"><Pencil size={15}/><span>Editează</span></button>
              <button type="button" className="admin-catalog-toggle" onClick={() => void toggleLink(link)} title={link.active ? 'Dezactivează' : 'Activează'}><Power size={15}/><span>{link.active ? 'Dezactivează' : 'Activează'}</span></button>
              <button type="button" className="admin-catalog-toggle admin-link-delete" onClick={() => void deleteLink(link.id)} title="Șterge"><Trash2 size={15}/><span>Șterge</span></button>
            </div>
          </div>)}
          {!loading && links.length === 0 && <p className="admin-muted">Nu ai adăugat încă linkuri utile.</p>}
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

      <section className="dashboard-panel admin-catalog">\n        <div className="panel-heading"><div><h2><ScrollText size={18} /> Jurnal de activitate</h2><p>Ultimele 50 de evenimente administrative înregistrate.</p></div></div>\n        {loading ? <p className="admin-muted">Se încarcă jurnalul...</p> : auditLogs.length === 0 ? <p className="admin-muted">Nu există încă evenimente în jurnal.</p> : (\n          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Data</th><th>Acțiune</th><th>ID administrator</th><th>Detalii</th></tr></thead><tbody>\n            {auditLogs.map(log => <tr key={log.id}><td>{log.createdAt ? new Date(log.createdAt).toLocaleString('ro-RO') : '—'}</td><td>{log.action || '—'}</td><td>{log.adminId || '—'}</td><td>{log.details || '—'}</td></tr>)}\n          </tbody></table></div>\n        )}\n      </section>\n\n      <div className="admin-coming-grid">
        <article className="dashboard-panel"><span className="admin-feature-icon"><ShieldCheck size={20} /></span><h3>Moderare</h3><p>Instrumente pentru verificarea și gestionarea conținutului publicat.</p><span className="admin-feature-status">Modul următor</span></article>
        
      </div>
      <section className="dashboard-panel admin-catalog admin-about-editor">
        <div className="panel-heading"><div><h2><Info size={18} /> Despre noi</h2><p>Editează prezentarea care va fi vizibilă tuturor membrilor platformei.</p></div></div>
        <form className="admin-about-form" onSubmit={event => void saveAbout(event)}>
          <label>Titlu<input value={about.title} onChange={event => updateAbout('title', event.target.value)} minLength={2} maxLength={100} required /></label>
          <label>Prezentare generală<textarea value={about.intro} onChange={event => updateAbout('intro', event.target.value)} minLength={10} maxLength={1200} rows={4} required /></label>
          <label>Misiunea noastră<textarea value={about.mission} onChange={event => updateAbout('mission', event.target.value)} maxLength={1200} rows={3} /></label>
          <label>Viziunea noastră<textarea value={about.vision} onChange={event => updateAbout('vision', event.target.value)} maxLength={1200} rows={3} /></label>
          <label>Valorile noastre<textarea value={about.values_text} onChange={event => updateAbout('values_text', event.target.value)} maxLength={1200} rows={2} /></label>
          <div className="admin-about-row">
            <label>Email de contact<input type="email" value={about.contact_email} onChange={event => updateAbout('contact_email', event.target.value)} maxLength={160} placeholder="contact@com-unity.ro" /></label>
            <label>Localitate / adresă<input value={about.contact_location} onChange={event => updateAbout('contact_location', event.target.value)} maxLength={160} placeholder="Localitate, județ" /></label>
          </div>
          <div className="admin-links-form-actions"><button type="submit" className="button button-primary" disabled={saving}><Save size={16}/>{saving ? 'Se salvează...' : 'Salvează prezentarea'}</button></div>
        </form>
      </section>
    </section>
  );
}

export default AdminPanel;
