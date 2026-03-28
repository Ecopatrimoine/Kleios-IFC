// src/components/AuthGate.tsx
// Écran connexion / inscription / reset password — Kleios CRM
// Adapté depuis Ploutos — logique identique, UI sans shadcn/ui
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import type { useAuth } from "../hooks/useAuth";

type AuthGateProps = {
  authHook: ReturnType<typeof useAuth>;
  colorNavy: string;
  colorGold: string;
};

type Mode = "login" | "register" | "forgot" | "reset";

// ── Composants UI locaux (pas de shadcn dans Kleios) ─────────────────────────

function Field({
  label,
  type = "text",
  value,
  onChange,
  onKeyDown,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.8px",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.5)",
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          border: focused
            ? "1.5px solid #F26522"
            : "1.5px solid rgba(255,255,255,0.15)",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 13,
          color: "#0D1B2E",
          background: "rgba(255,255,255,0.97)",
          fontFamily: "inherit",
          outline: "none",
          transition: "border-color 0.15s",
        }}
      />
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function AuthGate({ authHook, colorNavy, colorGold: _cg }: AuthGateProps) {
  const {
    authState,
    error,
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    isPasswordRecovery,
    clearPasswordRecovery,
  } = authHook;

  const [mode, setMode]                     = useState<Mode>("login");
  const [email, setEmail]                   = useState("");
  const [password, setPassword]             = useState("");
  const [cabinetName, setCabinetName]       = useState("");
  const [campusRRE, setCampusRRE]           = useState("");
  const [prenomRRE, setPrenomRRE]           = useState("");
  const [nomRRE, setNomRRE]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword]       = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading]               = useState(false);
  const [successMsg, setSuccessMsg]         = useState("");
  const [localError, setLocalError]         = useState("");

  // Basculer en mode reset quand Supabase détecte un lien de récupération
  useEffect(() => {
    if (isPasswordRecovery) setMode("reset");
  }, [isPasswordRecovery]);

  const displayError = localError || error;

  // ── Handlers ──

  const handleLogin = async () => {
    setLocalError("");
    setLoading(true);
    await signIn(email, password);
    setLoading(false);
  };

  const handleRegister = async () => {
    setLocalError("");
    if (!cabinetName.trim()) { setLocalError("Veuillez saisir le nom de votre campus / établissement."); return; }
    if (!campusRRE.trim()) { setLocalError("Veuillez sélectionner votre campus."); return; }
    if (password.length < 8) { setLocalError("Le mot de passe doit faire au moins 8 caractères."); return; }
    if (password !== confirmPassword) { setLocalError("Les mots de passe ne correspondent pas."); return; }
    setLoading(true);
    const ok = await signUp(email, password, cabinetName, { campus: campusRRE, first_name: prenomRRE, last_name: nomRRE });
    setLoading(false);
    if (ok) {
      // Détecter Mac pour email de bienvenue adapté
      const isMac = navigator.platform?.toLowerCase().includes("mac") ||
        navigator.userAgent?.toLowerCase().includes("macintosh");
      const emailType = isMac ? "welcome_trial_mac" : "welcome_trial";
      // Fire-and-forget — ne bloque pas l'UI si la fonction échoue
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, type: emailType, cabinet_name: cabinetName }),
      }).catch(() => {});
      setSuccessMsg("Compte créé ! Vérifiez votre email pour confirmer votre inscription.");
      setMode("login");
    }
  };

  const handleReset = async () => {
    setLocalError("");
    if (newPassword.length < 8) { setLocalError("Le mot de passe doit faire au moins 8 caractères."); return; }
    if (newPassword !== confirmNewPassword) { setLocalError("Les mots de passe ne correspondent pas."); return; }
    setLoading(true);
    try {
      const ok = await updatePassword(newPassword);
      setLoading(false);
      if (ok) {
        setSuccessMsg("Mot de passe mis à jour ! Vous pouvez vous connecter.");
        clearPasswordRecovery();
        window.history.replaceState(null, "", window.location.pathname);
        setTimeout(() => setMode("login"), 2000);
      }
    } catch {
      setLoading(false);
      setLocalError("Erreur lors de la mise à jour. Réessayez.");
    }
  };

  const handleForgot = async () => {
    setLocalError("");
    if (!email) { setLocalError("Entrez votre email."); return; }
    setLoading(true);
    const ok = await resetPassword(email);
    setLoading(false);
    if (ok) setSuccessMsg("Email de réinitialisation envoyé !");
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setLocalError("");
    setSuccessMsg("");
  };

  // ── Rendu ──

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      background: `linear-gradient(135deg, ${colorNavy} 0%, #162338 60%, #1E2F47 100%)`,
      position: "relative",
      overflow: "hidden",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>

      {/* ── Formes géométriques animées ── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position:"absolute", top:"-120px", left:"-100px", width:"480px", height:"480px",
          borderRadius:"50%", background: "#F26522", opacity:0.06,
          animation:"float1 14s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", top:"-20px", left:"32%", width:"240px", height:"110px",
          borderRadius:"24px", background: "#F26522", opacity:0.10, transform:"rotate(-14deg)",
          animation:"float2 11s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", top:"80px", right:"-60px", width:"300px", height:"300px",
          borderRadius:"32px", background:"rgba(255,255,255,0.04)", transform:"rotate(22deg)",
          animation:"float3 16s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", bottom:"-80px", right:"40px", width:"380px", height:"380px",
          borderRadius:"50%", background: "#F26522", opacity:0.07,
          animation:"float4 13s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", bottom:"60px", left:"-50px", width:"300px", height:"140px",
          borderRadius:"20px", background:"rgba(255,255,255,0.03)", transform:"rotate(-10deg)",
          animation:"float5 12s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", top:"42%", left:"4%", width:"180px", height:"180px",
          borderRadius:"50%", background:"rgba(255,255,255,0.03)",
          animation:"float2 9s ease-in-out infinite" }}/>
      </div>

      <style>{`
        @keyframes float1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-22px)} }
        @keyframes float2 { 0%,100%{transform:translateY(0) rotate(-14deg)} 50%{transform:translateY(-16px) rotate(-14deg)} }
        @keyframes float3 { 0%,100%{transform:translateY(0) rotate(22deg)} 50%{transform:translateY(14px) rotate(22deg)} }
        @keyframes float4 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-24px)} }
        @keyframes float5 { 0%,100%{transform:translateY(0) rotate(-10deg)} 50%{transform:translateY(18px) rotate(-10deg)} }
      `}</style>

      {/* ── Logo Kleios IFC ── */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 28,
        position: "relative",
        zIndex: 1,
        gap: 10,
      }}>
        {/* Icône ϰ cerclée */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          border: `2px solid #F26522`,
          background: `#F2652218`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 30,
          color: "#F26522",
          fontFamily: "Georgia, serif",
          boxShadow: `0 0 30px #F2652230`,
        }}>
          ϰ
        </div>
        {/* Lettrage Kleios IFC */}
        <div style={{
          fontSize: 26,
          fontWeight: 600,
          color: "#fff",
          fontFamily: "Georgia, serif",
          letterSpacing: "-0.3px",
        }}>
          Kleios <span style={{ color: "#F26522" }}>IFC</span>
        </div>
        <div style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "2px",
          textTransform: "uppercase",
        }}>
          CRM Commercial
        </div>
      </div>

      {/* ── Card formulaire ── */}
      <div style={{
        background: "rgba(255,255,255,0.07)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: "28px 32px",
        width: "100%",
        maxWidth: 400,
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}>
        {/* Titre mode */}
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "#fff", margin: 0 }}>
            {mode === "login"    && "Connexion"}
            {mode === "register" && "Créer un compte"}
            {mode === "forgot"   && "Mot de passe oublié"}
            {mode === "reset"    && "Nouveau mot de passe"}
          </h2>
          {mode === "register" && (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              Accès réservé aux CGP partenaires
            </p>
          )}
        </div>

        {/* Message succès */}
        {successMsg && (
          <div style={{
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 500,
            background: "rgba(16,185,129,0.15)",
            border: "1px solid rgba(16,185,129,0.3)",
            color: "#6EE7B7",
          }}>
            ✓ {successMsg}
          </div>
        )}

        {/* Message erreur */}
        {displayError && (
          <div style={{
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 500,
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#FCA5A5",
          }}>
            {displayError}
          </div>
        )}

        {/* Mode grace (hors-ligne) */}
        {authState === "grace" && (
          <div style={{
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 12,
            background: "rgba(245,158,11,0.15)",
            border: "1px solid rgba(245,158,11,0.3)",
            color: "#FDE68A",
          }}>
            ⚠ Mode hors-ligne — connexion internet requise dans les 72h
          </div>
        )}

        {/* Nom du cabinet (inscription) */}
        {mode === "register" && (
          <Field
            label="Nom du cabinet"
            value={cabinetName}
            onChange={setCabinetName}
            placeholder="Ex : Marie Dupont — RRE"
          />
        )}


        {/* Prénom & Nom RRE (inscription) */}
        {mode === "register" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Prénom" value={prenomRRE} onChange={setPrenomRRE} placeholder="Prénom" />
            <Field label="Nom" value={nomRRE} onChange={setNomRRE} placeholder="Nom" />
          </div>
        )}

        {/* Campus IFC (inscription) */}
        {mode === "register" && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.65)", letterSpacing: 0.4, display: "block", marginBottom: 6 }}>CAMPUS / ÉTABLISSEMENT</label>
            <select value={campusRRE} onChange={e => setCampusRRE(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: campusRRE ? "#fff" : "rgba(255,255,255,0.45)", fontSize: 13, fontFamily: "inherit", outline: "none", appearance: "none" }}>
              <option value="">— Sélectionnez votre campus —</option>
              <option value="IFC Perpignan">IFC Perpignan</option>
              <option value="IFC Montpellier">IFC Montpellier</option>
              <option value="IFC Nîmes">IFC Nîmes</option>
              <option value="IFC Avignon">IFC Avignon</option>
              <option value="IFC Marseille">IFC Marseille</option>
              <option value="IFC Alès">IFC Alès</option>
              <option value="IFC Saint-Étienne">IFC Saint-Étienne</option>
              <option value="IFC Valence">IFC Valence</option>
              <option value="IFC Clermont-Ferrand">IFC Clermont-Ferrand</option>
              <option value="Westford">Westford</option>
            </select>
          </div>
        )}

        {/* Email */}
        {mode !== "reset" && (
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            onKeyDown={e => e.key === "Enter" && mode === "login" && handleLogin()}
            placeholder="votre@email.com"
          />
        )}

        {/* Mot de passe */}
        {mode !== "forgot" && mode !== "reset" && (
          <Field
            label="Mot de passe"
            type="password"
            value={password}
            onChange={setPassword}
            onKeyDown={e => e.key === "Enter" && mode === "login" && handleLogin()}
            placeholder={mode === "register" ? "8 caractères minimum" : "••••••••"}
          />
        )}

        {/* Confirmation mot de passe (inscription) */}
        {mode === "register" && (
          <Field
            label="Confirmer le mot de passe"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="••••••••"
          />
        )}

        {/* Nouveau mot de passe (reset) */}
        {mode === "reset" && (
          <>
            <Field
              label="Nouveau mot de passe"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="8 caractères minimum"
            />
            <Field
              label="Confirmer le mot de passe"
              type="password"
              value={confirmNewPassword}
              onChange={setConfirmNewPassword}
              placeholder="••••••••"
            />
          </>
        )}

        {/* Bouton action */}
        <button
          onClick={
            mode === "login"    ? handleLogin    :
            mode === "register" ? handleRegister :
            mode === "reset"    ? handleReset    :
            handleForgot
          }
          disabled={loading || (mode !== "reset" && !email)}
          style={{
            width: "100%",
            padding: "11px 0",
            borderRadius: 10,
            border: "none",
            background: loading || (mode !== "reset" && !email)
              ? "rgba(255,255,255,0.15)"
              : `linear-gradient(135deg, #F26522 0%, #E8C060 100%)`,
            color: loading || (mode !== "reset" && !email) ? "rgba(255,255,255,0.4)" : colorNavy,
            fontSize: 13,
            fontWeight: 600,
            cursor: loading || (mode !== "reset" && !email) ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s",
            marginTop: 4,
          }}
        >
          {loading ? "..." :
            mode === "login"    ? "Se connecter" :
            mode === "register" ? "Créer mon compte" :
            mode === "reset"    ? "Enregistrer le mot de passe" :
            "Envoyer le lien"
          }
        </button>

        {/* Liens secondaires */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: "rgba(255,255,255,0.4)",
        }}>
          {mode === "login" && (
            <>
              <button
                onClick={() => switchMode("forgot")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 12,
                  fontFamily: "inherit",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
              >
                Mot de passe oublié ?
              </button>
              <button
                onClick={() => switchMode("register")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 12,
                  fontFamily: "inherit",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
              >
                Pas encore de compte ? S'inscrire
              </button>
            </>
          )}
          {(mode === "register" || mode === "forgot") && (
            <button
              onClick={() => switchMode("login")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.4)",
                fontSize: 12,
                fontFamily: "inherit",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
            >
              ← Retour à la connexion
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <p style={{
        fontSize: 11,
        color: "rgba(255,255,255,0.25)",
        marginTop: 24,
        position: "relative",
        zIndex: 1,
      }}>
        © Kleios IFC 2026 — IFC Groupe
      </p>
    </div>
  );
}
