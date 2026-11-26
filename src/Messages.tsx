import { useCallback, useEffect, useState, type FormEvent } from "react";
import { MessageCircle, RefreshCw, Send, Users } from "lucide-react";

type Member = { id: string; display_name: string };
type Conversation = { user_id: string; display_name: string; last_message: string; created_at: string; unread_count?: number };
type Message = { id: string; sender_id: string; receiver_id: string; message: string; created_at: string; sender_name: string };

function Messages({ userId, onRead }: { userId: string; onRead?: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [memberResponse, conversationResponse] = await Promise.all([
        fetch("/api/members", { credentials: "same-origin", cache: "no-store" }),
        fetch("/api/messages", { credentials: "same-origin", cache: "no-store" })
      ]);
      const memberData = await memberResponse.json();
      const conversationData = await conversationResponse.json();
      if (!memberResponse.ok) throw new Error(memberData.error || "Nu am putut încărca membrii.");
      if (!conversationResponse.ok) throw new Error(conversationData.error || "Nu am putut încărca conversațiile.");
      setMembers(memberData.members || []);
      setConversations(conversationData.conversations || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Eroare la încărcare."); }
    finally { setLoading(false); }
  }, []);

  const loadThread = useCallback(async (otherId: string) => {
    if (!otherId) { setMessages([]); return; }
    try {
      const markRead = await fetch(`/api/messages?with=${encodeURIComponent(otherId)}`, { method: "PATCH", credentials: "same-origin" });
      if (!markRead.ok) throw new Error("Mesajele nu au putut fi marcate ca citite.");
      const response = await fetch(`/api/messages?with=${encodeURIComponent(otherId)}`, { credentials: "same-origin", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nu am putut încărca conversația.");
      setMessages(data.messages || []);
      onRead?.();
    } catch (e) { setError(e instanceof Error ? e.message : "Eroare la încărcarea conversației."); }
  }, [onRead]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadThread(selected); }, [selected, loadThread]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !draft.trim()) return;
    setSending(true); setError("");
    try {
      const response = await fetch("/api/messages", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_id: selected, message: draft.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Mesajul nu a putut fi trimis.");
      setDraft("");
      await loadThread(selected);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Eroare la trimitere."); }
    finally { setSending(false); }
  }

  const selectedMember = members.find(member => member.id === selected);
  const selectedConversation = conversations.find(item => item.user_id === selected);
  const selectedName = selectedMember?.display_name || selectedConversation?.display_name || "Membru";

  return <section className="messages-module">
    <div className="messages-toolbar">
      <div><h2>Conversațiile tale</h2><p>Mesaje private între membrii COM-Unity.</p></div>
      <button className="requests-refresh" onClick={() => { void load(); if (selected) void loadThread(selected); }} disabled={loading} aria-label="Reîncarcă"><RefreshCw size={17}/></button>
    </div>
    {error && <div className="requests-alert error" role="alert">{error}</div>}
    <div className="messages-layout">
      <aside className="dashboard-panel messages-people">
        <h3><Users size={17}/> Membri</h3>
        {loading ? <p>Se încarcă...</p> : members.length === 0 ? <p>Nu există alți membri confirmați.</p> : members.map(member =>
          <button key={member.id} className={selected === member.id ? "message-person selected" : "message-person"} onClick={() => setSelected(member.id)}>
            <span className="message-avatar">{member.display_name.trim().charAt(0).toUpperCase() || "M"}</span><span>{member.display_name}</span>
            {conversations.find(item => item.user_id === member.id)?.unread_count ? <span className="message-unread-badge">{conversations.find(item => item.user_id === member.id)?.unread_count}</span> : null}
          </button>
        )}
      </aside>
      <div className="dashboard-panel messages-thread">
        {selected ? <>
          <div className="messages-thread-heading"><span className="message-avatar">{selectedName.trim().charAt(0).toUpperCase() || "M"}</span><div><strong>{selectedName}</strong><small>Conversație privată</small></div></div>
          <div className="messages-list">
            {messages.length === 0 ? <div className="messages-empty"><MessageCircle size={25}/><p>Nu există mesaje. Trimite primul mesaj!</p></div> : messages.map(item =>
              <div key={item.id} className={item.sender_id === userId ? "message-bubble own" : "message-bubble"}>
                <p>{item.message}</p><time>{new Date(item.created_at).toLocaleString("ro-RO")}</time>
              </div>
            )}
          </div>
          <form className="message-compose" onSubmit={sendMessage}>
            <textarea value={draft} onChange={event => setDraft(event.target.value)} maxLength={5000} rows={2} placeholder="Scrie un mesaj..." required />
            <button className="button button-primary" disabled={sending || !draft.trim()}><Send size={16}/>{sending ? "Se trimite..." : "Trimite"}</button>
          </form>
        </> : <div className="messages-empty"><MessageCircle size={30}/><strong>Alege un membru</strong><p>Selectează un membru din listă pentru a începe o conversație.</p></div>}
      </div>
    </div>
  </section>;
}

export default Messages;
