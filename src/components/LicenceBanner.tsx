// src/components/LicenceBanner.tsx
// Bannière trial / abonnement — Kleios CRM
// Adaptée depuis Ploutos — sans Tailwind/shadcn
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import type { LicenceInfo } from "../hooks/useLicense";

interface LicenceBannerProps {
  licence:   LicenceInfo;
  userId:    string;
  colorGold: string;
  colorNavy: string;
}

async function openStripePortal(userId: string) {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        return_url: window.location.origin,
      }),
    }
  );
  const data = await res.json();
  if (data.url) window.open(data.url, "_blank");
  else console.error("Portail Stripe indisponible:", data.error);
}

export function LicenceBanner({ licence, userId, colorGold, colorNavy }: LicenceBannerProps) {
  const [loading, setLoading] = useState(false);
  console.log("BANNER props:", licence.type, licence.status, licence.trialDaysLeft);

  const handlePortal = async () => {
    setLoading(true);
    await openStripePortal(userId);
    setLoading(false);
  };

  // ── Trial actif ──
  if (licence.type === "trial" && licence.status === "active") {
    const days = licence.trialDaysLeft;
    const urgency = days <= 3;

    return (
      <div style={{
        width: "100%",
        textAlign: "center",
        padding: "6px 16px",
        fontSize: 12,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        background: urgency ? "#FEF2F2" : `${colorGold}18`,
        color: urgency ? "#991B1B" : colorNavy,
        borderBottom: `1px solid ${urgency ? "#FCA5A5" : `${colorGold}40`}`,
        flexShrink: 0,
      }}>
        <span>
          {urgency
            ? `⚠️ Essai gratuit — ${days} jour${days > 1 ? "s" : ""} restant${days > 1 ? "s" : ""}`
            : `✦ Essai gratuit — ${days} jours restants`}
        </span>
        {urgency && (
          <a
            href="https://crm.ploutos-cgp.fr"
            style={{
              color: "#991B1B",
              fontWeight: 700,
              textDecoration: "underline",
            }}
          >
            S'abonner →
          </a>
        )}
      </div>
    );
  }

  // ── Abonnement payant actif — bouton discret "Gérer" ──
  if (licence.type === "paid" && licence.status === "active") {
    return (
      <div style={{
        width: "100%",
        padding: "4px 16px",
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
        background: `${colorNavy}06`,
        borderBottom: `1px solid ${colorNavy}12`,
        flexShrink: 0,
      }}>
        <button
          onClick={handlePortal}
          disabled={loading}
          style={{
            background: "none",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 12,
            fontWeight: 500,
            color: colorNavy,
            opacity: loading ? 0.5 : 1,
            fontFamily: "inherit",
            textDecoration: "none",
          }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
        >
          {loading ? "Chargement…" : "⚙ Gérer mon abonnement"}
        </button>
      </div>
    );
  }

  // ── Annulation planifiée ──
  if (licence.status === "cancelling") {
    return (
      <div style={{
        width: "100%",
        textAlign: "center",
        padding: "6px 16px",
        fontSize: 12,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        background: "#FEF3C7",
        color: "#92400E",
        borderBottom: "1px solid #FCD34D",
        flexShrink: 0,
      }}>
        <span>⚠️ Abonnement annulé — accès maintenu jusqu'à la fin de la période</span>
        <button
          onClick={handlePortal}
          disabled={loading}
          style={{
            background: "none",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 12,
            fontWeight: 700,
            color: "#92400E",
            textDecoration: "underline",
            opacity: loading ? 0.5 : 1,
            fontFamily: "inherit",
          }}
        >
          {loading ? "…" : "Réactiver"}
        </button>
      </div>
    );
  }

  return null;
}
