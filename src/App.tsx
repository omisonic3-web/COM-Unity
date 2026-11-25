
import {
  Globe2,
  HeartHandshake,
  Users,
  ShieldCheck,
  ArrowRight,
  HandHeart,
  MessageCircle,
  FolderKanban
} from 'lucide-react';

function App() {
  return (
    <main className="app-shell">
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
          <button className="button button-outline">Autentificare</button>
          <button className="button button-primary">
            Înregistrare <ArrowRight size={17} />
          </button>
        </div>
      </header>

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
            <button className="button button-primary button-large">
              Alătură-te comunității <ArrowRight size={18} />
            </button>
            <button className="button button-outline button-large">
              Descoperă platforma
            </button>
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

        <div className="feature-grid">
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
    </main>
  );
}

export default App;
