import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import HelpRequests from './HelpRequests';
import HelpOffers from './HelpOffers';
import Projects from './Projects';
import Messages from './Messages';
import AdminPanel from './AdminPanel';
import UsefulLinks from './UsefulLinks';
import AboutUs from './AboutUs';
import Reports from './Reports';
import {
  Globe2, LayoutDashboard, HandHeart, HeartHandshake, FolderKanban,
  MessageCircle, UserRound, LogOut, ArrowUpRight, Compass,
  ShieldCheck, Clock3, ChevronRight, Bell, Pencil, Save, Link2, Info, House, Palette
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
  onProfileUpdated: (displayName: string) => void;
};

type Section = 'overview' | 'requests' | 'offers' | 'projects' | 'messages' | 'profile' | 'links' | 'about' | 'reports' | 'admin';

const navigation: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Prezentare generală', icon: LayoutDashboard },
  { id: 'requests', label: 'Cereri de ajutor', icon: HandHeart },
  { id: 'offers', label: 'Oferte de ajutor', icon: HeartHandshake },
  { id: 'projects', label: 'Proiecte', icon: FolderKanban },
  { id: 'messages', label: 'Mesaje', icon: MessageCircle },
  { id: 'profile', label: 'Profilul meu', icon: UserRound },
  { id: 'links', label: 'Linkuri utile', icon: Link2 },
  { id: 'about', label: 'Despre noi', icon: Info },
  { id: 'reports', label: 'Raportează o problemă', icon: ShieldCheck },
  { id: 'admin', label: 'Administrator', icon: ShieldCheck }
];

const sectionCopy: Record<Section, { title: string; description: string }> = {
  overview: { title: 'Prezentare generală', description: 'Centrul activității tale în comunitatea COM-Unity.' },
  requests: { title: 'Cereri de ajutor', description: 'Descoperă unde este nevoie de sprijin sau gestionează cererile tale.' },
  offers: { title: 'Oferte de ajutor', description: 'Împărtășește timpul, experiența și resursele tale.' },
  projects: { title: 'Proiecte comunitare', description: 'Idei care aduc oamenii împreună și produc schimbări reale.' },
  messages: { title: 'Mesaje', description: 'Comunicarea cu membrii comunității.' },
  profile: { title: 'Profilul meu', description: 'Informațiile contului tău COM-Unity.' },
  links: { title: 'Linkuri utile', description: 'Resurse și pagini recomandate pentru comunitatea COM-Unity.' },
  about: { title: 'Despre noi', description: 'Află mai multe despre misiunea, viziunea și valorile COM-Unity.' },
  reports: { title: 'Raportare și moderare', description: 'Semnalează un comportament sau conținut care încalcă regulile comunității.' },
  admin: { title: 'Panou de administrare', description: 'Administrarea centralizată a platformei COM-Unity.' }
};

type InterfaceTheme = 'ocean' | 'emerald' | 'violet' | 'rose' | 'amber' | 'light';

const interfaceThemes: { id: InterfaceTheme; label: string; description: string }[] = [
  { id: 'ocean', label: 'Ocean', description: 'Albastru și cyan' },
  { id: 'emerald', label: 'Emerald', description: 'Verde și turcoaz' },
  { id: 'violet', label: 'Violet', description: 'Mov și lavandă' },
  { id: 'rose', label: 'Rose', description: 'Roz și coral' },
  { id: 'amber', label: 'Amber', description: 'Auriu și portocaliu' },
  { id: 'light', label: 'Light', description: 'Interfață luminoasă' }
];


