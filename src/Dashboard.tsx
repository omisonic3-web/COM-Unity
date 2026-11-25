import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import HelpRequests from './HelpRequests';
import HelpOffers from './HelpOffers';
import Projects from './Projects';
import Messages from './Messages';
import {
  Globe2, LayoutDashboard, HandHeart, HeartHandshake, FolderKanban,
  MessageCircle, UserRound, LogOut, ArrowUpRight, Compass,
  ShieldCheck, Clock3, ChevronRight, Bell
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

type ActivityNotification = {
  id: string; title: string; message: string; actor_name: string;
  entity_type: string | null; entity_id: string | null; read_at: string | null; created_at: string;
};

function Dashboard({ user, onLogout, loading }: Props) {
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageNotice, setMessageNotice] = useState<{ sender: string; message: string } | null>(null);
  const [activityUnreadCount, setActivityUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activityNotice, setActivityNotice] = useState<{ id: string; title: string; message: string; actor: string; entityType: string | null } | null>(null);
  const latestActivityId = useRef<string | null>(null);
  const activityNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestUnreadId = useRef<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshUnread = useCallback(async (notify = false) => {
    try {
      const response = await fetch('/api/messages?unread=1', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      setUnreadCount(data.unread_count || 0);
      const latest = data.latest;
      if (latest?.id) {
        if (latestUnreadId.current && latestUnreadId.current !== latest.id && notify) {
          setMessageNotice({ sender: latest.sender_name || 'Membru', message: latest.message || 'Ți-a trimis un mesaj.' });
          if (noticeTimer.current) clearTimeout(noticeTimer.current);
          noticeTimer.current = setTimeout(() => setMessageNotice(null), 7000);
        }
        latestUnreadId.current = latest.id;
      } else latestUnreadId.current = null;
    } catch { /* notificările nu blochează dashboard-ul */ }
  }, []);
  const handleMessagesRead = useCallback(() => { void refreshUnread(false); }, [refreshUnread]);
  const refreshNotifications = useCallback(async (notify = false) => {
    try {
      const response = await fetch('/api/notifications', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      setActivityUnreadCount(data.unread_count || 0);
      setNotifications(data.notifications || []);
      const latest = (data.notifications || []).find((item: { read_at: string | null }) => !item.read_at);
      if (latest?.id) {
        if (latestActivityId.current && latestActivityId.current !== latest.id && notify) {
          setActivityNotice({
            id: latest.id,
            title: latest.title || 'Activitate nouă',
            message: latest.message || 'Ai o notificare nouă.',
            actor: latest.actor_name || 'Membru',
            entityType: latest.entity_type || null
          });
          if (activityNoticeTimer.current) clearTimeout(activityNoticeTimer.current);
          activityNoticeTimer.current = setTimeout(() => setActivityNotice(null), 8000);
        }
        latestActivityId.current = latest.id;
      } else latestActivityId.current = null;
    } catch { /* notificările nu blochează dashboard-ul */ }
  }, []);
  const openNotification = useCallback(async (notification: ActivityNotification) => {
    if (!notification.read_at) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: notification.id })
        });
      } catch { /* se sincronizează la următoarea încărcare */ }
    }
    setNotificationsOpen(false);
    setActiveSection(notification.entity_type === 'project' ? 'projects' : 'overview');
    await refreshNotifications(false);
  }, [refreshNotifications]);
  const openActivityNotice = useCallback(async () => {
    if (!activityNotice) return;
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activityNotice.id })
      });
    } catch { /* starea se va sincroniza la următoarea verificare */ }
    setActivityUnreadCount(count => Math.max(0, count - 1));
    await refreshNotifications(false);
    setActiveSection(activityNotice.entityType === 'project' ? 'projects' : 'overview');
    setActivityNotice(null);
  }, [activityNotice, refreshNotifications]);
  useEffect(() => {
    void refreshUnread(false);
    void refreshNotifications(false);
    const interval = setInterval(() => {
      void refreshUnread(true);
      void refreshNotifications(true);
    }, 15000);
    const onVisible = () => { if (document.visibilityState === 'visible') { void refreshUnread(true); void refreshNotifications(true); } };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); if (noticeTimer.current) clearTimeout(noticeTimer.current); if (activityNoticeTimer.current) clearTimeout(activityNoticeTimer.current); };
  }, [refreshUnread, refreshNotifications]);
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
                {item.id === "messages" && unreadCount > 0 && <span className="message-unread-badge" aria-label={`${unreadCount} mesaje necitite`}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
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

      {messageNotice && <div role="status" onClick={() => { setActiveSection("messages"); setMessageNotice(null); }} style={{ position: "fixed", zIndex: 1000, right: 22, top: 22, width: "min(360px, calc(100vw - 44px))", padding: "15px 18px", border: "1px solid #6bdff255", borderRadius: 14, background: "#14253af2", boxShadow: "0 16px 45px #0008", color: "#edf7ff", cursor: "pointer" }}>
        <strong style={{ display: "block", marginBottom: 5 }}>Mesaj nou de la {messageNotice.sender}</strong>
        <span style={{ display: "block", color: "#aebed2", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{messageNotice.message}</span>
        <small style={{ display: "block", marginTop: 8, color: "#70dff2" }}>Apasă pentru a deschide mesajele</small>
      </div>}
      {activityNotice && <div role="status" onClick={() => void openActivityNotice()} style={{ position: "fixed", zIndex: 1001, right: 22, top: messageNotice ? 112 : 22, width: "min(360px, calc(100vw - 44px))", padding: "15px 18px", border: "1px solid #a78bfa66", borderRadius: 14, background: "#1b1935f5", boxShadow: "0 16px 45px #0008", color: "#f3efff", cursor: "pointer" }}>
        <strong style={{ display: "block", marginBottom: 5 }}>{activityNotice.title}</strong>
        <span style={{ display: "block", color: "#c5bfdc", fontSize: 12 }}>{activityNotice.actor}: {activityNotice.message}</span>
        <small style={{ display: "block", marginTop: 8, color: "#b9a4ff" }}>Apasă pentru a vedea activitatea</small>
      </div>}
      {notificationsOpen && createPortal(<div role="dialog" aria-label="Notificări" style={{ position: "fixed", zIndex: 2147483647, top: 76, right: 24, width: "min(370px, calc(100vw - 32px))", maxHeight: "min(430px, calc(100vh - 96px))", overflowY: "auto", padding: 12, border: "1px solid #34445c", borderRadius: 16, background: "#111d2d", color: "#edf4ff", boxShadow: "0 18px 50px #0009" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 6px 12px" }}>
                  <strong>Notificări</strong>
                  <button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Închide notificările" style={{ border: 0, background: "transparent", color: "#aebed2", cursor: "pointer", fontSize: 20 }}>×</button>
                </div>
                {notifications.length === 0 ? <p style={{ margin: 8, color: "#aebed2", fontSize: 13 }}>Nu ai notificări momentan.</p> : notifications.map(notification => (
                  <button key={notification.id} type="button" onClick={() => void openNotification(notification)} style={{ display: "block", width: "100%", textAlign: "left", padding: 12, marginBottom: 7, border: "1px solid #34445c", borderRadius: 11, background: notification.read_at ? "#172538" : "#202f49", color: "inherit", cursor: "pointer" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, fontSize: 13 }}>
                      {!notification.read_at && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#8b7cff", flex: "0 0 auto" }} />}
                      {notification.title}
                    </span>
                    <span style={{ display: "block", marginTop: 6, color: "#c2cee0", fontSize: 12 }}>{notification.actor_name}: {notification.message}</span>
                    <span style={{ display: "block", marginTop: 7, color: "#8fa2bb", fontSize: 11 }}>{new Date(notification.created_at).toLocaleString("ro-RO")}</span>
                  </button>
                ))}
                {activityUnreadCount > 0 && <button type="button" onClick={async () => { await fetch('/api/notifications', { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) }); await refreshNotifications(false); }} style={{ width: "100%", padding: 9, border: 0, borderRadius: 9, background: "#263957", color: "#dce8ff", cursor: "pointer", fontSize: 12 }}>Marchează toate ca citite</button>}
              </div>, document.body)}
      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-breadcrumb"><span>COM-Unity</span><ChevronRight size={14} /><strong>{activeCopy.title}</strong></div>
          <div className="dashboard-account">
            <div style={{ position: "relative" }}>
              <button type="button" aria-label={activityUnreadCount ? `${activityUnreadCount} notificări necitite` : "Notificări"} aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen(open => !open); void refreshNotifications(false); }} style={{ position: "relative", border: 0, background: "transparent", color: "inherit", cursor: "pointer", padding: 8 }}>
                <Bell size={19} />
                {activityUnreadCount > 0 && <span className="message-unread-badge" style={{ position: "absolute", top: -2, right: -3 }}>{activityUnreadCount > 99 ? "99+" : activityUnreadCount}</span>}
              </button>

            </div>
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

          {activeSection === 'messages' && <Messages userId={user.id} onRead={handleMessagesRead} />}

          {activeSection !== 'overview' && activeSection !== 'profile' && activeSection !== 'requests' && activeSection !== 'offers' && activeSection !== 'projects' && activeSection !== 'messages' && (
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
