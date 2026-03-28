// src/components/SettingsPanel.tsx
// Paramètres cabinet Kleios — identité visuelle, coordonnées légales
// Sans shadcn/ui — architecture extensible
// Sync triple : localStorage + Supabase + (Electron si présent)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from "react";
import type { CabinetSettings } from "../types/crm";
import { BRAND } from "../constants";
import { supabase } from "../lib/supabase";

interface SettingsPanelProps {
  cabinet: CabinetSettings;
  userId: string;
  logoSrc: string | null;
  onUpdate: (updated: CabinetSettings) => void;
  onLogoChange: (src: string | null) => void;
  colorNavy: string;
  colorGold: string;
  googleConnected?: boolean;
  onGoogleConnect?: () => void;
  onGoogleDisconnect?: () => void;
  googleError?: string | null;
}

// ── Composants UI locaux ──────────────────────────────────────────────────────

function Section({ title }: { title: string }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.8px",
      textTransform: "uppercase",
      color: "#9CA3AF",
      paddingBottom: 8,
      borderBottom: "1px solid #E2E5EC",
      marginBottom: 14,
      marginTop: 24,
    }}>
      {title}
    </div>
  );
}

function Field({
  label, value, onChange, placeholder = "", type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          border: focused ? `1.5px solid #C9A84C` : "1px solid #E2E5EC",
          borderRadius: 8,
          padding: "8px 10px",
          fontSize: 13,
          color: "#0D1B2E",
          fontFamily: "inherit",
          outline: "none",
          background: "#fff",
          transition: "border-color 0.15s",
        }}
      />
    </div>
  );
}

function ColorPicker({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
    }}>
      <label style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: "3px solid #fff",
        boxShadow: "0 0 0 1px #E2E5EC",
        background: value,
        cursor: "pointer",
        display: "block",
        position: "relative",
      }}>
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ opacity: 0, position: "absolute", inset: 0, cursor: "pointer" }}
        />
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: 80,
          textAlign: "center",
          border: "1px solid #E2E5EC",
          borderRadius: 6,
          padding: "3px 6px",
          fontSize: 11,
          fontFamily: "monospace",
          color: "#0D1B2E",
          outline: "none",
        }}
      />
      <div style={{ fontSize: 10, color: "#9CA3AF", textAlign: "center", maxWidth: 80 }}>
        {label}
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

// ── Section Cal.com ───────────────────────────────────────────────────────────

import type { CalEventType } from "../types/crm";
import { CAL_DEFAULT_DURATIONS } from "../constants";

