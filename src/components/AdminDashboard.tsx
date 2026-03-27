// src/components/AdminDashboard.tsx
// Dashboard admin Kleios — gestion licences et comptes
// Sans shadcn/ui — architecture extensible
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useAdminDashboard } from "../hooks/useAdmin";
import type { AdminUser } from "../hooks/useAdmin";

interface AdminDashboardProps {
  colorNavy: string;
  colorGold?: string;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function daysLeft(isoDate: string | null): number {
  if (!isoDate) return 0;
  return Math.max(0, Math.ceil(
    (new Date(isoDate).getTime() - Date.now()) / 86400000
  ));
}

// ── Badge licence ─────────────────────────────────────────────────────────────

const BADGE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  "trial-active":    { bg: "#EFF6FF", color: "#1D4ED8", label: "Trial actif" },
  "trial-expired":   { bg: "#FEF3C7", color: "#92400E", label: "Trial expiré" },
  "paid-active":     { bg: "#ECFDF5", color: "#065F46", label: "Payant" },
  "paid-cancelling": { bg: "#FFFBEB", color: "#92400E", label: "Annulation prévue" },
  "paid-cancelled":  { bg: "#FEF2F2", color: "#991B1B", label: "Annulé" },
  "paid-expired":    { bg: "#FEF2F2", color: "#991B1B", label: "Expiré" },
  "lifetime-active": { bg: "#F5F3FF", color: "#5B21B6", label: "Lifetime ∞" },
  "none-none":       { bg: "#F3F4F6", color: "#6B7280", label: "Sans licence" },
};

function LicenceBadge({ user }: { user: AdminUser }) {
  const key = `${user.licence?.type ?? "none"}-${user.licence?.status ?? "none"}`;
  const s = BADGE_STYLES[key] ?? { bg: "#F3F4F6", color: "#6B7280", label: key };
  return (
    <span style={{
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      background: s.bg,
      color: s.color,
    }}>
      {s.label}
    </span>
  );
}

// ── Infos renouvellement ──────────────────────────────────────────────────────

function RenewalInfo({ user }: { user: AdminUser }) {
  if (user.licence?.type === "trial" && user.licence.trial_end) {
    const days = daysLeft(user.licence.trial_end);
    const color = days <= 3 ? "#EF4444" : days <= 7 ? "#F59E0B" : "#6B7280";
    return (
      <span style={{ fontSize: 11, color }}>
        {days > 0 ? `${days}j restants` : "Expiré"}
      </span>
    );
  }
  if (user.licence?.type === "paid" && user.subDetails) {
    const d = user.subDetails;
    const plan = d.interval === "year" ? "Annuel" : "Mensuel";
    const renewal = d.current_period_end
      ? formatDate(d.current_period_end)
      : "—";
    if (d.cancel_at_period_end) {
      return <span style={{ fontSize: 11, color: "#F59E0B" }}>Annulation le {renewal}</span>;
    }
    return <span style={{ fontSize: 11, color: "#6B7280" }}>{plan} · renouvellement {renewal}</span>;
  }
  if (user.licence?.type === "lifetime") {
    return <span style={{ fontSize: 11, color: "#6B7280" }}>Accès permanent</span>;
  }
  return null;
}

// ── Bouton action ─────────────────────────────────────────────────────────────

