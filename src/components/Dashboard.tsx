// src/components/Dashboard.tsx
// Tableau de bord Kleios — KPIs globaux + activité récente
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import type { ContactRecord } from "../types/crm";

interface DashboardProps {
  contacts: ContactRecord[];
  colorNavy: string;
  colorGold: string;
  onOpenContact: (record: ContactRecord) => void;
  onNavigate: (id: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEncours(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M€`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k€`;
  return `${n} €`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  if (diff < 7) return `Il y a ${diff} jours`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatDateFuture(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return "Passé";
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  if (diff < 7) return `Dans ${diff} jours`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// ── Composants UI ─────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, subColor, icon, onClick,
}: {
  label: string; value: string | number; sub?: string;
  subColor?: string; icon: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        border: "1px solid #E2E5EC",
        borderRadius: 12,
        padding: "16px 18px",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = "#C9A84C")}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = "#E2E5EC")}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
            {label}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#0D1B2E", lineHeight: 1 }}>
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: 11, color: subColor ?? "#9CA3AF", marginTop: 5 }}>
              {sub}
            </div>
          )}
        </div>
        <div style={{ fontSize: 22, opacity: 0.6 }}>{icon}</div>
      </div>
    </div>
  );
}

function SectionTitle({ title, action, onAction }: {
  title: string; action?: string; onAction?: () => void;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0D1B2E", margin: 0 }}>
        {title}
      </h3>
      {action && (
        <button
          onClick={onAction}
          style={{
            background: "none",
            border: "none",
            fontSize: 12,
            color: "#9CA3AF",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#0D1B2E")}
          onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}
        >
          {action} →
        </button>
      )}
    </div>
  );
}

// Badge statut
const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  vip:      { bg: "#FEF3C7", color: "#92400E", label: "VIP" },
  client:   { bg: "#ECFDF5", color: "#065F46", label: "Client" },
  prospect: { bg: "#EEF2FF", color: "#3730A3", label: "Prospect" },
  inactif:  { bg: "#F3F4F6", color: "#6B7280", label: "Inactif" },
};

// ── Dashboard principal ───────────────────────────────────────────────────────

