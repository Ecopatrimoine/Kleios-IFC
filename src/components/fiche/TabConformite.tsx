// src/components/fiche/TabConformite.tsx
// Onglet Conformité — KYC, MIF2, Lettre de mission, DER, RGPD
// Questionnaire MIF2 identique à Ploutos pour synchronisation future
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";
import type { ContactRecord } from "../../types/crm";

interface TabConformiteProps {
  record: ContactRecord;
  onSave: (record: ContactRecord) => void;
  colorNavy: string;
  colorGold: string;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConformiteData {
  // KYC
  kyc: {
    idType: "" | "CNI" | "passeport" | "titre_sejour" | "permis";
    idNumber: string;
    idExpiry: string;
    idVerifiedDate: string;
    isPPE: boolean;
    ppeDetails: string;
    isFATCA: boolean;
    fatcaTIN: string;
    isResidentFiscalUS: boolean;
    originFunds: string;
    riskLevel: "" | "faible" | "moyen" | "eleve";
  };
  // MIF2 — identique Ploutos
  mif2: {
    completedDate: string;
    // Q1 — Attitude face aux risques
    attitude: 0 | 8 | 12 | 18;
    // Q2 — Réaction face à une baisse
    reactionBaisse: 0 | 6 | 12 | 18;
    // Q3 — Connaissances/expériences
    connaitFondsEuros: boolean; investiFondsEuros: boolean;
    connaitActions: boolean; investiActions: boolean;
    connaitOPCVM: boolean; investiOPCVM: boolean;
    connaitImmo: boolean; investiImmo: boolean;
    connaitTrackers: boolean; investiTrackers: boolean;
    connaitStructures: boolean; investiStructures: boolean;
    // Q4 — Pertes et gains subis
    aSubiPertes: boolean;
    ampleurPertes: "" | -5 | -10 | -20 | -99;
    reactionPertes: 0 | 1 | 2 | 3;
    aRealiseGains: boolean;
    ampleurGains: "" | 5 | 10 | 20 | 99;
    reactionGains: 0 | 1 | 2 | 3;
    // Q5 — Mode de gestion
    modeGestion: "" | "pilote" | "libre";
    // Q6 — Questions théoriques (2 pts chacune)
    savoirUCRisque: boolean;
    savoirHorizonUC: boolean;
    savoirRisqueRendement: boolean;
    // Horizon
    horizon: "" | "0-4" | "5-8" | "9-15" | "15+";
  };
  // Lettre de mission
  lettreMission: {
    status: "" | "signee" | "en_cours" | "a_renouveler" | "expiree";
    signedDate: string;
    notes: string;
  };
  // DER
  ders: Array<{
    id: string;
    operation: string;
    date: string;
    produit: string;
    notes: string;
  }>;
  // RGPD
  rgpd: {
    consentGiven: boolean;
    consentDate: string;
    optOutMarketing: boolean;
    notes: string;
  };
}

const EMPTY_CONFORMITE: ConformiteData = {
  kyc: {
    idType: "", idNumber: "", idExpiry: "", idVerifiedDate: "",
    isPPE: false, ppeDetails: "", isFATCA: false, fatcaTIN: "",
    isResidentFiscalUS: false, originFunds: "", riskLevel: "",
  },
  mif2: {
    completedDate: "",
    attitude: 0, reactionBaisse: 0,
    connaitFondsEuros: false, investiFondsEuros: false,
    connaitActions: false, investiActions: false,
    connaitOPCVM: false, investiOPCVM: false,
    connaitImmo: false, investiImmo: false,
    connaitTrackers: false, investiTrackers: false,
    connaitStructures: false, investiStructures: false,
    aSubiPertes: false, ampleurPertes: "", reactionPertes: 0,
    aRealiseGains: false, ampleurGains: "", reactionGains: 0,
    modeGestion: "",
    savoirUCRisque: false, savoirHorizonUC: false, savoirRisqueRendement: false,
    horizon: "",
  },
  lettreMission: { status: "", signedDate: "", notes: "" },
  ders: [],
  rgpd: { consentGiven: false, consentDate: "", optOutMarketing: false, notes: "" },
};

// ── Calcul score MIF2 ─────────────────────────────────────────────────────────

function computeMIF2Score(m: ConformiteData["mif2"]): { score: number; max: number; profil: string; profilColor: string; profilBg: string } {
  let score = 0;
  // Q1
  score += m.attitude;
  // Q2
  score += m.reactionBaisse;
  // Q3 — connaissances (1 pt par connait, 2 pts si connait + investi)
  const q3pairs = [
    [m.connaitFondsEuros, m.investiFondsEuros],
    [m.connaitActions, m.investiActions],
    [m.connaitOPCVM, m.investiOPCVM],
    [m.connaitImmo, m.investiImmo],
    [m.connaitTrackers, m.investiTrackers],
    [m.connaitStructures, m.investiStructures],
  ];
  q3pairs.forEach(([c, i]) => { if (c) score += 1; if (c && i) score += 1; });
  // Q4 — pertes/gains (max 6 pts)
  if (m.aSubiPertes) {
    const ampMap: Record<number, number> = { [-5]: 0, [-10]: 1, [-20]: 2, [-99]: 3 };
    score += ampMap[m.ampleurPertes as number] ?? 0;
    score += m.reactionPertes;
  }
  // Q5 — mode gestion
  if (m.modeGestion === "libre") score += 6;
  else if (m.modeGestion === "pilote") score += 3;
  // Q6 — théorie (2 pts chacune)
  if (m.savoirUCRisque) score += 2;
  if (m.savoirHorizonUC) score += 2;
  if (m.savoirRisqueRendement) score += 2;

  const max = 18 + 18 + 12 + 6 + 6 + 6; // 66

  let profil = "Non défini";
  let profilColor = "#6B7280";
  let profilBg = "#F3F4F6";
  if (score <= 15) { profil = "Prudent"; profilColor = "#065F46"; profilBg = "#ECFDF5"; }
  else if (score <= 30) { profil = "Équilibré"; profilColor = "#0C4A6E"; profilBg = "#EFF6FF"; }
  else if (score <= 48) { profil = "Dynamique"; profilColor = "#92400E"; profilBg = "#FEF3C7"; }
  else { profil = "Offensif"; profilColor = "#881337"; profilBg = "#FFF1F2"; }

  return { score, max, profil, profilColor, profilBg };
}

// ── Helpers UI ────────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  border: "1px solid #E2E5EC", borderRadius: 6, padding: "7px 10px",
  fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff",
  width: "100%", boxSizing: "border-box",
};

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0D1B2E" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={inp} />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
      <div onClick={() => onChange(!value)} style={{
        width: 36, height: 20, borderRadius: 10, position: "relative",
        background: value ? "#0D1B2E" : "#D1D5DB", transition: "background 0.2s", flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", top: 2, left: value ? 18 : 2,
          width: 16, height: 16, borderRadius: "50%", background: "#fff",
          transition: "left 0.2s",
        }} />
      </div>
      <span style={{ fontSize: 13, color: "#374151" }}>{label}</span>
    </label>
  );
}