function ActionBtn({
  label, onClick, color = "#4B5563", bg = "#F9FAFB", disabled = false, title,
}: {
  label: string; onClick: () => void; color?: string;
  bg?: string; disabled?: boolean; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: "4px 10px",
        borderRadius: 6,
        border: `1px solid ${color}30`,
        background: disabled ? "#F3F4F6" : bg,
        color: disabled ? "#9CA3AF" : color,
        fontSize: 11,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export function AdminDashboard({ colorNavy, onClose }: AdminDashboardProps) {
  const {
    users, loading, error, fetchUsers,
    setLifetime, revokeLicence, extendTrial,
    resetUserPassword, deleteAccount,
  } = useAdminDashboard(true);

  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [search, setSearch]       = useState("");
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);

  const notify = (text: string, ok = true) => {
    setActionMsg({ text, ok });
    setTimeout(() => setActionMsg(null), 4000);
  };

  // ── Handlers ──

  const handleLifetime = async (u: AdminUser) => {
    const ok = await setLifetime(u.id);
    notify(ok ? `✓ ${u.cabinet_name} → Lifetime` : "Erreur", ok);
  };

  const handleRevoke = async (u: AdminUser) => {
    const ok = await revokeLicence(u.id);
    notify(ok ? `✓ Licence révoquée` : "Erreur", ok);
  };

  const handleExtend = async (u: AdminUser, days: number) => {
    const ok = await extendTrial(u.id, days);
    notify(ok ? `✓ Trial prolongé de ${days}j` : "Erreur", ok);
  };

  const handleReset = async (u: AdminUser) => {
    const ok = await resetUserPassword(u.email);
    notify(ok ? `✓ Email de reset envoyé à ${u.email}` : "Erreur reset", ok);
  };

  const handleDelete = async (u: AdminUser) => {
    const result = await deleteAccount(u.id);
    setConfirmDelete(null);
    notify(result.message, result.success);
  };

  // ── Stats ──

  const stats = {
    total:    users.length,
    trial:    users.filter(u => u.licence?.type === "trial" && u.licence?.status === "active").length,
    paid:     users.filter(u => u.licence?.type === "paid" && u.licence?.status === "active").length,
    lifetime: users.filter(u => u.licence?.type === "lifetime").length,
    expired:  users.filter(u => u.licence?.status === "expired" || u.licence?.status === "cancelled").length,
  };

  // ── Filtrage ──

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.cabinet_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      overflowY: "auto",
      zIndex: 50,
      background: "#F0F2F6",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>

        {/* ── Header ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: colorNavy, margin: 0 }}>
              Dashboard Admin
            </h1>
            <p style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
              KleiΩs — Gestion des licences et comptes
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={fetchUsers}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: "1px solid #E2E5EC",
                background: "#fff",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                color: "#4B5563",
              }}
            >
              ↻ Actualiser
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: "none",
                background: colorNavy,
                color: "#fff",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ← Retour
            </button>
          </div>
        </div>

        {/* ── Message action ── */}
        {actionMsg && (
          <div style={{
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            marginBottom: 16,
            background: actionMsg.ok ? "#ECFDF5" : "#FEF2F2",
            color: actionMsg.ok ? "#065F46" : "#991B1B",
            border: `1px solid ${actionMsg.ok ? "#A7F3D0" : "#FECACA"}`,
          }}>
            {actionMsg.text}
          </div>
        )}

        {/* ── Stats ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 10,
          marginBottom: 20,
        }}>
          {[
            { label: "Total",       value: stats.total,    color: colorNavy },
            { label: "Trial actif", value: stats.trial,    color: "#3B82F6" },
            { label: "Payants",     value: stats.paid,     color: "#10B981" },
            { label: "Lifetime",    value: stats.lifetime, color: "#8B5CF6" },
            { label: "Expirés",     value: stats.expired,  color: "#EF4444" },
          ].map(s => (
            <div key={s.label} style={{
              background: "#fff",
              border: "1px solid #E2E5EC",
              borderRadius: 10,
              padding: "12px 16px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Liste comptes ── */}
        <div style={{
          background: "#fff",
          border: "1px solid #E2E5EC",
          borderRadius: 12,
          overflow: "hidden",
        }}>
          {/* En-tête */}
          <div style={{
            padding: "14px 18px",
            borderBottom: "1px solid #E2E5EC",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colorNavy }}>
              Comptes ({users.length})
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher cabinet ou email..."
              style={{
                border: "1px solid #E2E5EC",
                borderRadius: 8,
                padding: "5px 12px",
                fontSize: 12,
                fontFamily: "inherit",
                outline: "none",
                width: 220,
              }}
            />
          </div>

          {loading && (
            <div style={{ padding: "30px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
              Chargement...
            </div>
          )}
          {error && (
            <div style={{ padding: "20px", textAlign: "center", color: "#EF4444", fontSize: 13 }}>
              {error}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: "30px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
              Aucun compte trouvé
            </div>
          )}

          {filtered.map((u, i) => (
            <div key={u.id} style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 18px",
              borderBottom: i < filtered.length - 1 ? "1px solid #F0F2F6" : "none",
            }}>
              {/* Avatar initiales */}
              <div style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: `${colorNavy}15`,
                border: `1px solid ${colorNavy}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                color: colorNavy,
                flexShrink: 0,
              }}>
                {(u.cabinet_name || u.email).slice(0, 2).toUpperCase()}
              </div>

              {/* Infos cabinet */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: colorNavy,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {u.cabinet_name || "—"}
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>
                  {u.email} · Inscrit le {formatDate(u.created_at)}
                </div>
              </div>

              {/* Licence + renouvellement */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 3,
                minWidth: 140,
              }}>
                <LicenceBadge user={u} />
                <RenewalInfo user={u} />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 4, flexShrink: 0, flexWrap: "wrap", maxWidth: 280 }}>
                {/* Prolonger trial */}
                {u.licence?.type === "trial" && (
                  <ActionBtn
                    label="+15j"
                    onClick={() => handleExtend(u, 15)}
                    color="#3B82F6"
                    bg="#EFF6FF"
                    title="Prolonger le trial de 15 jours"
                  />
                )}

                {/* Passer en lifetime */}
                {u.licence?.type !== "lifetime" && (
                  <ActionBtn
                    label="∞ Lifetime"
                    onClick={() => handleLifetime(u)}
                    color="#8B5CF6"
                    bg="#F5F3FF"
                    title="Passer en accès lifetime gratuit"
                  />
                )}

                {/* Révoquer */}
                {u.licence?.status === "active" && (
                  <ActionBtn
                    label="✕ Révoquer"
                    onClick={() => handleRevoke(u)}
                    color="#EF4444"
                    bg="#FEF2F2"
                    title="Révoquer la licence"
                  />
                )}

                {/* Reset mot de passe */}
                <ActionBtn
                  label="🔑 Reset MDP"
                  onClick={() => handleReset(u)}
                  disabled={!u.email}
                  color="#F59E0B"
                  bg="#FFFBEB"
                  title={`Envoyer email de réinitialisation à ${u.email}`}
                />

                {/* Lien Stripe */}
                {u.licence?.stripe_sub && (
                  <ActionBtn
                    label="Stripe →"
                    onClick={() => window.open(
                      `https://dashboard.stripe.com/subscriptions/${u.licence!.stripe_sub}`,
                      "_blank"
                    )}
                    color="#4F46E5"
                    bg="#EEF2FF"
                    title="Voir l'abonnement Stripe"
                  />
                )}

                {/* Contacter */}
                <ActionBtn
                  label="✉ Contacter"
                  onClick={() => window.location.href = `mailto:${u.email}`}
                  disabled={!u.email}
                  color="#0EA5E9"
                  bg="#F0F9FF"
                  title={`Envoyer un email à ${u.email}`}
                />

                {/* Supprimer compte — action destructive */}
                <ActionBtn
                  label="🗑 Supprimer"
                  onClick={() => setConfirmDelete(u)}
                  color="#DC2626"
                  bg="#FFF1F2"
                  title="Supprimer toutes les données Kleios de ce compte"
                />
              </div>
            </div>
          ))}
        </div>

        {/* ── Note technique ── */}
        <div style={{
          marginTop: 12,
          padding: "10px 14px",
          background: "#FFF7ED",
          border: "1px solid #FED7AA",
          borderRadius: 8,
          fontSize: 11,
          color: "#92400E",
        }}>
          ⚠ La suppression d'un compte efface les données Kleios (contacts, documents, licence) mais pas le compte auth Supabase.
          Pour supprimer complètement un utilisateur, faites-le depuis le dashboard Supabase → Authentication → Users.
        </div>
      </div>

      {/* ── Modal confirmation suppression ── */}
      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              width: 400,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: "#0D1B2E", marginBottom: 10 }}>
              Confirmer la suppression
            </div>
            <p style={{ fontSize: 13, color: "#4B5563", lineHeight: 1.6, marginBottom: 20 }}>
              Vous allez supprimer toutes les données Kleios de{" "}
              <strong>{confirmDelete.cabinet_name || confirmDelete.email}</strong>.
              Cette action est irréversible.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #E2E5EC",
                  borderRadius: 8,
                  background: "#fff",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 8,
                  background: "#DC2626",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
