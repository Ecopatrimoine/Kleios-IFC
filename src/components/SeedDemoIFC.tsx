// src/components/SeedDemoIFC.tsx
// Injection de données démo IFC dans tous les modules
// Entreprises + Pipeline + Suivi tuteurs
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import type { ContactRecord } from "../types/crm";

interface SeedDemoProps {
  onSeed: (records: ContactRecord[]) => void;
  onClear: (ids: string[]) => void;
  contacts: ContactRecord[];
  userId: string;
}

const PIPELINE_KEY = "kleios_ifc_pipeline_";
const VISITES_KEY  = "kleios_ifc_visites_";

function parseAlternants(raw: string | undefined) {
  if (!raw) return [];
  return raw.split("#").map((entry, i) => {
    const parts = entry.trim().split(" - ");
    const nomComplet = parts[0] ?? "";
    const classeAnnee = parts[1] ?? "";
    const classe = classeAnnee.replace(/\s*\d{4}$/, "").trim();
    const annee = classeAnnee.match(/\d{4}/)?.[0] ?? "";
    const nomParts = nomComplet.replace(/^(M\.|Mme)\s+/, "").split(" ");
    const prenom = nomParts[0] ?? "";
    const nom = nomParts.slice(1).join(" ");
    return {
      id: `demo-alt-${i}-${Date.now()}`,
      prenom, nom, classe, annee,
      type: "apprentissage" as const,
      statut: annee >= "2025" ? "en_cours" as const : "termine" as const,
      dateDebut: `${annee}-09-01`, dateFin: `${parseInt(annee)+2}-07-31`,
      etudiantId: null, notes: "",
    };
  }).filter(a => a.prenom);
}

