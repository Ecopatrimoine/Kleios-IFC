// src/components/fiche/TabCommissions.tsx
// Commissions par client — saisie manuelle + estimation automatique
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import type { ContactRecord } from "../../types/crm";

interface TabCommissionsProps {
  record: ContactRecord;
  onSave: (record: ContactRecord) => void;
  colorNavy: string;
  colorGold: string;
}

export type CommissionType = "entree" | "gestion" | "arbitrage" | "honoraire";
export type CommissionScope = "contrat" | "client";

export interface CommissionEntry {
  id: string;
  contactId: string;
  contractId: string | null;       // null = niveau client global
  contractName: string;
  insurer: string;
  type: CommissionType;
  scope: CommissionScope;
  amount: string;                   // montant reçu (€)
  estimated: string;                // montant estimé (€)
  period: string;                   // "2026-03" = mars 2026
  receivedDate: string;
  notes: string;
  createdAt: string;
}

const TYPE_LABELS: Record<CommissionType, string> = {
  entree:     "Entrée / Souscription",
  gestion:    "Gestion récurrente",
  arbitrage:  "Arbitrage",
  honoraire:  "Honoraire client",
};

const TYPE_COLORS: Record<CommissionType, { bg: string; color: string; border: string }> = {
  entree:    { bg: "rgba(46,139,110,0.10)", color: "#1E6B52", border: "rgba(46,139,110,0.20)" },
  gestion:   { bg: "rgba(91,130,166,0.10)", color: "#3A6080", border: "rgba(91,130,166,0.20)" },
  arbitrage: { bg: "rgba(201,168,76,0.12)", color: "#8A6D0A", border: "rgba(201,168,76,0.25)" },
  honoraire: { bg: "rgba(11,48,64,0.08)",   color: "#0B3040", border: "rgba(11,48,64,0.15)" },
};

const EMPTY_ENTRY: Omit<CommissionEntry, "id" | "contactId" | "createdAt"> = {
  contractId: null,
  contractName: "",
  insurer: "",
  type: "gestion",
  scope: "contrat",
  amount: "",
  estimated: "",
  period: new Date().toISOString().slice(0, 7),
  receivedDate: new Date().toISOString().slice(0, 10),
  notes: "",
};

