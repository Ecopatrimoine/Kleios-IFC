// src/components/ContratsView.tsx
// Vue globale des contrats — tous clients confondus
// KPIs encours, filtres par type/assureur/statut, recherche, tri
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";
import type { ContactRecord, Contract, ContractType, ContractStatus } from "../types/crm";
import { CONTRACT_TYPE_LABELS } from "../constants";
import { findAssureur, getLogoUrl } from "../constants/assureurs";

interface ContratsViewProps {
  contacts: ContactRecord[];
  colorNavy: string;
  colorGold: string;
  onOpenContact: (record: ContactRecord) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatVal(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M€`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k€`;
  return `${n.toFixed(0)} €`;
}
function parseVal(s: string): number {
  const v = parseFloat((s ?? "").replace(/[^0-9.,]/g, "").replace(",", "."));
  return isNaN(v) ? 0 : v;
}

const TYPE_STYLES: Record<string, { bg: string; color: string; short: string }> = {
  av:                  { bg: "#EEF2FF", color: "#3730A3", short: "AV" },
  per:                 { bg: "#ECFDF5", color: "#065F46", short: "PER" },
  scpi:                { bg: "#FEF3C7", color: "#92400E", short: "SCPI" },
  prevoyance:          { bg: "#FDF2F8", color: "#9D174D", short: "PRÉ" },
  capitalisation:      { bg: "#F0F9FF", color: "#0C4A6E", short: "CAP" },
  pea:                 { bg: "#F0FDF4", color: "#14532D", short: "PEA" },
  cto:                 { bg: "#FFF7ED", color: "#7C2D12", short: "CTO" },
  sante:               { bg: "#FDF4FF", color: "#581C87", short: "SAN" },
  iard:                { bg: "#F8FAFC", color: "#334155", short: "IAR" },
  emprunteur:          { bg: "#FFF1F2", color: "#881337", short: "EMP" },
  retraite_collective: { bg: "#F0FDF4", color: "#14532D", short: "RET" },
  autre:               { bg: "#F3F4F6", color: "#6B7280", short: "AUT" },
};

const STATUS_COLORS: Record<ContractStatus, { bg: string; color: string; label: string }> = {
  actif:          { bg: "#ECFDF5", color: "#065F46", label: "Actif" },
  rachat_partiel: { bg: "#FFFBEB", color: "#92400E", label: "Rachat partiel" },
  rachat_total:   { bg: "#FEF2F2", color: "#991B1B", label: "Rachat total" },
  en_cours:       { bg: "#EFF6FF", color: "#1D4ED8", label: "En cours" },
  resilie:        { bg: "#F3F4F6", color: "#6B7280", label: "Résilié" },
  suspendu:       { bg: "#FEF3C7", color: "#92400E", label: "Suspendu" },
};

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, colorNavy }: {
  label: string; value: string; sub?: string; icon: string; colorNavy: string;
}) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10,
      padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
            {label}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: colorNavy, lineHeight: 1 }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{ fontSize: 20, opacity: 0.5 }}>{icon}</div>
      </div>
    </div>
  );
}

// ── Ligne contrat ─────────────────────────────────────────────────────────────