// ── Entreprises ───────────────────────────────────────────────────────────────
const DEMO_ENTREPRISES = [
  { nom: "100% ENERGIE", forme: "SARL", siret: "899 408 678 00001", address1: "54 BD DE L'ATELIER", postalCode: "66240", city: "Saint-Estève", email: "contact@100pour100energie.com", codeApe: "4321A", activite: "ENERGIES RENOUVELABLES", opco: "CONSTRUCTYS (TOULOUSE)", conventionCollective: "BATIMENT", nbSalaries: "6", status: "partenaire" as const, campus: "IFC Perpignan", alternants: "Mme Clara GACHE - BCGPF 2025 - 100% ENERGIE#Mme Clara GACHE - GPME 2023 - 100% ENERGIE" },
  { nom: "15 R", forme: "SARL", siret: "933 952 970 00012", address1: "3 RUE ROGER ORIOL", postalCode: "66390", city: "Baixas", email: "j.martin@15r.fr", telMobile: "06 52 55 22 91", codeApe: "6920Z", activite: "Expertise comptable", opco: "ATLAS", conventionCollective: "CC DES EXPERTS COMPTABLES", nbSalaries: "1", status: "partenaire" as const, campus: "IFC Perpignan", alternants: "Mme Myriam SOUCI - CG 2025 - 15 R" },
  { nom: "1976", enseigne: "Boutique le 9", forme: "SASU", siret: "802 462 770 00032", address1: "1 RUE DU FOUR SAINT JEAN", postalCode: "66000", city: "PERPIGNAN", email: "contact@boutiquele9.com", codeApe: "4771Z", activite: "Boutique/Vente de produit de luxe", opco: "OPCO EP OCCITANIE", conventionCollective: "Commerce détail habillement", nbSalaries: "3", status: "partenaire" as const, campus: "IFC Perpignan", alternants: "Mme Charlazed HENNI - BCAC 1 2025 - 1976#M. Smail BARHA - COMA 2022 - 1976" },
  { nom: "4AB", forme: "SAS", siret: "901 527 184 00021", address1: "16 chemin de Saint Gaudérique", postalCode: "66330", city: "Cabestany", email: "comptagroupe4ab@gmail.com", telMobile: "06 48 35 50 13", codeApe: "5610A", activite: "HOLDING", opco: "AKTO", conventionCollective: "Bureaux d'études SYNTEC", nbSalaries: "2", status: "partenaire" as const, campus: "IFC Perpignan", alternants: "Mme Maud BELLET ALAMINOS - CG 2024 - 4AB#M. Jules BOURRIER - COMA 2023 - 4AB" },
  { nom: "A BATIMENT", forme: "SAS", siret: "817 775 034 00017", address1: "32 BD de l'atelier", address2: "ZA la mirande nouvelle", postalCode: "66240", city: "Saint-Estève", email: "a.batiment@orange.fr", telMobile: "06 16 34 85 38", codeApe: "4399C", activite: "Maçonnerie générale", opco: "CONSTRUCTYS", conventionCollective: "Travaux maçonnerie générale", nbSalaries: "8", status: "partenaire" as const, campus: "IFC Perpignan", alternants: "Mme Songul ARIKAN - CG 2024 - A BATIMENT" },
  { nom: "A PADEL", forme: "SAS", siret: "927 852 087 00018", address1: "11 avenue de la padrouze", postalCode: "66300", city: "THUIR", email: "apadel.thuir@gmail.com", telMobile: "06 49 54 96 06", codeApe: "9311Z", activite: "PADEL", opco: "AFDAS", conventionCollective: "CCN DU SPORT", nbSalaries: "5", status: "partenaire" as const, campus: "IFC Perpignan", alternants: "M. Adrien SIRE - BCAC 1 2025 - A PADEL#Mme Malia HOSTAILLÉ-BENADJAMIA - COMA 2025 - A PADEL" },
  { nom: "A2 POLE ENTREPRISES", forme: "Association", siret: "893 227 512 00017", address1: "449 avenue de St Charles", postalCode: "66000", city: "Perpignan", email: "direction@a2peps.com", codeApe: "9499Z", activite: "Association économique", opco: "UNIFORMATION", conventionCollective: "ECLAT", nbSalaries: "1", status: "partenaire" as const, campus: "IFC Perpignan", alternants: "M. Baptiste BOURRAT - NDRC 2024 - A2 POLE ENTREPRISES" },
  { nom: "A3F EXPERTS", forme: "SAS", siret: "952 663 789 00016", address1: "5 RUE DU PLAN PALAIS", postalCode: "34000", city: "Montpellier", codeApe: "6920Z", activite: "EXPERTISE COMPTABLE", opco: "OPCO ATLAS", nbSalaries: "4", status: "prospect" as const, campus: "IFC Montpellier", alternants: "M. Hennessy CONSTANTINO - CG 2023 - A3F EXPERTS" },
  { nom: "A4 COMMUNICATION", forme: "SASU", siret: "504 171 125 00025", address1: "17 Boulevard Évadés de France", address2: "Epicentre", postalCode: "66200", city: "ELNE", email: "agencea4@wanadoo.fr", telMobile: "06 62 29 94 62", codeApe: "7312Z", activite: "Régie Publicitaire", opco: "AFDAS", conventionCollective: "Publicité", nbSalaries: "5", status: "partenaire" as const, campus: "IFC Perpignan", alternants: "M. Tom WARIN - GPME 2025 - A4 COMMUNICATION#Mme Amel GHARBI - COMA 2024 - A4 COMMUNICATION#Mme Zina BEDJAOUI - BCACMO 2023 - A4 COMMUNICATION" },
  { nom: "AB Conseils", enseigne: "Aurélia BURET EI", forme: "EI", siret: "511 438 616 00043", address1: "36 BD DE L'ESPLANADE", postalCode: "83680", city: "La Garde-Freinet", email: "contact@abconseils.pro", telMobile: "07 77 79 79 01", codeApe: "8211Z", activite: "SERVICES ADMINISTRATIFS", opco: "OPCO EP", conventionCollective: "PERSONNEL PRESTATAIRES TERTIAIRE", nbSalaries: "0", status: "inactif" as const, campus: "IFC Perpignan", alternants: "Mme Camille MONTEL - GPME 2024 - AB Conseils#Mme Victoria GAUD - GPME 2024 - AB Conseils" },
];

