// src/components/ConformiteView.tsx
// Vue globale conformité — tous clients, alertes d'échéance
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";
import type { ContactRecord } from "../types/crm";
import type { ConformiteData } from "./fiche/TabConformite";

interface ConformiteViewProps {
  contacts: ContactRecord[];
  colorNavy: string;
  colorGold: string;
  onOpenContact: (record: ContactRecord) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function monthsUntil(dateStr: string): number {
  if (!dateStr) return Infinity;
  return (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
}

function addYears(dateStr: string, years: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

type AlertStatus = "ok" | "warning" | "danger" | "empty";

function getStatus(expiryDate: string, warnMonths = 6): AlertStatus {
  if (!expiryDate) return "empty";
  const months = monthsUntil(expiryDate);
  if (months < 0) return "danger";
  if (months < warnMonths) return "warning";
  return "ok";
}

const STATUS_STYLE: Record<AlertStatus, { bg: string; color: string; dot: string; label: string }> = {
  ok:      { bg: "#ECFDF5", color: "#065F46", dot: "#10B981", label: "OK" },
  warning: { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B", label: "À renouveler" },
  danger:  { bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444", label: "Expiré" },
  empty:   { bg: "#F3F4F6", color: "#6B7280", dot: "#D1D5DB", label: "À compléter" },
};

function Badge({ status }: { status: AlertStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 500,
      background: s.bg, color: s.color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />
      {s.label}
    </span>
  );
}

// Score MIF2 simplifié pour l'affichage
function getMIF2Profil(c: ConformiteData["mif2"]): string {
  if (!c.completedDate) return "—";
  let score = c.attitude + c.reactionBaisse;
  if (c.modeGestion === "libre") score += 6;
  else if (c.modeGestion === "pilote") score += 3;
  if (c.savoirUCRisque) score += 2;
  if (c.savoirHorizonUC) score += 2;
  if (c.savoirRisqueRendement) score += 2;
  if (score <= 15) return "Prudent";
  if (score <= 30) return "Équilibré";
  if (score <= 48) return "Dynamique";
  return "Offensif";
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, colorNavy }: {
  label: string; value: string; sub?: string; icon: string; colorNavy: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: colorNavy }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{ fontSize: 20, opacity: 0.5 }}>{icon}</div>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function ConformiteView({ contacts, colorNavy, colorGold: _cg, onOpenContact }: ConformiteViewProps) {
  const [filterStatus, setFilterStatus] = useState<AlertStatus | "all">("all");
  const [filterSection, setFilterSection] = useState<"all" | "kyc" | "mif2" | "mission" | "rgpd">("all");
  const [search, setSearch] = useState("");

  // Construire les données par client
  const rows = useMemo(() => contacts.map(contact => {
    const c: ConformiteData = contact.payload?.conformite ?? {
      kyc: { idType: "", idNumber: "", idExpiry: "", idVerifiedDate: "", isPPE: false, ppeDetails: "", isFATCA: false, fatcaTIN: "", isResidentFiscalUS: false, originFunds: "", riskLevel: "" },
      mif2: { completedDate: "", attitude: 0, reactionBaisse: 0, connaitFondsEuros: false, investiFondsEuros: false, connaitActions: false, investiActions: false, connaitOPCVM: false, investiOPCVM: false, connaitImmo: false, investiImmo: false, connaitTrackers: false, investiTrackers: false, connaitStructures: false, investiStructures: false, aSubiPertes: false, ampleurPertes: "", reactionPertes: 0, aRealiseGains: false, ampleurGains: "", reactionGains: 0, modeGestion: "", savoirUCRisque: false, savoirHorizonUC: false, savoirRisqueRendement: false, horizon: "" },
      lettreMission: { status: "", signedDate: "", notes: "" },
      ders: [],
      rgpd: { consentGiven: false, consentDate: "", optOutMarketing: false, notes: "" },
    } as ConformiteData;

    const mif2Expiry = c.mif2.completedDate ? addYears(c.mif2.completedDate, 2) : "";
    const missionExpiry = c.lettreMission.signedDate ? addYears(c.lettreMission.signedDate, 2) : "";

    const kycStatus = !c.kyc.idVerifiedDate ? "empty" : c.kyc.idExpiry ? getStatus(c.kyc.idExpiry) : "ok";
    const mif2Status = !c.mif2.completedDate ? "empty" : getStatus(mif2Expiry);
    const missionStatus = !c.lettreMission.signedDate ? "empty" : getStatus(missionExpiry);
    const rgpdStatus: AlertStatus = c.rgpd.consentGiven ? "ok" : "empty";

    // Statut global = le pire
    const order: AlertStatus[] = ["danger", "warning", "empty", "ok"];
    const globalStatus = [kycStatus, mif2Status, missionStatus, rgpdStatus]
      .sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] as AlertStatus;

    return { contact, c, kycStatus, mif2Status, missionStatus, rgpdStatus, globalStatus, mif2Expiry, missionExpiry };
  }), [contacts]);

  // KPIs
  const nbOk = rows.filter(r => r.globalStatus === "ok").length;
  const nbWarning = rows.filter(r => r.globalStatus === "warning").length;
  const nbDanger = rows.filter(r => r.globalStatus === "danger").length;
  const nbEmpty = rows.filter(r => r.globalStatus === "empty").length;

  // Filtres
  const filtered = useMemo(() => rows.filter(r => {
    if (filterStatus !== "all" && r.globalStatus !== filterStatus) return false;
    if (filterSection === "kyc" && r.kycStatus === "ok") return false;
    if (filterSection === "mif2" && r.mif2Status === "ok") return false;
    if (filterSection === "mission" && r.missionStatus === "ok") return false;
    if (filterSection === "rgpd" && r.rgpdStatus === "ok") return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.contact.displayName.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [rows, filterStatus, filterSection, search]);

  const inp: React.CSSProperties = {
    border: "1px solid #E2E5EC", borderRadius: 6, padding: "6px 10px",
    fontSize: 12, fontFamily: "inherit", outline: "none", background: "#fff",
  };

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Titre */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: colorNavy, margin: 0 }}>Conformité DDA / MIF2 / KYC</h2>
        <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3, marginBottom: 0 }}>
          {contacts.length} client{contacts.length > 1 ? "s" : ""} · Alertes et échéances réglementaires
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Conformes" value={String(nbOk)} sub="Tous documents à jour" icon="✅" colorNavy="#065F46" />
        <KpiCard label="À renouveler" value={String(nbWarning)} sub="Échéance < 6 mois" icon="⚠️" colorNavy="#92400E" />
        <KpiCard label="Expirés" value={String(nbDanger)} sub="Action requise" icon="🔴" colorNavy="#991B1B" />
        <KpiCard label="À compléter" value={String(nbEmpty)} sub="Données manquantes" icon="📋" colorNavy={colorNavy} />
      </div>

      {/* Filtres */}
      <div style={{
        background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10,
        padding: "12px 14px", marginBottom: 12,
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un client..." style={{ ...inp, width: 200 }} />

        {/* Filtre statut global */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "danger", "warning", "empty", "ok"] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: "4px 10px", borderRadius: 10, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
              border: filterStatus === s ? "none" : "1px solid #E2E5EC",
              background: filterStatus === s ? colorNavy : "#fff",
              color: filterStatus === s ? "#fff" : "#6B7280",
              fontWeight: filterStatus === s ? 600 : 400,
            }}>
              {s === "all" ? "Tous" : STATUS_STYLE[s].label}
            </button>
          ))}
        </div>

        {/* Filtre section */}
        <select value={filterSection} onChange={e => setFilterSection(e.target.value as any)} style={{ ...inp, marginLeft: "auto" }}>
          <option value="all">Toutes sections</option>
          <option value="kyc">KYC non OK</option>
          <option value="mif2">MIF2 non OK</option>
          <option value="mission">Mission non OK</option>
          <option value="rgpd">RGPD non OK</option>
        </select>

        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{
          background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10,
          padding: "50px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13,
        }}>
          Aucun client ne correspond aux filtres.
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#F8F9FB", borderBottom: "2px solid #E2E5EC" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>Client</th>
                <th style={{ padding: "10px 10px", textAlign: "center", fontWeight: 600, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>Statut global</th>
                <th style={{ padding: "10px 10px", textAlign: "center", fontWeight: 600, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>KYC</th>
                <th style={{ padding: "10px 10px", textAlign: "center", fontWeight: 600, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>MIF2</th>
                <th style={{ padding: "10px 10px", textAlign: "center", fontWeight: 600, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>Lettre mission</th>
                <th style={{ padding: "10px 10px", textAlign: "center", fontWeight: 600, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>RGPD</th>
                <th style={{ padding: "10px 10px", textAlign: "center", fontWeight: 600, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>Profil</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>Renouvellement</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ contact, c, kycStatus, mif2Status, missionStatus, rgpdStatus, globalStatus, mif2Expiry, missionExpiry }) => (
                <tr key={contact.id}
                  onClick={() => onOpenContact(contact)}
                  style={{ borderBottom: "1px solid #F0F2F6", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F8F9FB")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Client */}
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: colorNavy }}>{contact.displayName}</div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>
                      {c.kyc.riskLevel && (
                        <span style={{
                          padding: "1px 6px", borderRadius: 8, fontSize: 9, fontWeight: 500, marginRight: 4,
                          background: c.kyc.riskLevel === "faible" ? "#ECFDF5" : c.kyc.riskLevel === "moyen" ? "#FFFBEB" : "#FEF2F2",
                          color: c.kyc.riskLevel === "faible" ? "#065F46" : c.kyc.riskLevel === "moyen" ? "#92400E" : "#991B1B",
                        }}>
                          Risque {c.kyc.riskLevel}
                        </span>
                      )}
                      {c.kyc.isPPE && <span style={{ padding: "1px 6px", borderRadius: 8, fontSize: 9, background: "#FEF3C7", color: "#92400E", marginRight: 4 }}>PPE</span>}
                      {c.kyc.isFATCA && <span style={{ padding: "1px 6px", borderRadius: 8, fontSize: 9, background: "#FEF3C7", color: "#92400E" }}>FATCA</span>}
                    </div>
                  </td>
                  {/* Global */}
                  <td style={{ padding: "10px", textAlign: "center" }}><Badge status={globalStatus} /></td>
                  {/* KYC */}
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <Badge status={kycStatus} />
                    {c.kyc.idExpiry && <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{formatDate(c.kyc.idExpiry)}</div>}
                  </td>
                  {/* MIF2 */}
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <Badge status={mif2Status} />
                    {mif2Expiry && <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>exp. {formatDate(mif2Expiry)}</div>}
                  </td>
                  {/* Mission */}
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <Badge status={missionStatus} />
                    {missionExpiry && <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>exp. {formatDate(missionExpiry)}</div>}
                  </td>
                  {/* RGPD */}
                  <td style={{ padding: "10px", textAlign: "center" }}><Badge status={rgpdStatus} /></td>
                  {/* Profil MIF2 */}
                  <td style={{ padding: "10px", textAlign: "center", fontSize: 12, color: "#374151", fontWeight: 500 }}>
                    {getMIF2Profil(c.mif2)}
                  </td>
                  {/* Prochaine échéance */}
                  <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 11, color: "#6B7280" }}>
                    {(() => {
                      const dates = [mif2Expiry, missionExpiry, c.kyc.idExpiry].filter(Boolean);
                      if (!dates.length) return "—";
                      const next = dates.sort()[0];
                      const months = monthsUntil(next);
                      if (months < 0) return <span style={{ color: "#EF4444", fontWeight: 500 }}>Expiré</span>;
                      if (months < 1) return <span style={{ color: "#EF4444", fontWeight: 500 }}>&lt; 1 mois</span>;
                      if (months < 6) return <span style={{ color: "#F59E0B", fontWeight: 500 }}>{Math.round(months)} mois</span>;
                      return <span>{formatDate(next)}</span>;
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
