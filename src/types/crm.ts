// ============================================================
// KLEIOS IFC — Types TypeScript
// Modèle : Entreprise (ex-Contact CGP)
// ============================================================

// ------------------------------------------------------------
// 1. CABINET / PARAMÈTRES
// ------------------------------------------------------------

export interface CalEventType {
  id: string; label: string; slug: string; url: string;
  duration: number; defaultChannel: "tel" | "visio" | "physique";
}

export interface CabinetSettings {
  cabinetName: string;
  orias: string; rcp: string; mediateur: string;
  address: string; postalCode: string; city: string;
  phone: string; email: string; website: string;
  colorNavy: string; colorGold: string; colorBg: string;
  signatureProvider: "none" | "yousign" | "docusign" | "hellosign";
  signatureApiKey: string;
  rdvProvider: "none" | "cal" | "calendly" | "custom";
  rdvUrl: string; calApiKey: string; calUsername: string;
  calEventTypes: CalEventType[];
  commissionRates: Array<{ insurer: string; entree: string; gestion: string; arbitrage: string }>;
  senderName: string;
  senderEmail: string;
  googlePlacesApiKey?: string;  // clé Google Places API — gérée par le client
  campus: string;       // campus IFC du RRE
  isAdmin: boolean;     // accès multi-campus
  // Objectifs — fixés par le directeur/admin, consultables par les RRE
  objectifVisitesMois: number;        // visites tuteurs / mois
  objectifTauxPlacement: number;      // taux placement cible (%)
  objectifPartenaires: number;        // nb entreprises partenaires cible
  objectifProspects: number;          // nb prospects à contacter / mois
}

// ------------------------------------------------------------
// 2. ENTREPRISE — entité principale
// ------------------------------------------------------------

export type EntrepriseStatus = "partenaire" | "prospect" | "inactif";

export interface Entreprise {
  id: string;
  userId: string;
  // Identité juridique
  formeJuridique: string;       // SARL, SAS, SASU...
  nom: string;
  enseigne: string;
  siret: string;
  codeApe: string;
  codeIdcc: string;
  numeroTva: string;
  // Coordonnées
  address1: string;
  address2: string;
  postalCode: string;
  city: string;
  email: string;
  telFixe: string;
  telMobile: string;
  website: string;
  // Infos RH / formation
  nbSalaries: string;
  activite: string;
  conventionCollective: string;
  opco: string;
  caisseRetraite: string;
  organismePrevoyanc: string;
  nonAssujeti: boolean;         // non assujetti taxe apprentissage
  // Champs réservés — compatibilité données existantes
  person1?: any;
  person2?: any;
  // CRM
  status: EntrepriseStatus;
  campus: string;               // campus IFC qui gère cette entreprise
  notes: string;
  scoreRelation: number;        // 0-5 — fidélité / potentiel
  prochainerelance: string;     // ISO date
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}

// ------------------------------------------------------------
// 3. CONTACTS EN ENTREPRISE
// ------------------------------------------------------------

export type ContactRole = "dirigeant" | "tuteur" | "rh" | "contact_principal" | "autre";

export interface EntrepriseContact {
  id: string;
  role: ContactRole;
  gender: "M" | "F" | "";
  firstName: string;
  lastName: string;
  fonction: string;
  email: string;
  phone: string;
  notes: string;
}

// ------------------------------------------------------------
// 4. ALTERNANTS — historique + postes à pourvoir
// ------------------------------------------------------------

export type AlternantType = "apprentissage" | "pro" | "stage";

export interface Alternant {
  id: string;
  prenom: string;
  nom: string;
  classe: string;                // ex: "BTS NDRC 2024"
  annee: string;                 // ex: "2024"
  type: AlternantType;
  statut: "en_cours" | "termine" | "rompu";
  dateDebut: string;
  dateFin: string;
  // Lien vers l'étudiant si dans Kleios
  etudiantId: string | null;
  notes: string;
}

export interface PosteAPourvoir {
  id: string;
  titre: string;
  description: string;
  formations: string[];          // formations ciblées ex: ["BTS NDRC", "Bachelor Comm"]
  type: AlternantType;
  dateOuverture: string;
  status: "ouvert" | "pourvu" | "annule";
  // Candidats présentés
  candidats: Array<{
    etudiantId: string;
    nom: string;
    prenom: string;
    classe: string;
    datePresentation: string;
    apparie: boolean;
  }>;
  notes: string;
  createdAt: string;
}

// ------------------------------------------------------------
// 5. ÉCHANGES / RELANCES RRE
// ------------------------------------------------------------

export type EchangeType = "appel" | "email" | "visite" | "note" | "relance";
export type EchangeStatus = "realise" | "planifie" | "annule";

export interface Echange {
  id: string;
  date: string;                  // ISO
  type: EchangeType;
  status: EchangeStatus;
  interlocuteur: string;         // nom du RRE ou de l'interlocuteur entreprise
  sujet: string;
  notes: string;
  // Suivi
  actionSuivante: string;
  dateActionSuivante: string;   // ISO
  createdAt: string;
}

// ------------------------------------------------------------
// 6. GED — documents liés à l'entreprise
// ------------------------------------------------------------

export type DocumentCategory =
  | "convention" | "contrat_alternance" | "facture"
  | "cerfa" | "courrier" | "autre";

