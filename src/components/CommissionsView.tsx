// src/components/CommissionsView.tsx
// Vue globale commissions — tous clients confondus
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";
import type { ContactRecord } from "../types/crm";
import type { CommissionEntry, CommissionType } from "./fiche/TabCommissions";

interface CommissionsViewProps {
  contacts: ContactRecord[];
  colorNavy: string;
  colorGold: string;
  onOpenContact: (record: ContactRecord) => void;
}

const TYPE_LABELS: Record<CommissionType, string> = {
  entree:    "Entrée",
  gestion:   "Gestion",
  arbitrage: "Arbitrage",
  honoraire: "Honoraire",
};

const TYPE_COLORS: Record<CommissionType, { bg: string; color: string; border: string }> = {
  entree:    { bg: "rgba(46,139,110,0.10)", color: "#1E6B52", border: "rgba(46,139,110,0.20)" },
  gestion:   { bg: "rgba(91,130,166,0.10)", color: "#3A6080", border: "rgba(91,130,166,0.20)" },
  arbitrage: { bg: "rgba(201,168,76,0.12)", color: "#8A6D0A", border: "rgba(201,168,76,0.25)" },
  honoraire: { bg: "rgba(11,48,64,0.08)",   color: "#0B3040", border: "rgba(11,48,64,0.15)" },
};

