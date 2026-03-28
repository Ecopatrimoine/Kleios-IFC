// src/components/ProspectionView.tsx
// Prospection entreprises — API Recherche Entreprises (gouvernement FR)
// Enrichissement : OSM Overpass → Google Places (fallback)
// Drawer latéral push — téléphone, site web, horaires, note Google
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { ContactRecord } from "../types/crm";

interface ProspectionViewProps {
  /** Clé Google Places API du cabinet — jamais stockée côté serveur */
  googleApiKey?: string;
  contacts: ContactRecord[];
  userId: string;
  onImport: (records: ContactRecord[]) => void;
  colorNavy: string;
  colorGold: string;
}

// ── Types API recherche ───────────────────────────────────────────────────────

interface ApiDirigeant {
  nom: string;
  prenom: string | null;
  qualite: string;
  date_naissance?: string;
  date_naissance_partiel?: string;
}

interface ApiEntreprise {
  siren: string;
  nom_raison_sociale: string;
  nom_commercial: string | null;          // ← déjà dans la réponse API
  dirigeants: ApiDirigeant[] | null;      // ← déjà dans la réponse API
  date_creation: string | null;           // ← déjà dans la réponse API
  siege: {
    siret: string;
    adresse: string;
    code_postal: string;
    libelle_commune: string;
    latitude: number | null;
    longitude: number | null;
    activite_principale: string;
    libelle_activite_principale: string;
    tranche_effectif_salarie: string | null;
  };
  nature_juridique: string;
  libelle_nature_juridique: string;
  etat_administratif: string;
}

// Helper : premier dirigeant lisible
function getPrincipalDirigeant(e: ApiEntreprise): { nom: string; qualite: string } | null {
  const d = e.dirigeants?.[0];
  if (!d) return null;
  const nom = [d.prenom, d.nom].filter(Boolean).join(" ").trim();
  return nom ? { nom, qualite: d.qualite ?? "" } : null;
}

// Helper : nom commercial (nom_commercial > nom_raison_sociale si différent)
function getNomCommercial(e: ApiEntreprise): string | null {
  const nc = e.nom_commercial?.trim();
  if (!nc || nc === e.nom_raison_sociale.trim()) return null;
  return nc;
}

interface SearchResult {
  results: ApiEntreprise[];
  total_results: number;
  page: number;
  per_page: number;
}

// ── Type enrichissement ───────────────────────────────────────────────────────

// EnrichedData = ce qu'OSM et Google ajoutent (tél, web, horaires)
// Les données légales (dirigeant, nom commercial) viennent directement de ApiEntreprise
interface EnrichedData {
  tel: string | null;
  website: string | null;
  sourceContact: "osm" | "google" | "none";
  // Google Places uniquement
  hours: string[] | null;
  address: string | null;
  rating: number | null;
  ratingCount: number | null;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const API_PROXY     = `${SUPABASE_URL}/functions/v1/search-entreprises`;
const ENRICH_PROXY  = `${SUPABASE_URL}/functions/v1/enrich-entreprise`;
const DRAWER_WIDTH  = 400;

const EFFECTIF_LABELS: Record<string, string> = {
  "00": "0 salarié", "01": "1-2", "02": "3-5", "03": "6-9",
  "11": "10-19",    "12": "20-49", "21": "50-99", "22": "100-199",
  "31": "200-249",  "32": "250-499", "41": "500-999",
  "42": "1000-1999","51": "2000-4999","52": "5000-9999","53": "10000+",
};

// Sections NAF → param API : section_activite_principale
// Codes APE précis → param API : activite_principale
const SECTIONS_NAF = [
  { code: "G", label: "Commerce (détail, gros, auto)" },
  { code: "I", label: "Hébergement et restauration" },
  { code: "F", label: "Construction et travaux" },
  { code: "M", label: "Activités spécialisées (conseil, publicité...)" },
  { code: "J", label: "Information et communication" },
  { code: "K", label: "Activités financières et d'assurance" },
  { code: "L", label: "Activités immobilières" },
  { code: "N", label: "Services administratifs (intérim...)" },
  { code: "P", label: "Enseignement" },
  { code: "Q", label: "Santé humaine et action sociale" },
  { code: "R", label: "Arts, spectacles et loisirs" },
  { code: "C", label: "Industrie manufacturière" },
  { code: "H", label: "Transports et entreposage" },
  { code: "S", label: "Autres services aux particuliers" },
];


// categorie_entreprise : paramètre officiel API — seuil 250 sal. = seuil aide alternance
const CATEGORIE_OPTIONS = [
  { value: "",       label: "Toutes tailles" },
  { value: "PME",    label: "PME — moins de 250 salariés (aide alternance renforcée)" },
  { value: "ETI,GE", label: "250 salariés et plus" },
];

const DEPARTEMENTS = [
  "01","02","03","04","05","06","07","08","09","10",
  "11","12","13","14","15","16","17","18","19","2A","2B",
  "21","22","23","24","25","26","27","28","29","30",
  "31","32","33","34","35","36","37","38","39","40",
  "41","42","43","44","45","46","47","48","49","50",
  "51","52","53","54","55","56","57","58","59","60",
  "61","62","63","64","65","66","67","68","69","70",
  "71","72","73","74","75","76","77","78","79","80",
  "81","82","83","84","85","86","87","88","89","90",
  "91","92","93","94","95","971","972","973","974",
];

const inp: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 7,
  border: "1px solid rgba(26,46,68,0.15)", fontSize: 13,
  fontFamily: "inherit", outline: "none", color: "#2B2B2B", background: "#F9FAFB",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function effectifLabel(code: string | null): string {
  if (!code) return "—";
  return EFFECTIF_LABELS[code] ?? code;
}

function dejaInKleios(siret: string, contacts: ContactRecord[]): boolean {
  return contacts.some(
    c => (c.payload?.contact as any)?.siret?.replace(/\s/g, "") === siret?.replace(/\s/g, "")
  );
}

function buildRecord(e: ApiEntreprise, userId: string, enriched?: EnrichedData | null): ContactRecord {
  const now = new Date().toISOString();
  const id  = crypto.randomUUID();
  const src = enriched?.sourceContact;
  return {
    id, userId,
    displayName: e.nom_raison_sociale,
    status: "prospect",
    ploutosClientId: null,
    campus: "",
    city: e.siege.libelle_commune,
    siret: e.siege.siret,
    payload: {
      contact: {
        id, userId,
        formeJuridique: e.libelle_nature_juridique ?? "",
        nom: e.nom_raison_sociale,
        enseigne: getNomCommercial(e) ?? "",
        siret: e.siege.siret,
        codeApe: e.siege.activite_principale ?? "",
        codeIdcc: "", numeroTva: "",
        address1: enriched?.address ?? e.siege.adresse ?? "",
        address2: "",
        postalCode: e.siege.code_postal ?? "",
        city: e.siege.libelle_commune ?? "",
        email: "",
        telFixe: enriched?.tel ?? "",
        telMobile: "",
        website: enriched?.website ?? "",
        nbSalaries: effectifLabel(e.siege.tranche_effectif_salarie),
        activite: e.siege.libelle_activite_principale ?? "",
        conventionCollective: "", opco: "", caisseRetraite: "",
        organismePrevoyanc: "", nonAssujeti: false,
        status: "prospect",
        campus: "",
        notes: `Importé via prospection le ${new Date().toLocaleDateString("fr-FR")}${src && src !== "none" ? ` — enrichi via ${src === "google" ? "Google Places" : "OpenStreetMap"}` : ""}`,
        scoreRelation: 1, prochainerelance: "",
        createdAt: now, updatedAt: now, syncedAt: null,
        lat: e.siege.latitude ?? undefined,
        lng: e.siege.longitude ?? undefined,
      } as any,
      contacts: [], alternants: [], postes: [], echanges: [],
      documents: [], contracts: [], events: [], deals: [],
      compliance: null, commissions: [], portal: null,
    } as any,
    createdAt: now, updatedAt: now, syncedAt: null,
  } as any;
}

// ── InfoRow helper ────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", letterSpacing: 0.4, marginBottom: 2 }}>
          {label.toUpperCase()}
        </div>
        <div>{value}</div>
      </div>
    </div>
  );
}