// ── Pipeline ──────────────────────────────────────────────────────────────────
const DEMO_PIPELINE = [
  { prenom: "Lucas", nom: "MARTINEZ", formation: "BTS NDRC", campus: "IFC Perpignan", stage: "cherche", entrepriseNom: "", rre: "Sophie Blanc", notes: "Cherche dans le secteur commercial, préfère Perpignan centre" },
  { prenom: "Emma", nom: "DUPONT", formation: "BTS GPME", campus: "IFC Perpignan", stage: "cherche", entrepriseNom: "", rre: "Thomas Roux", notes: "Disponible immédiatement, profil sérieux" },
  { prenom: "Nathan", nom: "GARCIA", formation: "BTS NDRC", campus: "IFC Montpellier", stage: "cv_envoye", entrepriseNom: "A PADEL", rre: "Sophie Blanc", notes: "CV envoyé le 15/01 — relance prévue" },
  { prenom: "Jade", nom: "BERNARD", formation: "BTS Communication", campus: "IFC Perpignan", stage: "cv_envoye", entrepriseNom: "A4 COMMUNICATION", rre: "Marie Leroy", notes: "Profil créatif, très bon portfolio" },
  { prenom: "Hugo", nom: "LEFEVRE", formation: "BTS Comptabilité Gestion", campus: "IFC Perpignan", stage: "cv_envoye", entrepriseNom: "15 R", rre: "Thomas Roux", notes: "En attente de retour de l'entreprise" },
  { prenom: "Camille", nom: "MOREAU", formation: "BTS NDRC", campus: "IFC Perpignan", stage: "apparie", entrepriseNom: "100% ENERGIE", rre: "Sophie Blanc", notes: "Entretien réalisé le 20/01 — bonne impression côté entreprise" },
  { prenom: "Tom", nom: "WARIN", formation: "BTS GPME", campus: "IFC Perpignan", stage: "apparie", entrepriseNom: "A4 COMMUNICATION", rre: "Marie Leroy", notes: "Contrat en cours de finalisation" },
  { prenom: "Amel", nom: "GHARBI", formation: "BTS Communication", campus: "IFC Perpignan", stage: "place", entrepriseNom: "A4 COMMUNICATION", rre: "Marie Leroy", notes: "Contrat signé le 01/09/2024" },
  { prenom: "Clara", nom: "GACHE", formation: "BTS GPME", campus: "IFC Perpignan", stage: "place", entrepriseNom: "100% ENERGIE", rre: "Sophie Blanc", notes: "2ème année, très bien intégrée" },
  { prenom: "Baptiste", nom: "BOURRAT", formation: "BTS NDRC", campus: "IFC Perpignan", stage: "place", entrepriseNom: "A2 POLE ENTREPRISES", rre: "Thomas Roux", notes: "Excellent retour du tuteur" },
  { prenom: "Adrien", nom: "SIRE", formation: "BTS GPME", campus: "IFC Perpignan", stage: "place", entrepriseNom: "A PADEL", rre: "Sophie Blanc", notes: "En cours — année 1" },
  { prenom: "Songul", nom: "ARIKAN", formation: "BTS Comptabilité Gestion", campus: "IFC Perpignan", stage: "place", entrepriseNom: "A BATIMENT", rre: "Thomas Roux", notes: "Bonne progression" },
];

// ── Visites tuteurs ───────────────────────────────────────────────────────────
const today = new Date();
const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().slice(0,10); };
const daysFromNow = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); };

