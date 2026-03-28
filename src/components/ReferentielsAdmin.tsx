// src/components/ReferentielsAdmin.tsx
// Page d'administration des référentiels campus et formations
// Accessible aux admins IFC depuis le panneau d'administration
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useReferentiels } from "../hooks/useReferentiels";
import type { Campus, Formation } from "../hooks/useReferentiels";

const ORANGE = "#F26522";
const NAVY   = "#1A2E44";

const inp: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 7,
  border: "1px solid rgba(26,46,68,0.15)", fontSize: 13,
  fontFamily: "inherit", outline: "none", color: NAVY, background: "#F9FAFB",
};
const lbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: "#4A7FA5",
  letterSpacing: 0.4, display: "block", marginBottom: 4,
};
const card: React.CSSProperties = {
  background: "#fff", border: "1px solid rgba(26,46,68,0.08)",
  borderRadius: 10, overflow: "hidden",
  boxShadow: "0 1px 4px rgba(26,46,68,0.05)",
};

const NIVEAUX = ["Bac+2", "Bac+3", "Bac+5", "Autre"];
const REGIONS = ["Occitanie", "PACA", "Auvergne-RA", "Île-de-France", "International", "Autre"];

// ── Formulaire campus ──────────────────────────────────────────────────────────
function CampusForm({ item, onSave, onClose }: {
  item?: Partial<Campus>;
  onSave: (c: Partial<Campus>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Campus>>(item ?? { actif: true, ordre: 99 });
  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ padding: 16, background: "#F9FAFB", border: "1px solid rgba(26,46,68,0.08)", borderRadius: 8, marginBottom: 12 }}>
      <div style={{ fontWeight: 600, color: NAVY, fontSize: 13, marginBottom: 12 }}>
        {form.id ? "Modifier le campus" : "Nouveau campus"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div><label style={lbl}>NOM</label><input value={form.nom ?? ""} onChange={e => upd("nom", e.target.value)} placeholder="IFC Bordeaux" style={inp} /></div>
        <div><label style={lbl}>VILLE</label><input value={form.ville ?? ""} onChange={e => upd("ville", e.target.value)} placeholder="Bordeaux" style={inp} /></div>
        <div>
          <label style={lbl}>RÉGION</label>
          <select value={form.region ?? ""} onChange={e => upd("region", e.target.value)} style={{ ...inp, appearance: "none" }}>
            <option value="">— Région —</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(26,46,68,0.15)", background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
        <button onClick={() => { onSave(form); onClose(); }} style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: ORANGE, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          {form.id ? "Enregistrer" : "Ajouter"}
        </button>
      </div>
    </div>
  );
}