export function Dashboard({
  contacts, colorNavy, colorGold, onOpenContact, onNavigate,
}: DashboardProps) {

  const stats = useMemo(() => {
    const total = contacts.length;
    const vip = 0;
    const clients = contacts.filter(c => c.status === "partenaire").length;
    const prospects = contacts.filter(c => c.status === "prospect").length;

    // Encours total
    const encours = contacts.reduce((sum, c) => {
      return sum + (c.payload?.contracts ?? []).reduce((s, ct) => {
        const v = parseFloat(ct.currentValue?.replace(/[^0-9.]/g, "") ?? "0");
        return s + (isNaN(v) ? 0 : v);
      }, 0);
    }, 0);

    // Total contrats
    const totalContrats = contacts.reduce(
      (sum, c) => sum + (c.payload?.contracts ?? []).length, 0
    );

    // Prochains RDV (événements planifiés dans le futur)
    const now = new Date();
    const upcomingRdv = contacts.flatMap(c =>
      (c.payload?.events ?? [])
        .filter(e => e.type === "rdv" && e.status === "planifie" && new Date(e.date) > now)
        .map(e => ({ ...e, contact: c }))
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
     .slice(0, 5);

    // Rappels à venir
    const upcomingRappels = contacts.flatMap(c =>
      (c.payload?.events ?? [])
        .filter(e => e.followUpDate && new Date(e.followUpDate) > now)
        .map(e => ({ ...e, contact: c }))
    ).sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime())
     .slice(0, 5);

    // Contacts récents (modifiés récemment)
    const recentContacts = [...contacts]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);

    return {
      total, vip, clients, prospects, encours,
      totalContrats, upcomingRdv, upcomingRappels, recentContacts,
    };
  }, [contacts]);

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* ── Titre ── */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: colorNavy, margin: 0 }}>
          Tableau de bord
        </h2>
        <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3 }}>
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })}
        </p>
      </div>

      {/* ── KPIs ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
        marginBottom: 24,
      }}>
        <KpiCard
          label="Total clients"
          value={stats.total}
          sub={`${stats.vip} VIP · ${stats.prospects} prospects`}
          icon="👥"
          onClick={() => onNavigate("clients")}
        />
        <KpiCard
          label="Encours total"
          value={stats.encours > 0 ? formatEncours(stats.encours) : "—"}
          sub="Contrats actifs"
          icon="💼"
          onClick={() => onNavigate("contrats")}
        />
        <KpiCard
          label="Contrats"
          value={stats.totalContrats}
          sub={`${(stats.totalContrats / Math.max(stats.total, 1)).toFixed(1)} moy. / client`}
          icon="📄"
          onClick={() => onNavigate("contrats")}
        />
        <KpiCard
          label="RDV à venir"
          value={stats.upcomingRdv.length}
          sub={stats.upcomingRdv[0]
            ? `Prochain : ${formatDateFuture(stats.upcomingRdv[0].date)}`
            : "Aucun planifié"}
          subColor={stats.upcomingRdv.length > 0 ? "#3B82F6" : "#9CA3AF"}
          icon="📅"
          onClick={() => onNavigate("agenda")}
        />
      </div>

      {/* ── Ligne 2 : Répartition + Prochains RDV ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1.6fr",
        gap: 16,
        marginBottom: 16,
      }}>
        {/* Répartition statuts */}
        <div style={{
          background: "#fff",
          border: "1px solid #E2E5EC",
          borderRadius: 12,
          padding: "16px 18px",
        }}>
          <SectionTitle title="Répartition clients" />
          {stats.total === 0 ? (
            <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, padding: "20px 0" }}>
              Aucun client pour l'instant
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "VIP",       count: stats.vip,      color: "#F59E0B", bg: "#FEF3C7" },
                { label: "Clients",   count: stats.clients,  color: "#10B981", bg: "#ECFDF5" },
                { label: "Prospects", count: stats.prospects, color: "#3B82F6", bg: "#EFF6FF" },
                { label: "Inactifs",  count: contacts.filter(c => c.status === "inactif").length,
                  color: "#9CA3AF", bg: "#F3F4F6" },
              ].map(({ label, count, color }) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "#4B5563" }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color }}>{count}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "#F0F2F6", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      borderRadius: 3,
                      background: color,
                      width: `${Math.round((count / stats.total) * 100)}%`,
                      transition: "width 0.5s ease",
                    }}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prochains RDV */}
        <div style={{
          background: "#fff",
          border: "1px solid #E2E5EC",
          borderRadius: 12,
          padding: "16px 18px",
        }}>
          <SectionTitle
            title="Prochains rendez-vous"
            action="Voir agenda"
            onAction={() => onNavigate("agenda")}
          />
          {stats.upcomingRdv.length === 0 ? (
            <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, padding: "20px 0" }}>
              Aucun RDV planifié
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stats.upcomingRdv.map(e => {
                return (
                  <div
                    key={e.id}
                    onClick={() => onOpenContact(e.contact)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 10px",
                      borderRadius: 8,
                      cursor: "pointer",
                      border: "1px solid #F0F2F6",
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={e2 => (e2.currentTarget.style.borderColor = colorGold)}
                    onMouseLeave={e2 => (e2.currentTarget.style.borderColor = "#F0F2F6")}
                  >
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: `${colorNavy}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: colorNavy,
                      flexShrink: 0,
                    }}>
                      {e.contact.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#0D1B2E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {e.contact.displayName}
                      </div>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                        {e.title || "RDV"}{e.channel ? ` · ${e.channel}` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#3B82F6" }}>
                        {formatDateFuture(e.date)}
                      </div>
                      <div style={{ fontSize: 10, color: "#9CA3AF" }}>
                        {new Date(e.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Ligne 3 : Rappels + Activité récente ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
      }}>
        {/* Rappels */}
        <div style={{
          background: "#fff",
          border: "1px solid #E2E5EC",
          borderRadius: 12,
          padding: "16px 18px",
        }}>
          <SectionTitle title="Rappels à venir" />
          {stats.upcomingRappels.length === 0 ? (
            <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, padding: "20px 0" }}>
              Aucun rappel programmé
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stats.upcomingRappels.map(e => {
                const daysUntil = Math.ceil(
                  (new Date(e.followUpDate!).getTime() - Date.now()) / 86400000
                );
                const urgent = daysUntil <= 3;
                return (
                  <div
                    key={e.id}
                    onClick={() => onOpenContact(e.contact)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: urgent ? "#FFFBEB" : "#F8F9FB",
                      border: `1px solid ${urgent ? "#FCD34D" : "#F0F2F6"}`,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{urgent ? "⚠️" : "⏰"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#0D1B2E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {e.contact.displayName}
                      </div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {e.followUpNote || e.title || "Rappel"}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: urgent ? "#92400E" : "#6B7280",
                      flexShrink: 0,
                    }}>
                      {formatDateFuture(e.followUpDate!)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activité récente */}
        <div style={{
          background: "#fff",
          border: "1px solid #E2E5EC",
          borderRadius: 12,
          padding: "16px 18px",
        }}>
          <SectionTitle
            title="Activité récente"
            action="Voir clients"
            onAction={() => onNavigate("clients")}
          />
          {stats.recentContacts.length === 0 ? (
            <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, padding: "20px 0" }}>
              Aucun client créé
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stats.recentContacts.map(c => {
                const s = STATUS_STYLES[c.status] ?? STATUS_STYLES.inactif;
                const contractCount = c.payload?.contracts?.length ?? 0;
                return (
                  <div
                    key={c.id}
                    onClick={() => onOpenContact(c)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
                      cursor: "pointer",
                      border: "1px solid #F0F2F6",
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = colorGold)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#F0F2F6")}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: `${colorNavy}12`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      color: colorNavy,
                      flexShrink: 0,
                    }}>
                      {c.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#0D1B2E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.displayName}
                      </div>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                        {contractCount > 0 ? `${contractCount} contrat${contractCount > 1 ? "s" : ""}` : "Aucun contrat"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 500,
                        background: s.bg,
                        color: s.color,
                      }}>
                        {s.label}
                      </span>
                      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>
                        {formatDate(c.updatedAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