function CalComSection({ cabinet, upd, colorNavy, colorGold, userId }: {
  cabinet: import("../types/crm").CabinetSettings;
  upd: (key: keyof import("../types/crm").CabinetSettings, val: any) => void;
  colorNavy: string;
  colorGold: string;
  userId: string;
}) {
  const [testStatus, setTestStatus] = React.useState<"idle" | "loading" | "ok" | "error">("idle");
  const [testMsg, setTestMsg] = React.useState("");
  const [newType, setNewType] = React.useState<CalEventType>({
    id: "", label: "", slug: "", url: "", duration: 60, defaultChannel: "physique",
  });
  const [showAddForm, setShowAddForm] = React.useState(false);

  const handleTest = async () => {
    if (!cabinet.calApiKey) { setTestMsg("Entrez votre clé API Cal.com d'abord."); setTestStatus("error"); return; }
    setTestStatus("loading");
    try {
      const res = await fetch("https://api.cal.com/v2/event-types", {
        headers: { Authorization: `Bearer ${cabinet.calApiKey}`, "cal-api-version": "2024-06-14" },
      });
      if (res.ok) {
        const data = await res.json();
        const count = data?.data?.length ?? 0;
        setTestMsg(`✓ Connexion réussie — ${count} type(s) de RDV trouvé(s) · Sauvegarde automatique...`);
        setTestStatus("ok");
        // Auto-sauvegarde après test réussi
        try {
          const localKey = `${BRAND.storagePrefix}cabinet_${userId}`;
          localStorage.setItem(localKey, JSON.stringify(cabinet));
          await supabase.from("cabinet_settings").upsert({
            user_id: userId, settings: cabinet, updated_at: new Date().toISOString()
          });
          setTestMsg(`✓ Connexion réussie — ${count} type(s) de RDV · Paramètres sauvegardés`);
        } catch { /* non bloquant */ }
      } else {
        setTestMsg("Clé API invalide ou expirée.");
        setTestStatus("error");
      }
    } catch {
      setTestMsg("Erreur réseau.");
      setTestStatus("error");
    }
  };

  const handleAddType = () => {
    if (!newType.label || !newType.slug || !newType.url) return;
    const updated = [...(cabinet.calEventTypes ?? []), { ...newType, id: crypto.randomUUID() }];
    upd("calEventTypes", updated);
    setNewType({ id: "", label: "", slug: "", url: "", duration: 60, defaultChannel: "physique" });
    setShowAddForm(false);
  };

  const handleRemoveType = (id: string) => {
    upd("calEventTypes", (cabinet.calEventTypes ?? []).filter((t: CalEventType) => t.id !== id));
  };

  const inp = { border: "1px solid #E2E5EC", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontFamily: "inherit", outline: "none", background: "#fff", color: "#0D1B2E" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>
            Clé API Cal.com
            <a href="https://app.cal.com/settings/developer/api-keys" target="_blank"
              style={{ marginLeft: 6, fontSize: 10, color: colorNavy, textDecoration: "underline" }}>Obtenir →</a>
          </label>
          <input type="password" value={cabinet.calApiKey} onChange={e => upd("calApiKey", e.target.value)} placeholder="cal_live_xxxxxxxx" style={inp} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Username Cal.com</label>
          <input type="text" value={cabinet.calUsername} onChange={e => upd("calUsername", e.target.value)} placeholder="david-perry" style={inp} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={handleTest} disabled={testStatus === "loading"}
          style={{ padding: "7px 16px", border: `1px solid ${colorNavy}`, borderRadius: 8, background: "#fff", color: colorNavy, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
          {testStatus === "loading" ? "Test en cours..." : "Tester la connexion"}
        </button>
        {testMsg && (
          <span style={{ fontSize: 12, color: testStatus === "ok" ? "#065F46" : "#991B1B", background: testStatus === "ok" ? "#ECFDF5" : "#FEF2F2", padding: "5px 10px", borderRadius: 6 }}>
            {testMsg}
          </span>
        )}
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: colorNavy }}>Types de RDV Cal.com</div>
          <button onClick={() => setShowAddForm(v => !v)}
            style={{ padding: "5px 12px", border: "none", borderRadius: 6, background: colorNavy, color: "#fff", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            + Ajouter
          </button>
        </div>
        {(cabinet.calEventTypes ?? []).length === 0 && !showAddForm && (
          <div style={{ fontSize: 12, color: "#9CA3AF", padding: "10px 0" }}>Aucun type de RDV configuré.</div>
        )}
        {(cabinet.calEventTypes ?? []).map((t: CalEventType) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E5EC", background: "#F8F9FB", marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#0D1B2E" }}>{t.label}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>{t.duration}min · {t.defaultChannel} · {t.url}</div>
            </div>
            <button onClick={() => handleRemoveType(t.id)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
        ))}
        {showAddForm && (
          <div style={{ padding: 14, border: `1px solid ${colorGold}40`, borderRadius: 10, background: `${colorGold}08`, marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: colorNavy, marginBottom: 10 }}>Nouveau type de RDV</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={{ fontSize: 11, color: "#9CA3AF" }}>Libellé *</label>
                <input style={inp} value={newType.label} onChange={e => setNewType(p => ({ ...p, label: e.target.value }))} placeholder="Découverte patrimoniale" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={{ fontSize: 11, color: "#9CA3AF" }}>Slug Cal.com *</label>
                <input style={inp} value={newType.slug} onChange={e => setNewType(p => ({ ...p, slug: e.target.value }))} placeholder="decouverte" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 11, color: "#9CA3AF" }}>URL complète *</label>
                <input style={inp} value={newType.url} onChange={e => setNewType(p => ({ ...p, url: e.target.value }))} placeholder="https://cal.com/david-perry/decouverte" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={{ fontSize: 11, color: "#9CA3AF" }}>Durée</label>
                <select style={inp} value={newType.duration} onChange={e => setNewType(p => ({ ...p, duration: Number(e.target.value) }))}>
                  {CAL_DEFAULT_DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={{ fontSize: 11, color: "#9CA3AF" }}>Canal par défaut</label>
                <select style={inp} value={newType.defaultChannel} onChange={e => setNewType(p => ({ ...p, defaultChannel: e.target.value as any }))}>
                  <option value="physique">Physique</option>
                  <option value="visio">Visioconférence</option>
                  <option value="tel">Téléphone</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAddType} disabled={!newType.label || !newType.slug || !newType.url}
                style={{ padding: "7px 16px", border: "none", borderRadius: 8, background: (!newType.label || !newType.slug || !newType.url) ? "#D1D5DB" : colorNavy, color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                Ajouter ce type
              </button>
              <button onClick={() => setShowAddForm(false)}
                style={{ padding: "7px 16px", border: "1px solid #E2E5EC", borderRadius: 8, background: "#fff", color: "#4B5563", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: "10px 14px", background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8, fontSize: 11, color: "#0C4A6E" }}>
        <strong>Comment configurer :</strong>
        <ol style={{ margin: "6px 0 0", paddingLeft: 16, lineHeight: 1.7 }}>
          <li>Créez un compte sur <a href="https://cal.com" target="_blank" style={{ color: colorNavy }}>cal.com</a></li>
          <li>Settings → Developer → API Keys → Créer une clé</li>
          <li>Collez la clé ci-dessus et testez la connexion</li>
          <li>Pour chaque type de RDV, ajoutez son slug et son URL</li>
        </ol>
      </div>
    </div>
  );
}



// ── Section Google Places API ─────────────────────────────────────────────────

const SUPABASE_URL_GP  = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_GP = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const ENRICH_PROXY_GP  = `${SUPABASE_URL_GP}/functions/v1/enrich-entreprise`;

function GooglePlacesSection({ cabinet, upd, colorNavy, colorGold: _cg, userId: _uid }: {
  cabinet: import("../types/crm").CabinetSettings;
  upd: (key: keyof import("../types/crm").CabinetSettings, val: any) => void;
  colorNavy: string; colorGold: string; userId: string;
}) {
  const [visible,    setVisible]    = React.useState(false);
  const [testStatus, setTestStatus] = React.useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testError,  setTestError]  = React.useState("");

  const currentKey = (cabinet as any).googlePlacesApiKey ?? "";

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

  const inp: React.CSSProperties = {
    flex: 1, padding: "8px 10px", borderRadius: 8, fontFamily: "monospace",
    border: `1px solid ${testStatus === "ok" ? "#059669" : testStatus === "error" ? "#DC2626" : "#E2E5EC"}`,
    fontSize: 12, outline: "none", color: "#0D1B2E", background: "#fff",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ marginTop: 24 }}>
      <Section title="Google Places — Enrichissement prospection" />
      <div style={{ padding: "14px 16px", background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10, marginBottom: 4 }}>
        <div style={{ fontSize: 12, color: "#4B5563", marginBottom: 10, lineHeight: 1.6 }}>
          Permet de récupérer téléphone, site web et horaires lors de la prospection d'entreprises.
          Votre clé est utilisée directement — elle n'est jamais stockée sur nos serveurs.
          Google offre <strong>200 $/mois de crédit gratuit</strong> (≈ 70 000 enrichissements/mois).
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <input
            type={visible ? "text" : "password"}
            value={currentKey}
            onChange={e => { upd("googlePlacesApiKey" as any, e.target.value); setTestStatus("idle"); }}
            placeholder="AIzaSy..."
            style={inp}
            autoComplete="off"
            spellCheck={false}
          />
          <button onClick={() => setVisible(v => !v)} title={visible ? "Masquer" : "Afficher"}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #E2E5EC", background: "#F9FAFB", color: "#6B7280", cursor: "pointer", fontSize: 14, flexShrink: 0 }}>
            {visible ? "🙈" : "👁"}
          </button>
          <button onClick={handleTest} disabled={testStatus === "testing" || !currentKey.trim()}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: testStatus === "testing" || !currentKey.trim() ? "#D1D5DB" : colorNavy, color: "#fff", fontSize: 12, fontWeight: 500, cursor: !currentKey.trim() ? "default" : "pointer", fontFamily: "inherit", flexShrink: 0, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
            {testStatus === "testing" ? (
              <><span style={{ display: "inline-block", width: 11, height: 11, border: "1.5px solid rgba(255,255,255,0.5)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Test…</>
            ) : "● Tester la clé"}
          </button>
        </div>
        {testStatus === "ok" && (
          <div style={{ padding: "8px 12px", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, fontSize: 12, color: "#065F46", fontWeight: 500 }}>
            ✅ Clé valide — enrichissement téléphone + site web + horaires opérationnel
          </div>
        )}
        {testStatus === "error" && (
          <div style={{ padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: 12, color: "#991B1B" }}>
            ❌ {testError}
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>Vérifiez que Places API (New) est activée dans votre projet Google Cloud.</div>
          </div>
        )}
        {!currentKey.trim() && testStatus === "idle" && (
          <div style={{ fontSize: 11, color: "#9CA3AF" }}>
            Sans clé, l'enrichissement fonctionne uniquement via OpenStreetMap (couverture partielle).
          </div>
        )}
        <div style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <a href="https://console.cloud.google.com/apis/library/places-backend.googleapis.com" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: colorNavy, fontWeight: 500 }}>
            → Activer Places API (New) sur Google Cloud ↗
          </a>
          <a href="https://console.cloud.google.com/billing/budgets" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: "#D97706", fontWeight: 500 }}>
            → Configurer un budget d'alerte (recommandé : 50 $) ↗
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Section taux commissions ────────────────────────────────────────────────
interface CommissionRate {
  insurer: string;
  entree: string;      // % entrée
  gestion: string;     // % gestion annuelle
  arbitrage: string;   // % arbitrage
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CommissionRatesSection({ cabinet, upd, colorNavy, colorGold: _cg }: {
  cabinet: any; upd: (key: any, val: any) => void; colorNavy: string; colorGold: string;
}) {
  const rates: CommissionRate[] = cabinet.commissionRates ?? [];
  const [newInsurer, setNewInsurer] = React.useState("");

  const addRate = () => {
    if (!newInsurer.trim()) return;
    const updated = [...rates, { insurer: newInsurer.trim(), entree: "", gestion: "", arbitrage: "" }];
    upd("commissionRates", updated);
    setNewInsurer("");
  };

  const updateRate = (i: number, key: keyof CommissionRate, val: string) => {
    const updated = rates.map((r, idx) => idx === i ? { ...r, [key]: val } : r);
    upd("commissionRates", updated);
  };

  const removeRate = (i: number) => {
    upd("commissionRates", rates.filter((_, idx) => idx !== i));
  };

  const inp: React.CSSProperties = {
    border: "1px solid rgba(11,48,64,0.14)", borderRadius: 7,
    padding: "5px 8px", fontSize: 11, fontFamily: "inherit",
    color: "#0B3040", background: "#F6F8FA", outline: "none", width: "100%",
  };

  return (
    <div style={{ marginBottom: 12 }}>
      {rates.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
          <thead>
            <tr style={{ background: "rgba(11,48,64,0.03)" }}>
              {["Assureur","Entrée (%)","Gestion (%/an)","Arbitrage (%)",""].map(h => (
                <th key={h} style={{ padding: "6px 10px", fontSize: 10, fontWeight: 600, color: "#5B82A6", textAlign: "left", letterSpacing: 0.3, borderBottom: "1px solid rgba(11,48,64,0.08)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rates.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid rgba(11,48,64,0.05)" }}>
                <td style={{ padding: "5px 10px", fontWeight: 500, color: colorNavy, fontSize: 12 }}>{r.insurer}</td>
                <td style={{ padding: "5px 10px" }}><input value={r.entree} onChange={e => updateRate(i, "entree", e.target.value)} placeholder="ex: 3.0" style={inp} /></td>
                <td style={{ padding: "5px 10px" }}><input value={r.gestion} onChange={e => updateRate(i, "gestion", e.target.value)} placeholder="ex: 0.5" style={inp} /></td>
                <td style={{ padding: "5px 10px" }}><input value={r.arbitrage} onChange={e => updateRate(i, "arbitrage", e.target.value)} placeholder="ex: 0.3" style={inp} /></td>
                <td style={{ padding: "5px 10px" }}>
                  <button onClick={() => removeRate(i)} style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(220,38,38,0.20)", background: "#fff", fontSize: 10, cursor: "pointer", color: "#DC2626", fontFamily: "inherit" }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input value={newInsurer} onChange={e => setNewInsurer(e.target.value)} placeholder="Nom de l'assureur (ex: Swiss Life)"
          onKeyDown={e => e.key === "Enter" && addRate()}
          style={{ ...inp, flex: 1 }} />
        <button onClick={addRate} style={{ padding: "5px 14px", borderRadius: 7, border: "none", background: colorNavy, color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          + Ajouter
        </button>
      </div>
    </div>
  );
}

export function SettingsPanel({
  cabinet, userId, logoSrc,
  onUpdate, onLogoChange,
  colorNavy, colorGold,
  googleConnected = false,
  onGoogleConnect,
  onGoogleDisconnect,
  googleError,
}: SettingsPanelProps) {

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Mise à jour d'un champ
  const upd = useCallback((key: keyof CabinetSettings, val: string) => {
    onUpdate({ ...cabinet, [key]: val });
  }, [cabinet, onUpdate]);

  // Sauvegarde dans Supabase + localStorage
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // 1. localStorage
      const localKey = `${BRAND.storagePrefix}cabinet_${userId}`;
      localStorage.setItem(localKey, JSON.stringify(cabinet));

      // 2. Supabase
      const { error } = await supabase
        .from("cabinet_settings")
        .upsert({ user_id: userId, settings: cabinet, updated_at: new Date().toISOString() });

      if (error) throw error;
      setSaveMsg({ text: "Paramètres sauvegardés ✓", ok: true });
    } catch (e: any) {
      setSaveMsg({ text: `Erreur : ${e.message}`, ok: false });
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(null), 3000);
  }, [cabinet, userId]);

  // Upload logo
  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      onLogoChange(src);
      // Sauvegarder le logo en localStorage (jamais en Supabase — trop volumineux)
      localStorage.setItem(`${BRAND.storagePrefix}logo_${userId}`, src);
    };
    reader.readAsDataURL(file);
  }, [userId, onLogoChange]);

  // Supprimer logo
  const handleRemoveLogo = useCallback(() => {
    onLogoChange(null);
    localStorage.removeItem(`${BRAND.storagePrefix}logo_${userId}`);
  }, [userId, onLogoChange]);

  return (
    <div style={{ maxWidth: 800 }}>

      {/* ── En-tête ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
      }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: colorNavy, margin: 0 }}>
            Paramètres cabinet
          </h2>
          <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
            Identité visuelle et coordonnées légales
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "8px 20px",
            border: "none",
            borderRadius: 8,
            background: saving ? "#D1D5DB" : colorNavy,
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>
      </div>

      {/* Message confirmation */}
      {saveMsg && (
        <div style={{
          padding: "10px 14px",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 500,
          marginBottom: 16,
          background: saveMsg.ok ? "#ECFDF5" : "#FEF2F2",
          color: saveMsg.ok ? "#065F46" : "#991B1B",
          border: `1px solid ${saveMsg.ok ? "#A7F3D0" : "#FECACA"}`,
        }}>
          {saveMsg.text}
        </div>
      )}

      {/* ── Carte principale ── */}
      <div style={{
        background: "#fff",
        border: "1px solid #E2E5EC",
        borderRadius: 12,
        padding: "20px 24px",
      }}>

        {/* ── LOGO ── */}
        <Section title="Logo du cabinet" />
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 8 }}>
          {/* Aperçu logo */}
          <div style={{
            width: 100,
            height: 70,
            borderRadius: 10,
            border: "1px solid #E2E5EC",
            background: "#F8F9FB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}>
            {logoSrc ? (
              <img src={logoSrc} alt="Logo" style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}/>
            ) : (
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>Aucun logo</div>
            )}
          </div>

          {/* Boutons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              border: `1px solid ${colorNavy}`,
              background: colorNavy,
              color: "#fff",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}>
              ↑ Charger un logo
              <input
                type="file"
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={handleLogoUpload}
              />
            </label>
            {logoSrc && (
              <button
                onClick={handleRemoveLogo}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "1px solid #FCA5A5",
                  background: "#fff",
                  color: "#DC2626",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Supprimer le logo
              </button>
            )}
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
              PNG, SVG, JPEG, WebP — fond transparent recommandé
            </p>
          </div>
        </div>

        {/* ── COULEURS ── */}
        <Section title="Couleurs (UI + PDF)" />
        <div style={{
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          marginBottom: 8,
        }}>
          <ColorPicker
            label="Couleur principale"
            value={cabinet.colorNavy}
            onChange={v => upd("colorNavy", v)}
          />
          <ColorPicker
            label="Couleur accent (or)"
            value={cabinet.colorGold}
            onChange={v => upd("colorGold", v)}
          />
          <ColorPicker
            label="Fond de page"
            value={cabinet.colorBg}
            onChange={v => upd("colorBg", v)}
          />
        </div>
        <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 0 }}>
          Ces couleurs s'appliquent à l'interface et aux documents PDF générés.
        </p>

        {/* ── IDENTITÉ CABINET ── */}
        <Section title="Identité du cabinet & emails" />
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 4,
        }}>
          <Field label="Nom du cabinet *"     value={cabinet.cabinetName} onChange={v => upd("cabinetName", v)} placeholder="EcoPatrimoine Conseil" />
          <Field label="Email du cabinet"       value={cabinet.email}       onChange={v => upd("email", v)}       placeholder="contact@..." type="email" />
          <Field label="Nom expéditeur (emails)" value={cabinet.senderName ?? ""} onChange={v => upd("senderName", v)} placeholder="David Perry — EcoPatrimoine Conseil" />
          <Field label="Email expéditeur (emails marketing)" value={cabinet.senderEmail ?? ""} onChange={v => upd("senderEmail", v)} placeholder="david.perry@..." type="email" />
          <Field label="Téléphone"            value={cabinet.phone}       onChange={v => upd("phone", v)}       placeholder="+33 6 ..." type="tel" />
          <Field label="Site web"             value={cabinet.website}     onChange={v => upd("website", v)}     placeholder="https://..." />
        </div>

        {/* ── ADRESSE ── */}
        <Section title="Adresse" />
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr",
          gap: 12,
          marginBottom: 4,
        }}>
          <Field label="Adresse"       value={cabinet.address}    onChange={v => upd("address", v)}    placeholder="12 rue du Castellas" />
          <Field label="Code postal"   value={cabinet.postalCode} onChange={v => upd("postalCode", v)} placeholder="13008" />
          <Field label="Ville"         value={cabinet.city}       onChange={v => upd("city", v)}       placeholder="Marseille" />
        </div>

        {/* ── MENTIONS LÉGALES ── */}
        <Section title="Mentions légales & conformité" />
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 4,
        }}>
          <Field label="N° ORIAS"           value={cabinet.orias}    onChange={v => upd("orias", v)}    placeholder="ex: 12 345 678" />
          <Field label="Assureur RCP"        value={cabinet.rcp}      onChange={v => upd("rcp", v)}      placeholder="ex: Covéa Risks" />
          <Field label="Médiateur"           value={cabinet.mediateur} onChange={v => upd("mediateur", v)} placeholder="ex: La Médiation de l'Assurance" />
        </div>

        {/* ── SIGNATURE ÉLECTRONIQUE ── */}
        <Section title="Taux de commissions par assureur" />
        <div style={{ fontSize: 11, color: "#8FAAB6", marginBottom: 10 }}>
          Ces taux servent à estimer vos commissions théoriques par rapport aux montants réellement reçus.
        </div>
        <CommissionRatesSection cabinet={cabinet} upd={upd} colorNavy={colorNavy} colorGold={colorGold} />

        <Section title="Signature électronique (optionnel)" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Fournisseur</label>
            <select value={cabinet.signatureProvider} onChange={e => upd("signatureProvider", e.target.value)}
              style={{ border: "1px solid #E2E5EC", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff", color: "#0D1B2E" }}>
              <option value="none">Aucun</option>
              <option value="yousign">Yousign</option>
              <option value="docusign">DocuSign</option>
              <option value="hellosign">HelloSign</option>
            </select>
          </div>
          {cabinet.signatureProvider !== "none" && (
            <Field label={`Clé API ${cabinet.signatureProvider}`} value={cabinet.signatureApiKey}
              onChange={v => upd("signatureApiKey", v)} placeholder="sk_live_..." type="password" />
          )}
        </div>

        {/* ── CAL.COM — PRISE DE RDV ── */}
        <Section title="Cal.com — Prise de rendez-vous" />

        {/* Sélecteur de provider */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Outil de prise de RDV</label>
            <select value={cabinet.rdvProvider} onChange={e => upd("rdvProvider", e.target.value)}
              style={{ border: "1px solid #E2E5EC", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff", color: "#0D1B2E" }}>
              <option value="none">Aucun</option>
              <option value="cal">Cal.com (recommandé)</option>
              <option value="calendly">Calendly</option>
              <option value="custom">URL personnalisée</option>
            </select>
          </div>
          {cabinet.rdvProvider !== "none" && cabinet.rdvProvider !== "cal" && (
            <Field label="URL de prise de RDV" value={cabinet.rdvUrl}
              onChange={v => upd("rdvUrl", v)} placeholder="https://..." />
          )}
        </div>

        {/* Section Cal.com spécifique */}
        {cabinet.rdvProvider === "cal" && (
          <CalComSection cabinet={cabinet} upd={upd} colorNavy={colorNavy} colorGold={colorGold} userId={userId} />
        )}

        {/* ── GOOGLE CALENDAR ── */}
        <div style={{ marginTop: 24 }}>
          <Section title="Google Calendar — Indisponibilités" />
          <div style={{ marginTop: 12, padding: "14px 16px", background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10 }}>
            <div style={{ fontSize: 12, color: "#4B5563", marginBottom: 12, lineHeight: 1.6 }}>
              Connectez votre Google Calendar pour afficher vos indisponibilités (cours, RDVs perso, blocages) dans la grille de prise de RDV.
            </div>
            {googleConnected ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, fontSize: 12, color: "#065F46", fontWeight: 500 }}>
                  ✓ Google Calendar connecté
                </div>
                <button onClick={onGoogleDisconnect} style={{ padding: "6px 12px", border: "1px solid #FECACA", borderRadius: 8, background: "#fff", color: "#EF4444", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  Déconnecter
                </button>
              </div>
            ) : (
              <button onClick={onGoogleConnect} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", border: "1px solid #E2E5EC", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "inherit", color: "#374151" }}>
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
        </div>

        {/* ── GOOGLE PLACES API ── */}
        <GooglePlacesSection cabinet={cabinet} upd={upd} colorNavy={colorNavy} colorGold={colorGold} userId={userId} />

        {/* Note */}
        <div style={{
          marginTop: 20,
          padding: "12px 14px",
          background: `${colorGold}12`,
          border: `1px solid ${colorGold}30`,
          borderRadius: 8,
          fontSize: 12,
          color: "#92400E",
        }}>
          💡 Le logo n'est jamais envoyé sur Supabase — il reste dans votre navigateur et sur votre machine.
          Les autres paramètres sont synchronisés sur tous vos appareils.
        </div>
      </div>
    </div>
  );
}
