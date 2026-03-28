// src/components/DashboardDirection.tsx
// Dashboard direction IFC — Vue globale + détail par campus
// Accessible à tous les RRE (filtrés sur leur campus)
// ─────────────────────────────────────────────────────────

import { useMemo } from "react";
import type { ContactRecord } from "../types/crm";

interface DashboardDirectionProps {
  contacts: ContactRecord[];
  userId: string;
  colorNavy: string;
  colorGold: string;
  campusList: string[];
  campusRRE: string;
  isAdmin: boolean;
  onNavigate: (view: string) => void;
  userRole?: string;
  objectifVisitesMois?: number;
  objectifTauxPlacement?: number;
  objectifPartenaires?: number;
  objectifProspects?: number;
}

// ── Types internes ────────────────────────────────────────

interface PlacementCard {
  etudiantId: string;
  nom: string;
  prenom: string;
  classe: string;
  stage: "cherche" | "cv_envoye" | "apparie" | "place";
  campus?: string;
  formation?: string;
}

interface VisiteTuteur {
  id: string;
  date: string;
  statut: "planifiee" | "realisee" | "en_retard";
  entrepriseNom: string;
  campus?: string;
  _isDemoData?: boolean;
}

// ── Helpers ───────────────────────────────────────────────

function loadPipeline(userId: string): PlacementCard[] {
  try {
    const raw = localStorage.getItem(`kleios_ifc_pipeline_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function loadVisites(userId: string): VisiteTuteur[] {
  try {
    const raw = localStorage.getItem(`kleios_ifc_visites_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Composants UI ─────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon, onClick }: {
  label: string; value: string | number; sub?: string;
  color: string; icon: string; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      background: "#fff", borderRadius: 12, padding: "18px 20px",
      border: "1px solid #E2E5EC",
      borderLeft: `4px solid ${color}`,
      cursor: onClick ? "pointer" : "default",
      transition: "box-shadow 0.15s",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}
    onMouseEnter={e => onClick && ((e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)")}
    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)")}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ value, total, color, label }: { value: number; total: number; color: string; label: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "#4B5563", fontWeight: 500 }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value}/{total} <span style={{ color: "#9CA3AF", fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 8, background: "#F3F4F6", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────

export function DashboardDirection({
  contacts, userId, colorNavy, colorGold: _cg,
  campusList, campusRRE, isAdmin, onNavigate,
  userRole: _ur2, objectifVisitesMois = 6, objectifTauxPlacement = 80,
  objectifPartenaires = 50,
}: DashboardDirectionProps) {

  const pipeline = useMemo(() => loadPipeline(userId), [userId]);
  const visites  = useMemo(() => loadVisites(userId), [userId]);

  // Filtrer selon le rôle
  const campusVisible = useMemo(() => {
    if (isAdmin) return campusList.length > 0 ? campusList : ["IFC Perpignan"];
    return campusRRE ? [campusRRE] : campusList;
  }, [isAdmin, campusRRE, campusList]);

  // Contacts filtrés par campus visible
  const contactsFiltres = useMemo(() =>
    contacts.filter(c => !campusRRE || isAdmin || c.campus === campusRRE || !c.campus),
    [contacts, campusRRE, isAdmin]
  );

  // ── KPIs globaux ──
  const kpis = useMemo(() => {
    const total    = pipeline.length;
    const places   = pipeline.filter(p => p.stage === "place").length;
    const cherche  = pipeline.filter(p => p.stage === "cherche").length;
    const cvEnvoye = pipeline.filter(p => p.stage === "cv_envoye").length;
    const apparie  = pipeline.filter(p => p.stage === "apparie").length;
    const tauxPlacement = total > 0 ? Math.round((places / total) * 100) : 0;

    const partenaires = contactsFiltres.filter(c => c.status === "partenaire").length;
    const prospects   = contactsFiltres.filter(c => c.status === "prospect").length;

    const now = new Date().toISOString().slice(0, 10);
    const visitesRealisees = visites.filter(v => v.statut === "realisee").length;
    const visitesRetard    = visites.filter(v => v.statut === "en_retard" || (v.statut === "planifiee" && v.date < now)).length;
    const visitesTotales   = visites.length;

    return { total, places, cherche, cvEnvoye, apparie, tauxPlacement, partenaires, prospects, visitesRealisees, visitesRetard, visitesTotales };
  }, [pipeline, contactsFiltres, visites]);

  // ── Stats par campus ──
  const statsByCampus = useMemo(() =>
    campusVisible.map(campus => {
      const pipelineCampus = pipeline.filter(p => !p.campus || p.campus === campus);
      const contactsCampus = contacts.filter(c => c.campus === campus || (!c.campus && campus === campusRRE));

      const total   = pipelineCampus.length;
      const places  = pipelineCampus.filter(p => p.stage === "place").length;
      const taux    = total > 0 ? Math.round((places / total) * 100) : 0;
      const partenaires = contactsCampus.filter(c => c.status === "partenaire").length;
      const prospects   = contactsCampus.filter(c => c.status === "prospect").length;

      const now = new Date().toISOString().slice(0, 10);
      const visitesCampus = visites.filter(v => !v.campus || v.campus === campus);
      const visitesReal   = visitesCampus.filter(v => v.statut === "realisee").length;
      const visitesRetard = visitesCampus.filter(v => v.statut === "en_retard" || (v.statut === "planifiee" && v.date < now)).length;

      return { campus, total, places, taux, partenaires, prospects, visitesReal, visitesRetard, visitesTotales: visitesCampus.length };
    }),
    [campusVisible, pipeline, contacts, visites, campusRRE]
  );

  // Couleurs par étape pipeline
  const STAGE_COLORS: Record<string, string> = {
    cherche:    "#9CA3AF",
    cv_envoye:  "#3B82F6",
    apparie:    "#F59E0B",
    place:      "#10B981",
  };
  const STAGE_LABELS: Record<string, string> = {
    cherche:    "Sans alternance",
    cv_envoye:  "CV envoyé",
    apparie:    "Apparié",
    place:      "Placé",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── En-tête ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: colorNavy, margin: 0 }}>
            Dashboard direction
          </h2>
          <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3 }}>
            {isAdmin ? "Tous les campus" : `Campus : ${campusRRE || "Non défini"}`}
            {" · "}Données en temps réel depuis le pipeline et les visites
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onNavigate("pipeline")} style={{
            padding: "7px 14px", borderRadius: 8, border: `1px solid ${colorNavy}30`,
            background: "#fff", color: colorNavy, fontSize: 12, fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit",
          }}>→ Pipeline</button>
          <button onClick={() => onNavigate("suivi")} style={{
            padding: "7px 14px", borderRadius: 8, border: `1px solid ${colorNavy}30`,
            background: "#fff", color: colorNavy, fontSize: 12, fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit",
          }}>→ Suivi tuteurs</button>
        </div>
      </div>

      {/* ── KPIs globaux ── */}
      <div>
        <SectionTitle title="Vue globale" sub="Tous campus confondus" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <KpiCard
            label="Taux de placement"
            value={`${kpis.tauxPlacement}%`}
            sub={`${kpis.places} placés / ${kpis.total} · objectif ${objectifTauxPlacement}%`}
            color={kpis.tauxPlacement >= objectifTauxPlacement ? "#10B981" : kpis.tauxPlacement >= objectifTauxPlacement * 0.7 ? "#F59E0B" : "#DC2626"} icon="🎯"
            onClick={() => onNavigate("pipeline")}
          />
          <KpiCard
            label="Entreprises partenaires"
            value={kpis.partenaires}
            sub={`${kpis.prospects} prospects · objectif ${objectifPartenaires} partenaires`}
            color={kpis.partenaires >= objectifPartenaires ? "#10B981" : colorNavy} icon="🏢"
            onClick={() => onNavigate("entreprises")}
          />
          <KpiCard
            label="Visites réalisées"
            value={kpis.visitesRealisees}
            sub={`sur ${kpis.visitesTotales} · objectif ${objectifVisitesMois}/mois`}
            color={kpis.visitesRealisees >= objectifVisitesMois ? "#10B981" : "#3B82F6"} icon="✅"
            onClick={() => onNavigate("suivi")}
          />
          {kpis.visitesRetard > 0 ? (
            <KpiCard
              label="Visites en retard"
              value={kpis.visitesRetard}
              sub="Action requise"
              color="#DC2626" icon="⚠️"
              onClick={() => onNavigate("suivi")}
            />
          ) : (
            <KpiCard
              label="Alternants sans entreprise"
              value={kpis.cherche}
              sub={`${kpis.cvEnvoye} CV envoyés · ${kpis.apparie} appariés`}
              color="#F59E0B" icon="🔍"
              onClick={() => onNavigate("pipeline")}
            />
          )}
        </div>
      </div>

      {/* ── Répartition pipeline ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Étapes pipeline */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px", border: "1px solid #E2E5EC" }}>
          <SectionTitle title="Pipeline placement" sub="Répartition par étape" />
          {(["cherche", "cv_envoye", "apparie", "place"] as const).map(stage => (
            <ProgressBar
              key={stage}
              label={STAGE_LABELS[stage]}
              value={pipeline.filter(p => p.stage === stage).length}
              total={kpis.total || 1}
              color={STAGE_COLORS[stage]}
            />
          ))}
          {kpis.total === 0 && (
            <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, padding: "20px 0" }}>
              Aucun alternant dans le pipeline
            </div>
          )}
        </div>

        {/* Visites tuteurs */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px", border: "1px solid #E2E5EC" }}>
          <SectionTitle title="Suivi tuteurs" sub="Avancement des visites" />
          <ProgressBar
            label="Réalisées"
            value={kpis.visitesRealisees}
            total={kpis.visitesTotales || 1}
            color="#10B981"
          />
          <ProgressBar
            label="Planifiées"
            value={kpis.visitesTotales - kpis.visitesRealisees - kpis.visitesRetard}
            total={kpis.visitesTotales || 1}
            color="#3B82F6"
          />
          {kpis.visitesRetard > 0 && (
            <ProgressBar
              label="En retard"
              value={kpis.visitesRetard}
              total={kpis.visitesTotales || 1}
              color="#DC2626"
            />
          )}
          {kpis.visitesTotales === 0 && (
            <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, padding: "20px 0" }}>
              Aucune visite enregistrée
            </div>
          )}
          <div style={{ marginTop: 14, padding: "10px 12px", background: "#F9FAFB", borderRadius: 8, fontSize: 11, color: "#6B7280" }}>
            `💡 Objectif : ${objectifVisitesMois} visites / mois / RRE — Placement cible : ${objectifTauxPlacement}%`
          </div>
        </div>
      </div>

      {/* ── Détail par campus ── */}
      {campusVisible.length > 0 && (
        <div>
          <SectionTitle title="Détail par campus" sub="Activité RRE comparée" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {statsByCampus.map(s => (
              <div key={s.campus} style={{
                background: "#fff", borderRadius: 12, padding: "16px 20px",
                border: "1px solid #E2E5EC",
                display: "grid", gridTemplateColumns: "180px 1fr 1fr 1fr 1fr 1fr",
                alignItems: "center", gap: 12,
              }}>
                {/* Nom campus */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colorNavy }}>{s.campus}</div>
                  <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{s.partenaires + s.prospects} entreprises</div>
                </div>

                {/* Taux placement */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.taux >= 70 ? "#10B981" : s.taux >= 40 ? "#F59E0B" : "#DC2626" }}>
                    {s.taux}%
                  </div>
                  <div style={{ fontSize: 10, color: "#9CA3AF" }}>Placement</div>
                </div>

                {/* Placés */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#10B981" }}>{s.places}</div>
                  <div style={{ fontSize: 10, color: "#9CA3AF" }}>Placés / {s.total}</div>
                </div>

                {/* Partenaires */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: colorNavy }}>{s.partenaires}</div>
                  <div style={{ fontSize: 10, color: "#9CA3AF" }}>Partenaires</div>
                </div>

                {/* Visites */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#3B82F6" }}>{s.visitesReal}</div>
                  <div style={{ fontSize: 10, color: "#9CA3AF" }}>Visites réal.</div>
                </div>

                {/* Retard */}
                <div style={{ textAlign: "center" }}>
                  {s.visitesRetard > 0 ? (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#DC2626" }}>{s.visitesRetard}</div>
                      <div style={{ fontSize: 10, color: "#DC2626" }}>En retard ⚠️</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#10B981" }}>✓</div>
                      <div style={{ fontSize: 10, color: "#10B981" }}>À jour</div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Message si pas de données ── */}
      {kpis.total === 0 && kpis.partenaires === 0 && (
        <div style={{
          textAlign: "center", padding: "40px 20px",
          background: "#fff", borderRadius: 12, border: "1px solid #E2E5EC",
          color: "#9CA3AF",
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "#4B5563", marginBottom: 6 }}>
            Pas encore de données à afficher
          </div>
          <div style={{ fontSize: 13 }}>
            Ajoutez des entreprises et renseignez le pipeline pour voir les KPIs
          </div>
        </div>
      )}
    </div>
  );
}