const avatarOptions = [
  { id: 'person-1', label: 'Fermier tradițional · 50 ani', bg: '#d9edff', skin: '#b8754e', hair: '#4a3025', shirt: '#3c6d9c', kind: 'farmer' },
  { id: 'person-2', label: 'Horticultoare · 25 ani', bg: '#e1f4d9', skin: '#e8b58d', hair: '#633a2c', shirt: '#397b68', kind: 'horticulture' },
  { id: 'person-3', label: 'Inginer agronom · 35 ani', bg: '#dcecff', skin: '#c78b68', hair: '#352b29', shirt: '#244f78', kind: 'engineer' },
  { id: 'person-4', label: 'Manager de fermă · 45 ani', bg: '#f6e8d8', skin: '#e0ad8b', hair: '#9b8b7b', shirt: '#8c7665', kind: 'manager' },
  { id: 'person-5', label: 'Tractorist · 28 ani', bg: '#f9e8c9', skin: '#c98762', hair: '#382b25', shirt: '#405b70', kind: 'tractor' },
  { id: 'person-6', label: 'Apicultoare · 30 ani', bg: '#fff0c9', skin: '#9c6148', hair: '#211a1b', shirt: '#d8b65b', kind: 'beekeeper' },
  { id: 'person-7', label: 'Viticultor · 65 ani', bg: '#e6efd9', skin: '#d6a17d', hair: '#e5e3db', shirt: '#806b58', kind: 'vintner' },
  { id: 'person-8', label: 'Specialistă agrotech · 32 ani', bg: '#dceeff', skin: '#c58a6c', hair: '#34282c', shirt: '#527da8', kind: 'agritech' },
  { id: 'person-9', label: 'Student la agronomie · 21 ani', bg: '#e4f2dc', skin: '#d6a17f', hair: '#503326', shirt: '#3c8068', kind: 'student' }
] as const;