function ContractRow({ contract, contactName, onOpen, colorNavy }: {
  contract: Contract;
  contactName: string;
  onOpen: () => void;
  colorNavy: string;
}) {
  const style = TYPE_STYLES[contract.type] ?? TYPE_STYLES.autre;
  const statusStyle = STATUS_COLORS[contract.status] ?? STATUS_COLORS.actif;
  const value = parseVal(contract.currentValue);
  const perf = parseFloat(contract.performance2024 ?? "0");
  const assureurInfo = findAssureur(contract.insurer);

  return (
    <tr
      onClick={onOpen}
      style={{ borderBottom: "1px solid #F0F2F6", cursor: "pointer" }}
      onMouseEnter={e => (e.currentTarget.style.background = "#F8F9FB")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {/* Type */}
      <td style={{ padding: "10px 12px" }}>
        <div style={{
          width: 34, height: 34, borderRadius: 7,
          background: assureurInfo ? "#F8F9FB" : style.bg,
          border: assureurInfo ? "1px solid #E2E5EC" : "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 700, color: style.color,
        }}>
          {assureurInfo
            ? <img src={getLogoUrl(assureurInfo.domain, 48)} alt={assureurInfo.label}
                style={{ width: 24, height: 24, objectFit: "contain" }}
                onError={e => { e.currentTarget.style.display = "none"; }}
              />
            : style.short
          }
        </div>
      </td>
      {/* Produit */}
      <td style={{ padding: "10px 8px" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#0D1B2E" }}>
          {contract.productName || CONTRACT_TYPE_LABELS[contract.type]}
        </div>
        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>
          {contract.insurer} {contract.contractNumber ? `· ${contract.contractNumber}` : ""}
        </div>
      </td>
      {/* Client */}
      <td style={{ padding: "10px 8px" }}>
        <div style={{ fontSize: 13, color: colorNavy, fontWeight: 500 }}>{contactName}</div>
      </td>
      {/* Statut */}
      <td style={{ padding: "10px 8px" }}>
        <span style={{
          padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 500,
          background: statusStyle.bg, color: statusStyle.color,
        }}>
          {statusStyle.label}
        </span>
      </td>
      {/* Encours */}
      <td style={{ padding: "10px 12px", textAlign: "right" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0D1B2E" }}>
          {value > 0 ? formatVal(value) : "—"}
        </div>
        {contract.performance2024 && (
          <div style={{ fontSize: 10, color: perf >= 0 ? "#10B981" : "#EF4444", marginTop: 1 }}>
            {perf >= 0 ? "▲" : "▼"} {Math.abs(perf).toFixed(1)}%
          </div>
        )}
      </td>
      {/* Prime */}
      <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 12, color: "#6B7280" }}>
        {contract.annualPremium ? `${parseVal(contract.annualPremium).toLocaleString("fr-FR")} €/an` : "—"}
      </td>
      {/* Souscription */}
      <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, color: "#9CA3AF" }}>
        {contract.subscriptionDate
          ? new Date(contract.subscriptionDate).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })
          : "—"}
      </td>
    </tr>
  );
}

// ── Vue principale ────────────────────────────────────────────────────────────