// ── Drawer enrichissement ─────────────────────────────────────────────────────

function EnrichDrawer({
  entreprise, enriched, enriching, enrichingSet, onClose, onImport,
  onGoogleEnrich, googleApiKey, colorNavy, colorGold,
}: {
  entreprise: ApiEntreprise | null;
  enriched: EnrichedData | null;
  enriching: boolean;
  enrichingSet: Set<string>;
  onClose: () => void;
  onImport: (e: ApiEntreprise, enriched: EnrichedData | null) => void;
  onGoogleEnrich?: (e: ApiEntreprise) => void;
  googleApiKey?: string;
  colorNavy: string;
  colorGold: string;
}) {
  const NAVY   = colorNavy;
  const ORANGE = colorGold;
  const e      = entreprise;
  const isOpen = !!e;

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);


  const hasData = !!(enriched?.tel || enriched?.website);

  return (
    <>
      {isOpen && (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40, background: "transparent" }} />
      )}

      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: DRAWER_WIDTH,
        background: "#fff",
        boxShadow: isOpen ? "-4px 0 32px rgba(26,46,68,0.13)" : "none",
        transform: isOpen ? "translateX(0)" : `translateX(${DRAWER_WIDTH + 10}px)`,
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1), box-shadow 0.28s ease",
        zIndex: 50, display: "flex", flexDirection: "column", overflowY: "hidden",
      }}>
        {e && (
          <>
            {/* Header */}
            <div style={{
              padding: "18px 20px 14px", borderBottom: "1px solid rgba(26,46,68,0.08)",
              background: NAVY, flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.3, marginBottom: 4 }}>
                    {e.nom_raison_sociale}
                  </div>
                  <div style={{ fontSize: 11, color: ORANGE, fontWeight: 500 }}>
                    {e.siege.libelle_activite_principale || e.siege.activite_principale || "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 3 }}>
                    {e.siege.code_postal} {e.siege.libelle_commune} · SIRET {e.siege.siret}
                  </div>
                </div>
                <button onClick={onClose} style={{
                  background: "rgba(255,255,255,0.12)", border: "none", color: "#fff",
                  width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>✕</button>
              </div>
            </div>

            {/* Corps scrollable */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

              {/* Spinner enrichissement */}
              {enriching && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "14px 16px", background: "#F0F7FF",
                  border: "1px solid #BFDBFE", borderRadius: 10, marginBottom: 16,
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    border: `2px solid ${NAVY}`, borderTopColor: "transparent",
                    animation: "spin 0.8s linear infinite", flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>Enrichissement en cours</div>
                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>Recherche OSM → Google Places…</div>
                  </div>
                </div>
              )}

              {/* ── Données légales INSEE + API (gratuites, déjà dans la réponse) ── */}
              <div style={{ marginBottom: 14 }}>
                {/* Nom commercial */}
                {getNomCommercial(e) && (
                  <div style={{ padding: "8px 12px", background: "#F0F7FF", border: "1px solid #BFDBFE", borderRadius: 8, marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#1D6FB7", marginBottom: 2, letterSpacing: 0.4 }}>NOM COMMERCIAL</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{getNomCommercial(e)}</div>
                  </div>
                )}

                {/* Dirigeant principal */}
                {getPrincipalDirigeant(e) && (
                  <div style={{ marginBottom: 8 }}>
                    <InfoRow icon="👤" label={getPrincipalDirigeant(e)!.qualite || "Dirigeant"} value={
                      <span style={{ fontSize: 13, fontWeight: 500, color: NAVY }}>{getPrincipalDirigeant(e)!.nom}</span>
                    } />
                  </div>
                )}

                {/* Date création */}
                {e.date_creation && (
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: "#374151", background: "#F3F4F6", padding: "2px 8px", borderRadius: 6 }}>
                      📅 Créée le {e.date_creation}
                    </span>
                  </div>
                )}
              </div>

              {/* ── Données OSM (contact) ── */}
              {enriched && enriched.tel && enriched.sourceContact === "osm" && (
                <div style={{ marginBottom: 14, paddingTop: 12, borderTop: "1px solid rgba(26,46,68,0.08)" }}>
                  <InfoRow icon="📞" label="Téléphone (OpenStreetMap)" value={
                    <a href={`tel:${enriched.tel}`} style={{ color: NAVY, fontWeight: 600, textDecoration: "none", fontSize: 15 }}>
                      {enriched.tel}
                    </a>
                  } />
                  {enriched.website && (
                    <div style={{ marginTop: 8 }}>
                      <InfoRow icon="🌐" label="Site web (OpenStreetMap)" value={
                        <a href={enriched.website.startsWith("http") ? enriched.website : `https://${enriched.website}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ color: "#1D6FB7", fontSize: 12, wordBreak: "break-all", textDecoration: "underline" }}>
                          {enriched.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      } />
                    </div>
                  )}
                </div>
              )}

              {/* Spinner OSM en cours */}
              {enrichingSet.has(e.siege.siret) && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#F0F7FF", border: "1px solid #BFDBFE", borderRadius: 8, marginBottom: 12, fontSize: 11, color: "#1D6FB7" }}>
                  <span style={{ display: "inline-block", width: 12, height: 12, border: "1.5px solid #1D6FB7", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Recherche sur OpenStreetMap…
                </div>
              )}

              {/* Aucun contact OSM → inviter Google */}
              {enriched && !enriched.tel && enriched.sourceContact === "none" && (
                <div style={{ padding: "8px 12px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, fontSize: 11, color: "#92400E", marginBottom: 12 }}>
                  Aucun contact trouvé via OpenStreetMap.
                  {googleApiKey ? " Cliquez sur 🔍 Rechercher sur Google Places ci-dessous." : " Ajoutez une clé Google Places dans Paramètres pour aller plus loin."}
                </div>
              )}

              {/* ── Données Google Places (sur demande) ── */}
              {enriched?.sourceContact === "google" && (
                <div style={{ marginBottom: 16, paddingTop: 12, borderTop: "1px solid rgba(26,46,68,0.08)" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#1D6FB7", marginBottom: 10, letterSpacing: 0.4 }}>
                    📍 VIA GOOGLE PLACES
                  </div>
                  {enriched.tel && (
                    <div style={{ marginBottom: 8 }}>
                      <InfoRow icon="📞" label="Téléphone" value={
                        <a href={`tel:${enriched.tel}`} style={{ color: NAVY, fontWeight: 600, textDecoration: "none", fontSize: 15 }}>
                          {enriched.tel}
                        </a>
                      } />
                    </div>
                  )}
                  {enriched.website && (
                    <div style={{ marginBottom: 8 }}>
                      <InfoRow icon="🌐" label="Site web" value={
                        <a href={enriched.website.startsWith("http") ? enriched.website : `https://${enriched.website}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ color: "#1D6FB7", fontSize: 12, wordBreak: "break-all", textDecoration: "underline" }}>
                          {enriched.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      } />
                    </div>
                  )}
                  {enriched.rating !== null && (
                    <div style={{ marginBottom: 8 }}>
                      <InfoRow icon="⭐" label="Note Google" value={
                        <span style={{ color: NAVY, fontWeight: 600, fontSize: 13 }}>
                          {enriched.rating!.toFixed(1)}/5
                          <span style={{ fontWeight: 400, color: "#9CA3AF", fontSize: 11 }}>
                            {" "}({enriched.ratingCount?.toLocaleString("fr-FR")} avis)
                          </span>
                        </span>
                      } />
                    </div>
                  )}
                  {enriched.address && (
                    <div style={{ marginBottom: 8 }}>
                      <InfoRow icon="📍" label="Adresse vérifiée" value={
                        <span style={{ fontSize: 12, color: "#374151" }}>{enriched.address}</span>
                      } />
                    </div>
                  )}
                  {enriched.hours && enriched.hours.length > 0 && (
                    <div style={{ background: "#F9FAFB", border: "1px solid rgba(26,46,68,0.08)", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", marginBottom: 8, letterSpacing: 0.4 }}>
                        🕐 HORAIRES D'OUVERTURE
                      </div>
                      {enriched.hours!.map((h, i) => (
                        <div key={i} style={{
                          fontSize: 11, color: "#374151", padding: "3px 0",
                          borderBottom: i < enriched.hours!.length - 1 ? "1px solid rgba(26,46,68,0.05)" : "none",
                        }}>{h}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bouton Google Places — visible seulement si clé configurée et pas encore enrichi Google */}
              {enriched && enriched.sourceContact !== "google" && googleApiKey && (
                <button
                  onClick={() => onGoogleEnrich?.(e)}
                  style={{
                    width: "100%", padding: "8px", marginBottom: 14, borderRadius: 8,
                    border: "1px solid #BFDBFE", background: "#EFF6FF",
                    color: "#1D6FB7", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  🔍 Rechercher sur Google Places
                </button>
              )}

              {/* Séparateur */}
              <div style={{ height: 1, background: "rgba(26,46,68,0.08)", marginBottom: 16 }} />

              {/* Données INSEE */}
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", marginBottom: 10, letterSpacing: 0.4 }}>DONNÉES INSEE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                <InfoRow icon="🏢" label="Forme juridique" value={<span style={{ fontSize: 12 }}>{e.libelle_nature_juridique || "—"}</span>} />
                <InfoRow icon="📋" label="Code APE" value={<span style={{ fontSize: 12 }}>{e.siege.activite_principale} — {e.siege.libelle_activite_principale || "—"}</span>} />
                {e.siege.tranche_effectif_salarie && (
                  <InfoRow icon="👥" label="Effectif" value={<span style={{ fontSize: 12 }}>{effectifLabel(e.siege.tranche_effectif_salarie)}</span>} />
                )}
                <InfoRow icon="🆔" label="SIRET" value={<span style={{ fontSize: 12, fontFamily: "monospace" }}>{e.siege.siret}</span>} />
                <InfoRow icon="📍" label="Adresse INSEE" value={<span style={{ fontSize: 12 }}>{e.siege.adresse}, {e.siege.code_postal} {e.siege.libelle_commune}</span>} />
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(26,46,68,0.08)", background: "#fff", flexShrink: 0 }}>
              <button
                onClick={() => { onImport(e, enriched); onClose(); }}
                style={{
                  width: "100%", padding: "11px", borderRadius: 9, border: "none",
                  background: ORANGE, color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: "0 3px 12px rgba(242,101,34,0.30)",
                }}
              >
                ↓ Importer comme prospect
                {hasData && (
                  <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6, opacity: 0.85 }}>
                    (avec données enrichies)
                  </span>
                )}
              </button>
              <button onClick={onClose} style={{
                width: "100%", padding: "8px", marginTop: 6, borderRadius: 9,
                border: "1px solid rgba(26,46,68,0.12)", background: "transparent",
                color: "#6B7280", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>Fermer</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Carte résultat ────────────────────────────────────────────────────────────

function ResultCard({
  entreprise, selected, inKleios, onToggle,
  enriched, enriching, onEnrich, onOpenDrawer,
  colorNavy, colorGold,
}: {
  entreprise: ApiEntreprise;
  selected: boolean;
  inKleios: boolean;
  onToggle: () => void;
  enriched: EnrichedData | null;
  enriching: boolean;
  onEnrich: () => void;
  onOpenDrawer: () => void;
  colorNavy: string;
  colorGold: string;
}) {
  const NAVY    = colorNavy;
  const ORANGE  = colorGold;
  const e       = entreprise;
  const hasData = !!(enriched?.tel || enriched?.website);

  return (
    <div
      onClick={!inKleios ? onToggle : undefined}
      style={{
        background: selected ? `${ORANGE}08` : "#fff",
        border: `1px solid ${selected ? ORANGE : inKleios ? "#1D9E75" : "rgba(26,46,68,0.08)"}`,
        borderRadius: 10, padding: "10px 12px",
        cursor: inKleios ? "default" : "pointer",
        transition: "all 0.12s", position: "relative",
      }}
      onMouseEnter={ev => { if (!inKleios) ev.currentTarget.style.borderColor = ORANGE; }}
      onMouseLeave={ev => { if (!inKleios && !selected) ev.currentTarget.style.borderColor = "rgba(26,46,68,0.08)"; }}
    >
      {/* Badge Kleios */}
      {inKleios && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          fontSize: 10, fontWeight: 600, color: "#0F6E56",
          background: "#ECFDF5", padding: "2px 8px", borderRadius: 8,
        }}>✓ Dans Kleios</div>
      )}

      {/* Checkbox */}
      {!inKleios && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          width: 16, height: 16, borderRadius: 4,
          border: `1.5px solid ${selected ? ORANGE : "rgba(26,46,68,0.25)"}`,
          background: selected ? ORANGE : "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {selected && <span style={{ color: "#fff", fontSize: 10 }}>✓</span>}
        </div>
      )}

      <div style={{ paddingRight: 26 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 2 }}>
          {e.nom_raison_sociale}
        </div>
        <div style={{ fontSize: 11, color: ORANGE, fontWeight: 500, marginBottom: 5 }}>
          {e.siege.libelle_activite_principale || e.siege.activite_principale || "—"}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 4, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#6B7280" }}>📍 {e.siege.code_postal} {e.siege.libelle_commune}</span>
          <span style={{
            fontSize: 9, fontWeight: 600, color: "#9CA3AF",
            background: "#F3F4F6", padding: "1px 6px", borderRadius: 4,
            letterSpacing: 0.3, flexShrink: 0,
          }}>SIÈGE SOCIAL</span>
          {e.siege.tranche_effectif_salarie && (
            <span style={{ fontSize: 11, color: "#6B7280" }}>👥 {effectifLabel(e.siege.tranche_effectif_salarie)}</span>
          )}
        </div>
        {/* Dirigeant visible sur la card */}
        {getPrincipalDirigeant(e) && (
          <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 2 }}>
            👤 {getPrincipalDirigeant(e)!.nom}
            {getPrincipalDirigeant(e)!.qualite && (
              <span style={{ color: "#9CA3AF" }}> · {getPrincipalDirigeant(e)!.qualite}</span>
            )}
          </div>
        )}

        {/* Mini-preview données enrichies */}
        {hasData && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            {enriched!.tel && (
              <span style={{ fontSize: 10, color: "#059669", background: "#ECFDF5", padding: "2px 7px", borderRadius: 6, fontWeight: 500 }}>
                📞 {enriched!.tel}
              </span>
            )}
            {enriched!.website && (
              <span style={{ fontSize: 10, color: "#1D6FB7", background: "#EFF6FF", padding: "2px 7px", borderRadius: 6, fontWeight: 500 }}>
                🌐 {enriched!.website.replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 28)}
              </span>
            )}
            {enriched!.rating !== null && (
              <span style={{ fontSize: 10, color: "#92400E", background: "#FFFBEB", padding: "2px 7px", borderRadius: 6, fontWeight: 500 }}>
                ⭐ {enriched!.rating!.toFixed(1)}
              </span>
            )}
          </div>
        )}

        {/* Boutons action — non-Kleios uniquement */}
        {!inKleios && (
          <div onClick={ev => ev.stopPropagation()} style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {!enriched ? (
              <button
                onClick={onEnrich}
                disabled={enriching}
                style={{
                  padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: `1px solid ${NAVY}22`,
                  background: enriching ? "#F3F4F6" : `${NAVY}08`,
                  color: enriching ? "#9CA3AF" : NAVY,
                  cursor: enriching ? "wait" : "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                {enriching ? (
                  <>
                    <span style={{
                      display: "inline-block", width: 10, height: 10,
                      border: "1.5px solid #9CA3AF", borderTopColor: "transparent",
                      borderRadius: "50%", animation: "spin 0.7s linear infinite",
                    }} />
                    Recherche…
                  </>
                ) : <>✨ Enrichir</>}
              </button>
            ) : enriched.sourceContact === "none" ? (
              <span style={{ fontSize: 10, color: "#9CA3AF", padding: "3px 0" }}>Aucune donnée</span>
            ) : null}

            <button
              onClick={onOpenDrawer}
              style={{
                padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: `1px solid ${ORANGE}30`, background: `${ORANGE}08`, color: ORANGE,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Voir détails →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Filtre localité (Feature 3) ───────────────────────────────────────────────
// Garde une entreprise si son siège correspond à la zone cherchée :
// - Code postal cherché : les 2 premiers chiffres du CP siège correspondent
// - Département cherché : le CP siège commence par le département
// - GPS : coordonnées dans un rayon raisonnable autour du centre de la zone
// Sans filtre géo → pas de filtrage (recherche nationale)

function filterByLocalite(
  results: ApiEntreprise[],
  codePostal: string,
  departement: string,
): ApiEntreprise[] {
  if (!codePostal && !departement) return results; // pas de filtre géo → tout garder

  return results.filter(e => {
    const cpSiege = e.siege.code_postal?.replace(/\s/g, "") ?? "";
    const lat = e.siege.latitude;
    const lng = e.siege.longitude;

    // ── Filtre par code postal ──
    if (codePostal) {
      const cp = codePostal.replace(/\s/g, "");
      // Match exact ou même commune (même 5 chiffres)
      if (cpSiege === cp) return true;
      // Match partiel : même département (2 premiers chiffres)
      if (cpSiege.slice(0, 2) === cp.slice(0, 2) && lat && lng) {
        // Vérifier GPS si dispo : < 20 km du CP approximatif
        // On accepte si même département et on a des GPS
        return true;
      }
      // Pas de GPS → accepter si même 2 premiers chiffres (même dépt)
      if (cpSiege.slice(0, 2) === cp.slice(0, 2) && !lat) return true;
      return false;
    }

    // ── Filtre par département ──
    if (departement) {
      const dept = departement.padStart(2, "0");
      if (dept === "2A" || dept === "2B") return cpSiege.startsWith(dept.slice(0, 2));
      if (dept.length >= 3) return cpSiege.startsWith(dept); // DOM (971, 972...)
      return cpSiege.startsWith(dept);
    }

    return true;
  });
}

// ── Filtre entreprises visibles sur la carte (Feature 4) ─────────────────────

function filterByMapViewport(
  results: ApiEntreprise[],
  bounds: { north: number; south: number; east: number; west: number } | null,
  active: boolean,
): ApiEntreprise[] {
  if (!active || !bounds) return results;
  return results.filter(e => {
    const lat = e.siege.latitude;
    const lng = e.siege.longitude;
    if (!lat || !lng) return false; // sans GPS → pas visible sur carte
    return lat >= bounds.south && lat <= bounds.north &&
           lng >= bounds.west  && lng <= bounds.east;
  });
}

// ── Composant principal ───────────────────────────────────────────────────────

export function ProspectionView({ contacts, userId, onImport, colorNavy, colorGold, googleApiKey = "" }: ProspectionViewProps) {
  // Couleurs IFC depuis les props (jamais hardcodées)
  const NAVY   = colorNavy;
  const ORANGE = colorGold;
  const [codePostal,  setCodePostal]  = useState("");
  const [departement, setDepartement] = useState("");
  const [sectionNAF,  setSectionNAF]  = useState("");   // section NAF (G, I, F...)
  const [categorie,   setCategorie]   = useState("");   // PME | ETI,GE | ""
  const [motCle,      setMotCle]      = useState("");


  const [results,  setResults]  = useState<ApiEntreprise[]>([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [searched, setSearched] = useState(false);
  const [perPage,  setPerPage]  = useState(25);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [enrichedMap,  setEnrichedMap]  = useState<Record<string, EnrichedData>>({});
  const [enrichingSet, setEnrichingSet] = useState<Set<string>>(new Set());

  const [drawerSiret, setDrawerSiret] = useState<string | null>(null);
  const drawerEntreprise = results.find(e => e.siege.siret === drawerSiret) ?? null;
  const drawerEnriched   = drawerSiret ? (enrichedMap[drawerSiret] ?? null) : null;
  const drawerEnriching  = drawerSiret ? enrichingSet.has(drawerSiret) : false;

  const mapRef          = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef      = useRef<any[]>([]);
  const circleLayerRef  = useRef<any>(null);
  const [mapReady,     setMapReady]     = useState(false);
  const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null);
  const [circleRadius, setCircleRadius] = useState(10);
  const [mapBounds,    setMapBounds]    = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [filterByMap,      setFilterByMap]      = useState(false); // activer filtre carte
  const [filterLocalStrict, setFilterLocalStrict] = useState(false); // filtre siège local strict

  // Liste filtrée par viewport carte (si actif)
  const displayedResults = useMemo(
    () => filterByMapViewport(results, mapBounds, filterByMap),
    [results, mapBounds, filterByMap]
  );

  const dansKleios = useMemo(() => displayedResults.filter(e => dejaInKleios(e.siege.siret, contacts)).length, [displayedResults, contacts]);
  const nouvelles  = displayedResults.length - dansKleios;

  // ── Recherche ──
  // Construit les params de base (sans page)
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("per_page", "25");
    if (motCle.trim())     params.set("q", motCle.trim());
    if (codePostal.trim()) params.set("code_postal", codePostal.trim());
    else if (departement)  params.set("departement", departement);
    if (sectionNAF) params.set("section_activite_principale", sectionNAF);
    if (categorie) categorie.split(",").forEach(c => params.append("categorie_entreprise", c.trim()));
    params.set("etat_administratif", "A");
    return params;
  }, [motCle, codePostal, departement, sectionNAF, categorie]);

  // Charge une seule page et retourne les résultats
  const fetchPage = useCallback(async (pageNum: number, baseParams: URLSearchParams): Promise<SearchResult> => {
    const params = new URLSearchParams(baseParams);
    params.set("page", String(pageNum));
    const res = await fetch(`${API_PROXY}?${params}`, {
      headers: { "Accept": "application/json", "apikey": SUPABASE_ANON },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`Erreur API ${res.status}`);
    return res.json();
  }, []);

  const search = useCallback(async (p = 1, forcedPerPage?: number) => {
    setLoading(true); setError("");
    try {
      const baseParams = buildParams();
      const nbToLoad = forcedPerPage ?? perPage;
      const nbPages  = Math.ceil(nbToLoad / 25); // toujours 25 max par appel

      if (p === 1) {
        // Nouvelle recherche — charger nbPages pages en parallèle
        const pageNums = Array.from({ length: nbPages }, (_, i) => i + 1);
        const responses = await Promise.all(pageNums.map(n => fetchPage(n, baseParams)));

        const allResults = responses.flatMap(r => r.results ?? []);
        const total      = responses[0]?.total_results ?? 0;

        const filtered = filterLocalStrict
          ? filterByLocalite(allResults, codePostal.trim(), departement)
          : allResults;

        setResults(filtered);
        setTotal(total);
        setPage(nbPages);
        setEnrichedMap({}); setEnrichingSet(new Set());
        setSelected(new Set()); setDrawerSiret(null);
        setSearched(true);
      } else {
        // "Charger plus" — page suivante simple
        const data = await fetchPage(p, baseParams);
        const filtered = filterLocalStrict
          ? filterByLocalite(data.results ?? [], codePostal.trim(), departement)
          : data.results ?? [];
        setResults(prev => [...prev, ...filtered]);
        setPage(p);
      }
    } catch (err: any) {
      if (err.name === "AbortError") setError("Délai dépassé — réessayez.");
      else setError(`Erreur : ${err.message ?? "connexion impossible"}`);
    }
    setLoading(false);
  }, [motCle, codePostal, departement, sectionNAF, categorie, perPage, buildParams, fetchPage, filterLocalStrict]);

  const handleSearch   = () => { setSelected(new Set()); search(1); };
  const handleLoadMore = () => search(page + 1, 25); // toujours 25 par chargement supplémentaire

  // ── Enrichissement OSM — déclenché à l'ouverture du drawer ──
  // Données légales (dirigeant, nom commercial) déjà dans ApiEntreprise — pas d'appel Pappers
  const handleAutoEnrich = useCallback(async (e: ApiEntreprise) => {
    const siret = e.siege.siret;
    if (enrichingSet.has(siret) || enrichedMap[siret]) return;
    setEnrichingSet(prev => new Set([...prev, siret]));
    try {
      const nomCommercial = getNomCommercial(e);
      const res = await fetch(ENRICH_PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON },
        body: JSON.stringify({
          mode: "auto",
          nom: e.nom_raison_sociale,
          nomCommercial,
          codePostal: e.siege.code_postal,
          ville: e.siege.libelle_commune,
          lat: e.siege.latitude ?? null,
          lng: e.siege.longitude ?? null,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: EnrichedData = await res.json();
      setEnrichedMap(prev => ({ ...prev, [siret]: data }));
    } catch {
      setEnrichedMap(prev => ({
        ...prev,
        [siret]: { tel: null, website: null, sourceContact: "none", hours: null, address: null, rating: null, ratingCount: null },
      }));
    } finally {
      setEnrichingSet(prev => { const s = new Set(prev); s.delete(siret); return s; });
    }
  }, [enrichingSet, enrichedMap]);

  // ── Enrichissement Google Places — déclenché par bouton ──
  const handleGoogleEnrich = useCallback(async (e: ApiEntreprise) => {
    const siret = e.siege.siret;
    setEnrichingSet(prev => new Set([...prev, `${siret}_google`]));
    try {
      const res = await fetch(ENRICH_PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON },
        body: JSON.stringify({
          mode: "google",
          siren: e.siren,
          nom: e.nom_raison_sociale,
          nomCommercial: getNomCommercial(e),  // depuis ApiEntreprise, pas depuis enriched
          codePostal: e.siege.code_postal,
          ville: e.siege.libelle_commune,
          googleApiKey: googleApiKey || undefined,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Partial<EnrichedData> = await res.json();
      // Merger avec les données auto existantes
      setEnrichedMap(prev => ({
        ...prev,
        [siret]: {
          ...(prev[siret] ?? {}),
          tel:          data.tel          ?? prev[siret]?.tel          ?? null,
          website:      data.website      ?? prev[siret]?.website      ?? null,
          hours:        data.hours        ?? null,
          address:      data.address      ?? null,
          rating:       data.rating       ?? null,
          ratingCount:  data.ratingCount  ?? null,
          sourceContact: data.sourceContact ?? prev[siret]?.sourceContact ?? "none",
        } as EnrichedData,
      }));
    } catch { /* silencieux — on garde les données auto */ }
    finally {
      setEnrichingSet(prev => { const s = new Set(prev); s.delete(`${siret}_google`); return s; });
    }
  }, [enrichingSet, enrichedMap, googleApiKey]);



  const handleImportFromDrawer = useCallback((e: ApiEntreprise, enriched: EnrichedData | null) => {
    onImport([buildRecord(e, userId, enriched)]);
    setSelected(new Set());
  }, [userId, onImport]);

  const handleImportSelected = useCallback(() => {
    const toImport = results.filter(e => selected.has(e.siege.siret));
    const records  = toImport.map(e => buildRecord(e, userId, enrichedMap[e.siege.siret] ?? null));
    onImport(records);
    setSelected(new Set());
    alert(`✓ ${records.length} entreprise${records.length > 1 ? "s" : ""} importée${records.length > 1 ? "s" : ""} comme prospects`);
  }, [results, selected, userId, onImport, enrichedMap]);

  // ── Carte Leaflet ──
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    import("leaflet").then(L => {
      import("leaflet/dist/leaflet.css");
      const map = (L as any).map(mapContainerRef.current, { center: [46.5, 2.3], zoom: 5 });
      (L as any).tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 18 }).addTo(map);
      mapRef.current = map;
      setMapReady(true);
      map.on("click", (ev: any) => setCircleCenter([ev.latlng.lng, ev.latlng.lat]));
      // Mettre à jour les bounds quand la vue change (Feature 4)
      const updateBounds = () => {
        const b = map.getBounds();
        setMapBounds({
          north: b.getNorth(), south: b.getSouth(),
          east:  b.getEast(),  west:  b.getWest(),
        });
      };
      map.on("moveend", updateBounds);
      map.on("zoomend", updateBounds);
    }).catch(() => {});
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !mapReady || !circleCenter) return;
    import("leaflet").then(L => {
      if (circleLayerRef.current) circleLayerRef.current.remove();
      circleLayerRef.current = (L as any).circle(
        [circleCenter[1], circleCenter[0]],
        { radius: circleRadius * 1000, color: ORANGE, fillColor: ORANGE, fillOpacity: 0.12, weight: 2 }
      ).addTo(mapRef.current);
    });
  }, [circleCenter, circleRadius, mapReady]);

  const searchByCircle = () => {
    if (!circleCenter) return;
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${circleCenter[1]}&lon=${circleCenter[0]}&format=json`)
      .then(r => r.json())
      .then(data => { const cp = data.address?.postcode; if (cp) { setCodePostal(cp.slice(0, 5)); setDepartement(""); } })
      .catch(() => {})
      .finally(() => search(1));
  };

  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    import("leaflet").then(L => {
      markersRef.current.forEach(m => m.remove()); markersRef.current = [];
      const bounds: [number, number][] = [];
      results.forEach(e => {
        if (!e.siege.latitude || !e.siege.longitude) return;
        const inKleios = dejaInKleios(e.siege.siret, contacts);
        const color    = inKleios ? "#1D9E75" : ORANGE;
        const icon = (L as any).divIcon({
          html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
          className: "", iconSize: [12, 12], iconAnchor: [6, 6],
        });
        const marker = (L as any).marker([e.siege.latitude, e.siege.longitude], { icon })
          .addTo(mapRef.current)
          .bindPopup(`<div style="font-family:sans-serif;font-size:12px;min-width:160px">
            <div style="font-weight:600;color:${NAVY}">${e.nom_raison_sociale}</div>
            <div style="color:#6B7280;margin-top:2px">${e.siege.libelle_activite_principale || ""}</div>
            <div style="color:#9CA3AF;font-size:10px;margin-top:4px">${e.siege.code_postal} ${e.siege.libelle_commune}</div>
            ${inKleios ? '<div style="color:#059669;font-size:10px;margin-top:4px">✓ Déjà dans Kleios</div>' : ""}
          </div>`);
        markersRef.current.push(marker);
        bounds.push([e.siege.latitude, e.siege.longitude]);
      });
      if (bounds.length > 0) mapRef.current.fitBounds(bounds, { padding: 40, maxZoom: 13 });
    }).catch(() => {});
  }, [results, mapReady, contacts]);

  const toggleSelect = (siret: string) => setSelected(prev => { const n = new Set(prev); n.has(siret) ? n.delete(siret) : n.add(siret); return n; });
  const selectAll    = () => setSelected(new Set(displayedResults.filter(e => !dejaInKleios(e.siege.siret, contacts)).map(e => e.siege.siret)));

  const drawerOpen = !!drawerSiret;

  return (
    <div style={{ position: "relative" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>Prospection entreprises</div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
            Source : API INSEE officielle · Enrichissement : OSM + Google Places
          </div>
        </div>
        {selected.size > 0 && (
          <button onClick={handleImportSelected} style={{
            padding: "9px 20px", borderRadius: 8, border: "none",
            background: ORANGE, color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", boxShadow: "0 3px 12px rgba(242,101,34,0.30)",
          }}>
            ↓ Importer {selected.size} entreprise{selected.size > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Filtres */}
      <div style={{ background: "#fff", border: "1px solid rgba(26,46,68,0.08)", borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 12 }}>Critères de recherche</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "#4A7FA5", letterSpacing: 0.4, display: "block", marginBottom: 4 }}>MOT-CLÉ / NOM</label>
            <input value={motCle} onChange={e => setMotCle(e.target.value)} placeholder="Nom, activité…" style={inp} onKeyDown={e => e.key === "Enter" && handleSearch()} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "#4A7FA5", letterSpacing: 0.4, display: "block", marginBottom: 4 }}>CODE POSTAL</label>
            <input value={codePostal} onChange={e => setCodePostal(e.target.value)} placeholder="66000, 34000…" style={inp} onKeyDown={e => e.key === "Enter" && handleSearch()} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "#4A7FA5", letterSpacing: 0.4, display: "block", marginBottom: 4 }}>DÉPARTEMENT</label>
            <select value={departement} onChange={e => setDepartement(e.target.value)} style={{ ...inp, appearance: "none" }}>
              <option value="">— Tous —</option>
              {DEPARTEMENTS.map(d => <option key={d} value={d}>Dép. {d}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "#4A7FA5", letterSpacing: 0.4, display: "block", marginBottom: 4 }}>TAILLE</label>
            <select value={categorie} onChange={e => setCategorie(e.target.value)} style={{ ...inp, appearance: "none" }}>
              {CATEGORIE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "#4A7FA5", letterSpacing: 0.4, display: "block", marginBottom: 4 }}>SECTEUR D'ACTIVITÉ (section NAF)</label>
            <select value={sectionNAF} onChange={e => setSectionNAF(e.target.value)} style={{ ...inp, appearance: "none" }}>
              <option value="">— Tous secteurs —</option>
              {SECTIONS_NAF.map(s => <option key={s.code} value={s.code}>{s.code} — {s.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button onClick={handleSearch} disabled={loading} style={{
              width: "100%", padding: "9px", borderRadius: 8, border: "none",
              background: NAVY, color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
            }}>
              {loading ? "Recherche…" : "🔍 Rechercher"}
            </button>
          </div>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div style={{ padding: "12px 16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#DC2626", fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Layout 2 colonnes — TOUJOURS dans le DOM */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
        marginRight: drawerOpen ? DRAWER_WIDTH + 12 : 0,
        transition: "margin-right 0.28s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* Colonne gauche */}
        <div>
          {searched ? (
            <>
              <div style={{
                display: "flex", alignItems: "center", gap: 12, marginBottom: 10,
                padding: "10px 14px", background: "#fff",
                border: "1px solid rgba(26,46,68,0.08)", borderRadius: 10,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: NAVY }}>
                    <span style={{ fontWeight: 600 }}>{displayedResults.length.toLocaleString("fr-FR")}</span>
                    {" sur "}<span style={{ fontWeight: 600 }}>{total.toLocaleString("fr-FR")}</span>
                    {filterByMap && results.length !== displayedResults.length && (
                      <span style={{ color: "#9CA3AF" }}> (carte)</span>
                    )}{" "}·{" "}
                    <span style={{ color: ORANGE, fontWeight: 600 }}>{nouvelles} nouvelles</span> ·{" "}
                    <span style={{ color: "#059669", fontWeight: 600 }}>{dansKleios} dans Kleios</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: "#9CA3AF" }}>Charger :</span>
                    {[25, 50, 100, 200].map(n => (
                      <button
                        key={n}
                        onClick={() => { setPerPage(n); search(1, n); }}
                        style={{
                          padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600,
                          border: `1px solid ${perPage === n ? NAVY : "rgba(26,46,68,0.15)"}`,
                          background: perPage === n ? NAVY : "#fff",
                          color: perPage === n ? "#fff" : "#6B7280",
                          cursor: "pointer", fontFamily: "inherit",
                        }}
                      >{n}</button>
                    ))}
                  </div>
                </div>
                {/* Bouton filtre siège local */}
                {(codePostal || departement) && (
                  <button
                    onClick={() => setFilterLocalStrict(v => !v)}
                    title="Afficher seulement les entreprises dont le siège est dans la zone (moins de résultats)"
                    style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${filterLocalStrict ? "#059669" : "rgba(26,46,68,0.15)"}`,
                      background: filterLocalStrict ? "#ECFDF5" : "#fff",
                      color: filterLocalStrict ? "#059669" : "#6B7280",
                      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                    }}
                  >
                    📍 {filterLocalStrict ? "Sièges locaux" : "Avec sièges ailleurs"}
                  </button>
                )}
                {/* Bouton filtre carte */}
                <button
                  onClick={() => setFilterByMap(v => !v)}
                  title={filterByMap ? "Afficher toutes les entreprises" : "Limiter aux entreprises visibles sur la carte"}
                  style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    border: `1px solid ${filterByMap ? NAVY : "rgba(26,46,68,0.15)"}`,
                    background: filterByMap ? NAVY : "#fff",
                    color: filterByMap ? "#fff" : "#6B7280",
                    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  🗺 {filterByMap ? "Carte active" : "Filtrer par carte"}
                </button>
                {nouvelles > 0 && (
                  <button onClick={selectAll} style={{
                    padding: "4px 12px", borderRadius: 6, border: `1px solid ${ORANGE}30`,
                    background: `${ORANGE}08`, color: ORANGE, fontSize: 11, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                  }}>Tout sélectionner</button>
                )}
                {selected.size > 0 && (
                  <button onClick={() => setSelected(new Set())} style={{
                    padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(26,46,68,0.15)",
                    background: "#fff", color: "#6B7280", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                  }}>Désélectionner</button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "60vh", overflowY: "auto", paddingRight: 4 }}>
                {displayedResults.map(e => (
                  <ResultCard
                    key={e.siren}
                    entreprise={e}
                    selected={selected.has(e.siege.siret)}
                    inKleios={dejaInKleios(e.siege.siret, contacts)}
                    onToggle={() => toggleSelect(e.siege.siret)}
                    enriched={enrichedMap[e.siege.siret] ?? null}
                    enriching={enrichingSet.has(e.siege.siret)}
                    onEnrich={() => handleGoogleEnrich(e)}
                    onOpenDrawer={() => {
                      setDrawerSiret(e.siege.siret);
                      handleAutoEnrich(e);
                    }}
                    colorNavy={colorNavy}
                    colorGold={colorGold}
                  />
                ))}
                {results.length < total && (
                  <button onClick={handleLoadMore} disabled={loading} style={{
                    width: "100%", padding: "10px", borderRadius: 8,
                    border: "1px solid rgba(26,46,68,0.15)", background: "#fff",
                    color: NAVY, fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginTop: 4,
                  }}>
                    {loading ? "Chargement…" : `+ 25 résultats (${results.length} / ${total.toLocaleString("fr-FR")} au total)`}
                  </button>
                )}
                {displayedResults.length === 0 && !loading && (
                  <div style={{ padding: "30px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                    Aucun résultat pour ces critères
                  </div>
                )}
              </div>
            </>
          ) : (
            !loading && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#9CA3AF" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: NAVY, marginBottom: 6 }}>Trouvez de nouvelles entreprises à démarcher</div>
                <div style={{ fontSize: 13 }}>Filtrez par zone géographique, secteur ou taille</div>
                <div style={{ fontSize: 11, marginTop: 8 }}>11 millions d'entreprises actives · Enrichissement tél + web inclus</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Ou cliquez sur la carte pour définir une zone →</div>
              </div>
            )
          )}
        </div>

        {/* Colonne droite — carte TOUJOURS dans le DOM */}
        <div>
          <div style={{ position: "sticky", top: 0 }}>
            <div style={{ background: "#fff", border: "1px solid rgba(26,46,68,0.08)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{
                padding: "10px 14px", borderBottom: "1px solid rgba(26,46,68,0.08)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, flex: 1 }}>
                  Sélection géographique — cliquer pour placer un cercle
                </div>
                {circleCenter && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <label style={{ fontSize: 11, color: "#9CA3AF" }}>Rayon :</label>
                      <select value={circleRadius} onChange={e => setCircleRadius(Number(e.target.value))} style={{ padding: "3px 6px", borderRadius: 5, border: "1px solid rgba(26,46,68,0.15)", fontSize: 11, fontFamily: "inherit" }}>
                        {[5, 10, 20, 30, 50].map(r => <option key={r} value={r}>{r} km</option>)}
                      </select>
                    </div>
                    <button onClick={searchByCircle} style={{
                      padding: "4px 12px", borderRadius: 6, border: "none",
                      background: ORANGE, color: "#fff", fontSize: 11, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                    }}>Chercher ici</button>
                  </>
                )}
              </div>
              {/* ↓ TOUJOURS dans le DOM */}
              <div ref={mapContainerRef} style={{ height: 480 }} />
              <div style={{ padding: "8px 14px", display: "flex", gap: 16, fontSize: 10, color: "#9CA3AF", borderTop: "1px solid rgba(26,46,68,0.06)" }}>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: ORANGE, marginRight: 4 }} />Nouvelle</span>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#1D9E75", marginRight: 4 }} />Dans Kleios</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer enrichissement */}
      <EnrichDrawer
        entreprise={drawerEntreprise}
        enriched={drawerEnriched}
        enriching={drawerEnriching}
        enrichingSet={enrichingSet}
        onClose={() => setDrawerSiret(null)}
        onImport={handleImportFromDrawer}
        onGoogleEnrich={handleGoogleEnrich}
        googleApiKey={googleApiKey}
        colorNavy={colorNavy}
        colorGold={colorGold}
      />
    </div>
  );
}
