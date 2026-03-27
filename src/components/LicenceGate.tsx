// src/components/LicenceGate.tsx
// Écran abonnement expiré / inactif — Kleios CRM
// Adapté depuis Ploutos — sans shadcn/ui
// ─────────────────────────────────────────────────────────────────────────────

import type { LicenceInfo } from "../hooks/useLicense";

interface LicenceGateProps {
  licence:   LicenceInfo;
  userId:    string;
  onSignOut: () => void;
  colorNavy: string;
  colorGold: string;
}

export function LicenceGate({
  licence,
  userId,
  onSignOut,
  colorNavy,
  colorGold,
}: LicenceGateProps) {
  const isExpiredTrial = licence.type === "trial" && licence.status === "expired";

  // ── Liens Stripe Kleios (à créer dans le dashboard Stripe) ──
  // TODO : remplacer par les vrais liens Stripe Kleios une fois créés
  const handleSolo = () => {
    window.open(
      `https://buy.stripe.com/KLEIOS_SOLO_LINK?client_reference_id=${userId}`,
      "_blank"
    );
  };

  const handleAnnuel = () => {
    window.open(
      `https://buy.stripe.com/KLEIOS_ANNUEL_LINK?client_reference_id=${userId}`,
      "_blank"
    );
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      background: "#F0F2F6",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>

      {/* Logo KleiΩs */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 28,
        gap: 10,
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: `2px solid ${colorGold}`,
          background: colorNavy,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          color: colorGold,
          fontFamily: "Georgia, serif",
        }}>
          ϰ
        </div>
        <div style={{
          fontSize: 22,
          fontWeight: 600,
          color: colorNavy,
          fontFamily: "Georgia, serif",
        }}>
          Klei<span style={{ color: colorGold }}>Ω</span>s
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #E2E5EC",
        padding: "32px 32px",
        width: "100%",
        maxWidth: 480,
        textAlign: "center",
        boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
      }}>
        {/* Icône */}
        <div style={{ fontSize: 52, marginBottom: 16 }}>
          {isExpiredTrial ? "⏱️" : "🔒"}
        </div>

        {/* Titre */}
        <h2 style={{
          fontSize: 18,
          fontWeight: 600,
          color: colorNavy,
          margin: "0 0 10px",
        }}>
          {isExpiredTrial ? "Période d'essai terminée" : "Abonnement inactif"}
        </h2>

        {/* Description */}
        <p style={{
          fontSize: 13,
          color: "#4B5563",
          lineHeight: 1.6,
          marginBottom: 24,
        }}>
          {isExpiredTrial
            ? "Votre période d'essai gratuite de 15 jours est terminée. Souscrivez un abonnement pour continuer à utiliser KleiΩs."
            : "Votre abonnement n'est plus actif. Renouvelez pour retrouver l'accès complet."}
        </p>

        {/* Plans */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 20,
          textAlign: "left",
        }}>
          {/* Plan Standard mensuel */}
          <div style={{
            borderRadius: 12,
            padding: 16,
            border: `2px solid ${colorGold}`,
            background: `${colorGold}08`,
          }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              color: colorNavy,
              marginBottom: 6,
            }}>
              Plan Standard
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: colorNavy }}>
              35 €
              <span style={{ fontSize: 12, fontWeight: 400, color: "#6B7280" }}>/mois</span>
            </div>
            <ul style={{
              fontSize: 11,
              color: "#4B5563",
              marginTop: 10,
              paddingLeft: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}>
              <li>✓ Fiche civile + famille</li>
              <li>✓ Contrats illimités</li>
              <li>✓ Suivi commercial</li>
              <li>✓ Conformité DDA/MIF2</li>
              <li>✓ GED + Espace client</li>
            </ul>
            <button
              onClick={handleSolo}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "8px 0",
                borderRadius: 8,
                border: "none",
                background: `linear-gradient(135deg, ${colorGold} 0%, #c49040 100%)`,
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Choisir Standard
            </button>
          </div>

          {/* Plan Annuel */}
          <div style={{
            borderRadius: 12,
            padding: 16,
            border: `2px solid ${colorNavy}`,
            background: `${colorNavy}04`,
            position: "relative",
          }}>
            {/* Badge recommandé */}
            <div style={{
              position: "absolute",
              top: -12,
              left: "50%",
              transform: "translateX(-50%)",
              background: colorNavy,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 12px",
              borderRadius: 20,
              whiteSpace: "nowrap",
            }}>
              Recommandé
            </div>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              color: colorNavy,
              marginBottom: 6,
            }}>
              Plan Annuel
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: colorNavy }}>
              29 €
              <span style={{ fontSize: 12, fontWeight: 400, color: "#6B7280" }}>/mois</span>
            </div>
            <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              348 €/an · 2 mois offerts
            </div>
            <ul style={{
              fontSize: 11,
              color: "#4B5563",
              marginTop: 6,
              paddingLeft: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}>
              <li>✓ Toutes les fonctionnalités</li>
              <li>✓ 2 mois offerts</li>
              <li>✓ Tarif bloqué à vie</li>
            </ul>
            <button
              onClick={handleAnnuel}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "8px 0",
                borderRadius: 8,
                border: "none",
                background: `linear-gradient(135deg, ${colorNavy} 0%, #1E2F47 100%)`,
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Choisir Annuel
            </button>
          </div>
        </div>

        {/* Note Stripe */}
        <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 16 }}>
          Paiement sécurisé par Stripe · Résiliation à tout moment
        </p>

        {/* Support + déconnexion */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}>
          <a
            href="mailto:contact@ploutos-cgp.fr?subject=Problème de licence KleiΩs"
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: colorNavy,
              textDecoration: "none",
            }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
          >
            📧 Contacter le support
          </a>
          <button
            onClick={onSignOut}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              color: "#9CA3AF",
              fontFamily: "inherit",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#4B5563")}
            onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}
          >
            Se déconnecter
          </button>
        </div>
      </div>

      <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 20 }}>
        © KleiΩs 2026 — EcoPatrimoine Conseil · contact@ploutos-cgp.fr
      </p>
    </div>
  );
}