function AlertBadge({ status, label }: { status: "ok" | "warning" | "danger" | "empty"; label: string }) {
  const styles = {
    ok:      { bg: "#ECFDF5", color: "#065F46", dot: "#10B981" },
    warning: { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
    danger:  { bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
    empty:   { bg: "#F3F4F6", color: "#6B7280", dot: "#D1D5DB" },
  }[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 500,
      background: styles.bg, color: styles.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: styles.dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// Calcule le statut d'une date d'échéance
function dateStatus(dateStr: string, warningMonths: number, _dangerMonths: number): "ok" | "warning" | "danger" | "empty" {
  if (!dateStr) return "empty";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMonths = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (diffMonths < 0) return "danger";
  if (diffMonths < warningMonths) return "warning";
  return "ok";
}

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Composant principal ───────────────────────────────────────────────────────

export function TabConformite({ record, onSave, colorNavy, colorGold }: TabConformiteProps) {
  const conformite: ConformiteData = record.payload?.conformite ?? EMPTY_CONFORMITE;
  const [activeSection, setActiveSection] = useState<"dashboard" | "kyc" | "mif2" | "mission" | "der" | "rgpd">("dashboard");
  const [newDer, setNewDer] = useState({ operation: "", date: "", produit: "", notes: "" });

  const upd = (section: keyof ConformiteData, key: string, val: unknown) => {
    const updated: ContactRecord = {
      ...record,
      payload: {
        ...record.payload,
        conformite: {
          ...conformite,
          [section]: { ...(conformite[section] as Record<string, unknown>), [key]: val },
        },
      },
    };
    onSave(updated);
  };

  const updMif2 = (key: string, val: unknown) => upd("mif2", key, val);
  const updKyc = (key: string, val: unknown) => upd("kyc", key, val);
  const updMission = (key: string, val: unknown) => upd("lettreMission", key, val);
  const updRgpd = (key: string, val: unknown) => upd("rgpd", key, val);

  const mif2Score = useMemo(() => computeMIF2Score(conformite.mif2), [conformite.mif2]);

  // Statuts pour le dashboard
  const mif2Date = conformite.mif2.completedDate;
  const mif2Expiry = mif2Date ? new Date(new Date(mif2Date).getTime() + 2 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10) : "";
  const mif2Status = !mif2Date ? "empty" : dateStatus(mif2Expiry, 6 * 30, 0); // alerte 6 mois avant

  const kycStatus = !conformite.kyc.idVerifiedDate ? "empty"
    : conformite.kyc.idExpiry ? dateStatus(conformite.kyc.idExpiry, 12, 0)
    : "ok";

  const missionStatus = !conformite.lettreMission.signedDate ? "empty"
    : (() => {
      const expiry = new Date(new Date(conformite.lettreMission.signedDate).getTime() + 2 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      return dateStatus(expiry, 6 * 30, 0);
    })();

  const rgpdStatus = conformite.rgpd.consentGiven ? "ok" : "empty";

  const sections = [
    { id: "dashboard", label: "Vue d'ensemble", icon: "📋" },
    { id: "kyc", label: "KYC", icon: "🪪" },
    { id: "mif2", label: "Profil MIF2", icon: "📊" },
    { id: "mission", label: "Lettre de mission", icon: "📄" },
    { id: "der", label: "DER", icon: "✅" },
    { id: "rgpd", label: "RGPD", icon: "🔒" },
  ] as const;

  const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #E2E5EC",
    borderRadius: 10, padding: 16, marginBottom: 16,
  };

  const grid3: React.CSSProperties = {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16,
  };

  return (
    <div style={{ display: "flex", gap: 16, padding: "0 4px 20px" }}>

      {/* ── Nav secondaire ── */}
      <div style={{ width: 160, flexShrink: 0 }}>
        <div style={{ background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10, overflow: "hidden" }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id as any)} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 12px", width: "100%", textAlign: "left",
              border: "none", borderBottom: "1px solid #F0F2F6",
              background: activeSection === s.id ? colorNavy : "#fff",
              color: activeSection === s.id ? "#fff" : "#374151",
              fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}>
              <span>{s.icon}</span>
              <span style={{ fontWeight: activeSection === s.id ? 600 : 400 }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* ════ DASHBOARD ════ */}
        {activeSection === "dashboard" && (
          <div>
            <SectionTitle title="Vue d'ensemble conformité" subtitle="Alertes et échéances réglementaires" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                {
                  label: "KYC / Pièce d'identité", status: kycStatus,
                  detail: conformite.kyc.idVerifiedDate ? `Vérifié le ${formatDate(conformite.kyc.idVerifiedDate)}` : "Non renseigné",
                  sub: conformite.kyc.idExpiry ? `Expiration: ${formatDate(conformite.kyc.idExpiry)}` : "",
                  onClick: () => setActiveSection("kyc"),
                },
                {
                  label: "Profil MIF2",
                  status: mif2Status,
                  detail: mif2Date ? `${mif2Score.profil} · Score ${mif2Score.score}/${mif2Score.max}` : "Non renseigné",
                  sub: mif2Date ? `Valide jusqu'au ${formatDate(mif2Expiry)} · Rempli le ${formatDate(mif2Date)}` : "Questionnaire à compléter",
                  onClick: () => setActiveSection("mif2"),
                },
                {
                  label: "Lettre de mission",
                  status: missionStatus,
                  detail: conformite.lettreMission.signedDate ? `Signée le ${formatDate(conformite.lettreMission.signedDate)}` : "Non signée",
                  sub: (() => {
                    if (!conformite.lettreMission.signedDate) return "Durée légale : 2 ans";
                    const expiry = new Date(new Date(conformite.lettreMission.signedDate).getTime() + 2 * 365.25 * 24 * 3600 * 1000);
                    return `Renouvellement avant le ${formatDate(expiry.toISOString().slice(0, 10))}`;
                  })(),
                  onClick: () => setActiveSection("mission"),
                },
                {
                  label: "RGPD",
                  status: rgpdStatus,
                  detail: conformite.rgpd.consentGiven ? `Consentement recueilli le ${formatDate(conformite.rgpd.consentDate)}` : "Consentement manquant",
                  sub: "",
                  onClick: () => setActiveSection("rgpd"),
                },
              ].map(({ label, status, detail, sub, onClick }) => (
                <div key={label} onClick={onClick} style={{
                  ...card, marginBottom: 0, cursor: "pointer", transition: "border-color 0.15s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = colorGold)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#E2E5EC")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0D1B2E", marginBottom: 6 }}>{label}</div>
                    <AlertBadge status={status as "ok" | "warning" | "danger" | "empty"} label={
                      status === "ok" ? "OK" :
                      status === "warning" ? "À renouveler" :
                      status === "danger" ? "Expiré" : "À compléter"
                    } />
                  </div>
                  <div style={{ fontSize: 12, color: "#374151" }}>{detail}</div>
                  {sub && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{sub}</div>}
                </div>
              ))}
            </div>

            {/* DER récentes */}
            {conformite.ders.length > 0 && (
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                  DER — {conformite.ders.length} déclaration{conformite.ders.length > 1 ? "s" : ""} d'adéquation
                </div>
                {conformite.ders.slice(-3).reverse().map(d => (
                  <div key={d.id} style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: "1px solid #F0F2F6", fontSize: 12 }}>
                    <span style={{ color: "#9CA3AF", width: 90, flexShrink: 0 }}>{formatDate(d.date)}</span>
                    <span style={{ flex: 1, color: "#374151" }}>{d.operation}</span>
                    <span style={{ color: "#6B7280" }}>{d.produit}</span>
                  </div>
                ))}
                {conformite.ders.length > 3 && (
                  <button onClick={() => setActiveSection("der")} style={{ marginTop: 8, fontSize: 11, color: colorNavy, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    Voir toutes les DER →
                  </button>
                )}
              </div>
            )}

            {/* Risque KYC */}
            {conformite.kyc.riskLevel && (
              <div style={{ ...card, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "#6B7280" }}>Niveau de risque client :</span>
                <AlertBadge
                  status={conformite.kyc.riskLevel === "faible" ? "ok" : conformite.kyc.riskLevel === "moyen" ? "warning" : "danger"}
                  label={conformite.kyc.riskLevel === "faible" ? "Risque faible" : conformite.kyc.riskLevel === "moyen" ? "Risque moyen" : "Risque élevé"}
                />
                {(conformite.kyc.isPPE || conformite.kyc.isFATCA) && (
                  <div style={{ display: "flex", gap: 6 }}>
                    {conformite.kyc.isPPE && <AlertBadge status="warning" label="PPE" />}
                    {conformite.kyc.isFATCA && <AlertBadge status="warning" label="FATCA" />}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════ KYC ════ */}
        {activeSection === "kyc" && (
          <div>
            <SectionTitle title="KYC — Connaissance Client" subtitle="Vérification d'identité et obligations réglementaires" />

            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Pièce d'identité</div>
              <div style={grid3}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Type de pièce</label>
                  <select value={conformite.kyc.idType} onChange={e => updKyc("idType", e.target.value)} style={inp}>
                    <option value="">Sélectionner...</option>
                    <option value="CNI">Carte nationale d'identité</option>
                    <option value="passeport">Passeport</option>
                    <option value="titre_sejour">Titre de séjour</option>
                    <option value="permis">Permis de conduire</option>
                  </select>
                </div>
                <Field label="Numéro" value={conformite.kyc.idNumber} onChange={v => updKyc("idNumber", v)} placeholder="N° de la pièce" />
                <Field label="Date d'expiration" value={conformite.kyc.idExpiry} onChange={v => updKyc("idExpiry", v)} type="date" />
                <Field label="Date de vérification" value={conformite.kyc.idVerifiedDate} onChange={v => updKyc("idVerifiedDate", v)} type="date" />
              </div>
            </div>

            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Obligations réglementaires</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Toggle label="Personne politiquement exposée (PPE)" value={conformite.kyc.isPPE} onChange={v => updKyc("isPPE", v)} />
                {conformite.kyc.isPPE && (
                  <div style={{ marginLeft: 44 }}>
                    <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Détails PPE</label>
                    <textarea value={conformite.kyc.ppeDetails} onChange={e => updKyc("ppeDetails", e.target.value)}
                      rows={2} placeholder="Fonction, mandat..." style={{ ...inp, resize: "vertical" as const, marginTop: 4 }} />
                  </div>
                )}
                <Toggle label="Sujet FATCA (nationalité ou résidence fiscale US)" value={conformite.kyc.isFATCA} onChange={v => updKyc("isFATCA", v)} />
                {conformite.kyc.isFATCA && (
                  <div style={{ marginLeft: 44 }}>
                    <Field label="TIN (Taxpayer Identification Number)" value={conformite.kyc.fatcaTIN} onChange={v => updKyc("fatcaTIN", v)} placeholder="000-00-0000" />
                  </div>
                )}
                <Toggle label="Résident fiscal aux États-Unis" value={conformite.kyc.isResidentFiscalUS} onChange={v => updKyc("isResidentFiscalUS", v)} />
              </div>
            </div>

            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Origine des fonds & Niveau de risque</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Origine des fonds</label>
                  <textarea value={conformite.kyc.originFunds} onChange={e => updKyc("originFunds", e.target.value)}
                    rows={2} placeholder="Salaires, héritage, vente immobilière..." style={{ ...inp, resize: "vertical" as const, marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: 6 }}>Niveau de risque client</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[
                      { val: "faible", label: "Faible", color: "#065F46", bg: "#ECFDF5" },
                      { val: "moyen", label: "Moyen", color: "#92400E", bg: "#FEF3C7" },
                      { val: "eleve", label: "Élevé", color: "#991B1B", bg: "#FEF2F2" },
                    ].map(({ val, label, color, bg }) => (
                      <button key={val} onClick={() => updKyc("riskLevel", conformite.kyc.riskLevel === val ? "" : val)} style={{
                        padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                        border: conformite.kyc.riskLevel === val ? "2px solid " + color : "2px solid transparent",
                        background: conformite.kyc.riskLevel === val ? bg : "#F3F4F6",
                        color: conformite.kyc.riskLevel === val ? color : "#6B7280",
                        fontWeight: conformite.kyc.riskLevel === val ? 600 : 400,
                      }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ MIF2 ════ */}
        {activeSection === "mif2" && (
          <div>
            <SectionTitle title="Profil Investisseur MIF2" subtitle="Questionnaire de connaissance client — valide 24 mois" />

            {/* Score + profil */}
            {conformite.mif2.completedDate && (
              <div style={{ ...card, display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <div style={{
                  padding: "8px 16px", borderRadius: 8,
                  background: mif2Score.profilBg, color: mif2Score.profilColor,
                  fontSize: 16, fontWeight: 700,
                }}>
                  {mif2Score.profil}
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#374151" }}>Score : <strong>{mif2Score.score} / {mif2Score.max}</strong></div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>Complété le {formatDate(conformite.mif2.completedDate)} · Valide jusqu'au {formatDate(mif2Expiry)}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 6, borderRadius: 3, background: "#E2E5EC", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 3, transition: "width 0.3s",
                      background: mif2Score.profilColor,
                      width: `${(mif2Score.score / mif2Score.max) * 100}%`,
                    }} />
                  </div>
                </div>
                <AlertBadge status={mif2Status} label={
                  mif2Status === "ok" ? "Valide" : mif2Status === "warning" ? "À renouveler" : "Expiré"
                } />
              </div>
            )}

            {/* Date de complétion */}
            <div style={card}>
              <Field label="Date de complétion du questionnaire" value={conformite.mif2.completedDate} onChange={v => updMif2("completedDate", v)} type="date" />
            </div>

            {/* Q1 — Attitude */}
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0D1B2E", marginBottom: 10 }}>
                Q1 — Quelle est votre attitude face aux risques financiers ?
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { val: 0, label: "Je refuse toute perte en capital, même partielle" },
                  { val: 8, label: "J'accepte une légère baisse temporaire si le potentiel de gain est plus élevé" },
                  { val: 12, label: "J'accepte des fluctuations importantes pour rechercher une meilleure performance" },
                  { val: 18, label: "Je recherche la performance maximale et accepte des pertes significatives" },
                ].map(({ val, label }) => (
                  <label key={val} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                    <input type="radio" name="attitude" checked={conformite.mif2.attitude === val}
                      onChange={() => updMif2("attitude", val)}
                      style={{ marginTop: 2, accentColor: colorNavy }} />
                    <span style={{ fontSize: 12, color: "#374151" }}>{label}</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "#9CA3AF" }}>{val} pts</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Q2 — Réaction baisse */}
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0D1B2E", marginBottom: 10 }}>
                Q2 — Votre portefeuille baisse de 20% en 3 mois. Que faites-vous ?
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { val: 0, label: "Je vends tout immédiatement pour éviter d'autres pertes" },
                  { val: 6, label: "Je vends une partie pour sécuriser" },
                  { val: 12, label: "Je ne fais rien et j'attends la reprise" },
                  { val: 18, label: "J'en profite pour investir davantage à des prix plus bas" },
                ].map(({ val, label }) => (
                  <label key={val} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                    <input type="radio" name="reactionBaisse" checked={conformite.mif2.reactionBaisse === val}
                      onChange={() => updMif2("reactionBaisse", val)}
                      style={{ marginTop: 2, accentColor: colorNavy }} />
                    <span style={{ fontSize: 12, color: "#374151" }}>{label}</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "#9CA3AF" }}>{val} pts</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Q3 — Connaissances */}
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0D1B2E", marginBottom: 10 }}>
                Q3 — Connaissances et expériences financières
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#F8F9FB" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 500, color: "#374151", borderBottom: "1px solid #E2E5EC" }}>Produit</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 500, color: "#374151", borderBottom: "1px solid #E2E5EC" }}>Je connais</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 500, color: "#374151", borderBottom: "1px solid #E2E5EC" }}>J'ai investi</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Fonds euros / Livrets", connait: "connaitFondsEuros" as const, investi: "investiFondsEuros" as const },
                    { label: "Actions / Obligations", connait: "connaitActions" as const, investi: "investiActions" as const },
                    { label: "OPCVM / SICAV", connait: "connaitOPCVM" as const, investi: "investiOPCVM" as const },
                    { label: "Immobilier / SCPI", connait: "connaitImmo" as const, investi: "investiImmo" as const },
                    { label: "Trackers / ETF", connait: "connaitTrackers" as const, investi: "investiTrackers" as const },
                    { label: "Produits structurés", connait: "connaitStructures" as const, investi: "investiStructures" as const },
                  ].map(({ label, connait, investi }) => (
                    <tr key={label} style={{ borderBottom: "1px solid #F0F2F6" }}>
                      <td style={{ padding: "8px 12px", color: "#374151" }}>{label}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <input type="checkbox" checked={conformite.mif2[connait]}
                          onChange={e => updMif2(connait, e.target.checked)}
                          style={{ accentColor: colorNavy }} />
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <input type="checkbox" checked={conformite.mif2[investi]}
                          disabled={!conformite.mif2[connait]}
                          onChange={e => updMif2(investi, e.target.checked)}
                          style={{ accentColor: colorNavy }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Q4 — Pertes et gains */}
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0D1B2E", marginBottom: 12 }}>
                Q4 — Pertes et gains subis
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Toggle label="Avez-vous déjà subi des pertes sur vos investissements ?" value={conformite.mif2.aSubiPertes} onChange={v => updMif2("aSubiPertes", v)} />
                {conformite.mif2.aSubiPertes && (
                  <div style={{ marginLeft: 44, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: 6 }}>Ampleur des pertes</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[{ val: -5, label: "< 5%" }, { val: -10, label: "5-10%" }, { val: -20, label: "10-20%" }, { val: -99, label: "> 20%" }].map(({ val, label }) => (
                          <button key={val} onClick={() => updMif2("ampleurPertes", conformite.mif2.ampleurPertes === val ? "" : val)} style={{
                            padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                            border: conformite.mif2.ampleurPertes === val ? `1px solid ${colorNavy}` : "1px solid #E2E5EC",
                            background: conformite.mif2.ampleurPertes === val ? colorNavy : "#fff",
                            color: conformite.mif2.ampleurPertes === val ? "#fff" : "#374151",
                          }}>{label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: 6 }}>Réaction aux pertes</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {[
                          { val: 0, label: "Cela m'a poussé à arrêter d'investir" },
                          { val: 1, label: "Cela m'a rendu plus prudent" },
                          { val: 2, label: "Cela ne m'a pas vraiment affecté" },
                          { val: 3, label: "Cela m'a encouragé à diversifier" },
                        ].map(({ val, label }) => (
                          <label key={val} style={{ display: "flex", gap: 8, cursor: "pointer", fontSize: 12 }}>
                            <input type="radio" name="reactionPertes" checked={conformite.mif2.reactionPertes === val}
                              onChange={() => updMif2("reactionPertes", val)} style={{ accentColor: colorNavy }} />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <Toggle label="Avez-vous déjà réalisé des gains significatifs ?" value={conformite.mif2.aRealiseGains} onChange={v => updMif2("aRealiseGains", v)} />
              </div>
            </div>

            {/* Q5 — Mode gestion */}
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0D1B2E", marginBottom: 10 }}>Q5 — Mode de gestion préféré</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { val: "pilote", label: "🤝 Gestion pilotée", sub: "Délégation au gestionnaire" },
                  { val: "libre", label: "🎯 Gestion libre", sub: "Je choisis moi-même" },
                ].map(({ val, label, sub }) => (
                  <button key={val} onClick={() => updMif2("modeGestion", conformite.mif2.modeGestion === val ? "" : val)} style={{
                    flex: 1, padding: "10px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                    border: conformite.mif2.modeGestion === val ? `2px solid ${colorNavy}` : "2px solid #E2E5EC",
                    background: conformite.mif2.modeGestion === val ? `${colorNavy}08` : "#fff",
                    color: "#374151", textAlign: "left" as const,
                  }}>
                    <div style={{ fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Q6 — Théorie */}
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0D1B2E", marginBottom: 10 }}>Q6 — Questions théoriques (2 pts chacune)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Toggle label="Les unités de compte présentent un risque de perte en capital" value={conformite.mif2.savoirUCRisque} onChange={v => updMif2("savoirUCRisque", v)} />
                <Toggle label="Un horizon de placement long réduit le risque global" value={conformite.mif2.savoirHorizonUC} onChange={v => updMif2("savoirHorizonUC", v)} />
                <Toggle label="Risque et rendement potentiel sont liés (plus de risque = plus de rendement potentiel)" value={conformite.mif2.savoirRisqueRendement} onChange={v => updMif2("savoirRisqueRendement", v)} />
              </div>
            </div>

            {/* Horizon */}
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0D1B2E", marginBottom: 10 }}>Horizon de placement</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { val: "0-4", label: "Court terme", sub: "0-4 ans" },
                  { val: "5-8", label: "Moyen terme", sub: "5-8 ans" },
                  { val: "9-15", label: "Long terme", sub: "9-15 ans" },
                  { val: "15+", label: "Très long terme", sub: "+15 ans" },
                ].map(({ val, label, sub }) => (
                  <button key={val} onClick={() => updMif2("horizon", conformite.mif2.horizon === val ? "" : val)} style={{
                    flex: 1, padding: "8px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                    border: conformite.mif2.horizon === val ? `2px solid ${colorNavy}` : "2px solid #E2E5EC",
                    background: conformite.mif2.horizon === val ? `${colorNavy}08` : "#fff",
                    color: "#374151", textAlign: "center" as const,
                  }}>
                    <div style={{ fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 10, color: "#9CA3AF" }}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ LETTRE DE MISSION ════ */}
        {activeSection === "mission" && (
          <div>
            <SectionTitle title="Lettre de mission" subtitle="Durée légale : 2 ans — Alerte renouvellement à 6 mois" />
            <div style={card}>
              <div style={grid3}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Statut</label>
                  <select value={conformite.lettreMission.status} onChange={e => updMission("status", e.target.value)} style={inp}>
                    <option value="">Non défini</option>
                    <option value="signee">Signée</option>
                    <option value="en_cours">En cours de signature</option>
                    <option value="a_renouveler">À renouveler</option>
                    <option value="expiree">Expirée</option>
                  </select>
                </div>
                <Field label="Date de signature" value={conformite.lettreMission.signedDate} onChange={v => updMission("signedDate", v)} type="date" />
              </div>
              {conformite.lettreMission.signedDate && (
                <div style={{ marginTop: 10, padding: "10px 14px", background: missionStatus === "ok" ? "#ECFDF5" : missionStatus === "warning" ? "#FFFBEB" : "#FEF2F2", borderRadius: 8, fontSize: 12 }}>
                  {(() => {
                    const expiry = new Date(new Date(conformite.lettreMission.signedDate).getTime() + 2 * 365.25 * 24 * 3600 * 1000);
                    return `Renouvellement requis avant le ${formatDate(expiry.toISOString().slice(0, 10))}`;
                  })()}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Notes</label>
                <textarea value={conformite.lettreMission.notes} onChange={e => updMission("notes", e.target.value)}
                  rows={3} placeholder="Observations..." style={{ ...inp, resize: "vertical" as const, marginTop: 4 }} />
              </div>
            </div>
          </div>
        )}

        {/* ════ DER ════ */}
        {activeSection === "der" && (
          <div>
            <SectionTitle title="DER — Déclarations d'Adéquation" subtitle="Une DER par opération de conseil en investissement" />

            {/* Nouvelle DER */}
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Nouvelle DER</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                <Field label="Date" value={newDer.date} onChange={v => setNewDer(p => ({ ...p, date: v }))} type="date" />
                <Field label="Produit concerné" value={newDer.produit} onChange={v => setNewDer(p => ({ ...p, produit: v }))} placeholder="ex: AV Swiss Life" />
                <div style={{ gridColumn: "span 2" }}>
                  <Field label="Opération" value={newDer.operation} onChange={v => setNewDer(p => ({ ...p, operation: v }))} placeholder="ex: Souscription, Arbitrage, Rachat partiel..." />
                </div>
              </div>
              <button
                onClick={() => {
                  if (!newDer.operation || !newDer.date) return;
                  const der = { id: crypto.randomUUID(), ...newDer };
                  const updated: ContactRecord = {
                    ...record,
                    payload: {
                      ...record.payload,
                      conformite: { ...conformite, ders: [...conformite.ders, der] },
                    },
                  };
                  onSave(updated);
                  setNewDer({ operation: "", date: "", produit: "", notes: "" });
                }}
                disabled={!newDer.operation || !newDer.date}
                style={{
                  padding: "7px 16px", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  background: newDer.operation && newDer.date ? colorNavy : "#D1D5DB", color: "#fff",
                }}>
                Ajouter
              </button>
            </div>

            {/* Liste DER */}
            {conformite.ders.length > 0 && (
              <div style={card}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#F8F9FB", borderBottom: "1px solid #E2E5EC" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 500, color: "#374151" }}>Date</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 500, color: "#374151" }}>Opération</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 500, color: "#374151" }}>Produit</th>
                      <th style={{ width: 50 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {[...conformite.ders].reverse().map(d => (
                      <tr key={d.id} style={{ borderBottom: "1px solid #F0F2F6" }}>
                        <td style={{ padding: "8px 12px", color: "#6B7280" }}>{formatDate(d.date)}</td>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{d.operation}</td>
                        <td style={{ padding: "8px 12px", color: "#6B7280" }}>{d.produit}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <button onClick={() => {
                            const updated: ContactRecord = {
                              ...record,
                              payload: {
                                ...record.payload,
                                conformite: { ...conformite, ders: conformite.ders.filter(x => x.id !== d.id) },
                              },
                            };
                            onSave(updated);
                          }} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 14 }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════ RGPD ════ */}
        {activeSection === "rgpd" && (
          <div>
            <SectionTitle title="RGPD — Consentement et données personnelles" />
            <div style={card}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Toggle label="Consentement RGPD recueilli" value={conformite.rgpd.consentGiven} onChange={v => updRgpd("consentGiven", v)} />
                {conformite.rgpd.consentGiven && (
                  <div style={{ marginLeft: 44 }}>
                    <Field label="Date du consentement" value={conformite.rgpd.consentDate} onChange={v => updRgpd("consentDate", v)} type="date" />
                  </div>
                )}
                <Toggle label="Opposition au démarchage commercial (Bloctel)" value={conformite.rgpd.optOutMarketing} onChange={v => updRgpd("optOutMarketing", v)} />
                <div>
                  <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Notes</label>
                  <textarea value={conformite.rgpd.notes} onChange={e => updRgpd("notes", e.target.value)}
                    rows={2} placeholder="Demandes, exercice de droits..." style={{ ...inp, resize: "vertical" as const, marginTop: 4 }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
