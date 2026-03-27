// ============================================================
// KLEIOS CRM — Types TypeScript
// Version 1.1.0 — Intégration Cal.com
// EcoPatrimoine Conseil · David PERRY
// ============================================================

// ------------------------------------------------------------
// 1. CABINET
// ------------------------------------------------------------

export interface CalEventType {
  id: string;
  label: string;              // "Découverte patrimoniale"
  slug: string;               // slug Cal.com ex: "decouverte"
  url: string;                // https://cal.com/david/decouverte
  duration: number;           // minutes
  defaultChannel: 'tel' | 'visio' | 'physique';
}

export interface CabinetSettings {
  cabinetName: string;
  orias: string;
  rcp: string;
  mediateur: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  // Identité visuelle
  colorNavy: string;
  colorGold: string;
  colorBg: string;
  // Signature électronique (optionnel)
  signatureProvider: 'none' | 'yousign' | 'docusign' | 'hellosign';
  signatureApiKey: string;
  // Prise de RDV Cal.com
  rdvProvider: 'none' | 'cal' | 'calendly' | 'custom';
  rdvUrl: string;             // URL principale (fallback / Calendly / custom)
  calApiKey: string;          // Clé API Cal.com personnelle
  calUsername: string;        // Username Cal.com ex: "david-perry"
  calEventTypes: CalEventType[]; // Types de RDV configurés
  // Commissions — taux par assureur
  commissionRates: Array<{ insurer: string; entree: string; gestion: string; arbitrage: string }>;
  // Expéditeur emails marketing
  senderName: string;
  senderEmail: string;
  // logoSrc : jamais en Supabase — localStorage uniquement
}

// ------------------------------------------------------------
// 2. CONTACT
// ------------------------------------------------------------

export type ContactStatus = 'prospect' | 'client' | 'vip' | 'inactif';
export type CivilStatus = 'celibataire' | 'marie' | 'pacse' | 'concubin' | 'divorce' | 'veuf';
export type MatrimonialRegime = 'communaute_legale' | 'separation_biens' | 'communaute_universelle' | 'participation_acquets';
export type Gender = 'M' | 'F';
export type ParentLink = 'conjoint' | 'enfant' | 'enfant_conjoint' | 'parent' | 'frere_soeur' | 'autre';

export interface Person {
  firstName: string;
  lastName: string;
  usageName: string;
  gender: Gender;
  birthDate: string;
  birthPlace: string;
  birthDepartment: string;
  nationality: string;
  email: string;
  phone: string;
  phonePro: string;
  address: string;
  postalCode: string;
  city: string;
  csp: string;
  employer: string;
  isPPE: boolean;
  isFATCA: boolean;
  taxCountry: string;
  isHandicapped: boolean;
}

export interface FamilyLink {
  contactId: string;
  displayName: string;
  link: ParentLink;
  notes: string;
}

export interface Contact {
  id: string;
  userId: string;
  status: ContactStatus;
  ploutosClientId: string | null;
  person1: Person;
  person2: Person | null;
  civilStatus: CivilStatus;
  matrimonialRegime: MatrimonialRegime | null;
  weddingDate: string;
  familyLinks: FamilyLink[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}

// ------------------------------------------------------------
// 3. CONTRATS
// ------------------------------------------------------------

export type ContractType =
  | 'av' | 'per' | 'scpi' | 'capitalisation' | 'pea' | 'cto'
  | 'prevoyance' | 'sante' | 'iard' | 'emprunteur'
  | 'retraite_collective' | 'autre';

export type ContractStatus = 'actif' | 'rachat_partiel' | 'rachat_total' | 'en_cours' | 'resilie' | 'suspendu';
export type RemunerationType = 'commission' | 'honoraire' | 'mixte';

export interface ContractBeneficiary {
  name: string;
  link: string;
  share: string;
  contactId: string | null;
}

export interface Contract {
  id: string;
  contactId: string;
  userId: string;
  type: ContractType;
  status: ContractStatus;
  contractNumber: string;
  productName: string;
  insurer: string;
  platform: string;
  subscriptionDate: string;
  effectDate: string;
  echeanceDate: string;
  currentValue: string;
  totalPremiums: string;
  premiumsBefore70: string;  // AV/CAP — primes avant 70 ans
  premiumsAfter70: string;   // AV/CAP — primes après 70 ans
  annualPremium: string;
  performance2024: string;
  ucRatio: string;
  remunerationType: RemunerationType;
  commissionRate: string;
  honoraireAmount: string;
  lastCommission: string;
  lastCommissionDate: string;
  beneficiaries: ContractBeneficiary[];
  documentIds: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// 4. SUIVI COMMERCIAL — avec intégration Cal.com
// ------------------------------------------------------------

export type EventType = 'rdv' | 'note' | 'rappel' | 'email' | 'appel' | 'tache';
export type EventStatus = 'planifie' | 'realise' | 'annule' | 'reporte' | 'no_show';

// Canal de communication
export type RdvChannel = 'tel' | 'visio' | 'physique';

// Lieu physique
export type RdvLocation = 'cabinet' | 'domicile_client' | 'exterieur';

// Source de création du RDV
export type EventSource = 'manuel' | 'cal_conseiller' | 'cal_client';

// Qui a initié le RDV
export type EventInitiatedBy = 'conseiller' | 'client';

export interface CommercialEvent {
  id: string;
  contactId: string;
  userId: string;
  type: EventType;
  status: EventStatus;
  title: string;
  date: string;               // ISO datetime
  duration: number;           // minutes (0 = non défini)

