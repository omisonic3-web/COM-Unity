import { useEffect, useState, type FormEvent } from 'react';
import Dashboard from './Dashboard';
import {
  Globe2, HeartHandshake, Users, ShieldCheck, ArrowRight, HandHeart,
  MessageCircle, FolderKanban, X, LoaderCircle
} from 'lucide-react';

type User = {
  id: string;
  email: string;
  displayName: string;
  role: string;
};

type AuthMode = 'login' | 'register';

function App() {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
      .then(async response => response.ok ? response.json() : null)
      .then(data => {
        if (active && data?.authenticated && data.user) setUser(data.user as User);
      })
      .catch(() => {
        // O sesiune indisponibilă nu blochează vizitarea paginii publice.
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => { active = false; };
  }, []);

  function openAuth(mode: AuthMode) {
    setError('');
    setNotice('');
    setAuthMode(mode);
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError('');
    setNotice('');

    const payload = authMode === 'register'
      ? {
          displayName: String(form.get('displayName') || '').trim(),
          email: String(form.get('email') || '').trim(),
          password: String(form.get('password') || ''),
          website: String(form.get('website') || '')
        }
      : {
          email: String(form.get('email') || '').trim(),
          password: String(form.get('password') || '')
        };

    try {
      const response = await fetch(
        authMode === 'register' ? '/api/auth/register' : '/api/auth/login',
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          throw new Error('Adresa de email nu a fost confirmată. Deschide linkul primit prin email înainte de autentificare.');
        }
        const diagnostic = typeof data.diagnostic === 'string' ? ` (Etapă: ${data.diagnostic})` : '';
        const diagnosticReason = typeof data.diagnosticReason === 'string' ? ` — ${data.diagnosticReason}` : '';
        throw new Error((data.error || 'Solicitarea nu a putut fi procesată.') + diagnostic + diagnosticReason);
      }

      if (authMode === 'register') {
        setAuthMode(null);
        setNotice('Contul a fost creat. Verifică inboxul și confirmă adresa de email folosind linkul trimis de COM-Unity.');
      } else {
        setUser(data.user as User);
        setAuthMode(null);
        setNotice('Autentificare reușită. Bine ai revenit!');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A apărut o eroare. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin'
      });
      setUser(null);
      setNotice('Ai ieșit din cont.');
    } catch {
      setError('Nu am putut încheia sesiunea. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      {!user && <>
      <header className="navbar">
        <a className="brand" href="/">
          <span className="brand-icon"><Globe2 /></span>
          <span>COM-<strong>Unity</strong></span>
        </a>

        <nav>
          <a href="#despre">Despre</a>
          <a href="#comunitate">Comunitate</a>
          <a href="#proiecte">Proiecte</a>
        </nav>

        <div className="nav-actions">
          <button className="button button-outline" onClick={() => openAuth('login')} disabled={checkingSession}>
            Autentificare
          </button>
          <button className="button button-primary" onClick={() => openAuth('register')}>
            Înregistrare <ArrowRight size={17} />
          </button>
        </div>
      </header>

      {(notice || error) && (
        <div className={`global-message ${error ? 'message-error' : 'message-success'}`} role="status">
          <span>{error || notice}</span>
          <button aria-label="Închide mesajul" onClick={() => { setError(''); setNotice(''); }}><X size={17} /></button>
        </div>
      )}

      </>}

      {user ? (
        <Dashboard user={user} onLogout={handleLogout} loading={loading} />
      ) : <>
      <section className="hero" id="despre">
        <div className="hero-content">
          <span className="eyebrow">
            <HeartHandshake size={16} />
            O comunitate fără granițe
          </span>

          <h1>
            Împreună putem
            <span> schimba lumea.</span>
          </h1>

          <p>
            COM-Unity conectează oamenii care au nevoie de ajutor
            cu cei care pot oferi sprijin. Construim o lume bazată
            pe solidaritate, colaborare și încredere.
          </p>

          <div className="hero-actions">
            <button className="button button-primary button-large" onClick={() => openAuth('register')}>
              Alătură-te comunității <ArrowRight size={18} />
            </button>
            <a className="button button-outline button-large" href="#comunitate">
              Descoperă platforma
            </a>
          </div>

          <div className="trust-line">
            <ShieldCheck size={17} />
            O platformă construită pentru oameni
          </div>
        </div>

        <div className="hero-visual">
          <div className="glow-orb" />
          <div className="visual-card">
            <div className="visual-icon"><HandHeart size={42} /></div>
            <h3>Ajutorul ne unește</h3>
            <p>Fiecare gest contează. Fiecare persoană poate face diferența.</p>
            <div className="visual-footer">
              <span><Users size={16} /> Comunitate globală</span>
              <span className="online-dot" />
            </div>
          </div>
          <div className="floating-card floating-one">
            <HeartHandshake size={20} />
            <span>Solidaritate</span>
          </div>
          <div className="floating-card floating-two">
            <MessageCircle size={20} />
            <span>Comunicare</span>
          </div>
        </div>
      </section>

      <section className="features" id="comunitate">
        <div className="section-heading">
          <span className="eyebrow">Ce oferă COM-Unity</span>
          <h2>O comunitate. Posibilități nelimitate.</h2>
          <p>Instrumente simple pentru a transforma intențiile în acțiuni.</p>
        </div>

        <div className="feature-grid" id="proiecte">
          <article className="feature-card">
            <HandHeart />
            <h3>Cereri de ajutor</h3>
            <p>Găsește sprijin atunci când ai nevoie.</p>
          </article>
          <article className="feature-card">
            <HeartHandshake />
            <h3>Oferte de ajutor</h3>
            <p>Oferă timp, resurse și experiență celor din jur.</p>
          </article>
          <article className="feature-card">
            <FolderKanban />
            <h3>Proiecte comunitare</h3>
            <p>Transformă ideile bune în proiecte reale.</p>
          </article>
        </div>
      </section>

      <footer>
        <a className="brand" href="/">
          <Globe2 /> COM-<strong>Unity</strong>
        </a>
        <span>© 2026 COM-Unity. Împreună putem mai mult.</span>
      </footer>

      </>}

      {authMode && (
        <div className="modal-backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget && !loading) setAuthMode(null);
        }}>
          <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button className="modal-close" aria-label="Închide" onClick={() => setAuthMode(null)} disabled={loading}>
              <X />
            </button>
            <div className="auth-mark"><Globe2 size={25} /></div>
            <span className="eyebrow">COM-Unity • Comunitate</span>
            <h2 id="auth-title">{authMode === 'register' ? 'Creează un cont' : 'Bine ai revenit'}</h2>
            <p className="auth-subtitle">
              {authMode === 'register'
                ? 'Alătură-te oamenilor care fac bine împreună.'
                : 'Autentifică-te pentru a continua.'}
            </p>

            <form onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <label>
                  Nume afișat
                  <input name="displayName" type="text" minLength={2} maxLength={80} autoComplete="name" placeholder="Cum te numești?" required />
                </label>
              )}
              <label>
                Adresă de email
                <input name="email" type="email" maxLength={254} autoComplete="email" placeholder="nume@exemplu.ro" required />
              </label>
              <label>
                Parolă
                <input name="password" type="password" minLength={authMode === 'register' ? 12 : 1} maxLength={128} autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} placeholder={authMode === 'register' ? 'Minimum 12 caractere' : 'Parola ta'} required />
              </label>
              {authMode === 'register' && (
                <div className="honeypot" aria-hidden="true">
                  <label>Website<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
                </div>
              )}
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button-primary auth-submit" type="submit" disabled={loading}>
                {loading ? <><LoaderCircle className="spin" size={18} /> Se procesează...</> : authMode === 'register' ? 'Creează contul' : 'Autentificare'}
              </button>
            </form>

            <p className="auth-switch">
              {authMode === 'register' ? 'Ai deja un cont?' : 'Nu ai încă un cont?'}
              {' '}
              <button onClick={() => { setError(''); setAuthMode(authMode === 'register' ? 'login' : 'register'); }}>
                {authMode === 'register' ? 'Autentifică-te' : 'Înregistrează-te'}
              </button>
            </p>
            <p className="auth-legal">Prin continuare, folosești COM-Unity în mod responsabil și respecți comunitatea.</p>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
