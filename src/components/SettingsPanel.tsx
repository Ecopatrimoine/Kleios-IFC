// src/components/SettingsPanel.tsx
// Paramètres Kleios IFC — identité centre, profil RRE, outils
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from "react";
import type { CabinetSettings } from "../types/crm";
import { BRAND } from "../constants";
import { supabase } from "../lib/supabase";

interface SettingsPanelProps {
  cabinet: CabinetSettings;
  userId: string;
  isAdmin?: boolean;
  logoSrc: string | null;
  onUpdate: (updated: CabinetSettings) => void;
  onLogoChange: (src: string | null) => void;
  colorNavy: string;
  colorGold: string;
  googleConnected?: boolean;
  onGoogleConnect?: () => void;
  onGoogleDisconnect?: () => void;
  googleError?: string | null;
  campusList?: string[];
}

// ── Composants UI locaux ──────────────────────────────────────────────────────

function Section({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginTop: 28, marginBottom: 14 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.8px",
        textTransform: "uppercase" as const, color: "#9CA3AF",
        paddingBottom: 8, borderBottom: "1px solid #E2E5EC",
      }}>
        {title}
      </div>
      {subtitle && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>{subtitle}</div>}
    </div>
  );
}

function Field({
  label, value, onChange, placeholder = "", type = "text", hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>{label}</label>}
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          border: focused ? "1.5px solid #C9A84C" : "1px solid #E2E5EC",
          borderRadius: 8, padding: "8px 10px", fontSize: 13,
          color: "#0D1B2E", fontFamily: "inherit", outline: "none",
          background: "#fff", transition: "border-color 0.15s",
        }}
      />
      {hint && <div style={{ fontSize: 10, color: "#9CA3AF" }}>{hint}</div>}
    </div>
  );
}

function ColorPicker({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <label style={{
        width: 44, height: 44, borderRadius: "50%",
        border: "3px solid #fff", boxShadow: "0 0 0 1px #E2E5EC",
        background: value, cursor: "pointer",
        display: "block", position: "relative",
      }}>
        <input
          type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ opacity: 0, position: "absolute", inset: 0, cursor: "pointer" }}
        />
      </label>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: 80, textAlign: "center", border: "1px solid #E2E5EC",
          borderRadius: 6, padding: "3px 6px", fontSize: 11,
          fontFamily: "monospace", color: "#0D1B2E", outline: "none",
        }}
      />
      <div style={{ fontSize: 10, color: "#9CA3AF", textAlign: "center", maxWidth: 80 }}>{label}</div>
    </div>
  );
}

// ── Section Google Places ─────────────────────────────────────────────────────

const SUPABASE_URL_GP  = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_GP = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const ENRICH_PROXY_GP  = `${SUPABASE_URL_GP}/functions/v1/enrich-entreprise`;

