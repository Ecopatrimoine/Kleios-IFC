// src/components/AdminDashboard.tsx — Kleios IFC
import { useState, useRef, useEffect } from "react";
import { useAdminDashboard, ROLE_LABELS, ROLE_COLORS } from "../hooks/useAdmin";
import type { UserRole } from "../hooks/useAdmin";
import type { AdminUser } from "../hooks/useAdmin";

interface AdminDashboardProps {
  colorNavy: string;
  colorGold?: string;
  onClose: () => void;
}

const IFC_SCHOOLS = [
  "IFC Perpignan","IFC Montpellier","IFC Nîmes","IFC Avignon","IFC Marseille",
  "IFC Alès","IFC Saint-Étienne","IFC Valence","IFC Clermont-Ferrand","Westford School of Management",
];
const ORANGE = "#F26522";
const NAVY   = "#1A2E44";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function daysLeft(iso: string | null | undefined) {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

function LicenceBadge({ user }: { user: AdminUser }) {
  const lic = user.licence;
  if (!lic || lic.status === "none") return <span style={{ fontSize: 11, color: "#9CA3AF" }}>Sans licence</span>;
  const configs: Record<string, { bg: string; color: string; label: string }> = {
    "trial-active":    { bg: "#DBEAFE", color: "#1D4ED8", label: `Essai — ${daysLeft(lic.trial_end)}j` },
    "trial-expired":   { bg: "#FEE2E2", color: "#991B1B", label: "Essai expiré" },
    "lifetime-active": { bg: "#F5F3FF", color: "#5B21B6", label: "Lifetime ∞" },
    "admin-active":    { bg: `${ORANGE}18`, color: ORANGE, label: "Admin" },
    "paid-active":     { bg: "#D1FAE5", color: "#065F46", label: "Actif" },
    "inactive":        { bg: "#F3F4F6", color: "#6B7280", label: "Inactif" },
    "cancelled":       { bg: "#FEE2E2", color: "#991B1B", label: "Révoqué" },
  };
  const key = lic.status === "cancelled" ? "cancelled" : (lic.status as string) === "inactive" ? "inactive" : `${lic.type}-${lic.status}`;
  const cfg = configs[key] ?? { bg: "#F3F4F6", color: "#6B7280", label: lic.type ?? "—" };
  return (
    <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
      {cfg.label}
    </span>
  );
}

function ActionsMenu({ user, onLifetime, onActivate, onRevoke, onExtend, onReset, onDelete, onContact }: {
  user: AdminUser; onLifetime: () => void; onActivate: () => void; onRevoke: () => void;
  onExtend: () => void; onReset: () => void; onDelete: () => void; onContact: () => void;
}) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!pos) return;
    const close = (e: MouseEvent) => {
      const el = document.getElementById("actions-dropdown");
      if (el && !el.contains(e.target as Node) && e.target !== btnRef.current) setPos(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [pos]);

  const toggle = () => {
    if (pos) { setPos(null); return; }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  const lic = user.licence;
  const isActive = lic?.status === "active";
  const isLifetime = lic?.type === "lifetime";
  const isTrial = lic?.type === "trial";
  const isInactive = !isActive;
  const items = [
    { label: "✓ Activer la licence", color: "#059669", action: onActivate, show: isInactive },
    { label: "∞ Passer en Lifetime", color: "#7C3AED", action: onLifetime, show: !isLifetime },
    { label: "+15j Prolonger essai", color: "#2563EB", action: onExtend,   show: isTrial },
    { label: "✕ Révoquer",          color: "#DC2626", action: onRevoke,   show: isActive, div: true },
    { label: "🔑 Réinitialiser MDP",color: "#D97706", action: onReset,    show: true },
    { label: "✉ Contacter",         color: "#0EA5E9", action: onContact,  show: !!user.email },
    { label: "🗑 Supprimer compte", color: "#DC2626", action: onDelete,   show: true, div: true },
  ].filter(i => i.show) as { label: string; color: string; action: () => void; div?: boolean }[];

  return (
    <>
      <button ref={btnRef} onClick={toggle} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(26,46,68,0.15)", background: pos ? "#F3F4F6" : "#fff", cursor: "pointer", fontSize: 16, color: "#6B7280", fontFamily: "inherit" }}>⋯</button>
      {pos && (
        <div id="actions-dropdown" style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 99999, background: "#fff", border: "1px solid rgba(26,46,68,0.12)", borderRadius: 10, boxShadow: "0 8px 30px rgba(26,46,68,0.25)", minWidth: 210, overflow: "hidden" }}>
          {items.map((item, i) => (
            <div key={i}>
              {item.div && i > 0 && <div style={{ height: 1, background: "#F3F4F6", margin: "2px 0" }} />}
              <button onClick={() => { item.action(); setPos(null); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", background: "none", border: "none", fontSize: 13, fontFamily: "inherit", cursor: "pointer", color: item.color, fontWeight: 500 }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F9FAFB")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function CreateModal({ onCreate, onClose }: { onCreate: (d: any) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", school: "", role: "rre" as UserRole, licence_type: "lifetime" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const inp: React.CSSProperties = { width: "100%", padding: "8px 11px", borderRadius: 7, fontSize: 13, border: "1px solid rgba(26,46,68,0.15)", fontFamily: "inherit", outline: "none", color: NAVY, background: "#F9FAFB" };
  const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "#4A7FA5", letterSpacing: 0.4, display: "block", marginBottom: 4 };
  const submit = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.school) { setErr("Tous les champs sont obligatoires."); return; }
    setLoading(true); setErr("");
    await onCreate(form);
    setLoading(false);
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,46,68,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 460, boxShadow: "0 20px 60px rgba(26,46,68,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>Créer un compte</div>
            <div style={{ fontSize: 12, color: "#7A9AB0", marginTop: 3 }}>Un email d'invitation sera envoyé pour définir le mot de passe</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9CA3AF", padding: 0 }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}><label style={lbl}>PRÉNOM</label><input value={form.first_name} onChange={e => upd("first_name", e.target.value)} placeholder="Prénom" style={inp} /></div>
          <div style={{ flex: 1 }}><label style={lbl}>NOM</label><input value={form.last_name} onChange={e => upd("last_name", e.target.value)} placeholder="Nom" style={inp} /></div>
        </div>
        <div style={{ marginBottom: 14 }}><label style={lbl}>EMAIL</label><input type="email" value={form.email} onChange={e => upd("email", e.target.value)} placeholder="prenom.nom@ifc.fr" style={inp} /></div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>CAMPUS</label>
          <select value={form.school} onChange={e => upd("school", e.target.value)} style={{ ...inp, appearance: "none", cursor: "pointer" }}>
            <option value="">— Sélectionner un campus —</option>
            {IFC_SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>RÔLE</label>
          <select value={form.role} onChange={e => upd("role", e.target.value)} style={{ ...inp, appearance: "none", cursor: "pointer" }}>
            <option value="rre">RRE — Responsable Relations Entreprises</option>
            <option value="directeur">Directeur — Vue tous campus, agit sur son campus</option>
            <option value="super_directeur">Super Directeur — Accès complet tous campus</option>
          </select>
          <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>
            {form.role === "rre" && "Voit tous les campus en lecture · agit uniquement pour lui-même"}
            {form.role === "directeur" && "Consulte tous les campus · modifie uniquement son campus"}
            {form.role === "super_directeur" && "Accès illimité sur tous les centres IFC"}
          </div>
        </div>
        <div style={{ marginBottom: 22 }}>
          <label style={lbl}>LICENCE</label>
          <select value={form.licence_type} onChange={e => upd("licence_type", e.target.value)} style={{ ...inp, appearance: "none", cursor: "pointer" }}>
            <option value="trial">Essai (15 jours)</option>
            <option value="lifetime">Lifetime — Accès complet</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {err && <div style={{ fontSize: 12, color: "#DC2626", marginBottom: 12 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 7, border: "1px solid rgba(26,46,68,0.15)", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "#6B7280" }}>Annuler</button>
          <button onClick={submit} disabled={loading} style={{ padding: "9px 22px", borderRadius: 7, border: "none", background: loading ? "#ccc" : ORANGE, color: "#fff", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {loading ? "Création..." : "Créer le compte →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard({ colorNavy: _cn, colorGold: _cg, onClose }: AdminDashboardProps) {
  const { users, loading, error, fetchUsers, setLifetime, revokeLicence, extendTrial, resetUserPassword, deleteAccount, createUser, setUserRoleAction: changeRole } = useAdminDashboard(true);
  const [toast, setToast]           = useState<{ text: string; ok: boolean } | null>(null);
  const [search, setSearch]         = useState("");
  const [filterSchool, setFilterSchool] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const notify = (text: string, ok: boolean) => { setToast({ text, ok }); setTimeout(() => setToast(null), 3500); };

  const handleLifetime = async (u: AdminUser) => { const ok = await setLifetime(u.id); notify(ok ? `✓ ${u.first_name || u.email} → Lifetime` : "Erreur", ok); };

  const handleActivate = async (u: AdminUser) => {
    const { supabase } = await import("../lib/supabase");
    const { error: e } = await supabase.from("kleios_licences").update({ status: "active", type: "lifetime", trial_end: null }).eq("user_id", u.id);
    if (!e) { await fetchUsers(); notify(`✓ ${u.first_name || u.email} activé`, true); } else notify("Erreur", false);
  };

  const handleRevoke  = async (u: AdminUser) => { const ok = await revokeLicence(u.id); notify(ok ? `✓ Révoqué` : "Erreur", ok); };
  const handleExtend  = async (u: AdminUser) => { const ok = await extendTrial(u.id, 15); notify(ok ? `✓ +15j` : "Erreur", ok); };
  const handleReset   = async (u: AdminUser) => { const ok = await resetUserPassword(u.email); notify(ok ? `✓ Email envoyé à ${u.email}` : "Erreur", ok); };
  const handleChangeRole = async (userId: string, role: string) => { const ok = await changeRole(userId, role as any); notify(ok ? "✓ Rôle mis à jour" : "Erreur", ok); };
  const handleDelete  = async (u: AdminUser) => { const r = await deleteAccount(u.id); setConfirmDelete(null); notify(r.message, r.success); };
  const handleCreate  = async (data: any)    => { const r = await createUser(data); notify(r.message, r.success); if (r.success) setShowCreate(false); };

  const filtered = users.filter(u => {
    const s = (`${u.first_name} ${u.last_name} ${u.email} ${u.school}`).toLowerCase().includes(search.toLowerCase());
    const sc = filterSchool === "all" || u.school === filterSchool;
    return s && sc;
  });

  const stats = {
    total:    users.length,
    actifs:   users.filter(u => u.licence?.status === "active").length,
    lifetime: users.filter(u => u.licence?.type === "lifetime").length,
    inactifs: users.filter(u => !u.licence || u.licence.status !== "active").length,
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,46,68,0.60)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 500, backdropFilter: "blur(3px)", overflowY: "auto", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 900, background: "#F4F5F7", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 80px rgba(26,46,68,0.30)" }}>

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #2A4A6B 100%)`, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `3px solid ${ORANGE}` }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Administration</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Gestion des comptes et licences Kleios IFC</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowCreate(true)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: ORANGE, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 3px 12px rgba(242,101,34,0.40)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Créer un compte
            </button>
            <button onClick={() => fetchUsers()} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.10)", color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>↻</button>
            <button onClick={onClose} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.10)", color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {toast && (
            <div style={{ padding: "10px 16px", borderRadius: 8, fontSize: 12, fontWeight: 500, marginBottom: 16, background: toast.ok ? "#ECFDF5" : "#FEF2F2", color: toast.ok ? "#065F46" : "#991B1B", border: `1px solid ${toast.ok ? "#A7F3D0" : "#FECACA"}` }}>
              {toast.text}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Comptes total",    value: stats.total,    color: NAVY },
              { label: "Licences actives", value: stats.actifs,   color: "#059669" },
              { label: "Lifetime",         value: stats.lifetime, color: "#7C3AED" },
              { label: "Inactifs",         value: stats.inactifs, color: "#DC2626" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", border: "1px solid rgba(26,46,68,0.08)", borderRadius: 10, padding: "14px 16px", textAlign: "center", boxShadow: "0 1px 4px rgba(26,46,68,0.05)" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filtres */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, email..."
              style={{ flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(26,46,68,0.15)", fontFamily: "inherit", outline: "none", background: "#fff" }} />
            <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(26,46,68,0.15)", fontFamily: "inherit", outline: "none", background: "#fff", cursor: "pointer", minWidth: 200 }}>
              <option value="all">Tous les campus</option>
              {IFC_SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Liste */}
          <div style={{ background: "#fff", border: "1px solid rgba(26,46,68,0.08)", borderRadius: 12, boxShadow: "0 1px 6px rgba(26,46,68,0.06)" }}>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(26,46,68,0.08)", background: "rgba(214,228,242,0.30)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{filtered.length} compte{filtered.length > 1 ? "s" : ""}</span>
            </div>
            {loading && <div style={{ padding: "30px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Chargement...</div>}
            {error && <div style={{ padding: "20px", textAlign: "center", color: "#DC2626", fontSize: 13 }}>{error}</div>}
            {!loading && filtered.length === 0 && <div style={{ padding: "30px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Aucun compte</div>}

            {filtered.map((u, i) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderBottom: i < filtered.length - 1 ? "1px solid rgba(26,46,68,0.06)" : "none", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F9FAFB")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${ORANGE}15`, border: `1px solid ${ORANGE}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: ORANGE, flexShrink: 0 }}>
                  {(`${u.first_name || ""} ${u.last_name || ""}`).trim().slice(0, 2).toUpperCase() || u.email.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{u.email}</div>
                </div>
                <div style={{ minWidth: 160 }}>
                  {u.role && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10,
                      background: `${ROLE_COLORS[u.role as UserRole] ?? "#9CA3AF"}15`,
                      color: ROLE_COLORS[u.role as UserRole] ?? "#9CA3AF",
                      border: `1px solid ${ROLE_COLORS[u.role as UserRole] ?? "#9CA3AF"}30`,
                      marginRight: 4,
                    }}>
                      {ROLE_LABELS[u.role as UserRole] ?? u.role}
                    </span>
                  )}
                  {u.school ? (
                    <span style={{ fontSize: 11, fontWeight: 500, color: ORANGE, background: `${ORANGE}12`, border: `1px solid ${ORANGE}22`, padding: "2px 8px", borderRadius: 10 }}>
                      {u.school.replace("IFC ", "")}
                    </span>
                  ) : <span style={{ fontSize: 11, color: "#ccc" }}>—</span>}
                </div>
                <div style={{ minWidth: 120, textAlign: "right" }}>
                  <LicenceBadge user={u} />
                  {u.licence?.trial_end && u.licence.type === "trial" && (
                    <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>Expire {formatDate(u.licence.trial_end)}</div>
                  )}
                </div>
                <div style={{ minWidth: 90, textAlign: "right", fontSize: 11, color: "#9CA3AF" }}>{formatDate(u.created_at)}</div>
                <select
                  value={u.role ?? "rre"}
                  onChange={e => handleChangeRole(u.id, e.target.value)}
                  style={{ fontSize: 10, padding: "3px 7px", borderRadius: 6, border: "1px solid #E2E5EC", background: "#F9FAFB", color: "#374151", cursor: "pointer", fontFamily: "inherit", marginRight: 8 }}
                  title="Changer le rôle"
                >
                  <option value="rre">RRE</option>
                  <option value="directeur">Directeur</option>
                  <option value="super_directeur">Super Directeur</option>
                </select>
                <ActionsMenu user={u} onLifetime={() => handleLifetime(u)} onActivate={() => handleActivate(u)} onRevoke={() => handleRevoke(u)} onExtend={() => handleExtend(u)} onReset={() => handleReset(u)} onDelete={() => setConfirmDelete(u)} onContact={() => window.location.href = `mailto:${u.email}`} />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, padding: "9px 14px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8, fontSize: 11, color: "#92400E" }}>
            ⚠ La suppression efface les données Kleios mais pas le compte auth Supabase.
          </div>
        </div>
      </div>

      {/* Modal suppression */}
      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 28, width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#DC2626", marginBottom: 12 }}>Supprimer le compte</div>
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 24, lineHeight: 1.5 }}>
              Supprimer toutes les données de <strong>{[confirmDelete.first_name, confirmDelete.last_name].filter(Boolean).join(" ") || confirmDelete.email}</strong> ?<br/>Cette action est irréversible.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: "8px 16px", borderRadius: 7, border: "1px solid #E5E7EB", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={() => handleDelete(confirmDelete)} style={{ padding: "8px 16px", borderRadius: 7, border: "none", background: "#DC2626", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal création */}
      {showCreate && <CreateModal onCreate={handleCreate} onClose={() => setShowCreate(false)} />}
    </div>
  );
}
