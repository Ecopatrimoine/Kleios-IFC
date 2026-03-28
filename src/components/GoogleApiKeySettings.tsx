// ─────────────────────────────────────────────────────────────────────────────
// BLOC À INTÉGRER dans ta page de paramètres cabinet (CabinetSettings.tsx ou équivalent)
//
// 1. Ajouter dans DEFAULT_CABINET (src/constants/index.ts) :
//      googlePlacesApiKey: "",
//
// 2. Ajouter dans le type CabinetSettings (src/types/crm.ts ou constants) :
//      googlePlacesApiKey?: string;
//
// 3. Passer la prop à ProspectionView dans App.tsx :
//      <ProspectionView ... googleApiKey={cabinet.googlePlacesApiKey ?? ""} />
//
// 4. Copier-coller le composant <GoogleApiKeySettings> ci-dessous
//    dans ta page paramètres, à côté des autres sections.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";

const NAVY   = "#1A2E44";
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const ENRICH_PROXY  = `${SUPABASE_URL}/functions/v1/enrich-entreprise`;

type TestStatus = "idle" | "testing" | "ok" | "error";

interface GoogleApiKeySettingsProps {
  value: string;                         // cabinet.googlePlacesApiKey
  onChange: (key: string) => void;       // met à jour cabinet (puis saveCabinetAsync)
}

export function GoogleApiKeySettings({ value, onChange }: GoogleApiKeySettingsProps) {
  const [visible,    setVisible]    = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testError,  setTestError]  = useState("");

  const handleTest = async () => {
    if (!value.trim()) { setTestStatus("error"); setTestError("Entrez d'abord votre clé."); return; }
    setTestStatus("testing"); setTestError("");
    try {
      const res = await fetch(ENRICH_PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON },
        body: JSON.stringify({ testKey: true, googleApiKey: value.trim() }),
        signal: AbortSignal.timeout(12000),
      });
      const data = await res.json();
      if (data.valid) { setTestStatus("ok"); }
      else            { setTestStatus("error"); setTestError(data.error ?? "Clé invalide"); }
    } catch (e) {
      setTestStatus("error"); setTestError("Connexion impossible — réessayez.");
    }
  };

  const inp: React.CSSProperties = {
    flex: 1, padding: "9px 12px", borderRadius: 8,
    border: `1px solid ${
      testStatus === "ok"    ? "#059669" :
      testStatus === "error" ? "#DC2626" :
      "rgba(26,46,68,0.15)"
    }`,
    fontSize: 13, fontFamily: "monospace", outline: "none",
    color: NAVY, background: "#F9FAFB", letterSpacing: 0.5,
    transition: "border-color 0.15s",
  };

  return (
    <div style={{
      background: "#fff", border: "1px solid rgba(26,46,68,0.08)",
      borderRadius: 12, padding: "20px 24px", marginBottom: 20,
    }}>
      {/* Titre section */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${NAVY}08`, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0,
        }}>🔑</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>
            Enrichissement entreprises — Google Places
          </div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 1 }}>
            Permet de récupérer téléphone, site web et horaires lors de la prospection
          </div>
        </div>
      </div>

      {/* Bandeau info */}
      <div style={{
        margin: "14px 0", padding: "12px 14px",
        background: "#F0F7FF", border: "1px solid #BFDBFE", borderRadius: 9,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#1D6FB7", marginBottom: 6 }}>
          ℹ️ Votre clé, votre facturation
        </div>
        <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>
          La clé API est utilisée directement depuis votre navigateur vers Google.
          Elle n'est jamais transmise à nos serveurs. Chaque cabinet gère son propre quota.
          Google offre <strong>200 $/mois de crédit gratuit</strong> — soit environ{" "}
          <strong>70 000 enrichissements/mois</strong> sans frais.
        </div>
        <div style={{ marginTop: 8 }}>
          <a
            href="https://console.cloud.google.com/apis/library/places-backend.googleapis.com"
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: "#1D6FB7", fontWeight: 500 }}
          >
            → Activer Places API (New) sur Google Cloud Console ↗
          </a>
          <span style={{ color: "#9CA3AF", fontSize: 12, marginLeft: 16 }}>
            puis Credentials → Créer une clé API
          </span>
        </div>
        <div style={{ marginTop: 6 }}>
          <a
            href="https://console.cloud.google.com/billing/budgets"
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: "#D97706", fontWeight: 500 }}
          >
            → Configurer un budget d'alerte Google Cloud ↗
          </a>
          <span style={{ color: "#9CA3AF", fontSize: 12, marginLeft: 10 }}>
            (recommandé : alerte à 10 $, plafond à 50 $)
          </span>
        </div>
      </div>

      {/* Champ clé */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={e => { onChange(e.target.value); setTestStatus("idle"); }}
          placeholder="AIza..."
          style={inp}
          autoComplete="off"
          spellCheck={false}
        />
        {/* Bouton afficher/masquer */}
        <button
          onClick={() => setVisible(v => !v)}
          title={visible ? "Masquer" : "Afficher"}
          style={{
            padding: "9px 12px", borderRadius: 8,
            border: "1px solid rgba(26,46,68,0.15)", background: "#F9FAFB",
            color: "#6B7280", cursor: "pointer", fontSize: 14, flexShrink: 0,
          }}
        >
          {visible ? "🙈" : "👁"}
        </button>
        {/* Bouton test */}
        <button
          onClick={handleTest}
          disabled={testStatus === "testing" || !value.trim()}
          style={{
            padding: "9px 16px", borderRadius: 8, border: "none",
            background: testStatus === "testing" ? "#F3F4F6" : NAVY,
            color: testStatus === "testing" ? "#9CA3AF" : "#fff",
            fontSize: 12, fontWeight: 600, cursor: testStatus === "testing" ? "wait" : "pointer",
            fontFamily: "inherit", flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          {testStatus === "testing" ? (
            <>
              <span style={{
                display: "inline-block", width: 11, height: 11,
                border: "1.5px solid #9CA3AF", borderTopColor: "transparent",
                borderRadius: "50%", animation: "spin 0.7s linear infinite",
              }} />
              Test…
            </>
          ) : "● Tester la clé"}
        </button>
      </div>

      {/* Résultat du test */}
      {testStatus === "ok" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px", background: "#ECFDF5",
          border: "1px solid #6EE7B7", borderRadius: 8,
        }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#065F46" }}>Clé valide — Places API activée</div>
            <div style={{ fontSize: 11, color: "#059669", marginTop: 1 }}>
              L'enrichissement téléphone + site web est opérationnel.
            </div>
          </div>
        </div>
      )}
      {testStatus === "error" && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 8,
          padding: "10px 14px", background: "#FEF2F2",
          border: "1px solid #FECACA", borderRadius: 8,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>❌</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#991B1B" }}>Clé invalide</div>
            <div style={{ fontSize: 11, color: "#DC2626", marginTop: 1 }}>{testError}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
              Vérifiez que Places API (New) est bien activée dans votre projet Google Cloud,
              et que la clé n'a pas de restriction de domaine bloquant votre usage.
            </div>
          </div>
        </div>
      )}

      {/* Sans clé — mode dégradé */}
      {!value.trim() && testStatus === "idle" && (
        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
          Sans clé, l'enrichissement fonctionne uniquement via OpenStreetMap (couverture partielle).
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