// ── Formulaire formation ───────────────────────────────────────────────────────
function FormationForm({ item, onSave, onClose }: {
  item?: Partial<Formation>;
  onSave: (f: Partial<Formation>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Formation>>(item ?? { actif: true, duree: 2, ordre: 99 });
  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ padding: 16, background: "#F9FAFB", border: "1px solid rgba(26,46,68,0.08)", borderRadius: 8, marginBottom: 12 }}>
      <div style={{ fontWeight: 600, color: NAVY, fontSize: 13, marginBottom: 12 }}>
        {form.id ? "Modifier la formation" : "Nouvelle formation"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
        <div><label style={lbl}>CODE</label><input value={form.code ?? ""} onChange={e => upd("code", e.target.value)} placeholder="BTS NDRC" style={inp} /></div>
        <div><label style={lbl}>INTITULÉ COMPLET</label><input value={form.label ?? ""} onChange={e => upd("label", e.target.value)} placeholder="Négociation et Digitalisation..." style={inp} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <label style={lbl}>NIVEAU</label>
          <select value={form.niveau ?? ""} onChange={e => upd("niveau", e.target.value)} style={{ ...inp, appearance: "none" }}>
            <option value="">— Niveau —</option>
            {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>DURÉE (ans)</label>
          <select value={form.duree ?? 2} onChange={e => upd("duree", parseInt(e.target.value))} style={{ ...inp, appearance: "none" }}>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} an{n > 1 ? "s" : ""}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(26,46,68,0.15)", background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
        <button onClick={() => { onSave(form); onClose(); }} style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: ORANGE, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          {form.id ? "Enregistrer" : "Ajouter"}
        </button>
      </div>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────
export function ReferentielsAdmin() {
  const { campus, formations, loading, reload, saveCampus, deleteCampus, saveFormation, deleteFormation } = useReferentiels();
  const [tab, setTab] = useState<"campus" | "formations">("campus");
  const [showCampusForm, setShowCampusForm] = useState(false);
  const [showFormationForm, setShowFormationForm] = useState(false);
  const [editCampus, setEditCampus] = useState<Campus | undefined>();
  const [editFormation, setEditFormation] = useState<Formation | undefined>();

  const niveauColor: Record<string, string> = {
    "Bac+2": "#2563EB", "Bac+3": ORANGE, "Bac+5": "#7C3AED", "Autre": "#6B7280",
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>Référentiels IFC</div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
            {campus.length} campus · {formations.length} formations
          </div>
        </div>
        <button onClick={reload} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(26,46,68,0.15)", background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: NAVY }}>
          {loading ? "Chargement..." : "↻ Actualiser"}
        </button>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", borderBottom: "2px solid rgba(26,46,68,0.08)", marginBottom: 20 }}>
        {[{ id: "campus", label: `🏫 Campus (${campus.length})` }, { id: "formations", label: `📚 Formations (${formations.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{
            padding: "10px 20px", border: "none",
            borderBottom: `2px solid ${tab === t.id ? ORANGE : "transparent"}`,
            background: "transparent", color: tab === t.id ? ORANGE : "#6B7280",
            fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
            cursor: "pointer", fontFamily: "inherit", marginBottom: -2,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Campus ── */}
      {tab === "campus" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button onClick={() => { setEditCampus(undefined); setShowCampusForm(true); }} style={{ padding: "8px 16px", borderRadius: 7, border: "none", background: ORANGE, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              + Nouveau campus
            </button>
          </div>

          {showCampusForm && (
            <CampusForm
              item={editCampus}
              onSave={saveCampus}
              onClose={() => { setShowCampusForm(false); setEditCampus(undefined); }}
            />
          )}

          <div style={card}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F9FAFB" }}>
                  {["Nom", "Ville", "Région", "Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid rgba(26,46,68,0.08)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campus.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: i < campus.length - 1 ? "1px solid rgba(26,46,68,0.06)" : "none" }}>
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{c.nom}</div>
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 13, color: "#4B5563" }}>{c.ville}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: `${ORANGE}12`, color: ORANGE }}>{c.region}</span>
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => { setEditCampus(c); setShowCampusForm(true); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(26,46,68,0.15)", background: "#fff", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: NAVY }}>✏ Modifier</button>
                        <button onClick={() => { if (confirm(`Désactiver ${c.nom} ?`)) deleteCampus(c.id); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(220,38,38,0.2)", background: "#fff", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: "#DC2626" }}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Formations ── */}
      {tab === "formations" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button onClick={() => { setEditFormation(undefined); setShowFormationForm(true); }} style={{ padding: "8px 16px", borderRadius: 7, border: "none", background: ORANGE, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              + Nouvelle formation
            </button>
          </div>

          {showFormationForm && (
            <FormationForm
              item={editFormation}
              onSave={saveFormation}
              onClose={() => { setShowFormationForm(false); setEditFormation(undefined); }}
            />
          )}

          <div style={card}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F9FAFB" }}>
                  {["Code", "Intitulé", "Niveau", "Durée", "Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid rgba(26,46,68,0.08)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {formations.map((f, i) => (
                  <tr key={f.id} style={{ borderBottom: i < formations.length - 1 ? "1px solid rgba(26,46,68,0.06)" : "none" }}>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, fontFamily: "monospace", background: "rgba(26,46,68,0.06)", padding: "2px 7px", borderRadius: 5 }}>{f.code}</span>
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#4B5563", maxWidth: 280 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.label}</div>
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: `${niveauColor[f.niveau] ?? "#6B7280"}15`, color: niveauColor[f.niveau] ?? "#6B7280", fontWeight: 500 }}>{f.niveau}</span>
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#4B5563" }}>{f.duree} an{f.duree > 1 ? "s" : ""}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => { setEditFormation(f); setShowFormationForm(true); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(26,46,68,0.15)", background: "#fff", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: NAVY }}>✏ Modifier</button>
                        <button onClick={() => { if (confirm(`Désactiver ${f.code} ?`)) deleteFormation(f.id); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(220,38,38,0.2)", background: "#fff", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: "#DC2626" }}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