function formatEuro(val: string): string {
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function formatPeriod(period: string): string {
  const [y, m] = period.split("-");
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

export function TabCommissions({ record, onSave, colorNavy, colorGold }: TabCommissionsProps) {
  const commissions: CommissionEntry[] = (record.payload as any)?.commissions2 ?? [];
  const contracts = record.payload?.contracts ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_ENTRY });
  const [filterType, setFilterType] = useState<CommissionType | "all">("all");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  const saveCommissions = (list: CommissionEntry[]) => {
    onSave({ ...record, payload: { ...record.payload, commissions2: list } as any });
  };

  const handleSubmit = () => {
    if (!form.amount || !form.period) return;
    const contract = contracts.find(c => c.id === form.contractId);
    const entry: CommissionEntry = {
      ...form,
      contractName: contract ? (contract.productName || contract.type) : "Global client",
      insurer: contract?.insurer || form.insurer,
      id: editId ?? crypto.randomUUID(),
      contactId: record.id,
      createdAt: new Date().toISOString(),
    };
    const updated = editId
      ? commissions.map(c => c.id === editId ? entry : c)
      : [entry, ...commissions];
    saveCommissions(updated);
    setShowForm(false);
    setEditId(null);
    setForm({ ...EMPTY_ENTRY });
  };

  const handleEdit = (entry: CommissionEntry) => {
    setForm({ ...entry });
    setEditId(entry.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer cette commission ?")) return;
    saveCommissions(commissions.filter(c => c.id !== id));
  };

  // Filtrage
  const filtered = commissions
    .filter(c => filterType === "all" || c.type === filterType)
    .filter(c => c.period.startsWith(filterYear))
    .sort((a, b) => b.period.localeCompare(a.period));

  // KPIs année
  const yearTotal = commissions
    .filter(c => c.period.startsWith(filterYear))
    .reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);

  const byType = (["entree", "gestion", "arbitrage", "honoraire"] as CommissionType[]).map(type => ({
    type,
    total: commissions.filter(c => c.type === type && c.period.startsWith(filterYear)).reduce((s, c) => s + (parseFloat(c.amount) || 0), 0),
  }));

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(11,48,64,0.09)",
    borderRadius: 10,
    marginBottom: 12,
    overflow: "hidden",
  };
  const cardHeader: React.CSSProperties = {
    padding: "10px 14px",
    background: "rgba(214,228,240,0.38)",
    borderBottom: "1px solid rgba(91,130,166,0.12)",
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 12, fontWeight: 600, color: colorNavy,
  };
  const label: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: "#5B82A6", letterSpacing: 0.4, marginBottom: 4, display: "block",
  };
  const inp: React.CSSProperties = {
    border: "1px solid rgba(11,48,64,0.14)", borderRadius: 7,
    padding: "6px 10px", fontSize: 12, fontFamily: "inherit",
    color: "#0B3040", background: "#F6F8FA", width: "100%", outline: "none",
  };

  return (
    <div>
      {/* ── KPIs année ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{ ...card, marginBottom: 0 }}>
          <div style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 9, color: "#8FAAB6", letterSpacing: 0.5, marginBottom: 4 }}>TOTAL {filterYear}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: colorNavy }}>{yearTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
          </div>
        </div>
        {byType.map(({ type, total }) => {
          const col = TYPE_COLORS[type];
          return (
            <div key={type} style={{ ...card, marginBottom: 0 }}>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 9, color: col.color, letterSpacing: 0.3, marginBottom: 4, fontWeight: 600 }}>
                  {type === "entree" ? "ENTRÉE" : type === "gestion" ? "GESTION" : type === "arbitrage" ? "ARBITRAGE" : "HONORAIRES"}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: colorNavy }}>{total > 0 ? total.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €" : "—"}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Filtres + actions ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ ...inp, width: "auto", padding: "5px 10px" }}>
          {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "entree", "gestion", "arbitrage", "honoraire"] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{
              padding: "5px 12px", borderRadius: 7, border: "none", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
              background: filterType === t ? colorNavy : "rgba(255,255,255,0.85)",
              color: filterType === t ? "#fff" : "#5E7A88",
              fontWeight: filterType === t ? 600 : 400,
            }}>
              {t === "all" ? "Tout" : t === "entree" ? "Entrée" : t === "gestion" ? "Gestion" : t === "arbitrage" ? "Arbitrage" : "Honoraires"}
            </button>
          ))}
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY_ENTRY }); }} style={{
          marginLeft: "auto", padding: "7px 16px", borderRadius: 7, border: "none",
          background: colorNavy, color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
        }}>
          + Saisir une commission
        </button>
      </div>

      {/* ── Formulaire saisie ── */}
      {showForm && (
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={cardHeader}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: colorGold }} />
            {editId ? "Modifier la commission" : "Nouvelle commission"}
          </div>
          <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {/* Type */}
            <div>
              <span style={label}>TYPE</span>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as CommissionType }))} style={inp}>
                {(Object.entries(TYPE_LABELS) as [CommissionType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {/* Contrat lié */}
            <div>
              <span style={label}>CONTRAT LIÉ</span>
              <select value={form.contractId ?? ""} onChange={e => setForm(f => ({ ...f, contractId: e.target.value || null, scope: e.target.value ? "contrat" : "client" }))} style={inp}>
                <option value="">— Global client —</option>
                {contracts.map(c => <option key={c.id} value={c.id}>{c.productName || c.type} {c.insurer ? `(${c.insurer})` : ""}</option>)}
              </select>
            </div>
            {/* Assureur */}
            <div>
              <span style={label}>ASSUREUR</span>
              <input value={form.insurer} onChange={e => setForm(f => ({ ...f, insurer: e.target.value }))} placeholder="Swiss Life, Generali..." style={inp} />
            </div>
            {/* Période */}
            <div>
              <span style={label}>PÉRIODE</span>
              <input type="month" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} style={inp} />
            </div>
            {/* Date réception */}
            <div>
              <span style={label}>DATE RÉCEPTION</span>
              <input type="date" value={form.receivedDate} onChange={e => setForm(f => ({ ...f, receivedDate: e.target.value }))} style={inp} />
            </div>
            {/* Montant reçu */}
            <div>
              <span style={label}>MONTANT REÇU (€)</span>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" style={inp} />
            </div>
            {/* Montant estimé */}
            <div>
              <span style={label}>MONTANT ESTIMÉ (€)</span>
              <input type="number" step="0.01" value={form.estimated} onChange={e => setForm(f => ({ ...f, estimated: e.target.value }))} placeholder="0.00" style={inp} />
            </div>
            {/* Notes */}
            <div style={{ gridColumn: "1/-1" }}>
              <span style={label}>NOTES</span>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Référence, commentaire..." style={inp} />
            </div>
            {/* Actions */}
            <div style={{ gridColumn: "1/-1", display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ padding: "7px 16px", borderRadius: 7, border: "1px solid rgba(11,48,64,0.15)", background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={handleSubmit} style={{ padding: "7px 20px", borderRadius: 7, border: "none", background: colorNavy, color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                {editId ? "Modifier" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Liste commissions ── */}
      <div style={card}>
        <div style={cardHeader}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5B82A6" }} />
          Commissions {filterYear}
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 400, color: "#5E7A88" }}>{filtered.length} entrée{filtered.length > 1 ? "s" : ""}</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#8FAAB6", fontSize: 13 }}>
            Aucune commission enregistrée pour {filterYear}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(11,48,64,0.03)" }}>
                {["Période", "Type", "Contrat", "Assureur", "Reçu", "Estimé", "Écart", ""].map(h => (
                  <th key={h} style={{ padding: "8px 12px", fontSize: 10, fontWeight: 600, color: "#5B82A6", textAlign: "left", letterSpacing: 0.4, borderBottom: "1px solid rgba(11,48,64,0.07)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const col = TYPE_COLORS[c.type];
                const ecart = c.estimated && c.amount ? parseFloat(c.amount) - parseFloat(c.estimated) : null;
                return (
                  <tr key={c.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(11,48,64,0.05)" : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(214,228,240,0.15)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "9px 12px", fontSize: 12, color: colorNavy, fontWeight: 500 }}>{formatPeriod(c.period)}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 500, background: col.bg, color: col.color, border: `1px solid ${col.border}` }}>
                        {c.type === "entree" ? "Entrée" : c.type === "gestion" ? "Gestion" : c.type === "arbitrage" ? "Arbitrage" : "Honoraire"}
                      </span>
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: 11, color: "#5E7A88" }}>{c.contractName || "Global"}</td>
                    <td style={{ padding: "9px 12px", fontSize: 11, color: "#5E7A88" }}>{c.insurer || "—"}</td>
                    <td style={{ padding: "9px 12px", fontSize: 12, fontWeight: 600, color: colorNavy }}>{formatEuro(c.amount)}</td>
                    <td style={{ padding: "9px 12px", fontSize: 11, color: "#8FAAB6" }}>{c.estimated ? formatEuro(c.estimated) : "—"}</td>
                    <td style={{ padding: "9px 12px", fontSize: 11, fontWeight: 500, color: ecart === null ? "#8FAAB6" : ecart >= 0 ? "#1E6B52" : "#991B1B" }}>
                      {ecart !== null ? (ecart >= 0 ? "+" : "") + ecart.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €" : "—"}
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleEdit(c)} style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(11,48,64,0.12)", background: "#fff", fontSize: 10, cursor: "pointer", color: "#5E7A88", fontFamily: "inherit" }}>✏</button>
                        <button onClick={() => handleDelete(c.id)} style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(220,38,38,0.20)", background: "#fff", fontSize: 10, cursor: "pointer", color: "#DC2626", fontFamily: "inherit" }}>✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Total en bas */}
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{ background: "rgba(11,48,64,0.03)", borderTop: "2px solid rgba(11,48,64,0.09)" }}>
                  <td colSpan={4} style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, color: "#5E7A88" }}>TOTAL</td>
                  <td style={{ padding: "9px 12px", fontSize: 13, fontWeight: 700, color: colorNavy }}>
                    {filtered.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </td>
                  <td style={{ padding: "9px 12px", fontSize: 11, color: "#8FAAB6" }}>
                    {filtered.reduce((s, c) => s + (parseFloat(c.estimated) || 0), 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}