  // ── Canal & lieu (RDV physique/tel/visio) ──
  channel: RdvChannel | null;
  location: RdvLocation | null;       // uniquement si channel = 'physique'
  locationAddress: string;            // adresse libre si location = 'exterieur'
  // → Google Maps link auto-généré depuis locationAddress dans l'UI

  // ── Source Cal.com ──
  source: EventSource;
  initiatedBy: EventInitiatedBy;
  calBookingId: string;               // ID Cal.com — pour dédoublonnage
  calEventTypeSlug: string;           // slug du type de RDV Cal.com
  calLinked: boolean;                 // true = rattaché à un dossier

  // ── Contenu ──
  body: string;                       // compte rendu / note
  needsFollowUp: boolean;
  followUpDate: string;               // ISO — date rappel
  followUpNote: string;

  // ── Contrats évoqués ──
  contractIds: string[];

  // ── Lien de connexion (visio) ──
  rdvLink: string;

  createdAt: string;
  updatedAt: string;
}

// Pipeline commercial
export type DealStage =
  | 'premier_contact' | 'decouverte' | 'proposition'
  | 'negociation' | 'signe' | 'perdu';

export interface Deal {
  id: string;
  contactId: string;
  userId: string;
  title: string;
  stage: DealStage;
  estimatedAmount: string;
  probability: number;
  expectedCloseDate: string;
  contractType: ContractType;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// 5. CONFORMITÉ
// ------------------------------------------------------------

export type ComplianceDocStatus = 'a_generer' | 'envoye' | 'signe' | 'expire' | 'na';

export interface KycData {
  idType: string;
  idNumber: string;
  idExpiry: string;
  idVerified: boolean;
  idVerifiedDate: string;
  isPPE: boolean;
  ppeDetails: string;
  riskLevel: 'faible' | 'moyen' | 'eleve';
  isFATCA: boolean;
  taxResidencies: string[];
  fundsOrigin: string;
}

export interface MifProfile {
  score: number;
  profile: 'prudent' | 'equilibre' | 'dynamique' | 'offensif';
  horizon: 'court' | 'moyen' | 'long';
  lossCapacity: string;
  knowledgeActions: 'aucune' | 'basique' | 'avancee';
  knowledgeOblig: 'aucune' | 'basique' | 'avancee';
  knowledgeScpi: 'aucune' | 'basique' | 'avancee';
  knowledgePer: 'aucune' | 'basique' | 'avancee';
  completedAt: string;
  validUntil: string;
}

export interface ComplianceRecord {
  id: string;
  contactId: string;
  userId: string;
  lettreMission: ComplianceDocStatus;
  lettreMissionDate: string;
  lettreMissionDocId: string;
  der: ComplianceDocStatus;
  derDate: string;
  derDocId: string;
  rapportAdequation: ComplianceDocStatus;
  rapportAdequationDate: string;
  kyc: KycData;
  kycValidatedAt: string;
  mif: MifProfile;
  rgpdConsentDate: string;
  rgpdConsentGiven: boolean;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// 6. GED
// ------------------------------------------------------------

export type DocumentCategory =
  | 'lettre_mission' | 'der' | 'rapport_adequation' | 'kyc'
  | 'contrat' | 'rapport_patrimonial' | 'releve' | 'facture' | 'autre';

export type DocumentStatus = 'brouillon' | 'envoye' | 'signe' | 'archive';

export interface CrmDocument {
  id: string;
  contactId: string;
  userId: string;
  category: DocumentCategory;
  status: DocumentStatus;
  name: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  storagePath: string;
  signatureRequestId: string;
  signedAt: string;
  signedByContactId: string;
  visibleToClient: boolean;
  generatedByPloutos: boolean;
  ploutosClientId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// 7. COMMISSIONS
// ------------------------------------------------------------

export type CommissionType = 'entree' | 'gestion' | 'arbitrage' | 'honoraire' | 'apporteur';

export interface Commission {
  id: string;
  contactId: string;
  contractId: string;
  userId: string;
  type: CommissionType;
  amount: string;
  rate: string;
  base: string;
  period: string;
  receivedDate: string;
  insurer: string;
  notes: string;
  createdAt: string;
}

// ------------------------------------------------------------
// 8. ESPACE CLIENT
// ------------------------------------------------------------

export interface ClientPortal {
  id: string;
  contactId: string;
  userId: string;
  isActive: boolean;
  email: string;
  lastLoginAt: string;
  sharedDocumentIds: string[];
  inviteToken: string;
  inviteSentAt: string;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// 9. LICENCE
// ------------------------------------------------------------

export type LicenceType = 'trial' | 'paid' | 'lifetime';
export type LicenceStatus = 'active' | 'expired' | 'cancelled';

export interface KleiosLicence {
  userId: string;
  type: LicenceType;
  status: LicenceStatus;
  stripeSubId: string;
  trialEnd: string | null;
  cancelAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// 10. SYNC / AUTH
// ------------------------------------------------------------

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'syncing';
export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'grace' | 'expired';

// ------------------------------------------------------------
// 11. PAYLOAD COMPLET (jsonb Supabase)
// ------------------------------------------------------------

export interface ContactPayload {
  contact: Contact;
  contracts: Contract[];
  events: CommercialEvent[];
  deals: Deal[];
  compliance: ComplianceRecord | null;
  conformite?: import("../components/fiche/TabConformite").ConformiteData;
  documents: CrmDocument[];
  commissions: Commission[];
  portal: ClientPortal | null;
}

// ------------------------------------------------------------
// 12. RECORD (structure en localStorage / Supabase)
// ------------------------------------------------------------

export interface ContactRecord {
  id: string;
  userId: string;
  displayName: string;
  status: ContactStatus;
  ploutosClientId: string | null;
  payload: ContactPayload;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}

// ------------------------------------------------------------
// 13. CAL.COM — bookings non rattachés (stockés localement)
// ------------------------------------------------------------

export interface CalBookingUnlinked {
  calBookingId: string;       // ID unique Cal.com
  calEventTypeSlug: string;
  calEventTypeLabel: string;
  attendeeEmail: string;      // email du client qui a réservé
  attendeeName: string;
  date: string;               // ISO datetime
  duration: number;           // minutes
  status: 'accepted' | 'cancelled' | 'rescheduled';
  importedAt: string;         // quand Kleios l'a importé
  matchedContactId: string | null;  // null = non rattaché
  autoMatched: boolean;       // true = rapproché automatiquement par email
}

// ------------------------------------------------------------
// 14. MARKETING — Campagnes email
// ------------------------------------------------------------

export type CampaignStatus = 'brouillon' | 'envoye' | 'planifie';
export type CampaignTemplate =
  | 'bilan_annuel' | 'renouvellement_mission' | 'relance_prospect'
  | 'invitation_rdv' | 'alerte_marche' | 'voeux' | 'prevoyance_tns'
  | 'campagne_per' | 'nouveau_produit' | 'libre';

export interface CampaignRecord {
  id: string;
  userId: string;
  name: string;
  template: CampaignTemplate;
  subject: string;
  bodyHtml: string;
  status: CampaignStatus;
  recipientIds: string[];
  sentCount: number;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}
