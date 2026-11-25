import { useState } from 'react';
import HelpRequests from './HelpRequests';
import HelpOffers from './HelpOffers';
import Projects from './Projects';
import {
  Globe2, LayoutDashboard, HandHeart, HeartHandshake, FolderKanban,
  MessageCircle, UserRound, LogOut, ArrowUpRight, Compass,
  ShieldCheck, Clock3, ChevronRight
} from 'lucide-react';

type DashboardUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
};

type Props = {
  user: DashboardUser;
  onLogout: () => void;
  loading: boolean;
};

type Section = 'overview' | 'requests' | 'offers' | 'projects' | 'messages' | 'profile';

const navigation: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Prezentare generală', icon: LayoutDashboard },
  { id: 'requests', label: 'Cereri de ajutor', icon: HandHeart },
  { id: 'offers', label: 'Oferte de ajutor', icon: HeartHandshake },
  { id: 'projects', label: 'Proiecte', icon: FolderKanban },
  { id: 'messages', label: 'Mesaje', icon: MessageCircle },
  { id: 'profile', label: 'Profilul meu', icon: UserRound }
];

const sectionCopy: Record<Section, { title: string; description: string }> = {
  overview: { title: 'Prezentare generală', description: 'Centrul activității tale în comunitatea COM-Unity.' },
  requests: { title: 'Cereri de ajutor', description: 'Descoperă unde este nevoie de sprijin sau gestionează cererile tale.' },
  offers: { title: 'Oferte de ajutor', description: 'Împărtășește timpul, experiența și resursele tale.' },
  projects: { title: 'Proiecte comunitare', description: 'Idei care aduc oamenii împreună și produc schimbări reale.' },
  messages: { title: 'Mesaje', description: 'Comunicarea cu membrii comunității.' },
  profile: { title: 'Profilul meu', description: 'Informațiile contului tău COM-Unity.' }
};

