// src/components/ClientList.tsx
// Liste des entreprises Kleios IFC
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";
import type { ContactRecord } from "../types/crm";
import type { SyncStatus } from "../hooks/useContacts";

interface ClientListProps {
  contacts: ContactRecord[];
  syncStatus: SyncStatus;
  loading: boolean;
  searchValue: string;
  onOpenContact: (record: ContactRecord) => void;
  onNewContact?: () => void;
  onSyncNow: () => void;
  colorNavy: string;
  colorGold?: string;
}

type FilterStatus = "tous" | "partenaire" | "prospect" | "inactif";

const ORANGE = "#F26522";
const NAVY   = "#1A2E44";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    partenaire: { bg: "#D1FAE5", color: "#065F46", label: "Partenaire" },
    prospect:   { bg: "#DBEAFE", color: "#1D4ED8", label: "Prospect" },
    inactif:    { bg: "#F3F4F6", color: "#6B7280", label: "Inactif" },
  };
  const s = styles[status] ?? styles.inactif;
  return (
    <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function SyncIndicator({ status, onSync }: { status: SyncStatus; onSync: () => void }) {
  const config: Record<SyncStatus, { color: string; label: string }> = {
    synced:  { color: "#10B981", label: "Synchronisé" },
    pending: { color: "#F59E0B", label: "En attente" },
    offline: { color: "#9CA3AF", label: "Hors ligne" },
    syncing: { color: "#3B82F6", label: "Sync..." },
  };
  const c = config[status];
  return (
    <button onClick={onSync} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, border: `1px solid ${c.color}30`, background: `${c.color}10`, cursor: "pointer", fontSize: 11, color: c.color, fontFamily: "inherit", fontWeight: 500 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, display: "inline-block" }}/>
      {c.label}
    </button>
  );
}

