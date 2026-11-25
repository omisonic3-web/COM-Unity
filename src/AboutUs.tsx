import { useEffect, useState } from 'react';
import { Compass, HeartHandshake, Mail, MapPin, RefreshCw, ShieldCheck, Sparkles, Target } from 'lucide-react';

type AboutContent = {
  title: string; intro: string; mission: string; vision: string; values: string;
  contact_email: string; contact_location: string; updated_at?: string;
};

function AboutUs() {
  const [content, setContent] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/about', { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Prezentarea nu a putut fi încărcată.');
      setContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A apărut o eroare.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  if (loading) return <section className="dashboard-panel about-loading">Se încarcă prezentarea COM-Unity...</section>;
  if (error) return <section className="dashboard-panel about-loading"><p role="alert">{error}</p><button className="button button-outline" onClick={() => void load()}><RefreshCw size={16}/> Reîncearcă</button></section>;
  if (!content) return null;

  return (
    <section className="about-us-section">
      <header className="about-hero dashboard-panel">
        <span className="admin-kicker"><Sparkles size={14}/> COMUNITATE • SOLIDARITATE • IMPLICARE</span>
        <h2>{content.title}</h2>
        <p>{content.intro}</p>
      </header>
      <div className="about-values-grid">
        <article className="dashboard-panel about-info-card"><span className="about-icon"><Target size={21}/></span><h3>Misiunea noastră</h3><p>{content.mission || 'Construim legături și încurajăm sprijinul reciproc.'}</p></article>
        <article className="dashboard-panel about-info-card"><span className="about-icon"><Compass size={21}/></span><h3>Viziunea noastră</h3><p>{content.vision || 'O comunitate unită, activă și solidară.'}</p></article>
      </div>
      <article className="dashboard-panel about-values-card"><span className="about-icon"><HeartHandshake size={21}/></span><div><h3>Valorile noastre</h3><p>{content.values || 'Respect, încredere și cooperare.'}</p></div></article>
      {(content.contact_email || content.contact_location) && <article className="dashboard-panel about-contact-card"><h3>Contact și comunitate</h3>{content.contact_email && <a href={`mailto:${content.contact_email}`}><Mail size={16}/>{content.contact_email}</a>}{content.contact_location && <p><MapPin size={16}/>{content.contact_location}</p>}</article>}
      <div className="about-signoff"><ShieldCheck size={17}/> Împreună putem mai mult.</div>
    </section>
  );
}

export default AboutUs;