function Dashboard({ user, onLogout, loading }: Props) {
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const activeCopy = sectionCopy[activeSection];

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <a className="brand dashboard-brand" href="/" aria-label="COM-Unity">
          <span className="brand-icon"><Globe2 /></span>
          <span>COM-<strong>Unity</strong></span>
        </a>
        <div className="sidebar-label">SPAȚIUL MEU</div>
        <nav className="dashboard-nav" aria-label="Navigare dashboard">
          {navigation.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`dashboard-nav-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => setActiveSection(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {activeSection === item.id && <span className="nav-active-mark" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-trust">
            <ShieldCheck size={18} />
            <span>Comunitate bazată pe încredere</span>
          </div>
          <button className="dashboard-logout" onClick={onLogout} disabled={loading}>
            <LogOut size={17} /> Deconectare
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-breadcrumb"><span>COM-Unity</span><ChevronRight size={14} /><strong>{activeCopy.title}</strong></div>
          <div className="dashboard-account">
            <div className="account-avatar">{user.displayName.trim().charAt(0).toUpperCase() || 'U'}</div>
            <div className="account-meta">
              <strong>{user.displayName}</strong>
              <span>{user.role === 'admin' ? 'Administrator' : user.role === 'moderator' ? 'Moderator' : 'Membru'}</span>
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="dashboard-welcome">
            <div>
              <span className="eyebrow"><HeartHandshake size={15} /> BINE AI VENIT ÎN COMUNITATE</span>
              <h1>{activeSection === 'overview' ? <>Bun venit, <span>{user.displayName.split(' ')[0]}</span>!</> : activeCopy.title}</h1>
              <p>{activeCopy.description}</p>
            </div>
            <div className="welcome-orb"><Globe2 size={36} /></div>
          </div>

          {activeSection === 'overview' && (
            <>
              <div className="dashboard-section-heading">
                <div><h2>Cu ce te putem ajuta?</h2><p>Alege de unde vrei să începi.</p></div>
              </div>
              <div className="dashboard-action-grid">
                <button className="dashboard-action-card action-cyan" onClick={() => setActiveSection('requests')}>
                  <span className="action-icon"><HandHeart size={23} /></span>
                  <span className="action-card-copy"><strong>Am nevoie de ajutor</strong><small>Publică sau urmărește o cerere de sprijin.</small></span>
                  <ArrowUpRight size={19} className="action-arrow" />
                </button>
                <button className="dashboard-action-card action-violet" onClick={() => setActiveSection('offers')}>
                  <span className="action-icon"><HeartHandshake size={23} /></span>
                  <span className="action-card-copy"><strong>Vreau să ajut</strong><small>Oferă timp, cunoștințe sau resurse.</small></span>
                  <ArrowUpRight size={19} className="action-arrow" />
                </button>
                <button className="dashboard-action-card action-blue" onClick={() => setActiveSection('projects')}>
                  <span className="action-icon"><FolderKanban size={23} /></span>
                  <span className="action-card-copy"><strong>Explorează proiecte</strong><small>Descoperă inițiativele comunității.</small></span>
                  <ArrowUpRight size={19} className="action-arrow" />
                </button>
              </div>

              <div className="dashboard-lower-grid">
                <section className="dashboard-panel activity-panel">
                  <div className="panel-heading"><div><h2>Activitatea mea</h2><p>Un rezumat al contribuției tale.</p></div><Clock3 size={19} /></div>
                  <div className="dashboard-empty">
                    <div className="empty-icon"><Compass size={24} /></div>
                    <strong>Primul pas începe aici</strong>
                    <p>După ce participi la cereri, oferte sau proiecte, activitatea ta va apărea în această zonă.</p>
                  </div>
                </section>
                <section className="dashboard-panel profile-panel">
                  <div className="panel-heading"><div><h2>Contul meu</h2><p>Datele contului autentificat.</p></div><UserRound size={19} /></div>
                  <div className="profile-summary">
                    <div className="profile-avatar">{user.displayName.trim().charAt(0).toUpperCase() || 'U'}</div>
                    <div><strong>{user.displayName}</strong><span>{user.email}</span></div>
                  </div>
                  <div className="profile-status"><span className="status-dot" /> Cont activ și email confirmat</div>
                  <button className="text-link" onClick={() => setActiveSection('profile')}>Vezi profilul <ArrowUpRight size={15} /></button>
                </section>
              </div>
            </>
          )}

          {activeSection === 'requests' && <HelpRequests userId={user.id} />}

          {activeSection === 'offers' && <HelpOffers userId={user.id} />}

          {activeSection === 'projects' && <Projects userId={user.id} />}

          {activeSection !== 'overview' && activeSection !== 'profile' && activeSection !== 'requests' && activeSection !== 'offers' && activeSection !== 'projects' && (
            <section className="dashboard-panel module-placeholder">
              <div className="empty-icon"><Clock3 size={25} /></div>
              <span className="module-kicker">MODUL ÎN DEZVOLTARE</span>
              <h2>{activeCopy.title}</h2>
              <p>Zona este pregătită în structura Dashboard-ului. Următorul pas este conectarea acestui modul la baza de date și implementarea funcțiilor sale.</p>
              <button className="button button-outline" onClick={() => setActiveSection('overview')}>Înapoi la prezentare</button>
            </section>
          )}

          {activeSection === 'profile' && (
            <section className="dashboard-panel profile-details">
              <div className="profile-detail-avatar">{user.displayName.trim().charAt(0).toUpperCase() || 'U'}</div>
              <div className="profile-detail-row"><span>Nume afișat</span><strong>{user.displayName}</strong></div>
              <div className="profile-detail-row"><span>Adresă de email</span><strong>{user.email}</strong></div>
              <div className="profile-detail-row"><span>Rol în platformă</span><strong>{user.role === 'admin' ? 'Administrator' : user.role === 'moderator' ? 'Moderator' : 'Membru'}</strong></div>
              <div className="profile-status"><span className="status-dot" /> Cont activ și email confirmat</div>
            </section>
          )}
          <footer className="dashboard-footer"><span>© 2026 COM-Unity</span><span>Împreună putem mai mult.</span></footer>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
