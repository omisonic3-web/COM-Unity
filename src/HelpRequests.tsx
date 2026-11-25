import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, RefreshCw, MapPin, CalendarDays, Trash2, CheckCircle2, Circle, X, Send } from "lucide-react";

type HelpRequest = {
  id: string; user_id: string; title: string; description: string; category: string;
  location: string | null; status: "open" | "closed"; created_at: string; author_name: string;
};

const defaultCategories = ["Comunitate", "Educație", "Sănătate", "Alimente și bunuri", "Transport", "Locuință", "Tehnologie", "Altele"];

function HelpRequests({ userId }: { userId: string }) {
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [zones, setZones] = useState<string[]>([]);
  const [items, setItems] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [zoneSearch, setZoneSearch] = useState("");
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, { id: string; user_id: string; message: string; created_at: string; author_name: string }[]>>({});
  const [responseDraft, setResponseDraft] = useState("");
  const [sendingResponse, setSendingResponse] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/requests", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nu am putut încărca cererile.");
      setItems(data.requests || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Eroare la încărcare."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    fetch("/api/catalog", { credentials: "same-origin", cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!data) return;
        const available = (data.categories || []).filter((item: { kind: string }) => item.kind === "both" || item.kind === "request").map((item: { name: string }) => item.name);
        if (available.length) setCategories(available);
        setZones((data.zones || []).map((item: { name: string }) => item.name));
      }).catch(() => { /* păstrează categoriile implicite dacă catalogul nu răspunde */ });
  }, []);

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = Object.fromEntries(["title", "description", "category", "location"].map(key => [key, String(form.get(key) || "")]));
    try {
      const response = await fetch("/api/requests", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Cererea nu a putut fi publicată.");
      setShowForm(false); setSuccess("Cererea ta a fost publicată.");
      formElement.reset();
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Eroare la publicare."); }
    finally { setSaving(false); }
  }

  async function updateStatus(item: HelpRequest) {
    const status = item.status === "open" ? "closed" : "open";
    try {
      const response = await fetch(`/api/requests/${encodeURIComponent(item.id)}`, {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Actualizarea a eșuat.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Eroare."); }
  }

  async function deleteRequest(item: HelpRequest) {
    if (!window.confirm("Sigur vrei să ștergi definitiv această cerere?")) return;
    try {
      const response = await fetch(`/api/requests/${encodeURIComponent(item.id)}`, { method: "DELETE", credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Ștergerea a eșuat.");
      setSuccess("Cererea a fost ștearsă."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Eroare."); }
  }

  useEffect(() => {
    if (!expandedRequest) return;
    let active = true;
    let refreshing = false;

    const refreshConversation = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const response = await fetch(`/api/requests/${encodeURIComponent(expandedRequest)}/responses`, {
          credentials: "same-origin",
          cache: "no-store"
        });
        if (!response.ok) return;
        const data = await response.json();
        if (active) {
          setResponses(current => ({ ...current, [expandedRequest]: data.responses || [] }));
        }
      } catch {
        // O eroare temporară de rețea nu întrerupe conversația; următoarea actualizare va reîncerca.
      } finally {
        refreshing = false;
      }
    };

    void refreshConversation();
    const intervalId = window.setInterval(() => void refreshConversation(), 5000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [expandedRequest]);

  function toggleResponses(item: HelpRequest) {
    if (expandedRequest === item.id) { setExpandedRequest(null); return; }
    setExpandedRequest(item.id);
    setResponseDraft("");
    setError("");
  }

  async function sendResponse(item: HelpRequest, event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSendingResponse(true); setError("");
    try {
      const response = await fetch(`/api/requests/${encodeURIComponent(item.id)}/responses`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: responseDraft })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Răspunsul nu a putut fi trimis.");
      setResponseDraft("");
      const refreshed = await fetch(`/api/requests/${encodeURIComponent(item.id)}/responses`, { credentials: "same-origin", cache: "no-store" });
      const refreshedData = await refreshed.json();
      if (refreshed.ok) setResponses(current => ({ ...current, [item.id]: refreshedData.responses || [] }));
      setSuccess("Răspunsul a fost trimis. Autorul cererii va primi o notificare.");
    } catch (e) { setError(e instanceof Error ? e.message : "Eroare la trimiterea răspunsului."); }
    finally { setSendingResponse(false); }
  }

  const visible = items.filter(item => (filter === "all" || item.user_id === userId) && (!zoneSearch.trim() || (item.location || "").toLocaleLowerCase("ro").includes(zoneSearch.trim().toLocaleLowerCase("ro"))));

  return <section className="help-requests-module">
    <div className="requests-toolbar">
      <div className="requests-filters">
        <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>Toate cererile</button>
        <button className={filter === "mine" ? "selected" : ""} onClick={() => setFilter("mine")}>Cererile mele</button>
      </div>
      <label className="zone-search"><MapPin size={16}/><input type="search" value={zoneSearch} onChange={event => setZoneSearch(event.target.value)} placeholder="Caută după zonă sau localitate" aria-label="Caută cereri după zonă sau localitate"/>{zoneSearch && <button type="button" onClick={() => setZoneSearch("")} aria-label="Șterge căutarea"><X size={14}/></button>}</label>
      <div className="requests-toolbar-actions">
        <button className="requests-refresh" onClick={() => void load()} disabled={loading} aria-label="Reîncarcă"><RefreshCw size={17}/></button>
        <button className="button button-primary" onClick={() => { setShowForm(!showForm); setError(""); }}><Plus size={17}/> Publică o cerere</button>
      </div>
    </div>

    {error && <div className="requests-alert error" role="alert">{error}</div>}
    {success && <div className="requests-alert success">{success}<button onClick={() => setSuccess("")} aria-label="Închide"><X size={15}/></button></div>}

    {showForm && <form className="request-form dashboard-panel" onSubmit={createRequest}>
      <div className="request-form-heading"><div><h2>Publică o cerere de ajutor</h2><p>Descrie clar de ce ai nevoie. Cererea va fi vizibilă membrilor autentificați.</p></div><button type="button" onClick={() => setShowForm(false)} aria-label="Închide"><X/></button></div>
      <label>Titlul cererii<input name="title" minLength={5} maxLength={120} placeholder="Ex.: Am nevoie de ajutor pentru..." required /></label>
      <label>Descriere<textarea name="description" minLength={20} maxLength={5000} rows={5} placeholder="Explică situația și ce fel de sprijin cauți..." required /></label>
      <div className="request-form-row">
        <label>Categorie<select name="category" required defaultValue=""><option value="" disabled>Alege categoria</option>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
        <label>Localitate / zonă (opțional)<input name="location" list="request-zones" maxLength={120} placeholder="Alege sau scrie localitatea" /><datalist id="request-zones">{zones.map(zone => <option key={zone} value={zone} />)}</datalist></label>
      </div>
      <div className="request-form-footer"><span>Te rugăm să nu incluzi date personale sensibile.</span><button className="button button-primary" disabled={saving}>{saving ? "Se publică..." : "Publică cererea"}</button></div>
    </form>}

    {loading ? <div className="requests-empty">Se încarcă cererile...</div> : visible.length === 0 ?
      <div className="dashboard-panel requests-empty"><div className="empty-icon"><Circle size={24}/></div><h2>Nu există cereri de afișat</h2><p>{filter === "mine" ? "Nu ai publicat încă nicio cerere în această zonă." : zoneSearch ? "Nu există cereri în zona căutată." : "Fii primul care publică o cerere de ajutor în comunitate."}</p></div> :
      <div className="requests-list">{visible.map(item => <article className="dashboard-panel request-card" key={item.id}>
        <div className="request-card-top"><span className={item.status === "open" ? "request-status open" : "request-status closed"}>{item.status === "open" ? "Deschisă" : "Închisă"}</span><span className="request-category">{item.category}</span></div>
        <h2>{item.title}</h2><p className="request-description">{item.description}</p>
        <div className="request-meta"><span>Publicat de {item.author_name}</span>{item.location && <span><MapPin size={14}/>{item.location}</span>}<span><CalendarDays size={14}/>{new Date(item.created_at).toLocaleDateString("ro-RO")}</span></div>
        <div className="request-card-actions">
          {item.user_id !== userId && item.status === "open" && <button onClick={() => void toggleResponses(item)}>Oferă ajutor / Vezi răspunsurile</button>}
          {item.user_id === userId && <><button onClick={() => void toggleResponses(item)}>Vezi conversația</button><button onClick={() => void updateStatus(item)}>{item.status === "open" ? <><CheckCircle2 size={15}/> Marchează rezolvată</> : <><Circle size={15}/> Redeschide</>}</button><button className="danger" onClick={() => void deleteRequest(item)}><Trash2 size={15}/> Șterge</button></>}
        </div>
        {expandedRequest === item.id && <div className="request-responses">
          <div className="request-conversation-heading">
            <div><span className="request-conversation-kicker">CONVERSAȚIE</span><h3>Mesaje despre această cerere</h3></div>
            <span className="request-message-count">{(responses[item.id] || []).length} mesaje</span>
          </div>
          <div className="request-chat-history" aria-live="polite">
            {(responses[item.id] || []).length === 0 ? <div className="request-chat-empty"><span>👋</span><strong>Începe conversația</strong><p>Scrie un mesaj pentru a lua legătura cu autorul cererii.</p></div> : (responses[item.id] || []).map(reply => <div className={`request-chat-row ${reply.user_id === userId ? "mine" : "theirs"}`} key={reply.id}>
              <div className="request-chat-avatar">{reply.author_name.trim().charAt(0).toUpperCase()}</div>
              <div className="request-chat-bubble"><div className="request-chat-author">{reply.user_id === userId ? "Tu" : reply.author_name}</div><p>{reply.message}</p><time>{new Date(reply.created_at).toLocaleString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</time></div>
            </div>)}
          </div>
          {item.status === "open" ? <form onSubmit={event => void sendResponse(item, event)} className="request-chat-composer">
            <label className="sr-only" htmlFor={`response-${item.id}`}>Scrie un mesaj</label>
            <textarea id={`response-${item.id}`} value={responseDraft} onChange={event => setResponseDraft(event.target.value)} minLength={10} maxLength={2000} rows={1} placeholder="Scrie un mesaj..." required />
            <div className="request-chat-composer-footer"><span>{responseDraft.length}/2000</span><button type="submit" aria-label="Trimite mesajul" title="Trimite mesajul" disabled={sendingResponse || responseDraft.trim().length < 10}><Send size={17}/><span>{sendingResponse ? "Se trimite..." : "Trimite"}</span></button></div>
          </form> : <p className="request-chat-closed">Această cerere este închisă. Conversația poate fi consultată, dar nu mai poți trimite mesaje.</p>}
        </div>}
      </article>)}</div>
    }
  </section>;
}

export default HelpRequests;
