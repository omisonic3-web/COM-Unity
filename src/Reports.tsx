import { useEffect, useState, type FormEvent } from 'react';
import { Flag, Send, RefreshCw, ShieldCheck, CheckCircle2 } from 'lucide-react';

type User = { id: string; role: string };
type Report = {
  id: string; category: string; reason: string; details: string;
  target_type: string | null; target_id: string | null; reported_user_name: string | null;
  status: string; admin_note: string; created_at: string; reporter_name: string;
};

const categories = [
  { value: 'harassment', label: 'Hărțuire sau comportament abuziv' },
  { value: 'spam', label: 'Spam sau publicitate înșelătoare' },
  { value: 'fraud', label: 'Fraudă sau tentativă de înșelăciune' },
  { value: 'inappropriate', label: 'Conținut nepotrivit' },
  { value: 'fake', label: 'Identitate sau informații false' },
  { value: 'other', label: 'Altă problemă' }
];

const statusLabels: Record<string, string> = {
  pending: 'În așteptare', reviewing: 'În analiză', resolved: 'Rezolvată', dismissed: 'Respinsă'
};

function Reports({ user }: { user: User }) {
  const isModerator = user.role === 'admin' || user.role === 'moderator';
  const [items, setItems] = useState<Report[]>([]);
  const [category, setCategory] = useState('other');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [targetType, setTargetType] = useState('');
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/reports', { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Sesizările nu au putut fi încărcate.');
      setItems(data.reports || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'A apărut o eroare.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/reports', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, reason, details, targetType: targetType || null, targetId: targetId.trim() || null })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Sesizarea nu a putut fi trimisă.');
      setReason(''); setDetails(''); setTargetType(''); setTargetId('');
      setSuccess('Sesizarea a fost trimisă în siguranță. Mulțumim că ajuți la protejarea comunității.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'A apărut o eroare.'); }
    finally { setSaving(false); }
  }

  async function updateStatus(id: string, status: string) {
    setError(''); setSuccess('');
    try {
      const response = await fetch('/api/reports', {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Sesizarea nu a putut fi actualizată.');
      setSuccess('Starea sesizării a fost actualizată.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'A apărut o eroare.'); }
  }

  return <div className="reports-module">
    {error && <div className="requests-alert error" role="alert">{error}</div>}
    {success && <div className="requests-alert success" role="status">{success}</div>}
    {!isModerator && <section className="dashboard-panel">
      <div className="panel-heading"><div><h2><Flag size={18}/> Trimite o sesizare</h2><p>Sesizarea ajunge doar la echipa de moderare. Nu include parole sau date bancare.</p></div></div>
      <form className="request-form" onSubmit={submit}>
        <label>Tipul problemei
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {categories.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label>Descriere scurtă
          <input value={reason} onChange={e => setReason(e.target.value)} minLength={5} maxLength={160} placeholder="Ex.: Mesaj cu limbaj abuziv" required />
        </label>
        <label>Detalii suplimentare (opțional)
          <textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={2000} rows={4} placeholder="Descrie ce s-a întâmplat și unde..." />
        </label>
        <div className="reports-target-row">
          <label>Unde ai întâlnit problema? (opțional)
            <select value={targetType} onChange={e => { setTargetType(e.target.value); setTargetId(''); }}>
              <option value="">Nespecificat</option><option value="user">Profil de utilizator</option><option value="request">Cerere de ajutor</option><option value="offer">Ofertă de ajutor</option><option value="project">Proiect</option><option value="message">Mesaj</option>
            </select>
          </label>
          <label>ID-ul elementului (opțional)
            <input value={targetId} onChange={e => setTargetId(e.target.value)} maxLength={100} placeholder="ID, dacă îl ai" />
          </label>
        </div>
        <div className="request-form-footer"><button className="button button-primary" disabled={saving}><Send size={16}/>{saving ? 'Se trimite...' : 'Trimite sesizarea'}</button></div>
      </form>
    </section>}
    <section className="dashboard-panel reports-list">
      <div className="panel-heading"><div><h2><ShieldCheck size={18}/> {isModerator ? 'Sesizări primite' : 'Sesizările mele'}</h2><p>{isModerator ? 'Analizează sesizările și actualizează starea fiecăreia.' : 'Poți urmări aici stadiul sesizărilor trimise.'}</p></div><button type="button" className="button button-outline" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/> Reîncarcă</button></div>
      {loading ? <p>Se încarcă sesizările...</p> : items.length === 0 ? <p className="admin-muted">Nu există sesizări de afișat.</p> : items.map(item => <article className="report-item" key={item.id}>
        <div className="report-item-heading"><strong>{categories.find(c => c.value === item.category)?.label || item.category}</strong><span className={'report-status status-' + item.status}>{statusLabels[item.status] || item.status}</span></div>
        <p><strong>{item.reason}</strong></p>
        {item.details && <p>{item.details}</p>}
        <small>{isModerator ? 'Raportat de ' + item.reporter_name : 'Trimis la'} · {new Date(item.created_at).toLocaleString('ro-RO')}</small>
        {item.target_type && <small>Element raportat: {item.target_type}{item.target_id ? ' · ' + item.target_id : ''}</small>}
        {isModerator && <div className="report-moderation-actions">
          <button type="button" className="button button-outline" onClick={() => void updateStatus(item.id, 'reviewing')}>În analiză</button>
          <button type="button" className="button button-primary" onClick={() => void updateStatus(item.id, 'resolved')}><CheckCircle2 size={15}/> Rezolvată</button>
          <button type="button" className="button button-outline" onClick={() => void updateStatus(item.id, 'dismissed')}>Respinge</button>
        </div>}
      </article>)}
    </section>
  </div>;
}
export default Reports;
