// src/components/fiche/FicheClient.tsx
import { useState } from "react";
import type { ContactRecord, CabinetSettings } from "../../types/crm";
import type { CalSlotsCache, BusySlot } from "../../hooks/useCalSync";
import { TabCivile } from "./TabCivile";
import { TabContrats } from "./TabContrats";
import { TabSuivi } from "./TabSuivi";
import { TabConformite } from "./TabConformite";
import { TabGed } from "./TabGed";
import { TabCommissions } from "./TabCommissions";
import { TabEspace } from "./TabEspace";
import { CONTACT_STATUS_LABELS } from "../../constants";

type TabId = "synthese" | "civile" | "contrats" | "suivi" | "conformite" | "ged" | "commissions" | "espace";

interface FicheClientProps {
  record: ContactRecord;
  onSave: (record: ContactRecord) => void;
  onClose: () => void;
  colorNavy: string;
  colorGold: string;
  getBusySlotsForWeek?: (weekKey: string) => CalSlotsCache | null;
  fetchGoogleSlotsForWeek?: (weekKey: string) => Promise<BusySlot[]>;
  onCreateGoogleEvent?: (title: string, start: string, end: string, description?: string, googleEventId?: string, location?: string, attendeeEmail?: string) => Promise<string | null>;
  cabinet?: CabinetSettings;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatE(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M€`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k€`;
  return `${n}€`;
}

// ── Onglet synthèse — dashboard fiche client ──────────────────────────────────
function TabSynthese({
  record, colorNavy, colorGold, onTabChange,
}: {
  record: ContactRecord;
  colorNavy: string;
  colorGold: string;
  onTabChange: (tab: TabId) => void;
}) {
  const p1 = record.payload?.contact?.person1;
  const p2 = record.payload?.contact?.person2;
  const contact = record.payload?.contact;
  const contracts = record.payload?.contracts ?? [];
  const actifs = contracts.filter(c => c.status === "actif");
  const encours = actifs.reduce((s, c) => s + (parseFloat((c.currentValue ?? "0").replace(/[^0-9.]/g, "")) || 0), 0);
  const events = record.payload?.events ?? [];
  const upcomingRdv = events
    .filter(e => e.type === "rdv" && e.status === "planifie" && new Date(e.date) > new Date())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const recentRdv = events
    .filter(e => e.type === "rdv" && e.status === "realise")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 2);
  const conf = (record.payload as any)?.conformite;
  const mifAttitude = conf?.mif2?.attitude ?? 0;
  const mifProfile = mifAttitude >= 12 ? "Offensif" : mifAttitude >= 8 ? "Dynamique" : mifAttitude >= 4 ? "Équilibré" : conf ? "Prudent" : null;
  const missionSigned = conf?.lettreMission?.status === "signee";
  const missionDate = conf?.lettreMission?.signedDate;
  const missionExpiry = missionDate ? new Date(new Date(missionDate).getTime() + 2 * 365.25 * 24 * 3600 * 1000) : null;
  const missionMonths = missionExpiry ? Math.round((missionExpiry.getTime() - Date.now()) / (30 * 24 * 3600 * 1000)) : null;
  const missionAlert = missionMonths !== null && missionMonths < 3;

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(11,48,64,0.09)",
    borderRadius: 10,
    marginBottom: 12,
    overflow: "hidden",
    cursor: "pointer",
    transition: "box-shadow 0.15s",
  };
  const cardHeader = (_dot: string): React.CSSProperties => ({
    padding: "10px 14px",
    background: "rgba(214,228,240,0.38)",
    borderBottom: "1px solid rgba(91,130,166,0.12)",
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 12,
    fontWeight: 600,
    color: colorNavy,
  });
  const cardBody: React.CSSProperties = { padding: "12px 14px" };
  const row: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 };
  const fieldLabel: React.CSSProperties = { fontSize: 9, fontWeight: 600, color: "#5B82A6", letterSpacing: 0.4, marginBottom: 3 };
  const fieldVal: React.CSSProperties = { fontSize: 12, color: colorNavy, fontWeight: 400 };
  const badge = (color: string, bg: string, border: string): React.CSSProperties => ({
    display: "inline-flex", padding: "2px 8px", borderRadius: 20,
    fontSize: 9, fontWeight: 500, color, background: bg, border: `1px solid ${border}`,
  });

  const miniCard: React.CSSProperties = {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(11,48,64,0.09)",
    borderRadius: 10, marginBottom: 10, overflow: "hidden",
    cursor: "pointer",
  };
  const miniHeader: React.CSSProperties = {
    padding: "9px 12px",
    background: "rgba(214,228,240,0.38)",
    borderBottom: "1px solid rgba(91,130,166,0.12)",
    display: "flex", justifyContent: "space-between", alignItems: "center",
  };

  return (
    <div style={{ display: "flex", gap: 14 }}>

      {/* ── Colonne principale ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Identité */}
        <div style={card} onClick={() => onTabChange("civile")}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(11,48,64,0.10)")}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
          <div style={cardHeader("#5B82A6")}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: colorGold }} />
            Identité — Personne 1
            <span style={{ marginLeft: "auto", ...badge("#1E6B52", "rgba(46,139,110,0.12)", "rgba(46,139,110,0.20)") }}>
              {p1?.firstName ? "Complet" : "À remplir"}
            </span>
            <span style={{ fontSize: 10, color: "#5B82A6", marginLeft: 8 }}>Modifier →</span>
          </div>
          <div style={cardBody}>
            <div style={row}>
              <div><div style={fieldLabel}>PRÉNOM</div><div style={fieldVal}>{p1?.firstName || "—"}</div></div>
              <div><div style={fieldLabel}>NOM</div><div style={fieldVal}>{p1?.lastName || "—"}</div></div>
              <div><div style={fieldLabel}>DATE DE NAISSANCE</div><div style={fieldVal}>{p1?.birthDate ? new Date(p1.birthDate).toLocaleDateString("fr-FR") : "—"}</div></div>
              <div><div style={fieldLabel}>CSP</div><div style={fieldVal}>{p1?.csp || "—"}</div></div>
            </div>
            <div style={{ marginTop: 4 }}>
              <div style={fieldLabel}>ADRESSE</div>
              <div style={fieldVal}>{[p1?.address, p1?.postalCode, p1?.city].filter(Boolean).join(", ") || "—"}</div>
            </div>
            {p1?.email && <div style={{ marginTop: 8, display: "flex", gap: 16 }}>
              <div><div style={fieldLabel}>EMAIL</div><div style={{ ...fieldVal, fontSize: 11 }}>{p1.email}</div></div>
              {p1?.phone && <div><div style={fieldLabel}>TÉLÉPHONE</div><div style={{ ...fieldVal, fontSize: 11 }}>{p1.phone}</div></div>}
            </div>}
          </div>
        </div>

        {/* Personne 2 si couple */}
        {p2 && (
          <div style={card} onClick={() => onTabChange("civile")}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(11,48,64,0.10)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
            <div style={cardHeader("#5B82A6")}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: "#5B82A6", transform: "rotate(45deg)" }} />
              Identité — Personne 2
              <span style={{ marginLeft: "auto", fontSize: 10, color: "#5B82A6" }}>Modifier →</span>
            </div>
            <div style={cardBody}>
              <div style={row}>
                <div><div style={fieldLabel}>PRÉNOM</div><div style={fieldVal}>{p2.firstName || "—"}</div></div>
                <div><div style={fieldLabel}>NOM</div><div style={fieldVal}>{p2.lastName || "—"}</div></div>
              </div>
            </div>
          </div>
        )}

        {/* Situation familiale */}
        <div style={card} onClick={() => onTabChange("civile")}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(11,48,64,0.10)")}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
          <div style={cardHeader("#5B82A6")}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: "#5B82A6", transform: "rotate(45deg)" }} />
            Situation familiale & foyer
            <span style={{ marginLeft: "auto", fontSize: 10, color: "#5B82A6" }}>Modifier →</span>
          </div>
          <div style={cardBody}>
            <div style={row}>
              <div><div style={fieldLabel}>STATUT CIVIL</div>
                <div style={fieldVal}>{
                  { celibataire: "Célibataire", marie: "Marié(e)", pacse: "Pacsé(e)", concubin: "Concubin(e)", divorce: "Divorcé(e)", veuf: "Veuf/Veuve" }[contact?.civilStatus ?? ""] ?? "—"
                }</div>
              </div>
              <div><div style={fieldLabel}>RÉGIME</div>
                <div style={fieldVal}>{
                  ({ communaute_legale: "Communauté légale", separation_biens: "Séparation de biens", communaute_universelle: "Communauté universelle", participation_acquets: "Part. aux acquêts" } as Record<string, string>)[contact?.matrimonialRegime ?? ""] ?? "—"
                }</div>
              </div>
              {contact?.weddingDate && <div><div style={fieldLabel}>DATE MARIAGE / PACS</div><div style={fieldVal}>{new Date(contact.weddingDate).toLocaleDateString("fr-FR")}</div></div>}
            </div>
          </div>
        </div>



                {/* Conformité résumé */}
        <div style={card} onClick={() => onTabChange("conformite")}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(11,48,64,0.10)")}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
          <div style={cardHeader("#5B82A6")}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5B82A6" }} />
            Conformité DDA / MIF2 / KYC
            <span style={{ marginLeft: "auto", fontSize: 10, color: "#5B82A6" }}>Détail →</span>
          </div>
          <div style={cardBody}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#5E7A88" }}>Lettre mission</span>
                <span style={missionAlert
                  ? badge("#991B1B", "rgba(220,38,38,0.10)", "rgba(220,38,38,0.18)")
                  : missionSigned ? badge("#1E6B52", "rgba(46,139,110,0.12)", "rgba(46,139,110,0.20)")
                  : badge("#5E7A88", "rgba(11,48,64,0.07)", "rgba(11,48,64,0.12)")}>
                  {missionAlert ? `⚠ ${missionMonths}m` : missionSigned ? "Signée" : "À signer"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#5E7A88" }}>KYC</span>
                <span style={conf?.kyc?.idVerifiedDate ? badge("#1E6B52", "rgba(46,139,110,0.12)", "rgba(46,139,110,0.20)") : badge("#5E7A88", "rgba(11,48,64,0.07)", "rgba(11,48,64,0.12)")}>
                  {conf?.kyc?.idVerifiedDate ? "Validé" : "À faire"}
                </span>
              </div>
              {mifProfile && <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#5E7A88" }}>Profil MIF2</span>
                <span style={badge("#3A6080", "rgba(91,130,166,0.12)", "rgba(91,130,166,0.22)")}>{mifProfile}</span>
              </div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Colonne droite — synthèse rapide ── */}
      <div style={{ width: 500, flexShrink: 0 }}>

        {/* Encours */}
        <div style={{ ...miniCard, cursor: "default" }}>
          <div style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 9, color: "#8FAAB6", letterSpacing: 0.5, marginBottom: 4 }}>ENCOURS TOTAL</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: colorNavy, lineHeight: 1 }}>{encours > 0 ? formatE(encours) : "—"}</div>
            <div style={{ fontSize: 10, color: "#5E7A88", marginTop: 5 }}>{actifs.length} contrat{actifs.length > 1 ? "s" : ""} actif{actifs.length > 1 ? "s" : ""}</div>
            <div style={{ fontSize: 10, color: "#5E7A88" }}>{events.filter(e => e.type === "rdv" && e.status === "realise").length} RDV réalisés</div>
          </div>
        </div>