export interface CrmDocument {
  id: string;
  contactId: string;
  userId: string;
  category: DocumentCategory;
  name: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  storagePath: string;
  visibleToClient?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// 7. PAYLOAD COMPLET (jsonb Supabase)
// ------------------------------------------------------------

export interface ContactPayload {
  // "contact" garde le nom pour compatibilité Supabase
  contact: Entreprise;
  contacts: EntrepriseContact[];   // contacts humains dans l'entreprise
  alternants: Alternant[];
  postes: PosteAPourvoir[];
  echanges: Echange[];
  documents: CrmDocument[];
  // Champs gardés pour compatibilité avec le reste du code Kleios
  // Compatibilité avec composants CGP — non utilisés dans IFC
  contracts: any[];
  events: any[];
  deals: any[];
  compliance: any;
  commissions: any[];
  portal: any;
  conformite?: any;
}

// ------------------------------------------------------------
// 8. RECORD (localStorage / Supabase)
// ------------------------------------------------------------

export interface ContactRecord {
  id: string;
  userId: string;
  displayName: string;           // = entreprise.nom
  status: EntrepriseStatus;
  ploutosClientId: string | null;
  payload: ContactPayload;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
  // Données IFC directement sur le record pour perf
  campus?: string;
  siret?: string;
  city?: string;
}

// ------------------------------------------------------------
// 9. LICENCE
// ------------------------------------------------------------

export type LicenceType = "trial" | "paid" | "lifetime" | "admin";
export type LicenceStatus = "active" | "expired" | "cancelled" | "inactive";

export interface KleiosLicence {
  userId: string; type: LicenceType; status: LicenceStatus;
  stripeSubId: string; trialEnd: string | null;
  cancelAt: string | null; createdAt: string; updatedAt: string;
}

// ------------------------------------------------------------
// 10. SYNC / AUTH
// ------------------------------------------------------------

export type SyncStatus = "synced" | "pending" | "offline" | "syncing";
export type AuthState = "loading" | "authenticated" | "unauthenticated" | "grace" | "expired";

// ------------------------------------------------------------
// 11. MARKETING — conservé pour compatibilité
// ------------------------------------------------------------

export type CampaignStatus = "brouillon" | "envoye" | "planifie";
export type CampaignTemplate =
  | "bilan_annuel" | "renouvellement_mission" | "relance_prospect"
  | "invitation_rdv" | "alerte_marche" | "voeux" | "prevoyance_tns"
  | "campagne_per" | "nouveau_produit" | "libre";

export interface CampaignRecord {
  id: string; userId: string; name: string;
  template: CampaignTemplate; subject: string; bodyHtml: string;
  status: CampaignStatus; recipientIds: string[];
  sentCount: number; sentAt: string | null;
  createdAt: string; updatedAt: string;
}

// ============================================================
// TYPES DE COMPATIBILITÉ — aliases pour les composants hérités
// Ces types permettent au code CGP existant de compiler
// sans modification (les modules Cal, Contrats, etc. seront
// supprimés ou remplacés progressivement)
// ============================================================

export type ContactStatus = EntrepriseStatus;
export type CommercialEvent = any;
export type EventType = string;
export type RdvChannel = "tel" | "visio" | "physique";
export type RdvLocation = "cabinet" | "domicile_client" | "exterieur";
export type EventSource = string;
export type EventInitiatedBy = string;
export type EventStatus = string;
export type DealStage = string;
export type ContractType = string;
export type ContractStatus = string;
export type RemunerationType = string;
export type ComplianceDocStatus = string;
export type ParentLink = string;
export type Gender = "M" | "F";
export type CivilStatus = string;
export type MatrimonialRegime = string;

// Interface Person supprimée — non utilisée dans IFC

// Interface Contract supprimée — non utilisée dans IFC

// Interface Deal supprimée — non utilisée dans IFC

// Interface FamilyLink supprimée — non utilisée dans IFC

// Interface Contact CGP supprimée — remplacée par Entreprise dans IFC

// Interface CalBookingUnlinked supprimée — Cal.com non utilisé dans IFC

// Interface ClientPortal supprimée — non utilisée dans IFC

// Interface Commission supprimée — non utilisée dans IFC

// Interface ComplianceRecord supprimée — non utilisée dans IFC

// Interface ContractBeneficiary supprimée — non utilisée dans IFC

// ============================================================
// TYPES HÉRITÉS — conservés pour compatibilité composants CGP
// À supprimer progressivement quand les composants seront nettoyés
// ============================================================


export interface Person {
  firstName: string; lastName: string; usageName: string;
  gender: Gender; birthDate: string; birthPlace: string;
  birthDepartment: string; nationality: string;
  email: string; phone: string; phonePro: string;
  address: string; postalCode: string; city: string;
  csp: string; employer: string; isPPE: boolean;
  isFATCA: boolean; taxCountry: string; isHandicapped: boolean;
}

export interface Contract {
  id: string; contactId: string; userId: string;
  type: ContractType; status: ContractStatus;
  contractNumber: string; productName: string; insurer: string;
  platform: string; subscriptionDate: string; effectDate: string;
  echeanceDate: string; currentValue: string; totalPremiums: string;
  premiumsBefore70: string; premiumsAfter70: string;
  annualPremium: string; performance2024: string; ucRatio: string;
  remunerationType: RemunerationType; commissionRate: string;
  honoraireAmount: string; lastCommission: string;
  lastCommissionDate: string; beneficiaries: any[];
  documentIds: string[]; notes: string;
  createdAt: string; updatedAt: string;
}

export interface CalBookingUnlinked {
  calBookingId: string; calEventTypeSlug: string; calEventTypeLabel: string;
  attendeeEmail: string; attendeeName: string; date: string;
  duration: number; status: string; importedAt: string;
  matchedContactId: string | null; autoMatched: boolean;
}

