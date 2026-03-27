// src/components/NewContactModal.tsx
// Modal de création rapide d'un contact
// Champs minimalistes : nom affiché + statut
// Après création → ouvre directement la fiche
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";

interface NewContactModalProps {
  onConfirm: (displayName: string, status: string) => void;
  onClose: () => void;
  colorNavy: string;
  colorGold: string;
}

const STATUS_OPTIONS = [
  { value: "prospect", label: "Prospect" },
  { value: "client",   label: "Client" },
  { value: "vip",      label: "VIP" },
];

export function NewContactModal({
  onConfirm,
  onClose,
  colorNavy,
  colorGold,
}: NewContactModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("prospect");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus automatique sur le champ nom à l'ouverture
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Fermer avec Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && displayName.trim()) handleConfirm();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [displayName]);

  const handleConfirm = () => {
    if (!displayName.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    onConfirm(displayName.trim(), status);
  };

  return (
    // Overlay semi-transparent
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      {/* Modal — stoppe la propagation du clic pour ne pas fermer */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          width: 420,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        {/* En-tête */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#0D1B2E" }}>
              Nouveau client
            </div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
              Vous pourrez compléter la fiche après la création.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9CA3AF",
              fontSize: 20,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Champ nom */}
        <div style={{ marginBottom: 14 }}>
          <label style={{
            display: "block",
            fontSize: 11,
            color: "#9CA3AF",
            fontWeight: 500,
            marginBottom: 6,
          }}>
            Nom affiché *
          </label>
          <input
            ref={inputRef}
            type="text"
            value={displayName}
            onChange={e => { setDisplayName(e.target.value); setError(""); }}
            placeholder="ex: Martin & Isabelle Dupont"
            style={{
              width: "100%",
              border: error ? "1px solid #EF4444" : "1px solid #E2E5EC",
              borderRadius: 8,
              padding: "9px 12px",
              fontSize: 14,
              color: "#0D1B2E",
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = colorGold)}
            onBlur={e => (e.currentTarget.style.borderColor = error ? "#EF4444" : "#E2E5EC")}
          />
          {error && (
            <div style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>
              {error}
            </div>
          )}
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
            Peut inclure deux personnes : "Prénom1 & Prénom2 NOM"
          </div>
        </div>

        {/* Statut */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: "block",
            fontSize: 11,
            color: "#9CA3AF",
            fontWeight: 500,
            marginBottom: 8,
          }}>
            Statut
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: status === opt.value
                    ? `2px solid ${colorNavy}`
                    : "2px solid #E2E5EC",
                  background: status === opt.value ? colorNavy : "#fff",
                  color: status === opt.value ? "#fff" : "#4B5563",
                  fontSize: 12,
                  fontWeight: status === opt.value ? 500 : 400,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Boutons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px 0",
              border: "1px solid #E2E5EC",
              borderRadius: 8,
              background: "#fff",
              color: "#4B5563",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            style={{
              flex: 2,
              padding: "10px 0",
              border: "none",
              borderRadius: 8,
              background: displayName.trim() ? colorNavy : "#D1D5DB",
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              cursor: displayName.trim() ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}
          >
            Créer et ouvrir la fiche →
          </button>
        </div>
      </div>
    </div>
  );
}