function formatPeriod(period: string): string {
  const [y, m] = period.split("-");
  const months = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

export function CommissionsView({ contacts, colorNavy, colorGold, onOpenContact }: CommissionsViewProps) {
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterType, setFilterType] = useState<CommissionType | "all">("all");
  const [filterInsurer, setFilterInsurer] = useState("all");
  const [sortBy, setSortBy] = useState<"period" | "amount" | "client">("period");

  // Collecte toutes les commissions de tous les contacts
  const allEntries = useMemo(() => {
    const entries: (CommissionEntry & { contactName: string; contactRecord: ContactRecord })[] = [];
    contacts.forEach(contact => {
      const comms: CommissionEntry[] = (contact.payload as any)?.commissions2 ?? [];
      comms.forEach(c => entries.push({ ...c, contactName: contact.displayName, contactRecord: contact }));
    });
    return entries;
  }, [contacts]);

  // Assureurs uniques
  const insurers = useMemo(() => {
    const set = new Set(allEntries.map(e => e.insurer).filter(Boolean));
    return Array.from(set).sort();
  }, [allEntries]);

  // Filtrage
  const filtered = useMemo(() => {
    return allEntries
      .filter(e => e.period.startsWith(filterYear))
      .filter(e => filterType === "all" || e.type === filterType)
      .filter(e => filterInsurer === "all" || e.insurer === filterInsurer)
      .sort((a, b) => {
        if (sortBy === "period") return b.period.localeCompare(a.period);
        if (sortBy === "amount") return (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0);
        return a.contactName.localeCompare(b.contactName);
      });
  }, [allEntries, filterYear, filterType, filterInsurer, sortBy]);

  // KPIs
  const yearTotal = filtered.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const monthTotal = filtered.filter(e => e.period === new Date().toISOString().slice(0, 7)).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const byType = (["entree", "gestion", "arbitrage", "honoraire"] as CommissionType[]).map(type => ({
    type,
    total: filtered.filter(e => e.type === type).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
    count: filtered.filter(e => e.type === type).length,
  }));

  // Par mois pour le graphique simple
  const byMonth = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => { map[e.period] = (map[e.period] || 0) + (parseFloat(e.amount) || 0); });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);
  const maxMonth = Math.max(...byMonth.map(([, v]) => v), 1);

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(11,48,64,0.09)",
    borderRadius: 10,
    marginBottom: 14,
    overflow: "hidden",
  };
  const cardHeader: React.CSSProperties = {
    padding: "10px 14px",
    background: "rgba(214,228,240,0.38)",
    borderBottom: "1px solid rgba(91,130,166,0.12)",
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 12, fontWeight: 600, color: colorNavy,
  };
  const inp: React.CSSProperties = {
    border: "1px solid rgba(11,48,64,0.14)", borderRadius: 7,
    padding: "5px 10px", fontSize: 12, fontFamily: "inherit",
    color: "#0B3040", background: "#F6F8FA", outline: "none",
  };

  // Export CSV
  const handleExport = () => {
    const rows = [["Période","Client","Type","Contrat","Assureur","Reçu (€)","Estimé (€)","Date réception","Notes"]];
    filtered.forEach(e => rows.push([
      formatPeriod(e.period), e.contactName, TYPE_LABELS[e.type],
      e.contractName, e.insurer, e.amount, e.estimated, e.receivedDate, e.notes,
    ]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `commissions_${filterYear}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { label: `TOTAL ${filterYear}`, val: yearTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €", sub: `${filtered.length} entrées` },
          { label: "MOIS EN COURS", val: monthTotal > 0 ? monthTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €" : "—", sub: formatPeriod(new Date().toISOString().slice(0, 7)) },
        ].map(({ label, val, sub }) => (
          <div key={label} style={{ ...card, marginBottom: 0 }}>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 9, color: "#8FAAB6", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: colorNavy }}>{val}</div>
              <div style={{ fontSize: 10, color: "#5E7A88", marginTop: 3 }}>{sub}</div>
            </div>
          </div>
        ))}
        {byType.map(({ type, total, count }) => {
          const col = TYPE_COLORS[type];
          return (
            <div key={type} style={{ ...card, marginBottom: 0 }}>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 9, color: col.color, letterSpacing: 0.3, marginBottom: 4, fontWeight: 600 }}>
                  {type.toUpperCase()}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: colorNavy }}>{total > 0 ? total.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €" : "—"}</div>
                <div style={{ fontSize: 10, color: "#8FAAB6", marginTop: 3 }}>{count} entrée{count > 1 ? "s" : ""}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Graphique mensuel ── */}
      {byMonth.length > 0 && (
        <div style={{ ...card }}>
          <div style={cardHeader}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: colorGold }} />
            Évolution mensuelle {filterYear}
          </div>
          <div style={{ padding: "16px", display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
            {byMonth.map(([period, val]) => (
              <div key={period} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 4 }}>
                <div style={{ fontSize: 9, color: "#8FAAB6" }}>{val.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
                <div style={{ width: "100%", background: colorNavy, borderRadius: "3px 3px 0 0", height: Math.max(4, (val / maxMonth) * 60) }} />
                <div style={{ fontSize: 9, color: "#8FAAB6", whiteSpace: "nowrap" }}>{formatPeriod(period).slice(0, 3)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filtres ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={inp}>
          {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value as CommissionType | "all")} style={inp}>
          <option value="all">Tous types</option>
          {(Object.entries(TYPE_LABELS) as [CommissionType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {insurers.length > 0 && (
          <select value={filterInsurer} onChange={e => setFilterInsurer(e.target.value)} style={inp}>
            <option value="all">Tous assureurs</option>
            {insurers.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        )}
        <select value={sortBy} onChange={e => setSortBy(e.target.value as "period" | "amount" | "client")} style={inp}>
          <option value="period">Tri : Période</option>
          <option value="amount">Tri : Montant</option>
          <option value="client">Tri : Client</option>
        </select>
        <button onClick={handleExport} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(11,48,64,0.15)", background: "rgba(255,255,255,0.85)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: colorNavy }}>
          ⬇ Export CSV
        </button>
      </div>

      {/* ── Tableau global ── */}
      <div style={card}>
        <div style={cardHeader}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5B82A6" }} />
          Commissions {filterYear}
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 400, color: "#5E7A88" }}>{filtered.length} entrée{filtered.length > 1 ? "s" : ""}</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#8FAAB6", fontSize: 13 }}>
            Aucune commission enregistrée pour {filterYear}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(11,48,64,0.03)" }}>
                {["Période","Client","Type","Contrat","Assureur","Reçu","Estimé","Écart"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", fontSize: 10, fontWeight: 600, color: "#5B82A6", textAlign: "left", letterSpacing: 0.4, borderBottom: "1px solid rgba(11,48,64,0.07)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => {
                const col = TYPE_COLORS[e.type];
                const ecart = e.estimated && e.amount ? parseFloat(e.amount) - parseFloat(e.estimated) : null;
                return (
                  <tr key={e.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(11,48,64,0.05)" : "none", cursor: "pointer" }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = "rgba(214,228,240,0.15)")}
                    onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}
                    onClick={() => onOpenContact(e.contactRecord)}>
                    <td style={{ padding: "9px 12px", fontSize: 12, color: colorNavy, fontWeight: 500 }}>{formatPeriod(e.period)}</td>
                    <td style={{ padding: "9px 12px", fontSize: 12, color: colorNavy, fontWeight: 500 }}>{e.contactName}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 500, background: col.bg, color: col.color, border: `1px solid ${col.border}` }}>
                        {TYPE_LABELS[e.type]}
                      </span>
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: 11, color: "#5E7A88" }}>{e.contractName || "Global"}</td>
                    <td style={{ padding: "9px 12px", fontSize: 11, color: "#5E7A88" }}>{e.insurer || "—"}</td>
                    <td style={{ padding: "9px 12px", fontSize: 12, fontWeight: 600, color: colorNavy }}>{e.amount ? parseFloat(e.amount).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €" : "—"}</td>
                    <td style={{ padding: "9px 12px", fontSize: 11, color: "#8FAAB6" }}>{e.estimated ? parseFloat(e.estimated).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €" : "—"}</td>
                    <td style={{ padding: "9px 12px", fontSize: 11, fontWeight: 500, color: ecart === null ? "#8FAAB6" : ecart >= 0 ? "#1E6B52" : "#991B1B" }}>
                      {ecart !== null ? (ecart >= 0 ? "+" : "") + ecart.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €" : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "rgba(11,48,64,0.03)", borderTop: "2px solid rgba(11,48,64,0.09)" }}>
                <td colSpan={5} style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, color: "#5E7A88" }}>TOTAL</td>
                <td style={{ padding: "9px 12px", fontSize: 14, fontWeight: 700, color: colorNavy }}>
                  {filtered.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                </td>
                <td style={{ padding: "9px 12px", fontSize: 11, color: "#8FAAB6" }}>
                  {filtered.reduce((s, e) => s + (parseFloat(e.estimated) || 0), 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
