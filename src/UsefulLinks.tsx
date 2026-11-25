import { useEffect, useState } from 'react';
import { ExternalLink, Link2, RefreshCw } from 'lucide-react';

type UsefulLink = { id: string; title: string; url: string; description: string };

function UsefulLinks() {
  const [links, setLinks] = useState<UsefulLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/links', { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Linkurile utile nu au putut fi încărcate.');
      setLinks(data.links || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A apărut o eroare.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  return (
    <section className="useful-links-section">
      <div className="useful-links-heading">
        <div><span className="admin-kicker"><Link2 size={14} /> RESURSE PENTRU COMUNITATE</span><h2>Linkuri utile</h2><p>Pagini și resurse recomandate de echipa COM-Unity.</p></div>
        <button type="button" className="button button-outline" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Reîmprospătează</button>
      </div>
      {error && <div className="requests-alert error" role="alert">{error}</div>}
      {loading ? <div className="dashboard-panel useful-links-empty">Se încarcă resursele...</div> :
        links.length === 0 ? <div className="dashboard-panel useful-links-empty"><Link2 size={25}/><strong>Nu există linkuri publicate momentan.</strong><p>Revino mai târziu pentru resurse noi.</p></div> :
        <div className="useful-links-grid">{links.map(link => (
          <article className="dashboard-panel useful-link-card" key={link.id}>
            <span className="useful-link-icon"><Link2 size={19}/></span>
            <h3>{link.title}</h3>
            {link.description && <p>{link.description}</p>}
            <a href={link.url} target="_blank" rel="noopener noreferrer">Deschide resursa <ExternalLink size={15}/></a>
          </article>
        ))}</div>}
    </section>
  );
}

export default UsefulLinks;