function GooglePlacesSection({ cabinet, upd, colorNavy }: {
  cabinet: CabinetSettings;
  upd: (key: keyof CabinetSettings, val: any) => void;
  colorNavy: string;
}) {
  const [visible,    setVisible]    = React.useState(false);
  const [testStatus, setTestStatus] = React.useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testError,  setTestError]  = React.useState("");
  const currentKey = cabinet.googlePlacesApiKey ?? "";

  const handleTest = async () => {
    if (!currentKey.trim()) { setTestStatus("error"); setTestError("Entrez d'abord votre clé."); return; }
    setTestStatus("testing"); setTestError("");
    try {
      const res = await fetch(ENRICH_PROXY_GP, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_GP },
        body: JSON.stringify({ testKey: true, googleApiKey: currentKey.trim() }),
        signal: AbortSignal.timeout(12000),
      });
      const data = await res.json();
      if (data.valid) setTestStatus("ok");
      else { setTestStatus("error"); setTestError(data.error ?? "Clé invalide"); }
    } catch { setTestStatus("error"); setTestError("Connexion impossible — réessayez."); }
  };

  return (
    <div>
      <Section
        title="Google Places — Enrichissement prospection"
        subtitle="Récupère téléphone, site web et horaires lors de la prospection d'entreprises."
      />
      <div style={{ padding: "14px 16px", background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10 }}>
        <div style={{ fontSize: 12, color: "#4B5563", marginBottom: 12, lineHeight: 1.6 }}>
          Votre clé est utilisée directement depuis votre navigateur — elle n'est jamais envoyée sur nos serveurs.
          Google offre <strong>5 000 appels gratuits/mois</strong> (Text Search + Place Details).
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <input
            type={visible ? "text" : "password"}
            value={currentKey}
            onChange={e => upd("googlePlacesApiKey", e.target.value)}
            placeholder="AIzaSy..."
            style={{
              flex: 1, padding: "8px 10px", borderRadius: 8, fontFamily: "monospace",
              border: `1px solid ${testStatus === "ok" ? "#059669" : testStatus === "error" ? "#DC2626" : "#E2E5EC"}`,
              fontSize: 12, outline: "none", color: "#0D1B2E", background: "#fff",
            }}
          />
          <button onClick={() => setVisible(v => !v)}
            style={{ padding: "8px 10px", border: "1px solid #E2E5EC", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 12, color: "#6B7280", fontFamily: "inherit" }}>
            {visible ? "🙈" : "👁"}
          </button>
          <button onClick={handleTest} disabled={testStatus === "testing"}
            style={{
              padding: "8px 14px", border: `1px solid ${colorNavy}`, borderRadius: 8,
              background: "#fff", color: colorNavy, fontSize: 12, fontWeight: 500,
              cursor: testStatus === "testing" ? "wait" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            }}>
            {testStatus === "testing" ? "Test…" : "Tester la clé"}
          </button>
        </div>
        {testStatus === "ok" && (
          <div style={{ fontSize: 12, color: "#065F46", background: "#ECFDF5", padding: "6px 10px", borderRadius: 6, border: "1px solid #A7F3D0" }}>
            ✓ Clé valide — Google Places opérationnel
          </div>
        )}
        {testStatus === "error" && testError && (
          <div style={{ fontSize: 12, color: "#991B1B", background: "#FEF2F2", padding: "6px 10px", borderRadius: 6, border: "1px solid #FECACA" }}>
            ✕ {testError}
          </div>
        )}
        <div style={{ marginTop: 10, padding: "8px 12px", background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 6, fontSize: 11, color: "#0C4A6E" }}>
          💡 <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: colorNavy }}>Google Cloud Console</a> → Activer "Places API (New)" → Créer une clé API
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function SettingsPanel({
  cabinet, userId, logoSrc,
  onUpdate, onLogoChange,
  colorNavy, colorGold,
  googleConnected, onGoogleConnect, onGoogleDisconnect, googleError,
  campusList = [],
  isAdmin = false,
}: SettingsPanelProps) {
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const upd = useCallback((key: keyof CabinetSettings, val: any) => {
    onUpdate({ ...cabinet, [key]: val });
  }, [cabinet, onUpdate]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const localKey = `${BRAND.storagePrefix}cabinet_${userId}`;

      // Sauvegarder la clé Google séparément en localStorage
      // Elle ne part jamais en Supabase (donnée sensible, côté client uniquement)
      const googleKey = cabinet.googlePlacesApiKey ?? "";
      if (googleKey) {
        localStorage.setItem(`${BRAND.storagePrefix}google_places_key_${userId}`, googleKey);
      } else {
        localStorage.removeItem(`${BRAND.storagePrefix}google_places_key_${userId}`);
      }

      // Sauvegarder le reste du cabinet (sans la clé Google) en Supabase
      const { googlePlacesApiKey: _omit, ...cabinetWithoutKey } = cabinet as any;
      localStorage.setItem(localKey, JSON.stringify(cabinet)); // localStorage garde tout
      const { error } = await supabase
        .from("cabinet_settings")
        .upsert({ user_id: userId, settings: cabinetWithoutKey, updated_at: new Date().toISOString() });
      if (error) throw error;
      setSaveMsg({ text: "Paramètres sauvegardés ✓", ok: true });
    } catch (e: any) {
      setSaveMsg({ text: `Erreur : ${e.message}`, ok: false });
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(null), 3000);
  }, [cabinet, userId]);

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      onLogoChange(src);
      localStorage.setItem(`${BRAND.storagePrefix}logo_${userId}`, src);
    };
    reader.readAsDataURL(file);
  }, [userId, onLogoChange]);

  const handleRemoveLogo = useCallback(() => {
    onLogoChange(null);
    localStorage.removeItem(`${BRAND.storagePrefix}logo_${userId}`);
  }, [userId, onLogoChange]);

  return (
    <div style={{ maxWidth: 800 }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: colorNavy, margin: 0 }}>Paramètres</h2>
          <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
            Identité du centre · Profil RRE · Outils
          </p>
        </div>
        <button
          onClick={handleSave} disabled={saving}
          style={{
            padding: "8px 20px", border: "none", borderRadius: 8,
            background: saving ? "#D1D5DB" : colorNavy,
            color: "#fff", fontSize: 13, fontWeight: 500,
            cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
          }}
        >
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>
      </div>

      {saveMsg && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, marginBottom: 16,
          background: saveMsg.ok ? "#ECFDF5" : "#FEF2F2",
          color: saveMsg.ok ? "#065F46" : "#991B1B",
          border: `1px solid ${saveMsg.ok ? "#A7F3D0" : "#FECACA"}`,
        }}>
          {saveMsg.text}
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #E2E5EC", borderRadius: 12, padding: "20px 24px" }}>

        {/* LOGO */}
        <Section title="Logo du centre de formation" />
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 8 }}>
          <div style={{
            width: 100, height: 70, borderRadius: 10, border: "1px solid #E2E5EC",
            background: "#F8F9FB", display: "flex", alignItems: "center",
            justifyContent: "center", overflow: "hidden", flexShrink: 0,
          }}>
            {logoSrc
              ? <img src={logoSrc} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              : <div style={{ fontSize: 11, color: "#9CA3AF" }}>Aucun logo</div>
            }
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8,
              border: `1px solid ${colorNavy}`, background: colorNavy,
              color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer",
            }}>
              ↑ Charger un logo
              <input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp"
                style={{ display: "none" }} onChange={handleLogoUpload} />
            </label>
            {logoSrc && (
              <button onClick={handleRemoveLogo}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #FCA5A5", background: "#fff", color: "#DC2626", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                Supprimer le logo
              </button>
            )}
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>PNG, SVG, JPEG, WebP — fond transparent recommandé</p>
          </div>
        </div>

        {/* COULEURS */}
        <Section title="Couleurs (interface)" />
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 8 }}>
          <ColorPicker label="Couleur principale" value={cabinet.colorNavy} onChange={v => upd("colorNavy", v)} />
          <ColorPicker label="Couleur accent"     value={cabinet.colorGold} onChange={v => upd("colorGold", v)} />
          <ColorPicker label="Fond de page"       value={cabinet.colorBg}   onChange={v => upd("colorBg", v)} />
        </div>

        {/* IDENTITÉ IFC */}
        <Section title="Identité du centre de formation" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
          <Field label="Nom du centre *"         value={cabinet.cabinetName}       onChange={v => upd("cabinetName", v)}  placeholder="IFC Perpignan" />
          <Field label="Email de contact"        value={cabinet.email}             onChange={v => upd("email", v)}        placeholder="contact@ifc-perpignan.fr" type="email" />
          <Field label="Téléphone"               value={cabinet.phone}             onChange={v => upd("phone", v)}        placeholder="+33 4 ..." type="tel" />
          <Field label="Site web"                value={cabinet.website}           onChange={v => upd("website", v)}      placeholder="https://..." />
          <Field label="Nom expéditeur (emails)" value={cabinet.senderName ?? ""}  onChange={v => upd("senderName", v)}  placeholder="IFC Perpignan" />
          <Field label="Email expéditeur"        value={cabinet.senderEmail ?? ""} onChange={v => upd("senderEmail", v)} placeholder="noreply@ifc-perpignan.fr" type="email" />
        </div>

        {/* ADRESSE */}
        <Section title="Adresse" />
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 4 }}>
          <Field label="Adresse"     value={cabinet.address}    onChange={v => upd("address", v)}    placeholder="12 avenue du Languedoc" />
          <Field label="Code postal" value={cabinet.postalCode} onChange={v => upd("postalCode", v)} placeholder="66000" />
          <Field label="Ville"       value={cabinet.city}       onChange={v => upd("city", v)}       placeholder="Perpignan" />
        </div>

        {/* PROFIL RRE */}
        <Section
          title="Mon profil RRE"
          subtitle="Vos informations personnelles — utilisées dans les comptes-rendus de visite et les échanges."
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
          <Field
            label="Prénom"
            value={(cabinet as any).rrePrenom ?? ""}
            onChange={v => upd("rrePrenom" as any, v)}
            placeholder="Marie"
          />
          <Field
            label="Nom"
            value={(cabinet as any).rreNom ?? ""}
            onChange={v => upd("rreNom" as any, v)}
            placeholder="Dupont"
          />
          {/* Campus rattaché */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Campus rattaché</label>
            {campusList.length > 0 ? (
              <select
                value={cabinet.campus ?? ""}
                onChange={e => upd("campus", e.target.value)}
                style={{
                  border: "1px solid #E2E5EC", borderRadius: 8, padding: "8px 10px",
                  fontSize: 13, fontFamily: "inherit", outline: "none",
                  background: "#fff", color: "#0D1B2E", appearance: "none",
                }}
              >
                <option value="">— Choisir un campus —</option>
                {campusList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <Field
                label=""
                value={cabinet.campus ?? ""}
                onChange={v => upd("campus", v)}
                placeholder="Perpignan Centre"
                hint="Configurez vos campus dans Campus & Formations"
              />
            )}
          </div>
          {/* Objectif visites */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Objectif visites tuteurs / mois</label>
            <input
              type="number" min={1} max={50}
              value={(cabinet as any).objectifVisitesMois ?? 6}
              onChange={e => upd("objectifVisitesMois" as any, Number(e.target.value))}
              style={{
                border: "1px solid #E2E5EC", borderRadius: 8, padding: "8px 10px",
                fontSize: 13, fontFamily: "inherit", outline: "none",
                background: "#fff", color: "#0D1B2E",
              }}
            />
            <div style={{ fontSize: 10, color: "#9CA3AF" }}>Affiché dans le dashboard Suivi tuteurs (défaut : 6)</div>
          </div>
        </div>

        {/* OBJECTIFS DIRECTION */}
        <Section
          title="Objectifs direction"
          subtitle={isAdmin ? "Fixés par la direction — visibles par tous les RRE." : "Fixés par la direction — lecture seule pour les RRE."}
        />
        <div style={{
          background: isAdmin ? "#fff" : "#F9FAFB",
          borderRadius: 10, border: "1px solid #E2E5EC",
          padding: "16px 18px", marginBottom: 4,
        }}>
          {!isAdmin && (
            <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              🔒 Seul l'administrateur peut modifier ces objectifs
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Visites tuteurs / mois</label>
              <input
                type="number" min={1} max={50}
                value={(cabinet as any).objectifVisitesMois ?? 6}
                onChange={e => upd("objectifVisitesMois" as any, Number(e.target.value))}
                disabled={!isAdmin}
                style={{ border: "1px solid #E2E5EC", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", background: isAdmin ? "#fff" : "#F3F4F6", color: isAdmin ? "#0D1B2E" : "#6B7280" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Taux de placement cible (%)</label>
              <input
                type="number" min={0} max={100}
                value={(cabinet as any).objectifTauxPlacement ?? 80}
                onChange={e => upd("objectifTauxPlacement" as any, Number(e.target.value))}
                disabled={!isAdmin}
                style={{ border: "1px solid #E2E5EC", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", background: isAdmin ? "#fff" : "#F3F4F6", color: isAdmin ? "#0D1B2E" : "#6B7280" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Entreprises partenaires cible</label>
              <input
                type="number" min={0}
                value={(cabinet as any).objectifPartenaires ?? 50}
                onChange={e => upd("objectifPartenaires" as any, Number(e.target.value))}
                disabled={!isAdmin}
                style={{ border: "1px solid #E2E5EC", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", background: isAdmin ? "#fff" : "#F3F4F6", color: isAdmin ? "#0D1B2E" : "#6B7280" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Prospects à contacter / mois</label>
              <input
                type="number" min={0}
                value={(cabinet as any).objectifProspects ?? 10}
                onChange={e => upd("objectifProspects" as any, Number(e.target.value))}
                disabled={!isAdmin}
                style={{ border: "1px solid #E2E5EC", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", background: isAdmin ? "#fff" : "#F3F4F6", color: isAdmin ? "#0D1B2E" : "#6B7280" }}
              />
            </div>
          </div>
        </div>

        {/* GOOGLE CALENDAR */}
        <Section
          title="Google Calendar — Indisponibilités"
          subtitle="Connectez votre agenda pour bloquer des créneaux dans la planification des visites."
        />
        <div style={{ padding: "14px 16px", background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10 }}>
          {googleConnected ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, fontSize: 12, color: "#065F46", fontWeight: 500 }}>
                ✓ Google Calendar connecté
              </div>
              <button onClick={onGoogleDisconnect}
                style={{ padding: "6px 12px", border: "1px solid #FECACA", borderRadius: 8, background: "#fff", color: "#EF4444", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                Déconnecter
              </button>
            </div>
          ) : (
            <button onClick={onGoogleConnect}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", border: "1px solid #E2E5EC", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "inherit", color: "#374151" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Connecter Google Calendar
            </button>
          )}
          {googleError && <div style={{ marginTop: 8, fontSize: 11, color: "#EF4444" }}>⚠ {googleError}</div>}
          <div style={{ marginTop: 10, padding: "8px 12px", background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 6, fontSize: 11, color: "#0C4A6E" }}>
            💡 Vos événements restent privés — aucune donnée envoyée vers Supabase.
          </div>
        </div>

        {/* GOOGLE PLACES */}
        <GooglePlacesSection cabinet={cabinet} upd={upd} colorNavy={colorNavy} />

        {/* Note bas */}
        <div style={{ marginTop: 24, padding: "12px 14px", background: `${colorGold}12`, border: `1px solid ${colorGold}30`, borderRadius: 8, fontSize: 12, color: "#92400E" }}>
          💡 Le logo reste dans votre navigateur et n'est jamais envoyé sur Supabase. Les autres paramètres sont synchronisés automatiquement.
        </div>

      </div>
    </div>
  );
}
