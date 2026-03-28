// src/components/PipelinePlacement.tsx
// Pipeline de placement IFC — Kanban étudiant ↔ entreprise
// 4 étapes : Sans alternance → CV envoyé → Apparié → Placé
// 2 vues : par étudiant / par offre entreprise
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";
import type { ContactRecord } from "../types/crm";

interface PipelinePlacementProps {
  contacts: ContactRecord[];
  userId: string;
  colorNavy: string;
  colorGold: string;
  campusList?: string[];      // depuis useReferentiels
  formationList?: string[];   // depuis useReferentiels
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type PlacementStage = "cherche" | "cv_envoye" | "apparie" | "place";

export interface PlacementCard {
  id: string;
  userId: string;
  // Étudiant
  prenomEtudiant: string;
  nomEtudiant: string;
  formation: string;           // ex: "BTS NDRC 2025"
  campus: string;
  // Étape
  stage: PlacementStage;
  // Entreprise cible
  entrepriseId: string | null;
  entrepriseNom: string;
  // Suivi
  rre: string;                 // nom du RRE responsable
  dateDerniereAction: string;  // ISO
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const STAGES: { id: PlacementStage; label: string; color: string; bg: string; desc: string }[] = [
  { id: "cherche",    label: "Sans alternance",    color: "#DC2626", bg: "#FEF2F2", desc: "Cherche une entreprise" },
  { id: "cv_envoye",  label: "CV envoyé",          color: "#D97706", bg: "#FFFBEB", desc: "CV transmis à l'entreprise" },
  { id: "apparie",    label: "Apparié",             color: "#2563EB", bg: "#EFF6FF", desc: "En cours de finalisation" },
  { id: "place",      label: "Placé ✓",            color: "#059669", bg: "#ECFDF5", desc: "Contrat signé" },
];

// Formations chargées dynamiquement via props formationList

const ORANGE = "#F26522";
const NAVY   = "#1A2E44";
const STORAGE_KEY = "kleios_ifc_pipeline_";

function loadCards(userId: string): PlacementCard[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY + userId) ?? "[]"); }
  catch { return []; }
}
function saveCards(userId: string, cards: PlacementCard[]) {
  localStorage.setItem(STORAGE_KEY + userId, JSON.stringify(cards));
}

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  if (diff < 7) return `Il y a ${diff}j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

// ── Composant carte étudiant ──────────────────────────────────────────────────
function StudentCard({ card, onMove, onEdit, onDelete }: {
  card: PlacementCard;
  onMove: (id: string, stage: PlacementStage) => void;
  onEdit: (card: PlacementCard) => void;
  onDelete: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div style={{
      background: "#fff", borderRadius: 10, padding: 12, marginBottom: 8,
      border: "1px solid rgba(26,46,68,0.08)", boxShadow: "0 1px 4px rgba(26,46,68,0.06)",
      cursor: "pointer", transition: "box-shadow 0.15s",
    }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 14px rgba(26,46,68,0.12)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(26,46,68,0.06)")}
      onClick={() => onEdit(card)}
    >
      {/* Nom + formation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{card.prenomEtudiant} {card.nomEtudiant}</div>
          <div style={{ fontSize: 11, color: ORANGE, fontWeight: 500, marginTop: 1 }}>{card.formation}</div>
        </div>
        <div style={{ position: "relative" }} onClick={e => { e.stopPropagation(); setShowMenu(m => !m); }}>
          <div style={{ padding: "2px 6px", borderRadius: 4, cursor: "pointer", color: "#9CA3AF", fontSize: 16 }}>⋯</div>
          {showMenu && (
            <div style={{ position: "fixed", zIndex: 9999, background: "#fff", border: "1px solid rgba(26,46,68,0.12)", borderRadius: 8, boxShadow: "0 8px 24px rgba(26,46,68,0.18)", minWidth: 160, overflow: "hidden" }}
              onClick={e => e.stopPropagation()}>
              {STAGES.filter(s => s.id !== card.stage).map(s => (
                <button key={s.id} onClick={() => { onMove(card.id, s.id); setShowMenu(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", background: "none", border: "none", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: s.color }}>
                  → {s.label}
                </button>
              ))}
              <div style={{ height: 1, background: "#F3F4F6" }} />
              <button onClick={() => { onDelete(card.id); setShowMenu(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", background: "none", border: "none", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: "#DC2626" }}>
                🗑 Supprimer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Campus */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {card.campus && (
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 8, background: `${ORANGE}12`, color: ORANGE, fontWeight: 500 }}>
            {card.campus.replace("IFC ", "")}
          </span>
        )}
        {card.entrepriseNom && (
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 8, background: "rgba(26,46,68,0.07)", color: NAVY }}>
            🏢 {card.entrepriseNom}
          </span>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {card.rre ? (
          <span style={{ fontSize: 10, color: "#9CA3AF" }}>👤 {card.rre}</span>
        ) : <span />}
        <span style={{ fontSize: 10, color: "#9CA3AF" }}>{formatDate(card.dateDerniereAction || card.updatedAt)}</span>
      </div>
    </div>
  );
}

// ── Formulaire ajout/édition carte ───────────────────────────────────────────
function CardForm({ card, entreprises, onSave, onClose, campusList, formationList }: {
  card: Partial<PlacementCard> | null;
  entreprises: ContactRecord[];
  onSave: (card: PlacementCard) => void;
  onClose: () => void;
  campusList?: string[];
  formationList?: string[];
}) {
  const [form, setForm] = useState<Partial<PlacementCard>>(card ?? { stage: "cherche" });
  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid rgba(26,46,68,0.15)", fontSize: 13, fontFamily: "inherit", outline: "none", color: NAVY, background: "#F9FAFB" };
  const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "#4A7FA5", letterSpacing: 0.4, display: "block", marginBottom: 4 };

  const submit = () => {
    if (!form.prenomEtudiant && !form.nomEtudiant) return;
    const now = new Date().toISOString();
    onSave({
      id: form.id ?? crypto.randomUUID(),
      userId: form.userId ?? "",
      prenomEtudiant: form.prenomEtudiant ?? "",
      nomEtudiant: form.nomEtudiant ?? "",
      formation: form.formation ?? "",
      campus: form.campus ?? "",
      stage: form.stage ?? "cherche",
      entrepriseId: form.entrepriseId ?? null,
      entrepriseNom: form.entrepriseNom ?? "",
      rre: form.rre ?? "",
      dateDerniereAction: form.dateDerniereAction ?? now,
      notes: form.notes ?? "",
      createdAt: form.createdAt ?? now,
      updatedAt: now,
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,46,68,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 480, boxShadow: "0 20px 60px rgba(26,46,68,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>{form.id ? "Modifier" : "Nouvel étudiant"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9CA3AF" }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label style={lbl}>PRÉNOM</label><input value={form.prenomEtudiant ?? ""} onChange={e => upd("prenomEtudiant", e.target.value)} placeholder="Prénom" style={inp} /></div>
          <div><label style={lbl}>NOM</label><input value={form.nomEtudiant ?? ""} onChange={e => upd("nomEtudiant", e.target.value)} placeholder="Nom" style={inp} /></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={lbl}>FORMATION</label>
            <select value={form.formation ?? ""} onChange={e => upd("formation", e.target.value)} style={{ ...inp, appearance: "none", cursor: "pointer" }}>
              <option value="">— Sélectionner —</option>
              {(formationList ?? ["BTS NDRC","BTS GPME","BTS Communication","Bachelor Comm","Bachelor CAC","Bachelor RH","DCG","DSCG","Master MRH"]).map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>CAMPUS</label>
            <select value={form.campus ?? ""} onChange={e => upd("campus", e.target.value)} style={{ ...inp, appearance: "none", cursor: "pointer" }}>
              <option value="">— Campus —</option>
              {(campusList ?? ["IFC Perpignan","IFC Montpellier","IFC Nîmes","IFC Avignon","IFC Marseille","IFC Alès","IFC Saint-Étienne","IFC Valence","IFC Clermont-Ferrand","Westford"]).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={lbl}>ÉTAPE</label>
            <select value={form.stage ?? "cherche"} onChange={e => upd("stage", e.target.value)} style={{ ...inp, appearance: "none", cursor: "pointer" }}>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>ENTREPRISE CIBLE</label>
            <select value={form.entrepriseId ?? ""} onChange={e => {
              const ent = entreprises.find(c => c.id === e.target.value);
              upd("entrepriseId", e.target.value);
              upd("entrepriseNom", ent?.displayName ?? "");
            }} style={{ ...inp, appearance: "none", cursor: "pointer" }}>
              <option value="">— Aucune —</option>
              {entreprises.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label style={lbl}>RRE RESPONSABLE</label><input value={form.rre ?? ""} onChange={e => upd("rre", e.target.value)} placeholder="Nom du RRE" style={inp} /></div>
          <div><label style={lbl}>DATE DERNIÈRE ACTION</label><input type="date" value={form.dateDerniereAction?.slice(0,10) ?? ""} onChange={e => upd("dateDerniereAction", e.target.value)} style={inp} /></div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>NOTES</label>
          <textarea value={form.notes ?? ""} onChange={e => upd("notes", e.target.value)} rows={2} style={{ ...inp, height: 60, resize: "vertical" }} placeholder="Remarques, préférences secteur..." />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 7, border: "1px solid rgba(26,46,68,0.15)", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "#6B7280" }}>Annuler</button>
          <button onClick={submit} style={{ padding: "9px 22px", borderRadius: 7, border: "none", background: ORANGE, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {form.id ? "Enregistrer" : "Ajouter →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pipeline principal ────────────────────────────────────────────────────────
export function PipelinePlacement({ contacts, userId, colorNavy: _cn, colorGold: _cg, campusList: campusListProp, formationList: formationListProp }: PipelinePlacementProps) {
  const [cards, setCards] = useState<PlacementCard[]>(() => loadCards(userId));
  const [view, setView] = useState<"etudiant" | "offre">("etudiant");
  const [filterCampus, setFilterCampus] = useState("all");
  const [filterFormation, setFilterFormation] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editCard, setEditCard] = useState<PlacementCard | null>(null);

  const persist = (updated: PlacementCard[]) => {
    setCards(updated);
    saveCards(userId, updated);
  };

  const handleSave = (card: PlacementCard) => {
    const c = { ...card, userId };
    const exists = cards.some(x => x.id === c.id);
    persist(exists ? cards.map(x => x.id === c.id ? c : x) : [c, ...cards]);
    setShowForm(false);
    setEditCard(null);
  };

  const handleMove = (id: string, stage: PlacementStage) => {
    persist(cards.map(c => c.id === id ? { ...c, stage, updatedAt: new Date().toISOString() } : c));
  };

  const handleDelete = (id: string) => {
    persist(cards.filter(c => c.id !== id));
  };

  const handleEdit = (card: PlacementCard) => {
    setEditCard(card);
    setShowForm(true);
  };

  // Filtres
  const filtered = useMemo(() => cards.filter(c => {
    if (filterCampus !== "all" && c.campus !== filterCampus) return false;
    if (filterFormation !== "all" && !c.formation.includes(filterFormation)) return false;
    return true;
  }), [cards, filterCampus, filterFormation]);

  // Stats
  const stats = STAGES.map(s => ({ ...s, count: filtered.filter(c => c.stage === s.id).length }));
  const total = filtered.length;

  // Campus uniques
  const campuses = [...new Set(cards.map(c => c.campus).filter(Boolean))];
  const formations = [...new Set(cards.map(c => c.formation).filter(Boolean))];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>Pipeline de placement</div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{total} étudiant{total > 1 ? "s" : ""} en suivi</div>
        </div>

        {/* Toggle vue */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.80)", border: "1px solid rgba(26,46,68,0.10)", borderRadius: 8, overflow: "hidden" }}>
          {[{ id: "etudiant", label: "👤 Par étudiant" }, { id: "offre", label: "🏢 Par offre" }].map(v => (
            <button key={v.id} onClick={() => setView(v.id as any)} style={{ padding: "7px 14px", border: "none", background: view === v.id ? ORANGE : "transparent", color: view === v.id ? "#fff" : "#6B7280", fontSize: 12, fontWeight: view === v.id ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>
              {v.label}
            </button>
          ))}
        </div>

        {/* Filtres */}
        <select value={filterCampus} onChange={e => setFilterCampus(e.target.value)} style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid rgba(26,46,68,0.15)", fontSize: 12, fontFamily: "inherit", outline: "none", background: "#fff" }}>
          <option value="all">Tous les campus</option>
          {campuses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterFormation} onChange={e => setFilterFormation(e.target.value)} style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid rgba(26,46,68,0.15)", fontSize: 12, fontFamily: "inherit", outline: "none", background: "#fff" }}>
          <option value="all">Toutes les formations</option>
          {formations.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <button onClick={() => { setEditCard(null); setShowForm(true); }} style={{ marginLeft: "auto", padding: "8px 18px", borderRadius: 8, border: "none", background: ORANGE, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 3px 10px rgba(242,101,34,0.28)" }}>
          + Ajouter un étudiant
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        {stats.map(s => (
          <div key={s.id} style={{ background: "#fff", border: `1px solid ${s.color}20`, borderRadius: 10, padding: "12px 16px", borderLeft: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Vue par étudiant — Kanban */}
      {view === "etudiant" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, alignItems: "start" }}>
          {STAGES.map(stage => {
            const stageCards = filtered.filter(c => c.stage === stage.id);
            return (
              <div key={stage.id} style={{ background: stage.bg, border: `1px solid ${stage.color}25`, borderRadius: 12, padding: 12, minHeight: 200 }}>
                {/* Header colonne */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: stage.color }}>{stage.label}</div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>{stage.desc}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: stage.color, background: `${stage.color}20`, padding: "2px 8px", borderRadius: 10 }}>{stageCards.length}</span>
                </div>

                {/* Cartes */}
                {stageCards.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#D1D5DB", fontSize: 12, padding: "20px 0" }}>Aucun étudiant</div>
                ) : (
                  stageCards.map(card => (
                    <StudentCard key={card.id} card={card} onMove={handleMove} onEdit={handleEdit} onDelete={handleDelete} />
                  ))
                )}

                {/* Bouton ajouter dans la colonne */}
                <button onClick={() => { setEditCard({ stage: stage.id } as any); setShowForm(true); }} style={{ width: "100%", padding: "7px", borderRadius: 7, border: `1px dashed ${stage.color}50`, background: "transparent", fontSize: 11, color: stage.color, cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}>
                  + Ajouter
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Vue par offre — Tableau */}
      {view === "offre" && (
        <div style={{ background: "#fff", border: "1px solid rgba(26,46,68,0.08)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", background: "rgba(214,228,242,0.30)", borderBottom: "1px solid rgba(26,46,68,0.08)", fontSize: 12, fontWeight: 600, color: NAVY }}>
            Vue par offre entreprise — {filtered.filter(c => c.entrepriseNom).length} étudiants avec entreprise cible
          </div>
          {contacts.filter(c => c.payload?.postes?.some((p: any) => p.status === "ouvert") || filtered.some(card => card.entrepriseId === c.id)).map(entreprise => {
            const assigned = filtered.filter(c => c.entrepriseId === entreprise.id);
            if (assigned.length === 0) return null;
            return (
              <div key={entreprise.id} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(26,46,68,0.06)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 8 }}>🏢 {entreprise.displayName}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {assigned.map(card => {
                    const s = STAGES.find(x => x.id === card.stage)!;
                    return (
                      <div key={card.id} onClick={() => handleEdit(card)} style={{ padding: "6px 12px", borderRadius: 8, background: s.bg, border: `1px solid ${s.color}25`, cursor: "pointer" }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: NAVY }}>{card.prenomEtudiant} {card.nomEtudiant}</div>
                        <div style={{ fontSize: 10, color: ORANGE }}>{card.formation}</div>
                        <div style={{ fontSize: 10, color: s.color, marginTop: 2 }}>{s.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filtered.filter(c => !c.entrepriseId).length > 0 && (
            <div style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#9CA3AF", marginBottom: 8 }}>Sans entreprise cible</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {filtered.filter(c => !c.entrepriseId).map(card => {
                  const s = STAGES.find(x => x.id === card.stage)!;
                  return (
                    <div key={card.id} onClick={() => handleEdit(card)} style={{ padding: "6px 12px", borderRadius: 8, background: s.bg, border: `1px solid ${s.color}25`, cursor: "pointer" }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: NAVY }}>{card.prenomEtudiant} {card.nomEtudiant}</div>
                      <div style={{ fontSize: 10, color: ORANGE }}>{card.formation}</div>
                      <div style={{ fontSize: 10, color: s.color, marginTop: 2 }}>{s.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <CardForm
          card={editCard}
          entreprises={contacts}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditCard(null); }}
          campusList={campusListProp}
          formationList={formationListProp}
        />
      )}
    </div>
  );
}
