// src/components/fiche/FicheClient.tsx
// Fiche entreprise Kleios IFC
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import type { ContactRecord, EntrepriseContact, Alternant, Echange } from "../../types/crm";

interface FicheClientProps {
  record: ContactRecord;
  onSave: (record: ContactRecord) => void;
  onClose: () => void;
  onTabChange: (tab: string) => void;
  onPlanifierVisite?: (entrepriseId: string, entrepriseNom: string) => void;
  colorNavy: string;
  colorGold: string;
}

const ORANGE = "#F26522";
const NAVY   = "#1A2E44";

const TABS = [
  { id: "synthese",   label: "Synthèse" },
  { id: "general",   label: "Informations" },
  { id: "contacts",  label: "Contacts" },
  { id: "alternants",label: "Alternants" },
  { id: "postes",    label: "Postes à pourvoir" },
  { id: "echanges",  label: "Échanges / Relances" },
];

const FORME_OPTIONS = ["SA", "SAS", "SASU", "SARL", "EURL", "SNC", "EI", "EIRL", "Auto-entrepreneur", "Association", "Autre"];
const STATUS_OPTIONS = [
  { value: "partenaire", label: "Partenaire" },
  { value: "prospect",   label: "Prospect" },
  { value: "inactif",    label: "Inactif" },
];
const ROLE_OPTIONS = ["dirigeant", "tuteur", "rh", "contact_principal", "autre"];