function AvatarIllustration({ avatarId, size = 56 }: { avatarId: string; size?: number }) {
  const avatar = avatarOptions.find(item => item.id === avatarId) || avatarOptions[0];
  const kind = avatar.kind;
  return (
    <svg className="avatar-illustration" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={avatar.label}>
      <defs>
        <linearGradient id={'avatar-sky-' + avatar.id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={avatar.bg}/><stop offset="1" stopColor="#ffffff"/></linearGradient>
        <linearGradient id={'avatar-shirt-' + avatar.id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={avatar.shirt}/><stop offset="1" stopColor="#172f42"/></linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill={'url(#avatar-sky-' + avatar.id + ')'} />
      <circle cx="78" cy="18" r="8" fill="#fff2b8" opacity=".9"/>
      <path d="M0 67 Q24 48 47 66 T100 61 V100 H0Z" fill="#8ab58a" opacity=".65"/>
      <path d="M0 78 Q25 62 49 78 T100 72 V100 H0Z" fill="#5e966e" opacity=".55"/>
      {kind === 'farmer' && <g><path d="M8 58V36l12-9 12 9v23" fill="#b86f4b" opacity=".8"/><path d="M6 37l14-11 14 11" fill="none" stroke="#fff1d4" strokeWidth="3"/><path d="M9 43h22" stroke="#fff1d4" strokeWidth="2"/></g>}
      {kind === 'horticulture' && <g><path d="M13 63q-10-16 2-23 13 9-2 23M15 63q1-22 17-25 4 17-17 25" fill="#4e9c67"/><path d="M15 63v-16" stroke="#377a51" strokeWidth="2"/></g>}
      {kind === 'engineer' && <g><path d="M75 38l8-9 8 9-8 9z" fill="#fff" opacity=".7"/><path d="M83 47v9" stroke="#477b9d" strokeWidth="2"/></g>}
      {kind === 'manager' && <g><path d="M75 56V32h13v24" fill="#d8c7a9" opacity=".8"/><path d="M72 33h19" stroke="#9c866b" strokeWidth="2"/></g>}
      {kind === 'tractor' && <g><circle cx="18" cy="66" r="10" fill="#273a43"/><circle cx="18" cy="66" r="5" fill="#d5dce0"/><path d="M11 54h19l7 9H12z" fill="#d64c32"/></g>}
      {kind === 'beekeeper' && <g><rect x="73" y="48" width="13" height="17" rx="4" fill="#d9a72e"/><rect x="75" y="45" width="9" height="5" rx="2" fill="#8d6425"/><path d="M79 55h2" stroke="#fff0b0" strokeWidth="2"/></g>}
      {kind === 'vintner' && <g><path d="M12 55q-7-10 0-18 7 8 0 18M18 58q-3-13 8-17 4 11-8 17" fill="#5c944f"/><circle cx="13" cy="60" r="4" fill="#654c86"/><circle cx="21" cy="62" r="4" fill="#654c86"/></g>}
      {kind === 'agritech' && <g><rect x="76" y="45" width="13" height="17" rx="2" fill="#304c66" stroke="#d7efff" strokeWidth="1.5"/><path d="M79 50h7M79 54h5" stroke="#8ed6e8" strokeWidth="1.5"/></g>}
      {kind === 'student' && <g><path d="M72 49l12-5 12 5-12 5z" fill="#e8e1c8"/><path d="M84 54v8" stroke="#b9a982" strokeWidth="2"/><path d="M73 49v7" stroke="#b9a982" strokeWidth="2"/></g>}
      <path d="M13 100q2-27 23-32h28q21 5 23 32z" fill={'url(#avatar-shirt-' + avatar.id + ')'} />
      {kind === 'engineer' && <path d="M39 70h22l8 30H31z" fill="#e9c84f"/>}
      {kind === 'manager' && <path d="M35 72l15 9 15-9-5 28H40z" fill="#e7dfd1" opacity=".9"/>}
      {kind === 'beekeeper' && <path d="M24 72q26 10 52 0l-5 28H29z" fill="#f2d67a" opacity=".85"/>}
      <path d="M43 57h14v17H43z" fill={avatar.skin}/>
      <ellipse cx="50" cy="43" rx="20" ry="24" fill={avatar.skin}/>
      {kind === 'manager' && <path d="M29 44q-6-24 13-29 24-6 29 18l-7 20-5-25q-15 12-30 7z" fill={avatar.hair}/>}
      {kind === 'horticulture' && <g><path d="M30 37q-4-23 19-25 23 2 21 26l-7-9q-14 8-28 3z" fill={avatar.hair}/><path d="M32 39q-9 12-4 28M67 39q9 12 4 28" stroke={avatar.hair} strokeWidth="5" fill="none" strokeLinecap="round"/><path d="M29 54q-8 18-2 24M70 54q8 18 2 24" stroke={avatar.hair} strokeWidth="3" fill="none" strokeLinecap="round"/></g>}
      {kind === 'beekeeper' && <path d="M30 40q-4-24 19-27 23 2 21 27l-8-12q-13 8-25 3z" fill={avatar.hair}/>}
      {kind === 'agritech' && <path d="M29 42q-5-25 20-29 24 4 22 28l-7-12q-14 10-29 5z" fill={avatar.hair}/>}
      {kind === 'student' && <path d="M30 40q-4-23 20-26 22 2 21 25l-8-10q-15 7-29 2z" fill={avatar.hair}/>}
      {kind === 'vintner' && <path d="M30 39q-4-24 20-25 23 2 21 25l-8-10q-14 8-29 2z" fill={avatar.hair}/>}
      {kind === 'engineer' && <path d="M30 39q-3-24 20-26 24 2 21 27l-8-11q-14 9-29 4z" fill={avatar.hair}/>}
      {kind === 'tractor' && <path d="M30 39q-4-24 20-25 23 1 21 25l-8-9q-14 7-29 2z" fill={avatar.hair}/>}
      {kind === 'farmer' && <path d="M30 42q-3-23 20-25 23 2 21 26l-8-10q-15 8-29 3z" fill={avatar.hair}/>}
      <path d="M30 42q-3 13 1 22M70 42q3 13-1 22" stroke={avatar.skin} strokeWidth="4" fill="none" strokeLinecap="round"/>
      <circle cx="43" cy="44" r="1.8" fill="#2a2522"/><circle cx="57" cy="44" r="1.8" fill="#2a2522"/>
      <path d="M46 54q4 3 8 0" stroke="#8b5146" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      {kind === 'farmer' && <g><path d="M37 58q13 10 26 0" stroke="#f0f0e8" strokeWidth="3" fill="none" strokeLinecap="round"/><path d="M23 30q4-12 27-13 23 1 27 13-25 5-54 0z" fill="#d6a64d" stroke="#9c7134" strokeWidth="2"/><path d="M29 29q21 5 42 0" stroke="#f5d98e" strokeWidth="2"/></g>}
      {kind === 'tractor' && <g><path d="M24 31q4-15 26-16 23 1 27 16l-3 5H27z" fill="#26394a"/><path d="M27 34q23 4 48 0" stroke="#60788a" strokeWidth="3"/></g>}
      {kind === 'engineer' && <g><rect x="31" y="39" width="16" height="11" rx="4" fill="none" stroke="#263c4e" strokeWidth="2"/><rect x="53" y="39" width="16" height="11" rx="4" fill="none" stroke="#263c4e" strokeWidth="2"/><path d="M47 43h6" stroke="#263c4e" strokeWidth="2"/></g>}
      {kind === 'agritech' && <g><rect x="31" y="39" width="16" height="11" rx="4" fill="none" stroke="#263c4e" strokeWidth="2"/><rect x="53" y="39" width="16" height="11" rx="4" fill="none" stroke="#263c4e" strokeWidth="2"/><path d="M47 43h6" stroke="#263c4e" strokeWidth="2"/></g>}
      {kind === 'vintner' && <g><path d="M34 57q16 12 32 0" stroke="#f4eee5" strokeWidth="4" fill="none" strokeLinecap="round"/><path d="M31 35q3-15 19-17 18 2 20 18" stroke="#e8e5df" strokeWidth="5" fill="none" strokeLinecap="round"/></g>}
      {kind === 'beekeeper' && <g><path d="M25 24q25-14 50 0l-5 41q-20 17-40 0z" fill="none" stroke="#f8e6ad" strokeWidth="3" opacity=".8"/><path d="M29 29q21 6 42 0" stroke="#f8e6ad" strokeWidth="2" fill="none"/></g>}
      {kind === 'student' && <path d="M38 70l12 8 12-8" stroke="#d9e7d7" strokeWidth="2" fill="none"/>}
    </svg>
  );
}

type ActivityNotification = {
  id: string; title: string; message: string; actor_name: string;
  entity_type: string | null; entity_id: string | null; read_at: string | null; created_at: string;
};

function Dashboard({ user, onLogout, loading, onProfileUpdated }: Props) {
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [theme, setTheme] = useState<InterfaceTheme>(() => {
    const saved = localStorage.getItem('com-unity-theme');
    return interfaceThemes.some(item => item.id === saved) ? saved as InterfaceTheme : 'ocean';
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user.displayName);
  const [avatarId, setAvatarId] = useState('person-1');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [reputation, setReputation] = useState({ average: 0, count: 0, completedProjects: 0 });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
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
    setActiveSection(notification.entity_type === 'project' ? 'projects' : notification.entity_type === 'request' ? 'requests' : 'overview');
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
    setActiveSection(activityNotice.entityType === 'project' ? 'projects' : activityNotice.entityType === 'request' ? 'requests' : 'overview');
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
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = profileName.trim();
    if (displayName.length < 2 || displayName.length > 80) {
      setProfileError('Numele trebuie să aibă între 2 și 80 de caractere.');
      return;
    }
    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Profilul nu a putut fi actualizat.');
      onProfileUpdated(data.user.displayName);
      setProfileName(data.user.displayName);
      setEditingProfile(false);
      setProfileSuccess('Numele a fost actualizat.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'A apărut o eroare.');
    } finally {
      setProfileSaving(false);
    }
  }

  useEffect(() => { localStorage.setItem('com-unity-theme', theme); }, [theme]);

  useEffect(() => {
    let active = true;
    fetch('/api/profile', { credentials: 'same-origin', cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (active && data?.user) { if (data.user.avatarId) setAvatarId(data.user.avatarId); setReputation({ average: Number(data.user.ratingAverage || 0), count: Number(data.user.ratingCount || 0), completedProjects: Number(data.user.completedProjects || 0) }); } })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  async function saveAvatar(nextAvatarId: string) {
    setAvatarId(nextAvatarId); setAvatarSaving(true); setProfileError(''); setProfileSuccess('');
    try {
      const response = await fetch('/api/profile', { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatarId: nextAvatarId }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Avatarul nu a putut fi salvat.');
      setProfileSuccess('Avatarul a fost actualizat.');
    } catch (error) { setProfileError(error instanceof Error ? error.message : 'A apărut o eroare.'); }
    finally { setAvatarSaving(false); }
  }

  const badges = [
    { id: 'new', icon: '🌱', name: 'Membru nou', description: 'Bun venit în comunitatea COM-Unity!', unlocked: reputation.completedProjects === 0 && reputation.count === 0 },
    { id: 'helper', icon: '🤝', name: 'Colaborator activ', description: 'Ai participat la cel puțin un proiect finalizat.', unlocked: reputation.completedProjects >= 1 },
    { id: 'liked', icon: '⭐', name: 'Membru apreciat', description: 'Ai primit cel puțin o evaluare de minimum 4 stele în medie.', unlocked: reputation.count >= 1 && reputation.average >= 4 },
    { id: 'trusted', icon: '🏆', name: 'Comunitar de încredere', description: 'Ai cel puțin 3 evaluări și o medie de minimum 4,5 stele.', unlocked: reputation.count >= 3 && reputation.average >= 4.5 },
    { id: 'ambassador', icon: '💎', name: 'Ambasador COM-Unity', description: 'Ai contribuit la 5 proiecte și ai cel puțin 5 evaluări cu media de minimum 4,8.', unlocked: reputation.completedProjects >= 5 && reputation.count >= 5 && reputation.average >= 4.8 }
  ];
  const activeCopy = sectionCopy[activeSection];

  return (
    <div className="dashboard-layout" data-theme={theme}>
      <aside className="dashboard-sidebar">
        <a className="brand dashboard-brand" href="/" aria-label="COM-Unity">
          <span className="brand-icon"><Globe2 /></span>
          <span>COM-<strong>Unity</strong></span>
        </a>
        <div className="sidebar-label">SPAȚIUL MEU</div>
        <nav className="dashboard-nav" aria-label="Navigare dashboard">
          {navigation.filter(item => item.id !== 'admin' || user.role === 'admin').map(item => {
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
          <button type="button" className="dashboard-home-button" onClick={() => { setActiveSection('overview'); setEditingProfile(false); }} aria-label="Înapoi la pagina principală"><House size={16} /><span>Pagina principală</span></button>
          <div className="dashboard-account">
            <div style={{ position: "relative" }}>
              <button type="button" aria-label={activityUnreadCount ? `${activityUnreadCount} notificări necitite` : "Notificări"} aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen(open => !open); void refreshNotifications(false); }} style={{ position: "relative", border: 0, background: "transparent", color: "inherit", cursor: "pointer", padding: 8 }}>
                <Bell size={19} />
                {activityUnreadCount > 0 && <span className="message-unread-badge" style={{ position: "absolute", top: -2, right: -3 }}>{activityUnreadCount > 99 ? "99+" : activityUnreadCount}</span>}
              </button>

            </div>
            <div className="account-avatar"><AvatarIllustration avatarId={avatarId} size={38} /></div>
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
                    <div className="profile-avatar"><AvatarIllustration avatarId={avatarId} size={52} /></div>
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

          {activeSection === 'links' && <UsefulLinks />}
          {activeSection === 'about' && <AboutUs />}
          {activeSection === 'reports' && <Reports user={user} />}

          {activeSection === 'admin' && user.role === 'admin' && <AdminPanel />}

          {activeSection !== 'overview' && activeSection !== 'profile' && activeSection !== 'requests' && activeSection !== 'offers' && activeSection !== 'projects' && activeSection !== 'messages' && activeSection !== 'links' && activeSection !== 'about' && activeSection !== 'reports' && activeSection !== 'admin' && (
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
              <div className="profile-detail-avatar"><AvatarIllustration avatarId={avatarId} size={88} /></div>
              {profileSuccess && <div className="requests-alert success" role="status">{profileSuccess}</div>}

              <div className="profile-avatar-picker">
                <div className="profile-avatar-picker-heading"><strong>Alege-ți avatarul</strong><span>Personajul va apărea lângă numele tău în platformă.</span></div>
                <div className="profile-avatar-grid">
                  {avatarOptions.map(option => (
                    <button key={option.id} type="button" className={`profile-avatar-option ${avatarId === option.id ? 'selected' : ''}`} onClick={() => void saveAvatar(option.id)} disabled={avatarSaving} aria-pressed={avatarId === option.id} aria-label={`Alege avatarul: ${option.label}`}>
                      <AvatarIllustration avatarId={option.id} size={64}/><span className="profile-avatar-label">{option.label}</span>
                      {avatarId === option.id && <span className="avatar-selected-check">✓</span>}
                    </button>
                  ))}
                </div>
                {avatarSaving && <small className="profile-avatar-saving">Se salvează avatarul...</small>}
              </div>

              {profileError && <div className="requests-alert error" role="alert">{profileError}</div>}
              {editingProfile ? (
                <form onSubmit={saveProfile} className="request-form" style={{ width: '100%', maxWidth: 520 }}>
                  <label>Nume afișat
                    <input value={profileName} onChange={event => setProfileName(event.target.value)} minLength={2} maxLength={80} autoComplete="name" required />
                  </label>
                  <div className="request-form-footer">
                    <button type="button" className="button button-outline" onClick={() => { setProfileName(user.displayName); setEditingProfile(false); setProfileError(''); }} disabled={profileSaving}>Anulează</button>
                    <button type="submit" className="button button-primary" disabled={profileSaving || profileName.trim() === user.displayName}>{profileSaving ? 'Se salvează...' : <><Save size={16} /> Salvează</>}</button>
                  </div>
                </form>
              ) : <>
                <div className="profile-detail-row"><span>Nume afișat</span><strong>{user.displayName}</strong></div>
                <button type="button" className="button button-outline" onClick={() => { setProfileName(user.displayName); setEditingProfile(true); setProfileError(''); setProfileSuccess(''); }}><Pencil size={16} /> Modifică numele</button>
              </>}
              <div className="profile-detail-row"><span>Adresă de email</span><strong>{user.email}</strong></div>
              <div className="profile-detail-row"><span>Rol în platformă</span><strong>{user.role === 'admin' ? 'Administrator' : user.role === 'moderator' ? 'Moderator' : 'Membru'}</strong></div>
              <div className="profile-reputation">
                <div><strong>Reputația mea</strong><span>Evaluări primite în proiectele finalizate</span></div>
                <div className="profile-reputation-score"><strong>{reputation.count ? reputation.average.toFixed(1) : '—'}</strong><span className="project-rating-value">★★★★★</span><small>{reputation.count} {reputation.count === 1 ? 'evaluare' : 'evaluări'}</small></div>
              </div>
              <section className="profile-badges" aria-labelledby="profile-badges-title">
                <div className="profile-badges-heading"><div><strong id="profile-badges-title">Insignele mele</strong><span>Insigne acordate automat pentru implicarea în comunitate</span></div><small>{badges.filter(badge => badge.unlocked).length} / {badges.length} obținute</small></div>
                <div className="profile-badges-grid">
                  {badges.map(badge => <article key={badge.id} className={`profile-badge-card ${badge.unlocked ? 'unlocked' : 'locked'}`} title={badge.description}>
                    <span className="profile-badge-icon" aria-hidden="true">{badge.icon}</span>
                    <strong>{badge.name}</strong>
                    <small>{badge.description}</small>
                    <span className="profile-badge-status">{badge.unlocked ? 'Obținută' : 'În curs'}</span>
                  </article>)}
                </div>
              </section>
              <div className="profile-theme-settings">
                <div className="profile-theme-heading"><span className="profile-theme-icon"><Palette size={18}/></span><div><strong>Temă interfață</strong><p>Alege aspectul platformei. Preferința se păstrează pe acest dispozitiv.</p></div></div>
                <div className="profile-theme-grid">
              {interfaceThemes.map(option => (
                <button key={option.id} type="button" className={`profile-theme-option ${theme === option.id ? 'selected' : ''}`} onClick={() => setTheme(option.id)} aria-pressed={theme === option.id}>
                  <span className={`theme-preview theme-preview-${option.id}`}><i/><i/><i/></span>
                  <span className="profile-theme-option-copy"><strong>{option.label}</strong><small>{option.description}</small></span>
                  {theme === option.id && <span className="theme-selected-mark">Activă</span>}
                </button>
              ))}
                </div>
              </div>
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
