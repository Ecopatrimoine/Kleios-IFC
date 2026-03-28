// src/components/CampagnesIFC.tsx
// Campagnes IFC — Templates modifiables + sélection destinataires
// ─────────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback } from "react";
import type { ContactRecord } from "../types/crm";

interface CampagnesIFCProps {
  contacts: ContactRecord[];
  colorNavy: string;
  colorGold: string;
  campusList: string[];
}

// ── Types ─────────────────────────────────────────────────

interface Template {
  id: string;
  nom: string;
  sujet: string;
  corps: string;
  icon: string;
  cible: string; // description courte de la cible par défaut
}

interface FiltreDestinataires {
  statuts: string[];
  campus: string[];
  sections: string[];        // sections NAF (G, I, F...)
  taille: string;            // "" | "PME" | "GE"
  sansAlternantDepuis: number; // 0 = pas de filtre, sinon nb mois
  dernierEchangeDepuis: number;// 0 = pas de filtre
  avecPosteActif: boolean;
  jamaisContacte: boolean;
}

// ── Templates prédéfinis ──────────────────────────────────

const TEMPLATES_DEFAUT: Template[] = [
  {
    id: "recherche_alternants",
    nom: "Recherche d'alternants",
    icon: "🎓",
    cible: "Partenaires + Prospects",
    sujet: "IFC Perpignan — Recherche d'alternants [FORMATION] [ANNEE]",
    corps: `Madame, Monsieur,

L'IFC Perpignan, centre de formation supérieure depuis plus de 30 ans, recherche des entreprises partenaires pour accueillir ses étudiants en alternance.

Nos formations disponibles :
- BTS NDRC — Négociation et Digitalisation de la Relation Client
- BTS MCO — Management Commercial Opérationnel  
- DCG — Diplôme de Comptabilité et Gestion
- Bachelor Communication

Accueillir un alternant, c'est :
✓ Bénéficier d'une aide financière jusqu'à 6 000 €/an
✓ Former un futur collaborateur à votre culture d'entreprise
✓ Contribuer à l'insertion professionnelle des jeunes du territoire

Nous serions ravis d'échanger avec vous sur vos besoins.

Cordialement,
[NOM RRE]
Responsable Relations Entreprises — IFC Perpignan
[TEL] | [EMAIL]`,
  },
  {
    id: "taxe_apprentissage",
    nom: "Taxe d'apprentissage",
    icon: "💶",
    cible: "Partenaires actifs",
    sujet: "Taxe d'apprentissage [ANNEE] — IFC Perpignan",
    corps: `Madame, Monsieur,

Dans le cadre de la campagne de collecte de la taxe d'apprentissage [ANNEE], nous vous recontactons afin de vous rappeler que vous pouvez affecter votre solde de taxe d'apprentissage à l'IFC Perpignan.

En fléchant votre taxe vers notre établissement, vous soutenez directement la formation des étudiants que vous accueillez ou avez accueillis en alternance.

Numéro UAI de l'IFC Perpignan : [UAI]

La démarche est simple et se fait en ligne sur la plateforme SOLTéA avant le 31 mai [ANNEE].

N'hésitez pas à nous contacter pour toute question.

Cordialement,
[NOM RRE]
IFC Perpignan | [TEL] | [EMAIL]`,
  },
  {
    id: "nouvelle_formation",
    nom: "Nouvelle formation",
    icon: "📚",
    cible: "Prospects par secteur",
    sujet: "Nouvelle formation [FORMATION] disponible à l'IFC Perpignan",
    corps: `Madame, Monsieur,

L'IFC Perpignan a le plaisir de vous annoncer l'ouverture d'une nouvelle formation en alternance : [FORMATION].

Cette formation de niveau [NIVEAU] est idéalement adaptée aux entreprises de votre secteur d'activité.

Points clés :
- Durée : [DUREE]
- Rythme : [RYTHME] (ex: 3 jours en entreprise / 2 jours en cours)
- Rentrée : [DATE RENTREE]
- Aide à l'embauche : jusqu'à [MONTANT AIDE] pour les entreprises de moins de 250 salariés

Nous serions heureux de vous présenter cette formation et d'étudier avec vous les possibilités de collaboration.

Cordialement,
[NOM RRE]
IFC Perpignan | [TEL] | [EMAIL]`,
  },
  {
    id: "invitation_forum",
    nom: "Invitation forum",
    icon: "📅",
    cible: "Tous les contacts",
    sujet: "Invitation — Forum Alternance IFC Perpignan — [DATE]",
    corps: `Madame, Monsieur,

L'IFC Perpignan organise son Forum Alternance le [DATE] de [HEURE DEBUT] à [HEURE FIN] au [LIEU].

Cet événement est l'occasion idéale pour :
✓ Rencontrer directement nos étudiants à la recherche d'une entreprise
✓ Présenter vos postes à pourvoir
✓ Échanger avec notre équipe pédagogique

Entrée libre. Parking disponible.

Pour confirmer votre participation et réserver votre stand, merci de répondre à ce mail avant le [DATE LIMITE].

Nous nous réjouissons de vous accueillir !

Cordialement,
[NOM RRE]
IFC Perpignan | [TEL] | [EMAIL]`,
  },
  {
    id: "remerciement",
    nom: "Remerciement partenaire",
    icon: "🙏",
    cible: "Partenaires actifs",
    sujet: "Merci pour votre confiance — IFC Perpignan",
    corps: `Madame, Monsieur,

Au terme de cette année [ANNEE], nous souhaitions vous adresser nos sincères remerciements pour votre engagement à nos côtés.

Votre confiance et votre implication dans l'accompagnement de nos alternants contribuent directement à leur réussite professionnelle et au dynamisme de notre territoire.

Nous espérons pouvoir continuer cette belle collaboration en [ANNEE+1] et restons à votre disposition pour toute question.

Meilleurs vœux pour la nouvelle année.

Cordialement,
[NOM RRE]
IFC Perpignan | [TEL] | [EMAIL]`,
  },
  {
    id: "relance_prospect",
    nom: "Relance prospect inactif",
    icon: "🔄",
    cible: "Prospects sans échange > 3 mois",
    sujet: "Prenons contact — IFC Perpignan",
    corps: `Madame, Monsieur,

Nous nous permettons de vous recontacter suite à notre précédente prise de contact.

L'IFC Perpignan accompagne chaque année plus de [NB] entreprises du territoire dans leur démarche d'alternance. Nous serions heureux de pouvoir échanger avec vous sur vos besoins actuels et futurs.

Avez-vous des postes à pourvoir pour lesquels nous pourrions vous proposer des candidats ?

Un simple retour par mail ou par téléphone nous permettrait d'avancer ensemble.

Cordialement,
[NOM RRE]
IFC Perpignan | [TEL] | [EMAIL]`,
  },
  {
    id: "libre",
    nom: "Campagne libre",
    icon: "✏️",
    cible: "Au choix",
    sujet: "",
    corps: "",
  },
];

