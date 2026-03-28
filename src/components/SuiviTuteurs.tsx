// src/components/SuiviTuteurs.tsx
// Suivi des visites tuteurs IFC
// Vue dashboard → liste → formulaire
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect } from "react";
import type { ContactRecord } from "../types/crm";
import type { PlacementCard } from "./PipelinePlacement";

interface SuiviTuteursProps {
  contacts: ContactRecord[];
  userId: string;
  userEmail?: string;
  colorNavy: string;
  colorGold: string;
  campusRRE?: string;
  defaultEntrepriseId?: string;
  defaultEntrepriseNom?: string;
  onPendingVisiteHandled?: () => void;
  objectifVisitesMois?: number;   // depuis cabinet.objectifVisitesMois
}

export type VisiteStatut = "planifiee" | "realisee" | "annulee" | "a_planifier";

export interface VisiteTuteur {
  id: string; userId: string;
  prenomEtudiant: string; nomEtudiant: string;
  formation: string; campus: string;
  entrepriseId: string; entrepriseNom: string;
  tuteurNom: string; tuteurFonction: string;
  statut: VisiteStatut;
  dateVisite: string; dateProchaine: string;
  frequenceMois: number; rre: string;
  cr: string; pointsPositifs: string; pointsAttention: string;
  createdAt: string; updatedAt: string;
}

const ORANGE = "#F26522";
const NAVY   = "#1A2E44";
const PIPELINE_KEY = "kleios_ifc_pipeline_";
const VISITES_KEY  = "kleios_ifc_visites_";
const FREQUENCES = [
  { value: 3, label: "Trimestrielle (3 mois)" },
  { value: 6, label: "Semestrielle (6 mois)" },
  { value: 12, label: "Annuelle (12 mois)" },
];
const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  a_planifier: { color: "#6B7280", bg: "#F3F4F6", border: "#9CA3AF", label: "À planifier" },
  planifiee:   { color: "#185FA5", bg: "#E6F1FB", border: "#378ADD", label: "Planifiée" },
  realisee:    { color: "#0F6E56", bg: "#ECFDF5", border: "#1D9E75", label: "Réalisée" },
  annulee:     { color: "#9CA3AF", bg: "#F9FAFB", border: "#D1D5DB", label: "Annulée" },
};

function loadVisites(userId: string): VisiteTuteur[] {
  try { return JSON.parse(localStorage.getItem(VISITES_KEY + userId) ?? "[]"); }
  catch { return []; }
}
function saveVisites(userId: string, v: VisiteTuteur[]) {
  localStorage.setItem(VISITES_KEY + userId, JSON.stringify(v));
}
function loadPipeline(userId: string): PlacementCard[] {
  try { return JSON.parse(localStorage.getItem(PIPELINE_KEY + userId) ?? "[]"); }
  catch { return []; }
}
function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function joursRestants(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}
function urgenceStyle(jours: number, statut: VisiteStatut) {
  if (statut === "realisee" || statut === "annulee") return null;
  if (jours < 0)  return { dot: "#E24B4A", label: `En retard de ${Math.abs(jours)}j`, bg: "#FCEBEB", color: "#A32D2D" };
  if (jours < 14) return { dot: "#EF9F27", label: `Dans ${jours}j`, bg: "#FAEEDA", color: "#854F0B" };
  if (jours < 30) return { dot: "#378ADD", label: `Dans ${jours}j`, bg: "#E6F1FB", color: "#185FA5" };
  return null;
}

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid rgba(26,46,68,0.15)", fontSize: 13, fontFamily: "inherit", outline: "none", color: NAVY, background: "#F9FAFB" };
const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "#4A7FA5", letterSpacing: 0.4, display: "block", marginBottom: 4 };