const DEMO_VISITES = [
  { prenom: "Amel", nom: "GHARBI", formation: "BTS Communication", campus: "IFC Perpignan", entrepriseNom: "A4 COMMUNICATION", tuteurNom: "Jean-Marc CASTEL", tuteurFonction: "Directeur création", statut: "realisee", dateVisite: daysAgo(45), dateProchaine: daysFromNow(135), frequenceMois: 6, rre: "Marie Leroy", cr: "Très bon suivi. Amel s'est parfaitement intégrée à l'équipe. Elle gère désormais les réseaux sociaux en autonomie.", pointsPositifs: "Autonomie, créativité, ponctualité", pointsAttention: "" },
  { prenom: "Clara", nom: "GACHE", formation: "BTS GPME", campus: "IFC Perpignan", entrepriseNom: "100% ENERGIE", tuteurNom: "Pierre MARTIN", tuteurFonction: "Gérant", statut: "realisee", dateVisite: daysAgo(20), dateProchaine: daysFromNow(160), frequenceMois: 6, rre: "Sophie Blanc", cr: "Clara maîtrise bien les outils de gestion. En progression sur la relation client.", pointsPositifs: "Rigueur, sérieux", pointsAttention: "Développer la prise d'initiative" },
  { prenom: "Tom", nom: "WARIN", formation: "BTS GPME", campus: "IFC Perpignan", entrepriseNom: "A4 COMMUNICATION", tuteurNom: "Jean-Marc CASTEL", tuteurFonction: "Directeur création", statut: "planifiee", dateVisite: daysFromNow(8), dateProchaine: daysFromNow(188), frequenceMois: 6, rre: "Marie Leroy", cr: "", pointsPositifs: "", pointsAttention: "" },
  { prenom: "Camille", nom: "MOREAU", formation: "BTS NDRC", campus: "IFC Perpignan", entrepriseNom: "100% ENERGIE", tuteurNom: "Pierre MARTIN", tuteurFonction: "Gérant", statut: "planifiee", dateVisite: daysFromNow(3), dateProchaine: daysFromNow(183), frequenceMois: 6, rre: "Sophie Blanc", cr: "", pointsPositifs: "", pointsAttention: "" },
  { prenom: "Baptiste", nom: "BOURRAT", formation: "BTS NDRC", campus: "IFC Perpignan", entrepriseNom: "A2 POLE ENTREPRISES", tuteurNom: "Rémi AUBERT", tuteurFonction: "Directeur", statut: "realisee", dateVisite: daysAgo(90), dateProchaine: daysFromNow(-5), frequenceMois: 6, rre: "Thomas Roux", cr: "Visite satisfaisante. Baptiste est apprécié par toute l'équipe.", pointsPositifs: "Relationnel, dynamisme", pointsAttention: "" },
  { prenom: "Adrien", nom: "SIRE", formation: "BTS GPME", campus: "IFC Perpignan", entrepriseNom: "A PADEL", tuteurNom: "Karim HASSAN", tuteurFonction: "Gérant", statut: "realisee", dateVisite: daysAgo(100), dateProchaine: daysFromNow(-10), frequenceMois: 6, rre: "Sophie Blanc", cr: "Bon démarrage mais quelques difficultés sur la gestion administrative.", pointsPositifs: "Motivation, investissement", pointsAttention: "Renforcer les compétences en facturation" },
  { prenom: "Songul", nom: "ARIKAN", formation: "BTS Comptabilité Gestion", campus: "IFC Perpignan", entrepriseNom: "A BATIMENT", tuteurNom: "Ahmed KARA", tuteurFonction: "Responsable administratif", statut: "a_planifier", dateVisite: daysAgo(180), dateProchaine: daysFromNow(-20), frequenceMois: 6, rre: "Thomas Roux", cr: "", pointsPositifs: "", pointsAttention: "Visite en retard — à programmer d'urgence" },
  { prenom: "Nathan", nom: "GARCIA", formation: "BTS NDRC", campus: "IFC Montpellier", entrepriseNom: "A PADEL", tuteurNom: "Karim HASSAN", tuteurFonction: "Gérant", statut: "planifiee", dateVisite: daysFromNow(21), dateProchaine: daysFromNow(201), frequenceMois: 6, rre: "Sophie Blanc", cr: "", pointsPositifs: "", pointsAttention: "" },
];

function buildEntrepriseRecord(data: typeof DEMO_ENTREPRISES[0], userId: string): ContactRecord {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const alternants = parseAlternants(data.alternants);
  return {
    id, userId, displayName: data.nom, status: data.status,
    ploutosClientId: null, campus: data.campus,
    city: (data as any).city, siret: data.siret,
    payload: {
      contact: { id, userId, formeJuridique: data.forme, nom: data.nom, enseigne: (data as any).enseigne ?? "", siret: data.siret, codeApe: data.codeApe ?? "", codeIdcc: "", numeroTva: "", address1: (data as any).address1 ?? "", address2: (data as any).address2 ?? "", postalCode: (data as any).postalCode ?? "", city: (data as any).city ?? "", email: (data as any).email ?? "", telFixe: (data as any).telFixe ?? "", telMobile: (data as any).telMobile ?? "", website: "", nbSalaries: data.nbSalaries ?? "", activite: data.activite ?? "", conventionCollective: data.conventionCollective ?? "", opco: data.opco ?? "", caisseRetraite: "", organismePrevoyanc: "", nonAssujeti: false, status: data.status, campus: data.campus, notes: "", scoreRelation: data.status === "partenaire" ? 4 : 2, prochainerelance: "", createdAt: now, updatedAt: now, syncedAt: null } as any,
      contacts: [], alternants, postes: [], echanges: [],
      documents: [], contracts: [], events: [], deals: [], compliance: null, commissions: [], portal: null,
    } as any,
    createdAt: now, updatedAt: now, syncedAt: null, _isDemoData: true,
  } as any;
}

