// src/components/DashboardRRE.tsx
// Tableau de bord RRE — "Que faire aujourd'hui ?"
// Design : ops-dashboard, dense mais lisible, couleurs IFC
// ─────────────────────────────────────────────────────────

import { useMemo } from "react";
import type { ContactRecord } from "../types/crm";

interface DashboardRREProps {
  contacts: ContactRecord[];
  userId: string;
  colorNavy: string;
  colorGold: string;
  campusRRE?: string;
  userRole?: string;
  objectifVisitesMois?: number;
  onNavigate: (view: string) => void;
  onOpenContact?: (record: ContactRecord) => void;
}

// ── Loaders localStorage ──────────────────────────────────

function loadVisites(userId: string): any[] {
  try { return JSON.parse(localStorage.getItem(`kleios_ifc_visites_${userId}`) ?? "[]"); } catch { return []; }
}
function loadPipeline(userId: string): any[] {
  try { return JSON.parse(localStorage.getItem(`kleios_ifc_pipeline_${userId}`) ?? "[]"); } catch { return []; }
}
function loadAgenda(userId: string): any[] {
  try { return JSON.parse(localStorage.getItem(`kleios_ifc_agenda_${userId}`) ?? "[]"); } catch { return []; }
}

// ── Helpers ───────────────────────────────────────────────

function joursDepuis(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
function joursAvant(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}
function jourSemaine(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}
function heure(hhmm: string): string { return hhmm?.slice(0, 5) ?? ""; }

const TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  visite:   { label: "Visite tuteur",    color: "#E8722A", icon: "🏢" },
  relance:  { label: "Relance",          color: "#B8860B", icon: "📞" },
  prospect: { label: "RDV prospect",     color: "#3B82F6", icon: "🔍" },
  externe:  { label: "Événement",        color: "#7C3AED", icon: "📅" },
};

// ── Composants atomiques ──────────────────────────────────

