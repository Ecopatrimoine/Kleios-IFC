// src/components/ClientList.tsx
// Liste des contacts avec stats, filtres, recherche et indicateur de sync
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";
import type { ContactRecord } from "../types/crm";
import type { SyncStatus } from "../hooks/useContacts";
import { CONTACT_STATUS_LABELS } from "../constants";

// ── Types ─────────────────────────────────────────────────────────────────────

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

type FilterStatus = "tous" | "vip" | "client" | "prospect" | "inactif";

// ── Composants UI locaux ──────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  subColor,
}: {
  label: string;
  value: string | number;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #E2E5EC",
      borderRadius: 10,
      padding: "14px 16px",
    }}>
      <div style={{
        fontSize: 11,
        color: "#9CA3AF",
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: "#0D1B2E", lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: subColor ?? "#9CA3AF", marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    vip:      { bg: "#FEF3C7", color: "#92400E" },
    client:   { bg: "#ECFDF5", color: "#065F46" },
    prospect: { bg: "#EEF2FF", color: "#3730A3" },
    inactif:  { bg: "#F3F4F6", color: "#6B7280" },
  };
  const s = styles[status] ?? styles.inactif;
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 9px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 500,
      background: s.bg,
      color: s.color,
    }}>
      {CONTACT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function SyncIndicator({
  status,
  onSync,
}: {
  status: SyncStatus;
  onSync: () => void;
}) {
  const config: Record<SyncStatus, { color: string; label: string; dot: string }> = {
    synced:  { color: "#10B981", dot: "#10B981", label: "Synchronisé" },
    pending: { color: "#F59E0B", dot: "#F59E0B", label: "En attente" },
    offline: { color: "#9CA3AF", dot: "#9CA3AF", label: "Hors ligne" },
    syncing: { color: "#3B82F6", dot: "#3B82F6", label: "Sync..." },
  };
  const c = config[status];

  return (
    <button
      onClick={onSync}
      title="Cliquer pour synchroniser manuellement"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 20,
        border: `1px solid ${c.color}30`,
        background: `${c.color}10`,
        cursor: "pointer",
        fontSize: 11,
        color: c.color,
        fontFamily: "inherit",
        fontWeight: 500,
      }}
    >
      <span style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: c.dot,
        display: "inline-block",
        animation: status === "syncing" ? "blink 1s ease-in-out infinite" : "none",
      }}/>
      {c.label}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </button>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function ClientList({
  contacts,
  syncStatus,
  loading,
  searchValue,
  onOpenContact,
  onSyncNow,
  colorNavy,
  colorGold: _colorGold = "#C9A84C",
}: ClientListProps) {

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("tous");

  // ── Filtrage + recherche (côté client, instantané) ──
  const filtered = useMemo(() => {
    let result = contacts;

    // Filtre par statut
    if (filterStatus !== "tous") {
      result = result.filter(c => c.status === filterStatus);
    }

    // Recherche sur le nom affiché (insensible à la casse)
    if (searchValue.trim()) {
      const q = searchValue.toLowerCase();
      result = result.filter(c =>
        c.displayName.toLowerCase().includes(q) ||
        c.payload?.contact?.person1?.email?.toLowerCase().includes(q) ||
        c.payload?.contact?.person1?.city?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [contacts, filterStatus, searchValue]);

  // ── Stats calculées depuis les contacts ──
  const stats = useMemo(() => {
    const total = contacts.length;
    const withPloutos = contacts.filter(c => c.ploutosClientId).length;
    const vip = contacts.filter(c => c.status === "vip").length;
    const prospects = contacts.filter(c => c.status === "prospect").length;
    // Encours total : somme des valeurs des contrats dans le payload
    const encours = contacts.reduce((sum, c) => {
      const contracts = c.payload?.contracts ?? [];
      return sum + contracts.reduce((s, ct) => {
        const val = parseFloat(ct.currentValue?.replace(/[^0-9.]/g, "") ?? "0");
        return s + (isNaN(val) ? 0 : val);
      }, 0);
    }, 0);

    return { total, withPloutos, vip, prospects, encours };
  }, [contacts]);

  // ── Formatage encours ──
  const formatEncours = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M€`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k€`;
    return `${n}€`;
  };

  // ── Filtre pills ──
  const filters: { id: FilterStatus; label: string }[] = [
    { id: "tous",     label: `Tous (${contacts.length})` },
    { id: "vip",      label: "VIP" },
    { id: "client",   label: "Clients" },
    { id: "prospect", label: "Prospects" },
    { id: "inactif",  label: "Inactifs" },
  ];

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "50vh",
        color: "#9CA3AF",
        fontSize: 13,
      }}>
        Chargement des contacts...
      </div>
    );
  }

  return (
    <div>
      {/* ── Stats ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
        marginBottom: 20,
      }}>
        <StatCard
          label="Total clients"
          value={stats.total}
          sub={`dont ${stats.vip} VIP`}
        />
        <StatCard
          label="Encours total"
          value={stats.encours > 0 ? formatEncours(stats.encours) : "—"}
          sub="Contrats actifs"
        />
        <StatCard
          label="Prospects"
          value={stats.prospects}
          sub="En cours de suivi"
          subColor="#F59E0B"
        />
        <StatCard
          label="Synchro Ploutos"
          value={stats.withPloutos}
          sub="dossiers liés"
          subColor="#10B981"
        />
      </div>

      {/* ── Table ── */}
      <div style={{
        background: "#fff",
        border: "1px solid #E2E5EC",
        borderRadius: 10,
        overflow: "hidden",
      }}>
        {/* En-tête table */}
        <div style={{
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: "1px solid #E2E5EC",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
            {filtered.length === contacts.length
              ? "Tous les clients"
              : `${filtered.length} résultat${filtered.length > 1 ? "s" : ""}`}
          </div>

          {/* Indicateur sync */}
          <SyncIndicator status={syncStatus} onSync={onSyncNow} />

          {/* Pills filtre */}
          <div style={{ display: "flex", gap: 6 }}>
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  border: "1px solid #E2E5EC",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  background: filterStatus === f.id ? colorNavy : "#fff",
                  color: filterStatus === f.id ? "#fff" : "#4B5563",
                  fontWeight: filterStatus === f.id ? 500 : 400,
                  transition: "all 0.15s",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table contacts */}
        {filtered.length === 0 ? (
          <div style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "#9CA3AF",
            fontSize: 13,
          }}>
            {contacts.length === 0
              ? "Aucun client pour l'instant — créez votre premier dossier."
              : "Aucun résultat pour cette recherche."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F0F2F6" }}>
                {["Client", "Statut", "Contrats", "Encours", "Ploutos"].map(h => (
                  <th key={h} style={{
                    padding: "10px 18px",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    borderBottom: "1px solid #E2E5EC",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact, i) => {
                const contracts = contact.payload?.contracts ?? [];
                const encours = contracts.reduce((s, ct) => {
                  const v = parseFloat(ct.currentValue?.replace(/[^0-9.]/g, "") ?? "0");
                  return s + (isNaN(v) ? 0 : v);
                }, 0);
                const city = contact.payload?.contact?.person1?.city ?? "";
                const csp = contact.payload?.contact?.person1?.csp ?? "";

                return (
                  <tr
                    key={contact.id}
                    onClick={() => onOpenContact(contact)}
                    style={{
                      cursor: "pointer",
                      transition: "background 0.1s",
                      borderBottom: i < filtered.length - 1
                        ? "1px solid #E2E5EC"
                        : "none",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F8F9FB")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Nom */}
                    <td style={{ padding: "11px 18px" }}>
                      <div style={{
                        fontWeight: 500,
                        fontSize: 13,
                        color: "#0D1B2E",
                      }}>
                        {contact.displayName}
                      </div>
                      {(city || csp) && (
                        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>
                          {[city, csp].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </td>

                    {/* Statut */}
                    <td style={{ padding: "11px 18px" }}>
                      <StatusBadge status={contact.status} />
                    </td>

                    {/* Contrats */}
                    <td style={{
                      padding: "11px 18px",
                      fontSize: 13,
                      color: "#4B5563",
                    }}>
                      {contracts.length > 0
                        ? `${contracts.length} contrat${contracts.length > 1 ? "s" : ""}`
                        : <span style={{ color: "#9CA3AF" }}>—</span>}
                    </td>

                    {/* Encours */}
                    <td style={{
                      padding: "11px 18px",
                      fontSize: 13,
                      fontWeight: encours > 0 ? 500 : 400,
                      color: encours > 0 ? "#0D1B2E" : "#9CA3AF",
                    }}>
                      {encours > 0 ? formatEncours(encours) : "—"}
                    </td>

                    {/* Lien Ploutos */}
                    <td style={{ padding: "11px 18px" }}>
                      {contact.ploutosClientId ? (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: "#10B981",
                        }}>
                          ● Lié
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                          ○ Non lié
                        </span>
                      )}
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