export function ContratsView({ contacts, colorNavy, colorGold: _cg, onOpenContact }: ContratsViewProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("actif");
  const [filterAssureur, setFilterAssureur] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"encours" | "date" | "client">("encours");

  // Aplatir tous les contrats avec leur contact
  const allContracts = useMemo(() => {
    const list: { contract: Contract; contact: ContactRecord }[] = [];
    contacts.forEach(c => {
      (c.payload?.contracts ?? []).forEach(ct => {
        list.push({ contract: ct, contact: c });
      });
    });
    return list;
  }, [contacts]);

  // KPIs globaux (contrats actifs uniquement)
  const actifs = allContracts.filter(({ contract: c }) => c.status === "actif");
  const totalEncours = actifs.reduce((s, { contract: c }) => s + parseVal(c.currentValue), 0);
  const totalPrimes = actifs.reduce((s, { contract: c }) => s + parseVal(c.annualPremium), 0);
  const avgEncours = actifs.length > 0 ? totalEncours / actifs.length : 0;

  // Listes pour les filtres
  const types = [...new Set(allContracts.map(({ contract: c }) => c.type))];
  const assureurs = [...new Set(allContracts.map(({ contract: c }) => c.insurer).filter(Boolean))].sort();

  // Filtre + tri
  const filtered = useMemo(() => {
    let list = allContracts;
    if (filterStatus !== "all") list = list.filter(({ contract: c }) => c.status === filterStatus);
    if (filterType !== "all") list = list.filter(({ contract: c }) => c.type === filterType);
    if (filterAssureur !== "all") list = list.filter(({ contract: c }) => c.insurer === filterAssureur);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(({ contract: c, contact }) =>
        c.productName?.toLowerCase().includes(q) ||
        c.insurer?.toLowerCase().includes(q) ||
        c.contractNumber?.toLowerCase().includes(q) ||
        contact.displayName.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "encours") return parseVal(b.contract.currentValue) - parseVal(a.contract.currentValue);
      if (sortBy === "client") return a.contact.displayName.localeCompare(b.contact.displayName);
      if (sortBy === "date") return (b.contract.subscriptionDate ?? "").localeCompare(a.contract.subscriptionDate ?? "");
      return 0;
    });
    return list;
  }, [allContracts, filterStatus, filterType, filterAssureur, search, sortBy]);

  const inp: React.CSSProperties = {
    border: "1px solid #E2E5EC", borderRadius: 6, padding: "6px 10px",
    fontSize: 12, fontFamily: "inherit", outline: "none", background: "#fff",
  };

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Titre */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: colorNavy, margin: 0 }}>
          Contrats
        </h2>
        <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3, marginBottom: 0 }}>
          {allContracts.length} contrat{allContracts.length > 1 ? "s" : ""} · {contacts.filter(c => (c.payload?.contracts?.length ?? 0) > 0).length} clients
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Encours total" value={totalEncours > 0 ? formatVal(totalEncours) : "—"} sub={`${actifs.length} contrats actifs`} icon="💼" colorNavy={colorNavy} />
        <KpiCard label="Primes annuelles" value={totalPrimes > 0 ? formatVal(totalPrimes) : "—"} sub="Tous contrats actifs" icon="📅" colorNavy={colorNavy} />
        <KpiCard label="Encours moyen" value={avgEncours > 0 ? formatVal(avgEncours) : "—"} sub="Par contrat actif" icon="📊" colorNavy={colorNavy} />
        <KpiCard label="Assureurs" value={String(assureurs.length)} sub={`${types.length} types de contrats`} icon="🏢" colorNavy={colorNavy} />
      </div>

      {/* Filtres */}
      <div style={{
        background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10,
        padding: "12px 14px", marginBottom: 12,
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        {/* Recherche */}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un contrat, client, assureur..."
          style={{ ...inp, width: 240 }}
        />

        {/* Statut */}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={inp}>
          <option value="all">Tous statuts</option>
          <option value="actif">Actifs</option>
          <option value="en_cours">En cours</option>
          <option value="suspendu">Suspendus</option>
          <option value="resilie">Résiliés</option>
        </select>

        {/* Type */}
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={inp}>
          <option value="all">Tous types</option>
          {types.map(t => (
            <option key={t} value={t}>{CONTRACT_TYPE_LABELS[t as ContractType] ?? t}</option>
          ))}
        </select>

        {/* Assureur */}
        {assureurs.length > 0 && (
          <select value={filterAssureur} onChange={e => setFilterAssureur(e.target.value)} style={inp}>
            <option value="all">Tous assureurs</option>
            {assureurs.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}

        {/* Tri */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{ ...inp, marginLeft: "auto" }}>
          <option value="encours">Tri : Encours ↓</option>
          <option value="client">Tri : Client A→Z</option>
          <option value="date">Tri : Date récente</option>
        </select>

        <span style={{ fontSize: 11, color: "#9CA3AF" }}>
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{
          background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10,
          padding: "50px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13,
        }}>
          {allContracts.length === 0
            ? "Aucun contrat enregistré. Ajoutez des contrats depuis les fiches clients ou importez un fichier."
            : "Aucun contrat ne correspond aux filtres."
          }
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8F9FB", borderBottom: "2px solid #E2E5EC" }}>
                <th style={{ width: 50 }} />
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px" }}>Contrat</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px" }}>Client</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px" }}>Statut</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px" }}>Encours</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px" }}>Prime</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px" }}>Souscription</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ contract, contact }) => (
                <ContractRow
                  key={`${contact.id}-${contract.id}`}
                  contract={contract}
                  contactName={contact.displayName}
                  onOpen={() => onOpenContact(contact)}
                  colorNavy={colorNavy}
                />
              ))}
            </tbody>
          </table>

          {/* Total */}
          {filtered.some(({ contract: c }) => parseVal(c.currentValue) > 0) && (
            <div style={{
              padding: "10px 12px", borderTop: "2px solid #E2E5EC",
              display: "flex", justifyContent: "flex-end", gap: 40,
              background: "#F8F9FB", fontSize: 12,
            }}>
              <span style={{ color: "#6B7280" }}>
                Total encours : <strong style={{ color: colorNavy }}>
                  {formatVal(filtered.reduce((s, { contract: c }) => s + parseVal(c.currentValue), 0))}
                </strong>
              </span>
              <span style={{ color: "#6B7280" }}>
                Total primes : <strong style={{ color: colorNavy }}>
                  {formatVal(filtered.reduce((s, { contract: c }) => s + parseVal(c.annualPremium), 0))} /an
                </strong>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