function AlertBadge({ count, label, color, icon, onClick }: {
  count: number; label: string; color: string; icon: string; onClick: () => void;
}) {
  if (count === 0) return null;
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 16px", borderRadius: 10,
      border: `1.5px solid ${color}30`,
      background: `${color}08`,
      cursor: "pointer", fontFamily: "inherit", textAlign: "left",
      transition: "all 0.15s",
      animation: "fadeSlide 0.3s ease both",
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${color}14`; (e.currentTarget as HTMLElement).style.borderColor = `${color}50`; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${color}08`; (e.currentTarget as HTMLElement).style.borderColor = `${color}30`; }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${color}18`, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontSize: 18, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{count}</div>
        <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2, fontWeight: 500 }}>{label}</div>
      </div>
      <div style={{ marginLeft: "auto", color: `${color}60`, fontSize: 16 }}>›</div>
    </button>
  );
}

function StatCard({ value, label, sub, color, icon, animDelay = 0, onClick }: {
  value: string | number; label: string; sub?: string;
  color: string; icon: string; animDelay?: number; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      background: "#fff", borderRadius: 14, padding: "20px 22px",
      border: "1px solid rgba(0,0,0,0.06)",
      boxShadow: "0 2px 10px rgba(0,0,0,0.08), 0 0 0 0 transparent",
      cursor: onClick ? "pointer" : "default",
      transition: "all 0.18s",
      animation: `fadeSlide 0.4s ease ${animDelay}ms both`,
      position: "relative" as const, overflow: "hidden",
    }}
    onMouseEnter={e => onClick && ((e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px ${color}20`)}
    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.05), 0 0 0 0 transparent")}
    >
      {/* Fond décoratif */}
      <div style={{
        position: "absolute", top: -12, right: -12, width: 64, height: 64,
        borderRadius: "50%", background: `${color}10`,
        pointerEvents: "none",
      }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${color}15`, display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>{icon}</div>
        {onClick && <div style={{ fontSize: 11, color: "#9CA3AF" }}>›</div>}
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1, letterSpacing: "-1px" }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function ProgressRing({ value, total, color, size = 56 }: {
  value: number; total: number; color: string; size?: number;
}) {
  const pct   = total > 0 ? Math.min(1, value / total) : 0;
  const r     = (size - 8) / 2;
  const circ  = 2 * Math.PI * r;
  const dash  = circ * pct;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#111", letterSpacing: "-0.2px" }}>{title}</div>
      {action && onAction && (
        <button onClick={onAction} style={{
          fontSize: 11, color: "#9CA3AF", background: "none", border: "none",
          cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
          padding: "2px 6px", borderRadius: 6,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "#374151")}
        onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}
        >{action} →</button>
      )}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────

export function DashboardRRE({
  contacts, userId, colorNavy, colorGold,
  campusRRE, userRole: _ur, objectifVisitesMois = 6, onNavigate, onOpenContact,
}: DashboardRREProps) {

  const visites  = useMemo(() => loadVisites(userId),  [userId]);
  const pipeline = useMemo(() => loadPipeline(userId), [userId]);
  const agenda   = useMemo(() => loadAgenda(userId),   [userId]);

  const today     = new Date().toISOString().slice(0, 10);
  const moisDebut = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  // ── Alertes ──
  const alertes = useMemo(() => {
    const visitesRetard = visites.filter(v =>
      v.statut !== "realisee" && v.statut !== "annulee" &&
      v.dateProchaine && v.dateProchaine.slice(0, 10) < today
    );
    const sansEntreprise = pipeline.filter(p => p.stage === "cherche");
    const echangesRetard = contacts.filter(c => {
      const echanges = c.payload?.echanges ?? [];
      const planifies = echanges.filter((e: any) => e.status === "planifie" && e.dateActionSuivante && e.dateActionSuivante.slice(0, 10) < today);
      return planifies.length > 0;
    });
    const postesVides = contacts.filter(c => {
      const postes = c.payload?.postes ?? [];
      return postes.some((p: any) => p.status === "ouvert" && (!p.candidats || p.candidats.length === 0));
    });
    return { visitesRetard: visitesRetard.length, sansEntreprise: sansEntreprise.length, echangesRetard: echangesRetard.length, postesVides: postesVides.length };
  }, [visites, pipeline, contacts, today]);

  const totalAlertes = alertes.visitesRetard + alertes.sansEntreprise + alertes.echangesRetard + alertes.postesVides;

  // ── Stats ──
  const stats = useMemo(() => {
    const visitesRealisees = visites.filter(v => v.statut === "realisee" && v.dateVisite?.slice(0, 10) >= moisDebut).length;
    const places = pipeline.filter(p => p.stage === "place").length;
    const total  = pipeline.length;
    const taux   = total > 0 ? Math.round((places / total) * 100) : 0;
    const partenaires = contacts.filter(c => c.status === "partenaire").length;
    const prospects   = contacts.filter(c => c.status === "prospect").length;
    return { visitesRealisees, places, total, taux, partenaires, prospects };
  }, [visites, pipeline, contacts, moisDebut]);

  // ── Agenda cette semaine ──
  const prochainsEvts = useMemo(() => {
    const in7 = new Date(); in7.setDate(in7.getDate() + 7);
    const in7iso = in7.toISOString().slice(0, 10);
    return agenda
      .filter((e: any) => e.date >= today && e.date <= in7iso && !e.done)
      .sort((a: any, b: any) => a.date.localeCompare(b.date) || a.heureDebut.localeCompare(b.heureDebut))
      .slice(0, 6);
  }, [agenda, today]);

  // ── Activité récente ──
  const activiteRecente = useMemo(() => {
    return [...contacts]
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
      .slice(0, 5);
  }, [contacts]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const dayLabel = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ fontFamily: "inherit", paddingBottom: 32 }}>
      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dash-action:hover { transform: translateY(-1px) !important; }
      `}</style>

      {/* ── En-tête personnalisé ── */}
      <div style={{
        background: `linear-gradient(135deg, ${colorNavy} 0%, ${colorNavy}E0 100%)`,
        borderRadius: 16, padding: "24px 28px", marginBottom: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "relative", overflow: "hidden",
        animation: "fadeSlide 0.3s ease both",
      }}>
        {/* Formes décoratives */}
        <div style={{ position: "absolute", top: -30, right: 60, width: 120, height: 120, borderRadius: "50%", background: `${colorGold}15`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, right: 20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>
            {greeting()} 👋
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
            {dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}
            {campusRRE && <span style={{ marginLeft: 10, background: `${colorGold}30`, color: colorGold, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>📍 {campusRRE}</span>}
          </div>
        </div>

        {totalAlertes > 0 && (
          <div style={{
            background: "#DC2626", color: "#fff", borderRadius: 12,
            padding: "10px 18px", position: "relative",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{totalAlertes}</div>
              <div style={{ fontSize: 10, opacity: 0.85 }}>action{totalAlertes > 1 ? "s" : ""} requise{totalAlertes > 1 ? "s" : ""}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Alertes (si présentes) ── */}
      {totalAlertes > 0 && (
        <div style={{ marginBottom: 20, animation: "fadeSlide 0.35s ease 50ms both" }}>
          <SectionTitle title="⚠️ Actions requises" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            <AlertBadge count={alertes.visitesRetard}  label="visites en retard"          color="#DC2626" icon="🏢" onClick={() => onNavigate("suivi")} />
            <AlertBadge count={alertes.sansEntreprise} label="alternants sans entreprise" color="#F59E0B" icon="🎓" onClick={() => onNavigate("pipeline")} />
            <AlertBadge count={alertes.echangesRetard} label="relances échues"            color="#E8722A" icon="📞" onClick={() => onNavigate("entreprises")} />
            <AlertBadge count={alertes.postesVides}    label="postes sans candidat"       color="#7C3AED" icon="📋" onClick={() => onNavigate("entreprises")} />
          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20, animation: "fadeSlide 0.4s ease 100ms both" }}>
        <StatCard
          value={`${stats.visitesRealisees}/${objectifVisitesMois}`}
          label="Visites ce mois"
          sub={stats.visitesRealisees >= objectifVisitesMois ? "✓ Objectif atteint" : `${objectifVisitesMois - stats.visitesRealisees} restantes`}
          color={stats.visitesRealisees >= objectifVisitesMois ? "#10B981" : colorNavy}
          icon="✅" animDelay={0} onClick={() => onNavigate("suivi")}
        />
        <StatCard
          value={`${stats.taux}%`}
          label="Taux de placement"
          sub={`${stats.places} placés / ${stats.total} alternants`}
          color={stats.taux >= 70 ? "#10B981" : stats.taux >= 40 ? "#F59E0B" : "#DC2626"}
          icon="🎯" animDelay={60} onClick={() => onNavigate("pipeline")}
        />
        <StatCard
          value={stats.partenaires}
          label="Entreprises partenaires"
          sub={`${stats.prospects} prospects actifs`}
          color={colorNavy} icon="🏢" animDelay={120} onClick={() => onNavigate("entreprises")}
        />
        <StatCard
          value={prochainsEvts.length}
          label="Événements à venir"
          sub="Cette semaine"
          color="#7C3AED" icon="📅" animDelay={180} onClick={() => onNavigate("agenda")}
        />
      </div>

      {/* ── Ligne 3 : Agenda + Progression ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, marginBottom: 20 }}>

        {/* Agenda semaine */}
        <div style={{
          background: "#fff", borderRadius: 14, padding: "20px 22px",
          border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
          animation: "fadeSlide 0.4s ease 200ms both",
        }}>
          <SectionTitle title="📅 Cette semaine" action="Voir l'agenda" onAction={() => onNavigate("agenda")} />
          {prochainsEvts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#9CA3AF" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🗓</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Aucun événement prévu cette semaine</div>
              <button onClick={() => onNavigate("agenda")} style={{
                marginTop: 12, padding: "7px 16px", borderRadius: 8, border: `1px solid ${colorNavy}30`,
                background: "#fff", color: colorNavy, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>+ Créer un événement</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {prochainsEvts.map((ev: any, i: number) => {
                const cfg = TYPE_LABELS[ev.type] ?? { label: ev.type, color: "#9CA3AF", icon: "📌" };
                const j   = joursAvant(ev.date);
                return (
                  <div key={ev.id ?? i} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: 10,
                    background: i === 0 ? `${cfg.color}08` : "#F9FAFB",
                    border: `1px solid ${i === 0 ? `${cfg.color}20` : "#F3F4F6"}`,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: `${cfg.color}15`, display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: 16,
                    }}>{cfg.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                        {ev.titre}
                      </div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>
                        {jourSemaine(ev.date)} à {heure(ev.heureDebut)}
                        {ev.entrepriseNom && ` · ${ev.entrepriseNom}`}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
                      background: j === 0 ? "#DC2626" : j <= 1 ? "#F59E0B" : `${cfg.color}15`,
                      color: j === 0 ? "#fff" : j <= 1 ? "#fff" : cfg.color,
                      whiteSpace: "nowrap",
                    }}>
                      {j === 0 ? "Aujourd'hui" : j === 1 ? "Demain" : `J-${j}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Progression pipeline + visites */}
        <div style={{
          background: "#fff", borderRadius: 14, padding: "20px 22px",
          border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
          animation: "fadeSlide 0.4s ease 250ms both",
        }}>
          <SectionTitle title="📊 Progression" action="Pipeline" onAction={() => onNavigate("pipeline")} />

          {/* Anneau placement */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, padding: "14px 16px", background: "#F9FAFB", borderRadius: 12 }}>
            <ProgressRing value={stats.places} total={stats.total || 1} color={stats.taux >= 70 ? "#10B981" : stats.taux >= 40 ? "#F59E0B" : "#DC2626"} size={60} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: "-0.5px" }}>{stats.taux}%</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Placement</div>
              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>{stats.places} / {stats.total} alternants</div>
            </div>
          </div>

          {/* Étapes pipeline */}
          {(["cherche","cv_envoye","apparie","place"] as const).map((stage, i) => {
            const labels: Record<string, {l:string;c:string}> = {
              cherche:   {l:"Sans entreprise", c:"#9CA3AF"},
              cv_envoye: {l:"CV envoyé",       c:"#3B82F6"},
              apparie:   {l:"Apparié",         c:"#F59E0B"},
              place:     {l:"Placé",           c:"#10B981"},
            };
            const count = pipeline.filter((p:any) => p.stage === stage).length;
            const pct   = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            const cfg   = labels[stage];
            return (
              <div key={stage} style={{ marginBottom: i < 3 ? 10 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: "#4B5563", fontWeight: 500 }}>{cfg.l}</span>
                  <span style={{ color: cfg.c, fontWeight: 700 }}>{count} <span style={{ color: "#9CA3AF", fontWeight: 400 }}>({pct}%)</span></span>
                </div>
                <div style={{ height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: cfg.c, borderRadius: 3, transition: "width 0.5s ease" }} />
                </div>
              </div>
            );
          })}

          {/* Objectif visites */}
          <div style={{ marginTop: 16, padding: "12px 14px", background: `${colorNavy}08`, borderRadius: 10, border: `1px solid ${colorNavy}15` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: colorNavy }}>Visites ce mois</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: colorNavy }}>{stats.visitesRealisees}/{objectifVisitesMois}</span>
            </div>
            <div style={{ height: 6, background: `${colorNavy}20`, borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3,
                width: `${Math.min(100, Math.round((stats.visitesRealisees/objectifVisitesMois)*100))}%`,
                background: stats.visitesRealisees >= objectifVisitesMois ? "#10B981" : colorNavy,
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Activité récente ── */}
      <div style={{
        background: "#fff", borderRadius: 14, padding: "20px 22px",
        border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        marginBottom: 20, animation: "fadeSlide 0.4s ease 300ms both",
      }}>
        <SectionTitle title="🕐 Activité récente" action="Toutes les entreprises" onAction={() => onNavigate("entreprises")} />
        {activiteRecente.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#9CA3AF", fontSize: 13 }}>
            Aucune activité récente
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {activiteRecente.map(c => (
              <button key={c.id} onClick={() => onOpenContact?.(c)} style={{
                display: "flex", flexDirection: "column", alignItems: "flex-start",
                padding: "12px 14px", borderRadius: 10,
                border: "1px solid #F3F4F6", background: "#FAFAFA",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = `${colorNavy}30`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#FAFAFA"; (e.currentTarget as HTMLElement).style.borderColor = "#F3F4F6"; }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8, marginBottom: 8,
                  background: c.status === "partenaire" ? "#10B98115" : c.status === "prospect" ? "#3B82F615" : "#F3F4F6",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                }}>
                  {c.status === "partenaire" ? "🤝" : c.status === "prospect" ? "🔍" : "💤"}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", width: "100%" }}>
                  {c.displayName}
                </div>
                <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>
                  {c.city ?? "—"} · {c.updatedAt ? `il y a ${joursDepuis(c.updatedAt)}j` : ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Accès rapides ── */}
      <div style={{ animation: "fadeSlide 0.4s ease 350ms both" }}>
        <SectionTitle title="⚡ Actions rapides" />
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { label: "Nouvelle visite", icon: "🏢", view: "suivi",       color: colorNavy },
            { label: "Nouveau prospect", icon: "🔍", view: "prospection", color: "#3B82F6" },
            { label: "Planifier un RDV", icon: "📅", view: "agenda",      color: "#7C3AED" },
            { label: "Voir le pipeline", icon: "🎯", view: "pipeline",    color: "#10B981" },
          ].map(a => (
            <button key={a.view} className="dash-action" onClick={() => onNavigate(a.view)} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, padding: "13px 16px", borderRadius: 12,
              border: `1.5px solid ${a.color}20`,
              background: `${a.color}08`, color: a.color,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", transition: "all 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${a.color}15`; (e.currentTarget as HTMLElement).style.borderColor = `${a.color}40`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${a.color}08`; (e.currentTarget as HTMLElement).style.borderColor = `${a.color}20`; }}
            >
              <span style={{ fontSize: 18 }}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