function injectPipeline(userId: string, entrepriseRecords: ContactRecord[]) {
  const now = new Date().toISOString();
  const cards = DEMO_PIPELINE.map((d, i) => {
    const ent = entrepriseRecords.find(e => e.displayName === d.entrepriseNom);
    return {
      id: crypto.randomUUID(), userId,
      prenomEtudiant: d.prenom, nomEtudiant: d.nom,
      formation: d.formation, campus: d.campus,
      stage: d.stage, entrepriseId: ent?.id ?? null,
      entrepriseNom: d.entrepriseNom, rre: d.rre,
      dateDerniereAction: daysAgo(i * 3 + 1), notes: d.notes,
      createdAt: now, updatedAt: now, _isDemoData: true,
    };
  });
  localStorage.setItem(PIPELINE_KEY + userId, JSON.stringify(cards));
}

function injectVisites(userId: string, entrepriseRecords: ContactRecord[]) {
  const now = new Date().toISOString();
  const visites = DEMO_VISITES.map(d => {
    const ent = entrepriseRecords.find(e => e.displayName === d.entrepriseNom);
    return {
      id: crypto.randomUUID(), userId,
      prenomEtudiant: d.prenom, nomEtudiant: d.nom,
      formation: d.formation, campus: d.campus,
      entrepriseId: ent?.id ?? "", entrepriseNom: d.entrepriseNom,
      tuteurNom: d.tuteurNom, tuteurFonction: d.tuteurFonction,
      statut: d.statut, dateVisite: d.dateVisite,
      dateProchaine: d.dateProchaine, frequenceMois: d.frequenceMois,
      rre: d.rre, cr: d.cr, pointsPositifs: d.pointsPositifs,
      pointsAttention: d.pointsAttention,
      createdAt: now, updatedAt: now, _isDemoData: true,
    };
  });
  localStorage.setItem(VISITES_KEY + userId, JSON.stringify(visites));
}

function clearPipelineDemo(userId: string) {
  const raw = localStorage.getItem(PIPELINE_KEY + userId);
  if (!raw) return;
  const cards = JSON.parse(raw).filter((c: any) => !c._isDemoData);
  localStorage.setItem(PIPELINE_KEY + userId, JSON.stringify(cards));
}

function clearVisitesDemo(userId: string) {
  const raw = localStorage.getItem(VISITES_KEY + userId);
  if (!raw) return;
  const visites = JSON.parse(raw).filter((v: any) => !v._isDemoData);
  localStorage.setItem(VISITES_KEY + userId, JSON.stringify(visites));
}

// ── Composant ─────────────────────────────────────────────────────────────────
export function SeedDemoIFC({ onSeed, onClear, contacts, userId }: SeedDemoProps) {
  const [seeded, setSeeded] = useState(false);
  const demoIds = contacts.filter(c => (c as any)._isDemoData).map(c => c.id);
  const hasDemo = demoIds.length > 0;

  const handleSeed = () => {
    const records = DEMO_ENTREPRISES.map(d => buildEntrepriseRecord(d, userId));
    onSeed(records);
    // Injecter pipeline et visites après un court délai
    setTimeout(() => {
      injectPipeline(userId, records);
      injectVisites(userId, records);
      setSeeded(true);
    }, 300);
  };

  const handleClear = () => {
    onClear(demoIds);
    clearPipelineDemo(userId);
    clearVisitesDemo(userId);
    setSeeded(false);
  };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
      {!hasDemo ? (
        <button onClick={handleSeed} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#1A2E44", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px rgba(26,46,68,0.30)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🏢</span>
          Charger les données démo
        </button>
      ) : (
        <button onClick={handleClear} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(220,38,38,0.3)", background: "#fff", color: "#DC2626", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}>
          ✕ Supprimer les démos ({demoIds.length} entreprises)
        </button>
      )}
      {seeded && (
        <div style={{ fontSize: 11, color: "#059669", background: "#fff", padding: "4px 10px", borderRadius: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          ✓ 10 entreprises · 12 étudiants pipeline · 8 visites chargés
        </div>
      )}
    </div>
  );
}