export function ClientList({ contacts, syncStatus, loading, searchValue, onOpenContact, onSyncNow, colorNavy: _cn, colorGold: _cg }: ClientListProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("tous");

  const filtered = useMemo(() => {
    let result = contacts;
    if (filterStatus !== "tous") result = result.filter(c => c.status === filterStatus);
    if (searchValue.trim()) {
      const q = searchValue.toLowerCase();
      result = result.filter(c =>
        c.displayName.toLowerCase().includes(q) ||
        (c.payload?.contact?.city ?? "").toLowerCase().includes(q) ||
        (c.payload?.contact?.siret ?? "").includes(q) ||
        (c.payload?.contact?.activite ?? "").toLowerCase().includes(q) ||
        (c.campus ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [contacts, filterStatus, searchValue]);

  const stats = useMemo(() => ({
    total:      contacts.length,
    partenaires: contacts.filter(c => c.status === "partenaire").length,
    prospects:  contacts.filter(c => c.status === "prospect").length,
    alternants: contacts.reduce((s, c) => s + (c.payload?.alternants?.length ?? 0), 0),
  }), [contacts]);

  const filters: { id: FilterStatus; label: string }[] = [
    { id: "tous",       label: `Toutes (${contacts.length})` },
    { id: "partenaire", label: `Partenaires (${stats.partenaires})` },
    { id: "prospect",   label: `Prospects (${stats.prospects})` },
    { id: "inactif",    label: "Inactives" },
  ];

  if (loading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", color: "#9CA3AF", fontSize: 13 }}>Chargement des entreprises...</div>;
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Entreprises total", value: stats.total, sub: `dont ${stats.partenaires} partenaires` },
          { label: "Partenaires actifs", value: stats.partenaires, sub: "En contrat", color: "#059669" },
          { label: "Prospects", value: stats.prospects, sub: "À transformer", color: ORANGE },
          { label: "Alternants historique", value: stats.alternants, sub: "Toutes entreprises" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid rgba(26,46,68,0.08)", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 4px rgba(26,46,68,0.05)" }}>
            <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: (s as any).color ?? NAVY, lineHeight: 1 }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid rgba(26,46,68,0.08)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 6px rgba(26,46,68,0.05)" }}>
        {/* En-tête */}
        <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(26,46,68,0.08)", background: "rgba(214,228,242,0.25)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, flex: 1, color: NAVY }}>
            {filtered.length === contacts.length ? "Toutes les entreprises" : `${filtered.length} résultat${filtered.length > 1 ? "s" : ""}`}
          </div>
          <SyncIndicator status={syncStatus} onSync={onSyncNow} />
          <div style={{ display: "flex", gap: 6 }}>
            {filters.map(f => (
              <button key={f.id} onClick={() => setFilterStatus(f.id)} style={{
                padding: "4px 12px", borderRadius: 20,
                border: filterStatus === f.id ? "none" : "1px solid rgba(26,46,68,0.15)",
                fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                background: filterStatus === f.id ? ORANGE : "#fff",
                color: filterStatus === f.id ? "#fff" : "#4B5563",
                fontWeight: filterStatus === f.id ? 600 : 400,
              }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
            {contacts.length === 0 ? "Aucune entreprise — créez votre première fiche ou importez depuis Gesform." : "Aucun résultat."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                {["Entreprise", "Statut", "Ville", "Secteur d'activité", "Alternants", "Campus"].map(h => (
                  <th key={h} style={{ padding: "10px 18px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid rgba(26,46,68,0.08)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((record, i) => {
                const e = record.payload?.contact;
                const nbAlternants = record.payload?.alternants?.length ?? 0;
                const postes = record.payload?.postes?.filter(p => p.status === "ouvert").length ?? 0;

                return (
                  <tr key={record.id} onClick={() => onOpenContact(record)} style={{ cursor: "pointer", borderBottom: i < filtered.length - 1 ? "1px solid rgba(26,46,68,0.06)" : "none" }}
                    onMouseEnter={e2 => (e2.currentTarget.style.background = "#F9FAFB")}
                    onMouseLeave={e2 => (e2.currentTarget.style.background = "transparent")}>

                    {/* Nom entreprise */}
                    <td style={{ padding: "12px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: `${ORANGE}15`, border: `1px solid ${ORANGE}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: ORANGE, flexShrink: 0 }}>
                          {record.displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: NAVY }}>{record.displayName}</div>
                          {e?.formeJuridique && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{e.formeJuridique}{e?.siret ? ` · ${e.siret}` : ""}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Statut */}
                    <td style={{ padding: "12px 18px" }}><StatusBadge status={record.status} /></td>

                    {/* Ville */}
                    <td style={{ padding: "12px 18px", fontSize: 13, color: "#4B5563" }}>{e?.city || "—"}</td>

                    {/* Activité */}
                    <td style={{ padding: "12px 18px", fontSize: 12, color: "#4B5563", maxWidth: 200 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e?.activite || "—"}
                      </div>
                    </td>

                    {/* Alternants */}
                    <td style={{ padding: "12px 18px" }}>
                      {nbAlternants > 0 ? (
                        <span style={{ fontSize: 12, fontWeight: 500, color: NAVY }}>{nbAlternants} alternant{nbAlternants > 1 ? "s" : ""}</span>
                      ) : <span style={{ fontSize: 12, color: "#9CA3AF" }}>—</span>}
                      {postes > 0 && <div style={{ fontSize: 10, color: ORANGE, marginTop: 2 }}>{postes} poste{postes > 1 ? "s" : ""} ouvert{postes > 1 ? "s" : ""}</div>}
                    </td>

                    {/* Campus */}
                    <td style={{ padding: "12px 18px" }}>
                      {record.campus ? (
                        <span style={{ fontSize: 11, fontWeight: 500, color: ORANGE, background: `${ORANGE}12`, border: `1px solid ${ORANGE}22`, padding: "2px 8px", borderRadius: 10 }}>
                          {record.campus.replace("IFC ", "")}
                        </span>
                      ) : <span style={{ fontSize: 11, color: "#ccc" }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