const SECTIONS_NAF = [
  { code: "G", label: "Commerce" },
  { code: "I", label: "Hébergement / Restauration" },
  { code: "F", label: "Construction" },
  { code: "M", label: "Conseil / Publicité" },
  { code: "J", label: "Informatique / Communication" },
  { code: "K", label: "Finance / Assurance" },
  { code: "L", label: "Immobilier" },
  { code: "N", label: "Services admin." },
  { code: "P", label: "Enseignement" },
  { code: "Q", label: "Santé / Social" },
  { code: "H", label: "Transport" },
  { code: "C", label: "Industrie" },
  { code: "S", label: "Services aux particuliers" },
];

const FILTRE_VIDE: FiltreDestinataires = {
  statuts: [], campus: [], sections: [], taille: "",
  sansAlternantDepuis: 0, dernierEchangeDepuis: 0,
  avecPosteActif: false, jamaisContacte: false,
};

// ── Helpers ───────────────────────────────────────────────

function getSectionNAF(codeApe: string): string {
  // codes APE → lettre de section (approximation par les premiers chiffres)
  const n = parseInt(codeApe?.slice(0, 2) ?? "0");
  if (n >= 45 && n <= 47) return "G";
  if (n >= 55 && n <= 56) return "I";
  if (n >= 41 && n <= 43) return "F";
  if (n >= 69 && n <= 75) return "M";
  if (n >= 58 && n <= 63) return "J";
  if (n >= 64 && n <= 66) return "K";
  if (n === 68) return "L";
  if (n >= 77 && n <= 82) return "N";
  if (n >= 85 && n <= 85) return "P";
  if (n >= 86 && n <= 88) return "Q";
  if (n >= 49 && n <= 53) return "H";
  if (n >= 10 && n <= 33) return "C";
  if (n >= 95 && n <= 96) return "S";
  return "";
}