// ── Formulaire ────────────────────────────────────────────────────────────────
function VisiteForm({ visite, contacts, pipeline, defaultStatut, defaultEntrepriseId, defaultEntrepriseNom, campusRRE, onSave, onClose }: {
  visite?: Partial<VisiteTuteur>;
  contacts: ContactRecord[];
  pipeline: PlacementCard[];
  defaultStatut?: VisiteStatut;
  defaultEntrepriseId?: string;
  defaultEntrepriseNom?: string;
  campusRRE?: string;
  onSave: (v: VisiteTuteur) => void;
  onClose: () => void;
}) {
  const deId = defaultEntrepriseId ?? "";
  const deNom = defaultEntrepriseNom ?? "";
  const cRRE = campusRRE ?? "";
  const [form, setForm] = useState<Partial<VisiteTuteur>>(
    visite ?? {
      statut: defaultStatut ?? "planifiee", frequenceMois: 6,
      dateVisite: new Date().toISOString().slice(0, 10),
      entrepriseId: deId,
      entrepriseNom: deNom,
    }
  );
  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const [saisieLibre, setSaisieLibre] = useState(false);

  const [selCampus, setSelCampus] = useState(cRRE);
  const [selFormation, setSelFormation] = useState("");

  // Filtres pipeline selon hiérarchie
  const campusOptions = [...new Set(pipeline.map(p => p.campus).filter(Boolean))];
  const filteredByFormation = pipeline.filter(p =>
    (!selCampus || p.campus === selCampus) &&
    (!selFormation || p.formation === selFormation)
  );
  const formationOptions = [...new Set(
    pipeline.filter(p => !selCampus || p.campus === selCampus).map(p => p.formation).filter(Boolean)
  )];

  const handleSelectEtudiant = (id: string) => {
    const card = pipeline.find(p => p.id === id);
    if (!card) return;
    upd("prenomEtudiant", card.prenomEtudiant);
    upd("nomEtudiant", card.nomEtudiant);
    upd("formation", card.formation);
    upd("campus", card.campus);
    upd("entrepriseId", card.entrepriseId ?? "");
    upd("entrepriseNom", card.entrepriseNom);
  };

  const submit = () => {
    if (!form.prenomEtudiant && !form.nomEtudiant) return;
    const now = new Date().toISOString();
    const dateRef = form.dateVisite ? new Date(form.dateVisite) : new Date();
    dateRef.setMonth(dateRef.getMonth() + (form.frequenceMois ?? 6));
    onSave({
      id: form.id ?? crypto.randomUUID(), userId: form.userId ?? "",
      prenomEtudiant: form.prenomEtudiant ?? "", nomEtudiant: form.nomEtudiant ?? "",
      formation: form.formation ?? "", campus: form.campus ?? "",
      entrepriseId: form.entrepriseId ?? "", entrepriseNom: form.entrepriseNom ?? "",
      tuteurNom: form.tuteurNom ?? "", tuteurFonction: form.tuteurFonction ?? "",
      statut: form.statut ?? "planifiee",
      dateVisite: form.dateVisite ?? now,
      dateProchaine: form.dateProchaine || dateRef.toISOString().slice(0, 10),
      frequenceMois: form.frequenceMois ?? 6, rre: form.rre ?? "",
      cr: form.cr ?? "", pointsPositifs: form.pointsPositifs ?? "",
      pointsAttention: form.pointsAttention ?? "",
      createdAt: form.createdAt ?? now, updatedAt: now,
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,46,68,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 560, boxShadow: "0 20px 60px rgba(26,46,68,0.25)", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>{form.id ? "Modifier la visite" : "Nouvelle visite tuteur"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9CA3AF" }}>✕</button>
        </div>

        {/* Sélection hiérarchique ou saisie libre */}
        {!form.id && !form.prenomEtudiant && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button onClick={() => setSaisieLibre(false)} style={{ flex: 1, padding: "7px", borderRadius: 7, border: `1px solid ${!saisieLibre ? ORANGE : "rgba(26,46,68,0.15)"}`, background: !saisieLibre ? `${ORANGE}12` : "#fff", color: !saisieLibre ? ORANGE : "#6B7280", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: !saisieLibre ? 600 : 400 }}>
                Depuis le pipeline
              </button>
              <button onClick={() => setSaisieLibre(true)} style={{ flex: 1, padding: "7px", borderRadius: 7, border: `1px solid ${saisieLibre ? ORANGE : "rgba(26,46,68,0.15)"}`, background: saisieLibre ? `${ORANGE}12` : "#fff", color: saisieLibre ? ORANGE : "#6B7280", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: saisieLibre ? 600 : 400 }}>
                Saisie libre (Gesform)
              </button>
            </div>

            {!saisieLibre && (
              <div style={{ padding: 12, background: `${ORANGE}06`, border: `1px solid ${ORANGE}18`, borderRadius: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={lbl}>CAMPUS</label>
                    <select value={selCampus} onChange={e => { setSelCampus(e.target.value); setSelFormation(""); }} style={{ ...inp, appearance: "none", background: "#fff" }}>
                      <option value="">{cRRE || "— Campus —"}</option>
                      {campusOptions.filter(c => c !== cRRE).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>FORMATION / CLASSE</label>
                    <select value={selFormation} onChange={e => setSelFormation(e.target.value)} style={{ ...inp, appearance: "none", background: "#fff" }}>
                      <option value="">— Toutes —</option>
                      {formationOptions.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>ÉTUDIANT</label>
                    <select onChange={e => handleSelectEtudiant(e.target.value)} style={{ ...inp, appearance: "none", background: "#fff" }}>
                      <option value="">— Sélectionner —</option>
                      {filteredByFormation.filter(p => p.stage === "apparie" || p.stage === "place").map(p => (
                        <option key={p.id} value={p.id}>{p.prenomEtudiant} {p.nomEtudiant} → {p.entrepriseNom || "Sans entreprise"}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {filteredByFormation.filter(p => p.stage === "apparie" || p.stage === "place").length === 0 && (
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8, textAlign: "center" }}>Aucun étudiant placé avec ces filtres</div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid rgba(26,46,68,0.08)" }}>Étudiant</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div><label style={lbl}>PRÉNOM</label><input value={form.prenomEtudiant ?? ""} onChange={e => upd("prenomEtudiant", e.target.value)} style={inp} /></div>
          <div><label style={lbl}>NOM</label><input value={form.nomEtudiant ?? ""} onChange={e => upd("nomEtudiant", e.target.value)} style={inp} /></div>
          <div><label style={lbl}>FORMATION</label><input value={form.formation ?? ""} onChange={e => upd("formation", e.target.value)} style={inp} /></div>
          <div><label style={lbl}>CAMPUS</label><input value={form.campus ?? ""} onChange={e => upd("campus", e.target.value)} style={inp} /></div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid rgba(26,46,68,0.08)" }}>Entreprise & Tuteur</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={lbl}>ENTREPRISE</label>
            <select value={form.entrepriseId ?? ""} onChange={e => { const ent = contacts.find(c => c.id === e.target.value); upd("entrepriseId", e.target.value); upd("entrepriseNom", ent?.displayName ?? ""); }} style={{ ...inp, appearance: "none" }}>
              <option value="">— Sélectionner —</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
            </select>
          </div>
          <div><label style={lbl}>NOM DU TUTEUR</label><input value={form.tuteurNom ?? ""} onChange={e => upd("tuteurNom", e.target.value)} style={inp} /></div>
          <div><label style={lbl}>FONCTION DU TUTEUR</label><input value={form.tuteurFonction ?? ""} onChange={e => upd("tuteurFonction", e.target.value)} style={inp} /></div>
          <div><label style={lbl}>RRE RESPONSABLE</label><input value={form.rre ?? ""} onChange={e => upd("rre", e.target.value)} style={inp} /></div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid rgba(26,46,68,0.08)" }}>Planification</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={lbl}>STATUT</label>
            <select value={form.statut ?? "planifiee"} onChange={e => upd("statut", e.target.value)} style={{ ...inp, appearance: "none" }}>
              <option value="a_planifier">À planifier</option>
              <option value="planifiee">Planifiée</option>
              <option value="realisee">Réalisée</option>
              <option value="annulee">Annulée</option>
            </select>
          </div>
          <div><label style={lbl}>DATE VISITE</label><input type="date" value={form.dateVisite?.slice(0, 10) ?? ""} onChange={e => upd("dateVisite", e.target.value)} style={inp} /></div>
          <div>
            <label style={lbl}>FRÉQUENCE</label>
            <select value={form.frequenceMois ?? 6} onChange={e => upd("frequenceMois", parseInt(e.target.value))} style={{ ...inp, appearance: "none" }}>
              {FREQUENCES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "1/-1" }}><label style={lbl}>PROCHAINE VISITE</label><input type="date" value={form.dateProchaine?.slice(0, 10) ?? ""} onChange={e => upd("dateProchaine", e.target.value)} style={inp} /></div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid rgba(26,46,68,0.08)" }}>Compte-rendu</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          <div><label style={lbl}>COMPTE-RENDU GÉNÉRAL</label><textarea value={form.cr ?? ""} onChange={e => upd("cr", e.target.value)} rows={3} style={{ ...inp, height: 70, resize: "vertical" }} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={{ ...lbl, color: "#059669" }}>POINTS POSITIFS</label><textarea value={form.pointsPositifs ?? ""} onChange={e => upd("pointsPositifs", e.target.value)} rows={2} style={{ ...inp, height: 60, resize: "vertical" }} /></div>
            <div><label style={{ ...lbl, color: "#D97706" }}>POINTS D'ATTENTION</label><textarea value={form.pointsAttention ?? ""} onChange={e => upd("pointsAttention", e.target.value)} rows={2} style={{ ...inp, height: 60, resize: "vertical" }} /></div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 7, border: "1px solid rgba(26,46,68,0.15)", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "#6B7280" }}>Annuler</button>
          <button onClick={submit} style={{ padding: "9px 22px", borderRadius: 7, border: "none", background: ORANGE, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {form.id ? "Enregistrer" : "Créer la visite"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ visites, onGoToList, onNewVisite, objectifMois = 6 }: {
  visites: VisiteTuteur[];
  onGoToList: (filter?: string) => void;
  onNewVisite: () => void;
  objectifMois?: number;
}) {
  const now = new Date();
  const moisDebut = new Date(now.getFullYear(), now.getMonth(), 1);
  const moisFin   = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Stats globales
  const enRetard   = visites.filter(v => v.statut !== "realisee" && v.statut !== "annulee" && v.dateProchaine && joursRestants(v.dateProchaine) < 0);
  const urgentes   = visites.filter(v => v.statut !== "realisee" && v.statut !== "annulee" && v.dateProchaine && joursRestants(v.dateProchaine) >= 0 && joursRestants(v.dateProchaine) < 14);
  const planifiees = visites.filter(v => v.statut === "planifiee");
  const realisees  = visites.filter(v => v.statut === "realisee");

  // Activité du mois — visites réalisées ce mois
  const realiseesCeMois = visites.filter(v => {
    if (v.statut !== "realisee" || !v.dateVisite) return false;
    const d = new Date(v.dateVisite);
    return d >= moisDebut && d <= moisFin;
  });

  // Alertes triées par urgence
  const alertes = [...enRetard, ...urgentes].sort((a, b) => {
    const ja = joursRestants(a.dateProchaine);
    const jb = joursRestants(b.dateProchaine);
    return ja - jb;
  }).slice(0, 4);

  // Prochaines planifiées
  const prochaines = planifiees
    .filter(v => v.dateVisite)
    .sort((a, b) => new Date(a.dateVisite).getTime() - new Date(b.dateVisite).getTime())
    .slice(0, 3);

  const progressPct = Math.min(100, Math.round((realiseesCeMois.length / objectifMois) * 100));
  const moisNom = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const kpis = [
    { label: "En retard", value: enRetard.length, color: "#A32D2D", bg: "#FCEBEB", border: "#E24B4A", filter: "retard" },
    { label: "Urgentes < 14j", value: urgentes.length, color: "#854F0B", bg: "#FAEEDA", border: "#EF9F27", filter: "urgentes" },
    { label: "Planifiées", value: planifiees.length, color: "#185FA5", bg: "#E6F1FB", border: "#378ADD", filter: "planifiee" },
    { label: "Réalisées total", value: realisees.length, color: "#0F6E56", bg: "#ECFDF5", border: "#1D9E75", filter: "realisee" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>Suivi des visites tuteurs</div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{visites.length} visite{visites.length > 1 ? "s" : ""} enregistrée{visites.length > 1 ? "s" : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onGoToList()} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(26,46,68,0.15)", background: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", color: NAVY }}>
            Toutes les visites →
          </button>
          <button onClick={onNewVisite} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: ORANGE, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 3px 10px rgba(242,101,34,0.28)" }}>
            + Nouvelle visite
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, marginBottom: 16 }}>
        {kpis.map(k => (
          <div key={k.label} onClick={() => onGoToList(k.filter)} style={{ background: k.bg, border: `1px solid ${k.border}30`, borderLeft: `3px solid ${k.border}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer", transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: k.color, marginTop: 2, fontWeight: 500 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Deux colonnes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>

        {/* Alertes prioritaires */}
        <div style={{ background: "#fff", border: "1px solid rgba(26,46,68,0.08)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(26,46,68,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>Alertes prioritaires</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>visites en retard ou urgentes</div>
            </div>
            {(enRetard.length + urgentes.length) > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, background: "#FCEBEB", color: "#A32D2D", padding: "2px 8px", borderRadius: 10 }}>{enRetard.length + urgentes.length}</span>
            )}
          </div>
          {alertes.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>✓</div>
              Aucune alerte — tout est à jour !
            </div>
          ) : alertes.map((v, i) => {
            const jours = v.dateProchaine ? joursRestants(v.dateProchaine) : 0;
            const u = urgenceStyle(jours, v.statut)!;
            return (
              <div key={v.id} style={{ padding: "11px 16px", borderBottom: i < alertes.length - 1 ? "1px solid rgba(26,46,68,0.06)" : "none", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: u.dot, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.prenomEtudiant} {v.nomEtudiant}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>{v.entrepriseNom || "—"} · {v.formation}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: u.color, background: u.bg, padding: "2px 8px", borderRadius: 8, whiteSpace: "nowrap" }}>{u.label}</span>
              </div>
            );
          })}
          {(enRetard.length + urgentes.length) > 4 && (
            <div onClick={() => onGoToList("retard")} style={{ padding: "10px 16px", fontSize: 12, color: ORANGE, cursor: "pointer", textAlign: "center", borderTop: "1px solid rgba(26,46,68,0.06)" }}>
              Voir toutes les alertes →
            </div>
          )}
        </div>

        {/* Prochaines visites planifiées */}
        <div style={{ background: "#fff", border: "1px solid rgba(26,46,68,0.08)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(26,46,68,0.08)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>Prochaines visites planifiées</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{planifiees.length} visite{planifiees.length > 1 ? "s" : ""} à réaliser</div>
          </div>
          {prochaines.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
              Aucune visite planifiée
            </div>
          ) : prochaines.map((v, i) => (
            <div key={v.id} style={{ padding: "11px 16px", borderBottom: i < prochaines.length - 1 ? "1px solid rgba(26,46,68,0.06)" : "none", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ minWidth: 46, textAlign: "center", background: "#E6F1FB", borderRadius: 8, padding: "4px 6px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#185FA5" }}>{new Date(v.dateVisite).getDate()}</div>
                <div style={{ fontSize: 9, color: "#378ADD", textTransform: "uppercase" }}>{new Date(v.dateVisite).toLocaleDateString("fr-FR", { month: "short" })}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.prenomEtudiant} {v.nomEtudiant}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>{v.entrepriseNom || "—"} · {v.rre || "—"}</div>
              </div>
            </div>
          ))}
          {planifiees.length > 3 && (
            <div onClick={() => onGoToList("planifiee")} style={{ padding: "10px 16px", fontSize: 12, color: ORANGE, cursor: "pointer", textAlign: "center", borderTop: "1px solid rgba(26,46,68,0.06)" }}>
              Voir toutes les visites planifiées →
            </div>
          )}
        </div>
      </div>

      {/* Activité du mois */}
      <div style={{ background: "#fff", border: "1px solid rgba(26,46,68,0.08)", borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>Mon activité — {moisNom}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>visites réalisées ce mois vs objectif</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: progressPct >= 100 ? "#059669" : progressPct >= 60 ? "#2563EB" : "#D97706" }}>
              {realiseesCeMois.length}
            </span>
            <span style={{ fontSize: 13, color: "#9CA3AF" }}> / {objectifMois}</span>
          </div>
        </div>

        {/* Barre de progression */}
        <div style={{ height: 10, background: "#F3F4F6", borderRadius: 5, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ height: "100%", width: `${progressPct}%`, background: progressPct >= 100 ? "#1D9E75" : progressPct >= 60 ? "#378ADD" : "#EF9F27", borderRadius: 5, transition: "width 0.4s ease" }} />
        </div>

        {/* Détail par semaine estimé */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {[1, 2, 3, 4].map(sem => {
            const semStart = new Date(moisDebut);
            semStart.setDate((sem - 1) * 7 + 1);
            const semEnd = new Date(semStart);
            semEnd.setDate(semStart.getDate() + 6);
            const semVisites = realiseesCeMois.filter(v => {
              const d = new Date(v.dateVisite);
              return d >= semStart && d <= semEnd;
            }).length;
            return (
              <div key={sem} style={{ textAlign: "center", padding: "10px 8px", background: "#F9FAFB", borderRadius: 8, border: "1px solid rgba(26,46,68,0.06)" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: semVisites > 0 ? "#1D9E75" : "#D1D5DB" }}>{semVisites}</div>
                <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>Semaine {sem}</div>
              </div>
            );
          })}
        </div>

        {realiseesCeMois.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(26,46,68,0.06)" }}>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6 }}>RÉALISÉES CE MOIS</div>
            {realiseesCeMois.slice(0, 3).map(v => (
              <div key={v.id} style={{ fontSize: 12, color: "#4B5563", padding: "3px 0", display: "flex", gap: 8 }}>
                <span style={{ color: "#1D9E75" }}>✓</span>
                <span style={{ fontWeight: 500 }}>{v.prenomEtudiant} {v.nomEtudiant}</span>
                <span style={{ color: "#9CA3AF" }}>— {v.entrepriseNom}</span>
                <span style={{ color: "#9CA3AF", marginLeft: "auto" }}>{formatDate(v.dateVisite)}</span>
              </div>
            ))}
            {realiseesCeMois.length > 3 && (
              <div style={{ fontSize: 11, color: ORANGE, marginTop: 4, cursor: "pointer" }} onClick={() => onGoToList("realisee")}>
                + {realiseesCeMois.length - 3} autres ce mois →
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Liste complète ────────────────────────────────────────────────────────────
function Liste({ visites, contacts: _c, pipeline: _p, onBack, onEdit, onDelete, onMarkRealisee, defaultFilter }: {
  visites: VisiteTuteur[];
  contacts: ContactRecord[];
  pipeline: PlacementCard[];
  onBack: () => void;
  onEdit: (v: VisiteTuteur) => void;
  onDelete: (id: string) => void;
  onMarkRealisee: (id: string) => void;
  defaultFilter?: string;
}) {
  const [filterStatut, setFilterStatut] = useState(defaultFilter && ["planifiee","realisee","annulee","a_planifier"].includes(defaultFilter) ? defaultFilter : "all");
  const [filterUrgence, setFilterUrgence] = useState(defaultFilter === "retard" || defaultFilter === "urgentes" ? defaultFilter : "all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => visites.filter(v => {
    if (filterStatut !== "all" && v.statut !== filterStatut) return false;
    if (filterUrgence === "retard" && !(v.statut !== "realisee" && v.dateProchaine && joursRestants(v.dateProchaine) < 0)) return false;
    if (filterUrgence === "urgentes" && !(v.statut !== "realisee" && v.dateProchaine && joursRestants(v.dateProchaine) >= 0 && joursRestants(v.dateProchaine) < 14)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${v.prenomEtudiant} ${v.nomEtudiant} ${v.entrepriseNom} ${v.tuteurNom} ${v.rre}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    const da = new Date(a.dateProchaine || a.dateVisite || "2099").getTime();
    const db = new Date(b.dateProchaine || b.dateVisite || "2099").getTime();
    return da - db;
  }), [visites, filterStatut, filterUrgence, search]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid rgba(26,46,68,0.15)", background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: NAVY }}>← Tableau de bord</button>
        <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>Toutes les visites</div>
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ ...inp, width: 220, background: "#fff" }} />
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid rgba(26,46,68,0.15)", fontSize: 12, fontFamily: "inherit", background: "#fff", outline: "none" }}>
          <option value="all">Tous les statuts</option>
          <option value="a_planifier">À planifier</option>
          <option value="planifiee">Planifiées</option>
          <option value="realisee">Réalisées</option>
          <option value="annulee">Annulées</option>
        </select>
        <select value={filterUrgence} onChange={e => setFilterUrgence(e.target.value)} style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid rgba(26,46,68,0.15)", fontSize: 12, fontFamily: "inherit", background: "#fff", outline: "none" }}>
          <option value="all">Toute urgence</option>
          <option value="retard">En retard</option>
          <option value="urgentes">Urgentes (&lt; 14j)</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px", color: "#9CA3AF", fontSize: 13 }}>Aucune visite correspondante</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(v => {
            const jours = v.dateProchaine ? joursRestants(v.dateProchaine) : 999;
            const urgence = urgenceStyle(jours, v.statut);
            const sc = STATUS_CONFIG[v.statut] ?? STATUS_CONFIG.a_planifier;
            return (
              <div key={v.id} style={{ background: "#fff", border: "1px solid rgba(26,46,68,0.08)", borderRadius: 10, padding: 14, display: "flex", gap: 12, alignItems: "flex-start", boxShadow: "0 1px 4px rgba(26,46,68,0.05)" }}>
                {urgence && <div style={{ width: 4, alignSelf: "stretch", borderRadius: 2, background: urgence.dot, flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{v.prenomEtudiant} {v.nomEtudiant}</span>
                    <span style={{ fontSize: 11, color: ORANGE, fontWeight: 500 }}>{v.formation}</span>
                    <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 8, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}30`, fontWeight: 500 }}>{sc.label}</span>
                    {urgence && <span style={{ fontSize: 11, fontWeight: 600, color: urgence.color, background: urgence.bg, padding: "1px 7px", borderRadius: 8 }}>{urgence.label}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12, color: "#4B5563" }}>🏢 {v.entrepriseNom || "—"}{v.tuteurNom ? ` · Tuteur : ${v.tuteurNom}` : ""}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF" }}>Dernière visite : {formatDate(v.dateVisite)}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF" }}>Prochaine : {formatDate(v.dateProchaine)}</div>
                    {v.rre && <div style={{ fontSize: 12, color: "#9CA3AF" }}>👤 {v.rre}</div>}
                  </div>
                  {v.cr && <div style={{ marginTop: 6, fontSize: 11, color: "#6B7280", fontStyle: "italic" }}>{v.cr.slice(0, 100)}{v.cr.length > 100 ? "..." : ""}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
                  <button onClick={() => onEdit(v)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(26,46,68,0.15)", background: "#fff", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: NAVY }}>✏ Modifier</button>
                  {v.statut !== "realisee" && <button onClick={() => onMarkRealisee(v.id)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #1D9E7530", background: "#ECFDF5", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: "#059669" }}>✓ Réalisée</button>}
                  <button onClick={() => onDelete(v.id)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(220,38,38,0.2)", background: "#fff", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: "#DC2626" }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────
export function SuiviTuteurs({ contacts, userId, colorNavy: _cn, colorGold: _cg, campusRRE, defaultEntrepriseId, defaultEntrepriseNom, onPendingVisiteHandled, objectifVisitesMois = 6 }: SuiviTuteursProps) {
  const [visites, setVisites] = useState<VisiteTuteur[]>(() => loadVisites(userId));
  const pipeline = useMemo(() => loadPipeline(userId), [userId]);

  // Ouvrir formulaire automatiquement depuis fiche entreprise
  useEffect(() => {
    if (defaultEntrepriseId) {
      setEditVisite(null);
      setDefaultStatut("planifiee");
      setShowForm(true);
      onPendingVisiteHandled?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultEntrepriseId]);
  const [view, setView] = useState<"dashboard" | "liste">("dashboard");

  // Auto-ouvrir formulaire si visite demandée depuis fiche entreprise

  const [listFilter, setListFilter] = useState<string | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [editVisite, setEditVisite] = useState<VisiteTuteur | null>(null);
  const [defaultStatut, setDefaultStatut] = useState<VisiteStatut | undefined>();

  const persist = (updated: VisiteTuteur[]) => { setVisites(updated); saveVisites(userId, updated); };

  const handleSave = (v: VisiteTuteur) => {
    const vv = { ...v, userId };
    const exists = visites.some(x => x.id === vv.id);
    persist(exists ? visites.map(x => x.id === vv.id ? vv : x) : [vv, ...visites]);
    setShowForm(false); setEditVisite(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Supprimer cette visite ?")) persist(visites.filter(v => v.id !== id));
  };

  const handleMarkRealisee = (id: string) => {
    persist(visites.map(v => v.id === id ? { ...v, statut: "realisee", dateVisite: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString() } : v));
  };

  const handleGoToList = (filter?: string) => {
    setListFilter(filter);
    setView("liste");
  };

  const handleNewVisite = (statut?: VisiteStatut) => {
    setEditVisite(null);
    setDefaultStatut(statut);
    setShowForm(true);
  };

  return (
    <div>
      {view === "dashboard" ? (
        <Dashboard
          visites={visites}
          onGoToList={handleGoToList}
          onNewVisite={() => handleNewVisite()}
          objectifMois={objectifVisitesMois}
        />
      ) : (
        <Liste
          visites={visites}
          contacts={contacts}
          pipeline={pipeline}
          defaultFilter={listFilter}
          onBack={() => setView("dashboard")}
          onEdit={v => { setEditVisite(v); setShowForm(true); }}
          onDelete={handleDelete}
          onMarkRealisee={handleMarkRealisee}
        />
      )}

      {showForm && (
        <VisiteForm
          visite={editVisite ?? undefined}
          contacts={contacts}
          pipeline={pipeline}
          defaultStatut={defaultStatut}
          defaultEntrepriseId={defaultEntrepriseId}
          defaultEntrepriseNom={defaultEntrepriseNom}
          campusRRE={campusRRE}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditVisite(null); }}
        />
      )}
    </div>
  );
}