const field: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "#4A7FA5", letterSpacing: 0.4, marginBottom: 4, display: "block" };
const inp: React.CSSProperties  = { border: "1px solid rgba(26,46,68,0.15)", borderRadius: 7, padding: "7px 10px", fontSize: 12, fontFamily: "inherit", color: NAVY, background: "#F9FAFB", width: "100%", outline: "none" };
const card: React.CSSProperties = { background: "rgba(255,255,255,0.95)", border: "1px solid rgba(26,46,68,0.08)", borderRadius: 10, marginBottom: 14, overflow: "hidden" };
const cardHead: React.CSSProperties = { padding: "10px 16px", background: "rgba(208,228,242,0.35)", borderBottom: "1px solid rgba(74,127,165,0.12)", fontSize: 12, fontWeight: 600, color: NAVY, display: "flex", alignItems: "center", gap: 8 };

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function FicheClient({ record, onSave, onClose, onTabChange: _otc, onPlanifierVisite, colorNavy: _cn, colorGold: _cg }: FicheClientProps) {
  const [tab, setTab] = useState("synthese");
  const entreprise = record.payload?.contact;
  const contacts: EntrepriseContact[] = record.payload?.contacts ?? [];
  const alternants: Alternant[] = record.payload?.alternants ?? [];
  const postes: any[] = (record.payload?.postes ?? []) as any;
  const echanges: Echange[] = record.payload?.echanges ?? [];

  // Sauvegarde d'un champ entreprise
  const saveEntreprise = (key: string, value: any) => {
    onSave({ ...record, payload: { ...record.payload, contact: { ...entreprise, [key]: value } as any } });
  };

  // ── Formulaire nouvel échange ──
  const [showEchange, setShowEchange] = useState(false);
  const [newEchange, setNewEchange] = useState<Partial<Echange>>({ type: "appel", status: "realise", date: new Date().toISOString().slice(0, 10) });

  const saveEchange = () => {
    if (!newEchange.notes && !newEchange.sujet) return;
    const e: Echange = {
      id: crypto.randomUUID(), date: newEchange.date ?? new Date().toISOString(),
      type: newEchange.type ?? "note", status: newEchange.status ?? "realise",
      interlocuteur: newEchange.interlocuteur ?? "", sujet: newEchange.sujet ?? "",
      notes: newEchange.notes ?? "", actionSuivante: newEchange.actionSuivante ?? "",
      dateActionSuivante: newEchange.dateActionSuivante ?? "", createdAt: new Date().toISOString(),
    };
    onSave({ ...record, payload: { ...record.payload, echanges: [e, ...echanges] } as any });
    setShowEchange(false);
    setNewEchange({ type: "appel", status: "realise", date: new Date().toISOString().slice(0, 10) });
  };

  // ── Formulaire nouveau contact ──
  const [showContact, setShowContact] = useState(false);
  const [newContact, setNewContact] = useState<Partial<EntrepriseContact>>({ role: "tuteur", gender: "M" });

  const saveContact = () => {
    if (!newContact.firstName && !newContact.lastName) return;
    const c: EntrepriseContact = {
      id: crypto.randomUUID(), role: newContact.role ?? "autre",
      gender: newContact.gender ?? "M", firstName: newContact.firstName ?? "",
      lastName: newContact.lastName ?? "", fonction: newContact.fonction ?? "",
      email: newContact.email ?? "", phone: newContact.phone ?? "", notes: newContact.notes ?? "",
    };
    onSave({ ...record, payload: { ...record.payload, contacts: [...contacts, c] } as any });
    setShowContact(false);
    setNewContact({ role: "tuteur", gender: "M" });
  };

  // Header couleurs
  const statusColors: Record<string, string> = { partenaire: "#059669", prospect: ORANGE, inactif: "#9CA3AF" };
  const statusColor = statusColors[record.status] ?? "#9CA3AF";

  return (
    <div>
      {/* ── Header entreprise ── */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #2A4A6B 100%)`, borderRadius: 12, padding: "18px 22px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16, position: "relative", boxShadow: "0 4px 20px rgba(26,46,68,0.22)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${ORANGE}, #F5855A)`, borderRadius: "12px 12px 0 0" }} />
        {/* Logo initiales */}
        <div style={{ width: 52, height: 52, borderRadius: 12, background: `${ORANGE}25`, border: `2px solid ${ORANGE}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: ORANGE, flexShrink: 0 }}>
          {record.displayName.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{record.displayName}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 3 }}>
            {[entreprise?.formeJuridique, entreprise?.siret, entreprise?.city].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${statusColor}25`, color: statusColor, border: `1px solid ${statusColor}40` }}>
            {STATUS_OPTIONS.find(s => s.value === record.status)?.label ?? record.status}
          </span>
          {record.campus && (
            <span style={{ padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: `${ORANGE}20`, color: ORANGE, border: `1px solid ${ORANGE}35` }}>
              {record.campus}
            </span>
          )}
          <button onClick={onClose} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.10)", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← Retour</button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 2, marginBottom: 18, background: "rgba(255,255,255,0.80)", borderRadius: 10, border: "1px solid rgba(26,46,68,0.08)", overflow: "hidden" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 8px", border: "none", borderBottom: `2px solid ${tab === t.id ? ORANGE : "transparent"}`,
            background: tab === t.id ? `${ORANGE}08` : "transparent",
            color: tab === t.id ? ORANGE : "#7A9AB0",
            fontSize: 12, fontWeight: tab === t.id ? 600 : 400,
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
          }}>
            {t.label}
            {t.id === "alternants" && alternants.length > 0 && <span style={{ marginLeft: 4, background: ORANGE, color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: 10 }}>{alternants.length}</span>}
            {t.id === "postes" && postes.filter(p => p.status === "ouvert").length > 0 && <span style={{ marginLeft: 4, background: "#059669", color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: 10 }}>{postes.filter(p => p.status === "ouvert").length}</span>}
            {t.id === "echanges" && echanges.length > 0 && <span style={{ marginLeft: 4, background: "#4A7FA5", color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: 10 }}>{echanges.length}</span>}
          </button>
        ))}
      </div>

      {/* ── Synthèse ── */}
      {tab === "synthese" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 14 }}>
          {/* Colonne gauche */}
          <div>
            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Alternants historique", value: alternants.length, color: NAVY },
                { label: "Postes ouverts", value: postes.filter(p => p.status === "ouvert").length, color: "#059669" },
                { label: "Échanges RRE", value: echanges.length, color: "#4A7FA5" },
              ].map(k => (
                <div key={k.label} style={{ ...card, marginBottom: 0 }}>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: 9, color: "#9CA3AF", letterSpacing: 0.5, marginBottom: 4 }}>{k.label.toUpperCase()}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Infos rapides */}
            <div style={card}>
              <div style={cardHead}><div style={{ width: 8, height: 8, borderRadius: "50%", background: ORANGE }} />Identité</div>
              <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Forme juridique", val: entreprise?.formeJuridique },
                  { label: "SIRET", val: entreprise?.siret },
                  { label: "Code APE", val: entreprise?.codeApe },
                  { label: "Convention collective", val: entreprise?.conventionCollective },
                  { label: "OPCO", val: entreprise?.opco },
                  { label: "Nb salariés", val: entreprise?.nbSalaries },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div style={field}>{label.toUpperCase()}</div>
                    <div style={{ fontSize: 13, color: val ? NAVY : "#9CA3AF" }}>{val || "—"}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Derniers échanges */}
            {echanges.length > 0 && (
              <div style={card}>
                <div style={cardHead}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4A7FA5" }} />Derniers échanges</div>
                <div style={{ padding: "8px 0" }}>
                  {echanges.slice(0, 3).map((e, i) => (
                    <div key={e.id} style={{ padding: "10px 16px", borderBottom: i < 2 && i < echanges.slice(0, 3).length - 1 ? "1px solid rgba(26,46,68,0.06)" : "none", display: "flex", gap: 12 }}>
                      <div style={{ fontSize: 11, color: "#9CA3AF", minWidth: 70, flexShrink: 0 }}>{formatDate(e.date)}</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: NAVY }}>{e.sujet || e.type}</div>
                        <div style={{ fontSize: 11, color: "#7A9AB0", marginTop: 2 }}>{e.notes?.slice(0, 80)}{(e.notes?.length ?? 0) > 80 ? "..." : ""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Colonne droite */}
          <div>
            {/* Coordonnées */}
            <div style={card}>
              <div style={cardHead}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4A7FA5" }} />Coordonnées</div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Adresse", val: [entreprise?.address1, entreprise?.address2, entreprise?.postalCode, entreprise?.city].filter(Boolean).join(", ") },
                  { label: "Email", val: entreprise?.email },
                  { label: "Téléphone fixe", val: entreprise?.telFixe },
                  { label: "Mobile", val: entreprise?.telMobile },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div style={field}>{label.toUpperCase()}</div>
                    <div style={{ fontSize: 12, color: val ? NAVY : "#9CA3AF" }}>{val || "—"}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contacts entreprise */}
            <div style={card}>
              <div style={{ ...cardHead, justifyContent: "space-between" }}>
                <span><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#059669", display: "inline-block", marginRight: 8 }} />Contacts ({contacts.length})</span>
                <button onClick={() => { setTab("contacts"); }} style={{ fontSize: 10, color: ORANGE, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Gérer →</button>
              </div>
              <div style={{ padding: "8px 0" }}>
                {contacts.length === 0 ? (
                  <div style={{ padding: "12px 16px", fontSize: 12, color: "#9CA3AF" }}>Aucun contact renseigné</div>
                ) : contacts.slice(0, 3).map(c => (
                  <div key={c.id} style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${ORANGE}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: ORANGE }}>
                      {(c.firstName[0] ?? "") + (c.lastName[0] ?? "")}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: NAVY }}>{c.firstName} {c.lastName}</div>
                      <div style={{ fontSize: 10, color: "#9CA3AF" }}>{c.role} {c.email ? `· ${c.email}` : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alternants récents */}
            {alternants.length > 0 && (
              <div style={card}>
                <div style={{ ...cardHead, justifyContent: "space-between" }}>
                  <span><div style={{ width: 8, height: 8, borderRadius: "50%", background: NAVY, display: "inline-block", marginRight: 8 }} />Alternants</span>
                  <button onClick={() => setTab("alternants")} style={{ fontSize: 10, color: ORANGE, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Tous →</button>
                </div>
                <div style={{ padding: "8px 0" }}>
                  {alternants.slice(0, 4).map(a => (
                    <div key={a.id} style={{ padding: "7px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 12, color: NAVY }}>{a.prenom} {a.nom}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>{a.classe} {a.annee}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Informations générales ── */}
      {tab === "general" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={card}>
            <div style={cardHead}>Identité juridique</div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Forme juridique", key: "formeJuridique", type: "select", options: FORME_OPTIONS },
                { label: "Nom", key: "nom" },
                { label: "Enseigne", key: "enseigne" },
                { label: "SIRET", key: "siret" },
                { label: "Code APE", key: "codeApe" },
                { label: "Code IDCC", key: "codeIdcc" },
                { label: "Numéro TVA", key: "numeroTva" },
                { label: "Nb salariés", key: "nbSalaries", type: "number" },
              ].map(({ label, key, type, options }) => (
                <div key={key}>
                  <label style={field}>{label.toUpperCase()}</label>
                  {type === "select" ? (
                    <select value={(entreprise as any)?.[key] ?? ""} onChange={e => saveEntreprise(key, e.target.value)} style={{ ...inp, appearance: "none" }}>
                      <option value="">—</option>
                      {options!.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={type ?? "text"} value={(entreprise as any)?.[key] ?? ""} onChange={e => saveEntreprise(key, e.target.value)} style={inp} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={card}>
              <div style={cardHead}>Coordonnées</div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "Adresse 1", key: "address1" },
                  { label: "Adresse 2", key: "address2" },
                  { label: "Code postal", key: "postalCode" },
                  { label: "Ville", key: "city" },
                  { label: "Email", key: "email", type: "email" },
                  { label: "Téléphone fixe", key: "telFixe" },
                  { label: "Mobile", key: "telMobile" },
                  { label: "Site web", key: "website" },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label style={field}>{label.toUpperCase()}</label>
                    <input type={type ?? "text"} value={(entreprise as any)?.[key] ?? ""} onChange={e => saveEntreprise(key, e.target.value)} style={inp} />
                  </div>
                ))}
              </div>
            </div>

            <div style={card}>
              <div style={cardHead}>Formation & OPCO</div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "Secteur d'activité", key: "activite" },
                  { label: "Convention collective", key: "conventionCollective" },
                  { label: "OPCO", key: "opco" },
                  { label: "Caisse de retraite", key: "caisseRetraite" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label style={field}>{label.toUpperCase()}</label>
                    <input value={(entreprise as any)?.[key] ?? ""} onChange={e => saveEntreprise(key, e.target.value)} style={inp} />
                  </div>
                ))}
                <div>
                  <label style={field}>STATUT CRM</label>
                  <select value={record.status} onChange={e => onSave({ ...record, status: e.target.value as any })} style={{ ...inp, appearance: "none" }}>
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={field}>NOTES</label>
                  <textarea value={entreprise?.notes ?? ""} onChange={e => saveEntreprise("notes", e.target.value)} style={{ ...inp, height: 80, resize: "vertical" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Contacts entreprise ── */}
      {tab === "contacts" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <button onClick={() => setShowContact(true)} style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: ORANGE, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              + Ajouter un contact
            </button>
          </div>
          {showContact && (
            <div style={{ ...card, marginBottom: 14 }}>
              <div style={cardHead}>Nouveau contact</div>
              <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { label: "Prénom", key: "firstName" }, { label: "Nom", key: "lastName" },
                  { label: "Fonction", key: "fonction" }, { label: "Email", key: "email", type: "email" },
                  { label: "Téléphone", key: "phone" }, { label: "Notes", key: "notes" },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label style={field}>{label.toUpperCase()}</label>
                    <input type={type ?? "text"} value={(newContact as any)[key] ?? ""} onChange={e => setNewContact(f => ({ ...f, [key]: e.target.value }))} style={inp} />
                  </div>
                ))}
                <div>
                  <label style={field}>RÔLE</label>
                  <select value={newContact.role ?? "tuteur"} onChange={e => setNewContact(f => ({ ...f, role: e.target.value as any }))} style={{ ...inp, appearance: "none" }}>
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "1/-1", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowContact(false)} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(26,46,68,0.15)", background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
                  <button onClick={saveContact} style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: ORANGE, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Enregistrer</button>
                </div>
              </div>
            </div>
          )}
          {contacts.length === 0 ? (
            <div style={{ ...card, padding: 30, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Aucun contact renseigné</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {contacts.map(c => (
                <div key={c.id} style={card}>
                  <div style={{ padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${ORANGE}15`, border: `1px solid ${ORANGE}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: ORANGE, flexShrink: 0 }}>
                      {(c.firstName[0] ?? "") + (c.lastName[0] ?? "")}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{c.firstName} {c.lastName}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1, textTransform: "capitalize" }}>{c.role}{c.fonction ? ` · ${c.fonction}` : ""}</div>
                      {c.email && <div style={{ fontSize: 12, color: "#4A7FA5", marginTop: 4 }}>✉ {c.email}</div>}
                      {c.phone && <div style={{ fontSize: 12, color: "#4B5563", marginTop: 2 }}>☎ {c.phone}</div>}
                      {c.notes && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6, fontStyle: "italic" }}>{c.notes}</div>}
                    </div>
                    <button onClick={() => { const updated = contacts.filter(x => x.id !== c.id); onSave({ ...record, payload: { ...record.payload, contacts: updated } as any }); }}
                      style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(220,38,38,0.2)", background: "#fff", fontSize: 11, cursor: "pointer", color: "#DC2626" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Alternants ── */}
      {tab === "alternants" && (
        <div>
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={cardHead}><div style={{ width: 8, height: 8, borderRadius: "50%", background: NAVY }} />Historique des alternants ({alternants.length})</div>
            {alternants.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Aucun alternant enregistré — importez depuis Gesform ou saisissez manuellement.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F9FAFB" }}>
                    {["Nom", "Formation", "Année", "Type", "Statut"].map(h => (
                      <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid rgba(26,46,68,0.08)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alternants.map((a, i) => (
                    <tr key={a.id} style={{ borderBottom: i < alternants.length - 1 ? "1px solid rgba(26,46,68,0.06)" : "none" }}>
                      <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 500, color: NAVY }}>{a.prenom} {a.nom}</td>
                      <td style={{ padding: "10px 16px", fontSize: 12, color: "#4B5563" }}>{a.classe}</td>
                      <td style={{ padding: "10px 16px", fontSize: 12, color: "#4B5563" }}>{a.annee}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: a.type === "apprentissage" ? "#DBEAFE" : a.type === "pro" ? "#D1FAE5" : "#F3F4F6", color: a.type === "apprentissage" ? "#1D4ED8" : a.type === "pro" ? "#065F46" : "#6B7280" }}>
                          {a.type}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: a.statut === "en_cours" ? `${ORANGE}15` : "#F3F4F6", color: a.statut === "en_cours" ? ORANGE : "#6B7280" }}>
                          {a.statut === "en_cours" ? "En cours" : a.statut === "termine" ? "Terminé" : "Rompu"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Postes à pourvoir ── */}
      {tab === "postes" && (
        <div style={{ ...card, padding: 30, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
          Module postes à pourvoir — à développer
        </div>
      )}

      {/* ── Échanges / Relances ── */}
      {tab === "echanges" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <button onClick={() => setShowEchange(true)} style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: ORANGE, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              + Nouvel échange
            </button>
            {onPlanifierVisite && (
              <button
                onClick={() => onPlanifierVisite(record.id, record.displayName)}
                style={{ padding: "7px 16px", borderRadius: 7, border: `1px solid ${NAVY}25`, background: "#fff", color: NAVY, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                📋 Planifier une visite tuteur
              </button>
            )}
          </div>
          {showEchange && (
            <div style={{ ...card, marginBottom: 14 }}>
              <div style={cardHead}>Saisir un échange</div>
              <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={field}>DATE</label>
                  <input type="date" value={newEchange.date ?? ""} onChange={e => setNewEchange(f => ({ ...f, date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={field}>TYPE</label>
                  <select value={newEchange.type ?? "appel"} onChange={e => setNewEchange(f => ({ ...f, type: e.target.value as any }))} style={{ ...inp, appearance: "none" }}>
                    {["appel", "email", "visite", "note", "relance"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={field}>INTERLOCUTEUR</label>
                  <input value={newEchange.interlocuteur ?? ""} onChange={e => setNewEchange(f => ({ ...f, interlocuteur: e.target.value }))} placeholder="Nom du RRE ou contact" style={inp} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={field}>SUJET</label>
                  <input value={newEchange.sujet ?? ""} onChange={e => setNewEchange(f => ({ ...f, sujet: e.target.value }))} placeholder="Objet de l'échange" style={inp} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={field}>NOTES / COMPTE-RENDU</label>
                  <textarea value={newEchange.notes ?? ""} onChange={e => setNewEchange(f => ({ ...f, notes: e.target.value }))} rows={3} style={{ ...inp, height: 80, resize: "vertical" }} />
                </div>
                <div>
                  <label style={field}>ACTION SUIVANTE</label>
                  <input value={newEchange.actionSuivante ?? ""} onChange={e => setNewEchange(f => ({ ...f, actionSuivante: e.target.value }))} placeholder="Rappeler, envoyer convention..." style={inp} />
                </div>
                <div>
                  <label style={field}>DATE ACTION SUIVANTE</label>
                  <input type="date" value={newEchange.dateActionSuivante ?? ""} onChange={e => setNewEchange(f => ({ ...f, dateActionSuivante: e.target.value }))} style={inp} />
                </div>
                <div style={{ gridColumn: "1/-1", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowEchange(false)} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(26,46,68,0.15)", background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
                  <button onClick={saveEchange} style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: ORANGE, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Enregistrer</button>
                </div>
              </div>
            </div>
          )}
          {echanges.length === 0 ? (
            <div style={{ ...card, padding: 30, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Aucun échange enregistré</div>
          ) : (
            <div>
              {echanges.map((e) => (
                <div key={e.id} style={{ ...card }}>
                  <div style={{ padding: "12px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 80, textAlign: "right" }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: NAVY }}>{formatDate(e.date)}</div>
                      <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: `${ORANGE}15`, color: ORANGE, textTransform: "capitalize" }}>{e.type}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      {e.sujet && <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 4 }}>{e.sujet}</div>}
                      <div style={{ fontSize: 12, color: "#4B5563", lineHeight: 1.5 }}>{e.notes}</div>
                      {e.interlocuteur && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>Par : {e.interlocuteur}</div>}
                      {e.actionSuivante && (
                        <div style={{ marginTop: 8, padding: "6px 10px", background: `${ORANGE}10`, border: `1px solid ${ORANGE}25`, borderRadius: 6, fontSize: 11, color: ORANGE }}>
                          → {e.actionSuivante}{e.dateActionSuivante ? ` (avant le ${formatDate(e.dateActionSuivante)})` : ""}
                        </div>
                      )}
                    </div>
                    <button onClick={() => { const updated = echanges.filter(x => x.id !== e.id); onSave({ ...record, payload: { ...record.payload, echanges: updated } as any }); }}
                      style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(220,38,38,0.2)", background: "#fff", fontSize: 11, cursor: "pointer", color: "#DC2626" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