function buildMailtoGrouped(emails: string[], sujet: string, corps: string): string {
  const bcc = emails.slice(1).join(",");
  const params = new URLSearchParams();
  params.set("subject", sujet);
  params.set("body", corps);
  if (bcc) params.set("bcc", bcc);
  return `mailto:${emails[0] ?? ""}?${params.toString().replace(/\+/g, "%20")}`;
}

// ── Composant ─────────────────────────────────────────────

export function CampagnesIFC({ contacts, colorNavy, colorGold, campusList }: CampagnesIFCProps) {
  const [templates, setTemplates]         = useState<Template[]>(TEMPLATES_DEFAUT);
  const [selectedTpl, setSelectedTpl]     = useState<Template>(TEMPLATES_DEFAUT[0]);
  const [editMode, setEditMode]           = useState(false);
  const [editSujet, setEditSujet]         = useState(TEMPLATES_DEFAUT[0].sujet);
  const [editCorps, setEditCorps]         = useState(TEMPLATES_DEFAUT[0].corps);
  const [filtre, setFiltre]               = useState<FiltreDestinataires>(FILTRE_VIDE);
  const [preview, setPreview]             = useState(false);

  // Sélection d'un template
  const selectTemplate = useCallback((tpl: Template) => {
    setSelectedTpl(tpl);
    setEditSujet(tpl.sujet);
    setEditCorps(tpl.corps);
    setEditMode(false);
    setPreview(false);
  }, []);

  // Sauvegarde d'un template modifié
  const saveTemplate = useCallback(() => {
    const updated = templates.map(t =>
      t.id === selectedTpl.id ? { ...t, sujet: editSujet, corps: editCorps } : t
    );
    setTemplates(updated);
    setSelectedTpl(prev => ({ ...prev, sujet: editSujet, corps: editCorps }));
    setEditMode(false);
  }, [templates, selectedTpl, editSujet, editCorps]);

  // Réinitialiser au template par défaut
  const resetTemplate = useCallback(() => {
    const original = TEMPLATES_DEFAUT.find(t => t.id === selectedTpl.id);
    if (original) {
      setEditSujet(original.sujet);
      setEditCorps(original.corps);
    }
  }, [selectedTpl]);

  // Filtrage des destinataires
  const destinataires = useMemo(() => {
    return contacts.filter(c => {
      const e = c.payload?.contact as any;

      // Statuts
      if (filtre.statuts.length > 0 && !filtre.statuts.includes(c.status ?? "")) return false;

      // Campus
      if (filtre.campus.length > 0 && !filtre.campus.includes(c.campus ?? "")) return false;

      // Taille
      if (filtre.taille === "PME") {
        const nb = parseInt(e?.nbSalaries ?? "999");
        if (nb >= 250) return false;
      }
      if (filtre.taille === "GE") {
        const nb = parseInt(e?.nbSalaries ?? "0");
        if (nb < 250) return false;
      }

      // Section NAF
      if (filtre.sections.length > 0) {
        const section = getSectionNAF(e?.codeApe ?? "");
        if (!filtre.sections.includes(section)) return false;
      }

      // Email requis
      if (!e?.email) return false;

      return true;
    });
  }, [contacts, filtre]);

  const emails = destinataires.map(c => (c.payload?.contact as any)?.email).filter(Boolean);

  const upd = (key: keyof FiltreDestinataires, val: any) => setFiltre(prev => ({ ...prev, [key]: val }));

  const toggleArr = (key: "statuts" | "campus" | "sections", val: string) => {
    setFiltre(prev => {
      const arr = prev[key] as string[];
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 7,
    border: "1px solid #E2E5EC", fontSize: 13, fontFamily: "inherit",
    outline: "none", color: "#1A1A1A", background: "#fff", boxSizing: "border-box",
  };

  const chip = (label: string, active: boolean, onClick: () => void, color = colorNavy) => (
    <button onClick={onClick} style={{
      padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      border: `1.5px solid ${active ? color : "#E2E5EC"}`,
      background: active ? `${color}15` : "#fff",
      color: active ? color : "#9CA3AF",
      cursor: "pointer", fontFamily: "inherit",
    }}>{label}</button>
  );

  return (
    <div style={{ display: "flex", gap: 16, height: "calc(100vh - 100px)", fontFamily: "inherit" }}>

      {/* ── Colonne gauche : templates ── */}
      <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: 0.5, marginBottom: 6 }}>TEMPLATES</div>
        {templates.map(tpl => (
          <button key={tpl.id} onClick={() => selectTemplate(tpl)} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 10, border: "none",
            background: selectedTpl.id === tpl.id ? `${colorNavy}12` : "#fff",
            borderLeft: `3px solid ${selectedTpl.id === tpl.id ? colorNavy : "transparent"}`,
            cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            boxShadow: selectedTpl.id === tpl.id ? "none" : "0 1px 3px rgba(0,0,0,0.05)",
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{tpl.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: selectedTpl.id === tpl.id ? colorNavy : "#1A1A1A", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{tpl.nom}</div>
              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{tpl.cible}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Zone centrale : éditeur + filtres ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>

        {/* Header template */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #E2E5EC", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>{selectedTpl.icon}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: colorNavy }}>{selectedTpl.nom}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>Cible par défaut : {selectedTpl.cible}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {!editMode ? (
                <button onClick={() => setEditMode(true)} style={{
                  padding: "7px 14px", borderRadius: 8, border: `1px solid ${colorNavy}30`,
                  background: "#fff", color: colorNavy, fontSize: 12, fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit",
                }}>✏️ Modifier</button>
              ) : (
                <>
                  <button onClick={resetTemplate} style={{
                    padding: "7px 14px", borderRadius: 8, border: "1px solid #E2E5EC",
                    background: "#fff", color: "#6B7280", fontSize: 12,
                    cursor: "pointer", fontFamily: "inherit",
                  }}>↺ Réinitialiser</button>
                  <button onClick={saveTemplate} style={{
                    padding: "7px 14px", borderRadius: 8, border: "none",
                    background: colorNavy, color: "#fff", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}>✓ Sauvegarder</button>
                </>
              )}
              <button onClick={() => setPreview(v => !v)} style={{
                padding: "7px 14px", borderRadius: 8, border: `1px solid ${colorGold}40`,
                background: preview ? `${colorGold}15` : "#fff",
                color: preview ? "#B8860B" : "#6B7280", fontSize: 12,
                cursor: "pointer", fontFamily: "inherit",
              }}>{preview ? "👁 Aperçu actif" : "👁 Aperçu"}</button>
            </div>
          </div>

          {/* Sujet */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, display: "block", marginBottom: 4 }}>SUJET</label>
            {editMode
              ? <input value={editSujet} onChange={e => setEditSujet(e.target.value)} style={inp} placeholder="Sujet de l'email…" />
              : <div style={{ fontSize: 13, color: "#1A1A1A", padding: "8px 10px", background: "#F9FAFB", borderRadius: 7, border: "1px solid #E2E5EC" }}>{editSujet || <span style={{ color: "#9CA3AF" }}>Aucun sujet</span>}</div>
            }
          </div>

          {/* Corps */}
          <div>
            <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, display: "block", marginBottom: 4 }}>CORPS DU MESSAGE</label>
            {editMode ? (
              <textarea value={editCorps} onChange={e => setEditCorps(e.target.value)} rows={12}
                style={{ ...inp, resize: "vertical", lineHeight: 1.6, fontFamily: "monospace", fontSize: 12 }}
                placeholder="Corps du message… Utilisez [NOM RRE], [TEL], [EMAIL] comme variables." />
            ) : (
              <pre style={{
                fontSize: 12, color: "#374151", padding: "12px 14px",
                background: "#F9FAFB", borderRadius: 7, border: "1px solid #E2E5EC",
                whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.6,
                maxHeight: 220, overflowY: "auto", margin: 0,
              }}>{editCorps || <span style={{ color: "#9CA3AF" }}>Aucun contenu</span>}</pre>
            )}
          </div>
          {editMode && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#9CA3AF" }}>
              💡 Variables disponibles : [NOM RRE] [TEL] [EMAIL] [DATE] [ANNEE] [FORMATION] [NIVEAU]
            </div>
          )}
        </div>

        {/* Filtres destinataires */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #E2E5EC", flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: 0.5, marginBottom: 12 }}>FILTRES DESTINATAIRES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Statut */}
            <div>
              <div style={{ fontSize: 11, color: "#4B5563", fontWeight: 600, marginBottom: 6 }}>Statut</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {chip("Partenaire", filtre.statuts.includes("partenaire"), () => toggleArr("statuts", "partenaire"), "#059669")}
                {chip("Prospect",   filtre.statuts.includes("prospect"),   () => toggleArr("statuts", "prospect"),   "#3B82F6")}
                {chip("Inactif",    filtre.statuts.includes("inactif"),    () => toggleArr("statuts", "inactif"),    "#9CA3AF")}
              </div>
            </div>

            {/* Campus */}
            {campusList.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "#4B5563", fontWeight: 600, marginBottom: 6 }}>Campus</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {campusList.map(c => chip(c, filtre.campus.includes(c), () => toggleArr("campus", c), colorNavy))}
                </div>
              </div>
            )}

            {/* Taille */}
            <div>
              <div style={{ fontSize: 11, color: "#4B5563", fontWeight: 600, marginBottom: 6 }}>Taille</div>
              <div style={{ display: "flex", gap: 6 }}>
                {chip("Toutes", filtre.taille === "", () => upd("taille", ""))}
                {chip("PME — < 250 sal.", filtre.taille === "PME", () => upd("taille", "PME"), "#F59E0B")}
                {chip("GE — ≥ 250 sal.", filtre.taille === "GE",  () => upd("taille", "GE"),  "#7C3AED")}
              </div>
            </div>

            {/* Secteur NAF */}
            <div>
              <div style={{ fontSize: 11, color: "#4B5563", fontWeight: 600, marginBottom: 6 }}>Secteur d'activité</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SECTIONS_NAF.map(s => chip(`${s.code} — ${s.label}`, filtre.sections.includes(s.code), () => toggleArr("sections", s.code), colorNavy))}
              </div>
            </div>

            {/* Reset filtres */}
            {(filtre.statuts.length > 0 || filtre.campus.length > 0 || filtre.sections.length > 0 || filtre.taille) && (
              <button onClick={() => setFiltre(FILTRE_VIDE)} style={{
                padding: "6px 14px", borderRadius: 8, border: "1px solid #FECACA",
                background: "#fff", color: "#DC2626", fontSize: 12,
                cursor: "pointer", fontFamily: "inherit", alignSelf: "flex-start",
              }}>✕ Réinitialiser les filtres</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Colonne droite : destinataires + envoi ── */}
      <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Compteur */}
        <div style={{
          background: "#fff", borderRadius: 12, padding: "16px 18px",
          border: "1px solid #E2E5EC", textAlign: "center",
        }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: destinataires.length > 0 ? colorNavy : "#9CA3AF" }}>
            {destinataires.length}
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>destinataire{destinataires.length > 1 ? "s" : ""} sélectionné{destinataires.length > 1 ? "s" : ""}</div>
          <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{emails.length} avec email</div>
        </div>

        {/* Boutons d'envoi */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {emails.length > 0 && (
            <a href={buildMailtoGrouped(emails, editSujet, editCorps)} style={{
              display: "block", padding: "11px 14px", borderRadius: 10, border: "none",
              background: colorNavy, color: "#fff", fontSize: 13, fontWeight: 600,
              textAlign: "center", textDecoration: "none", cursor: "pointer",
            }}>
              ✉ Ouvrir dans Outlook ({emails.length})
            </a>
          )}
          {emails.length > 0 && (
            <button onClick={() => navigator.clipboard.writeText(emails.join("; "))} style={{
              padding: "10px 14px", borderRadius: 10,
              border: `1px solid ${colorNavy}30`, background: "#fff",
              color: colorNavy, fontSize: 12, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}>📋 Copier les emails</button>
          )}
        </div>

        {/* Liste destinataires */}
        <div style={{ flex: 1, background: "#fff", borderRadius: 12, border: "1px solid #E2E5EC", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #E2E5EC", fontSize: 11, fontWeight: 700, color: "#9CA3AF" }}>
            DESTINATAIRES
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {destinataires.length === 0 ? (
              <div style={{ padding: "20px 14px", textAlign: "center", color: "#9CA3AF", fontSize: 12 }}>
                Aucune entreprise ne correspond aux filtres
              </div>
            ) : (
              destinataires.map(c => {
                const e = c.payload?.contact as any;
                return (
                  <div key={c.id} style={{ padding: "8px 14px", borderBottom: "1px solid #F3F4F6" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1A1A", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {c.displayName}
                    </div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {e?.email || "⚠ Pas d'email"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
