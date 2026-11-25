import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, RefreshCw, MapPin, CalendarDays, Trash2, CheckCircle2, Circle, X, HeartHandshake } from "lucide-react";

type HelpOffer = {
  id: string; user_id: string; title: string; description: string; category: string;
  location: string | null; status: "active" | "closed"; created_at: string; author_name: string;
};

const defaultCategories = ["Comunitate", "Educație", "Sănătate", "Alimente și bunuri", "Transport", "Locuință", "Tehnologie", "Reparații și servicii", "Altele"];

function HelpOffers({ userId }: { userId: string }) {
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [zones, setZones] = useState<string[]>([]);
  const [items, setItems] = useState<HelpOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [zoneSearch, setZoneSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/offers", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nu am putut încărca ofertele.");
      setItems(data.offers || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Eroare la încărcare."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    fetch("/api/catalog", { credentials: "same-origin", cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!data) return;
        const available = (data.categories || []).filter((item: { kind: string }) => item.kind === "both" || item.kind === "offer").map((item: { name: string }) => item.name);
        if (available.length) setCategories(available);
        setZones((data.zones || []).map((item: { name: string }) => item.name));
      }).catch(() => { /* păstrează categoriile implicite dacă catalogul nu răspunde */ });
  }, []);

  async function createOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = Object.fromEntries(["title", "description", "category", "location"].map(key => [key, String(form.get(key) || "")]));
    try {
      const response = await fetch("/api/offers", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Oferta nu a putut fi publicată.");
      setShowForm(false); setSuccess("Oferta ta a fost publicată.");
      formElement.reset();
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Eroare la publicare."); }
    finally { setSaving(false); }
  }

  async function updateStatus(item: HelpOffer) {
    const status = item.status === "active" ? "closed" : "active";
    try {
      const response = await fetch(`/api/offers/${encodeURIComponent(item.id)}`, {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.diagnostic ? `${data.error || "Actualizarea a eșuat."} Detalii tehnice: ${data.diagnostic}` : data.error || "Actualizarea a eșuat.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Eroare."); }
  }

  async function deleteOffer(item: HelpOffer) {
    if (!window.confirm("Sigur vrei să ștergi definitiv această ofertă?")) return;
    try {
      const response = await fetch(`/api/offers/${encodeURIComponent(item.id)}`, { method: "DELETE", credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Ștergerea a eșuat.");
      setSuccess("Oferta a fost ștearsă."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Eroare."); }
  }

  const visible = items.filter(item => (filter === "all" || item.user_id === userId) && (!zoneSearch.trim() || (item.location || "").toLocaleLowerCase("ro").includes(zoneSearch.trim().toLocaleLowerCase("ro"))));

  return <section className="help-requests-module">
    <div className="requests-toolbar">
      <div className="requests-filters">
        <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>Toate ofertele</button>
        <button className={filter === "mine" ? "selected" : ""} onClick={() => setFilter("mine")}>Ofertele mele</button>
      </div>
      <label className="zone-search"><MapPin size={16}/><input type="search" value={zoneSearch} onChange={event => setZoneSearch(event.target.value)} placeholder="Caută după zonă sau localitate" aria-label="Caută oferte după zonă sau localitate"/>{zoneSearch && <button type="button" onClick={() => setZoneSearch("")} aria-label="Șterge căutarea"><X size={14}/></button>}</label>
      <div className="requests-toolbar-actions">
        <button className="requests-refresh" onClick={() => void load()} disabled={loading} aria-label="Reîncarcă"><RefreshCw size={17}/></button>
        <button className="button button-primary" onClick={() => { setShowForm(!showForm); setError(""); }}><Plus size={17}/> Publică o ofertă</button>
      </div>
    </div>

    {error && <div className="requests-alert error" role="alert">{error}</div>}
    {success && <div className="requests-alert success">{success}<button onClick={() => setSuccess("")} aria-label="Închide"><X size={15}/></button></div>}

    {showForm && <form className="request-form dashboard-panel" onSubmit={createOffer}>
      <div className="request-form-heading"><div><h2>Publică o ofertă de ajutor</h2><p>Spune comunității ce sprijin poți oferi.</p></div><button type="button" onClick={() => setShowForm(false)} aria-label="Închide"><X/></button></div>
      <label>Titlul ofertei<input name="title" minLength={5} maxLength={120} placeholder="Ex.: Ofer meditații gratuite la..." required /></label>
      <label>Descriere<textarea name="description" minLength={20} maxLength={5000} rows={5} placeholder="Descrie ce poți oferi, cui și în ce condiții..." required /></label>
      <div className="request-form-row">
        <label>Categorie<select name="category" required defaultValue=""><option value="" disabled>Alege categoria</option>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
        <label>Localitate / zonă (opțional)<input name="location" list="offer-zones" maxLength={120} placeholder="Alege sau scrie localitatea" /><datalist id="offer-zones">{zones.map(zone => <option key={zone} value={zone} />)}</datalist></label>
      </div>
      <div className="request-form-footer"><span>Nu include date personale sensibile.</span><button className="button button-primary" disabled={saving}>{saving ? "Se publică..." : "Publică oferta"}</button></div>
    </form>}

    {loading ? <div className="requests-empty">Se încarcă ofertele...</div> : visible.length === 0 ?
      <div className="dashboard-panel requests-empty"><div className="empty-icon"><HeartHandshake size={24}/></div><h2>Nu există oferte de afișat</h2><p>{filter === "mine" ? "Nu ai publicat încă nicio ofertă în această zonă." : zoneSearch ? "Nu există oferte în zona căutată." : "Fii primul care oferă ajutor comunității."}</p></div> :
      <div className="requests-list">{visible.map(item => <article className="dashboard-panel request-card" key={item.id}>
        <div className="request-card-top"><span className={item.status === "active" ? "request-status open" : "request-status closed"}>{item.status === "active" ? "Disponibilă" : "Indisponibilă"}</span><span className="request-category">{item.category}</span></div>
        <h2>{item.title}</h2><p className="request-description">{item.description}</p>
        <div className="request-meta"><span>Oferit de {item.author_name}</span>{item.location && <span><MapPin size={14}/>{item.location}</span>}<span><CalendarDays size={14}/>{new Date(item.created_at).toLocaleDateString("ro-RO")}</span></div>
        {item.user_id === userId && <div className="request-card-actions"><button onClick={() => void updateStatus(item)}>{item.status === "active" ? <><CheckCircle2 size={15}/> Marchează indisponibilă</> : <><Circle size={15}/> Reactivează oferta</>}</button><button className="danger" onClick={() => void deleteOffer(item)}><Trash2 size={15}/> Șterge</button></div>}
      </article>)}</div>
    }
  </section>;
}

export default HelpOffers;