{/* Contrats résumé */}
        <div style={card} onClick={() => onTabChange("contrats")}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(11,48,64,0.10)")}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
          <div style={cardHeader(colorGold)}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: colorGold }} />
            Contrats ({actifs.length} actif{actifs.length > 1 ? "s" : ""})
            <span style={{ marginLeft: "auto", fontSize: 10, color: "#5B82A6" }}>Gérer →</span>
          </div>
          <div style={cardBody}>
            {actifs.length === 0 ? (
              <div style={{ fontSize: 12, color: "#8FAAB6" }}>Aucun contrat actif</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {actifs.slice(0, 6).map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", background: "#EEF4F9", borderRadius: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: colorNavy, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 8, color: colorGold, fontWeight: 700 }}>{c.type.toUpperCase().slice(0,2)}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: colorNavy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.productName || c.type}</div>
                      <div style={{ fontSize: 9, color: "#8FAAB6" }}>{c.insurer}</div>
                    </div>
                    {(parseFloat((c.currentValue ?? "0").replace(/[^0-9.]/g, "")) > 0) && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: colorNavy, flexShrink: 0 }}>{formatE(parseFloat(c.currentValue!.replace(/[^0-9.]/g, "")))}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {actifs.length > 4 && <div style={{ fontSize: 10, color: "#8FAAB6", marginTop: 6, textAlign: "center" }}>+{actifs.length - 4} autres contrats</div>}
          </div>
        </div>

        {/* Prochains RDV */}
        <div style={miniCard} onClick={() => onTabChange("suivi")}>
          <div style={miniHeader}>
            <span style={{ fontSize: 11, fontWeight: 600, color: colorNavy }}>Agenda</span>
            <span style={{ fontSize: 10, color: "#5B82A6" }}>+ RDV →</span>
          </div>
          <div style={{ padding: "10px 12px" }}>
            {upcomingRdv.length === 0 ? (
              <div style={{ fontSize: 11, color: "#8FAAB6" }}>Aucun RDV planifié</div>
            ) : upcomingRdv.map((e, i) => (
              <div key={e.id} style={{ display: "flex", gap: 7, paddingBottom: i < upcomingRdv.length - 1 ? 8 : 0, marginBottom: i < upcomingRdv.length - 1 ? 8 : 0, borderBottom: i < upcomingRdv.length - 1 ? "1px solid rgba(11,48,64,0.07)" : "none" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: colorGold, marginTop: 3, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: colorNavy }}>{e.title || "RDV"}</div>
                  <div style={{ fontSize: 10, color: "#8FAAB6" }}>
                    {new Date(e.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} · {new Date(e.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Derniers RDV */}
        {recentRdv.length > 0 && (
          <div style={miniCard} onClick={() => onTabChange("suivi")}>
            <div style={miniHeader}>
              <span style={{ fontSize: 11, fontWeight: 600, color: colorNavy }}>Derniers RDV</span>
            </div>
            <div style={{ padding: "10px 12px" }}>
              {recentRdv.map((e, i) => (
                <div key={e.id} style={{ display: "flex", gap: 7, paddingBottom: i < recentRdv.length - 1 ? 8 : 0, marginBottom: i < recentRdv.length - 1 ? 8 : 0, borderBottom: i < recentRdv.length - 1 ? "1px solid rgba(11,48,64,0.07)" : "none" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#8FAAB6", marginTop: 3, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: colorNavy }}>{e.title || "RDV"}</div>
                    <div style={{ fontSize: 10, color: "#8FAAB6" }}>{new Date(e.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {contact?.notes && (
          <div style={{ ...miniCard, cursor: "default" }}>
            <div style={miniHeader}><span style={{ fontSize: 11, fontWeight: 600, color: colorNavy }}>Notes</span></div>
            <div style={{ padding: "10px 12px", fontSize: 11, color: "#5E7A88", lineHeight: 1.5 }}>
              {contact.notes.slice(0, 120)}{contact.notes.length > 120 ? "..." : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export function FicheClient({
  record, onSave, onClose, colorNavy, colorGold,
  getBusySlotsForWeek, fetchGoogleSlotsForWeek, onCreateGoogleEvent, cabinet,
}: FicheClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("synthese");

  const tabs: { id: TabId; label: string }[] = [
    { id: "synthese",    label: "Fiche client" },
    { id: "civile",      label: "Fiche civile" },
    { id: "contrats",    label: "Contrats" },
    { id: "suivi",       label: "Suivi commercial" },
    { id: "conformite",  label: "Conformité" },
    { id: "ged",         label: "GED" },
    { id: "commissions", label: "Commissions" },
    { id: "espace",      label: "Espace client" },
  ];

  const contractCount = record.payload?.contracts?.length ?? 0;
  const encours = (record.payload?.contracts ?? []).reduce((s, c) => s + (parseFloat((c.currentValue ?? "0").replace(/[^0-9.]/g, "")) || 0), 0);
  const rdvCount = (record.payload?.events ?? []).filter(e => e.type === "rdv" && e.status === "realise").length;

  const renderTab = () => {
    switch (activeTab) {
      case "synthese":    return <TabSynthese record={record} colorNavy={colorNavy} colorGold={colorGold} onTabChange={setActiveTab} />;
      case "civile":      return <TabCivile record={record} onSave={onSave} colorNavy={colorNavy} colorGold={colorGold} />;
      case "contrats":    return <TabContrats record={record} onSave={onSave} colorNavy={colorNavy} colorGold={colorGold} />;
      case "suivi":       return <TabSuivi record={record} onSave={onSave} colorNavy={colorNavy} colorGold={colorGold} cabinet={cabinet} getBusySlotsForWeek={getBusySlotsForWeek} fetchGoogleSlotsForWeek={fetchGoogleSlotsForWeek} onCreateGoogleEvent={onCreateGoogleEvent} />;
      case "conformite":  return <TabConformite record={record} onSave={onSave} colorNavy={colorNavy} colorGold={colorGold} />;
      case "ged":         return <TabGed record={record} onSave={onSave} colorNavy={colorNavy} colorGold={colorGold} />;
      case "commissions": return <TabCommissions record={record} onSave={onSave} colorNavy={colorNavy} colorGold={colorGold} />;
      case "espace":      return <TabEspace record={record} onSave={onSave} colorNavy={colorNavy} colorGold={colorGold} />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>

      {/* ── Header petrol ── */}
      <div style={{
        background: `linear-gradient(135deg, ${colorNavy} 0%, #144260 100%)`,
        borderRadius: "12px 12px 0 0",
        padding: "14px 20px",
        boxShadow: "0 4px 20px rgba(11,48,64,0.20)",
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "rgba(255,255,255,0.48)", fontSize: 11,
          cursor: "pointer", background: "none", border: "none",
          padding: "0 0 10px 0", fontFamily: "inherit",
        }}
          onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.48)")}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Retour clients
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Avatar */}
          <div style={{
            width: 46, height: 46, borderRadius: "50%", background: colorGold, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 700, color: colorNavy,
            border: "2px solid rgba(255,255,255,0.18)", boxShadow: "0 2px 10px rgba(201,168,76,0.35)",
          }}>
            {getInitials(record.displayName)}
          </div>

          {/* Nom + meta */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: "#fff" }}>{record.displayName}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
              {[CONTACT_STATUS_LABELS[record.status], record.payload?.contact?.person1?.csp, record.payload?.contact?.person1?.city].filter(Boolean).join(" · ")}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 24, marginRight: 24 }}>
            {[
              { val: encours > 0 ? formatE(encours) : "—", label: "ENCOURS" },
              { val: contractCount.toString(), label: "CONTRATS" },
              { val: rdvCount.toString(), label: "RDV" },
            ].map(({ val, label }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.38)", marginTop: 3, letterSpacing: 0.5 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 500, background: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.88)", border: "1px solid rgba(255,255,255,0.20)" }}>
              {CONTACT_STATUS_LABELS[record.status]}
            </span>
            {record.ploutosClientId && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.10)", color: colorGold, fontSize: 10, fontWeight: 500, padding: "3px 9px", borderRadius: 20, border: "1px solid rgba(201,168,76,0.28)" }}>
                π Ploutos lié
              </span>
            )}
            <button onClick={() => setActiveTab("suivi")} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              borderRadius: 7, border: "none", background: colorGold, color: colorNavy,
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 2px 8px rgba(201,168,76,0.30)",
            }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              Nouveau RDV
            </button>
          </div>
        </div>
      </div>

      {/* ── Onglets ── */}
      <div style={{
        display: "flex", flexShrink: 0,
        background: "rgba(255,255,255,0.80)",
        borderLeft: "1px solid rgba(11,48,64,0.09)",
        borderRight: "1px solid rgba(11,48,64,0.09)",
        borderBottom: "1px solid rgba(11,48,64,0.09)",
        overflowX: "auto",
      }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: "10px 15px", fontSize: 12, cursor: "pointer",
            color: activeTab === tab.id ? "#5B82A6" : "#8FAAB6",
            background: activeTab === tab.id ? "rgba(214,228,240,0.55)" : "none",
            border: "none",
            borderBottom: activeTab === tab.id ? "2px solid #5B82A6" : "2px solid transparent",
            whiteSpace: "nowrap", fontWeight: activeTab === tab.id ? 600 : 400,
            fontFamily: "inherit", transition: "all 0.15s",
          }}
            onMouseEnter={e => { if (activeTab !== tab.id) (e.currentTarget as HTMLElement).style.color = "#5B82A6"; }}
            onMouseLeave={e => { if (activeTab !== tab.id) (e.currentTarget as HTMLElement).style.color = "#8FAAB6"; }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Contenu ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 0 0 0", minHeight: 0 }}>
        {renderTab()}
      </div>
    </div>
  );
}
