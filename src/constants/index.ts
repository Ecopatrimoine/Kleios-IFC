// ============================================================
// KLEIOS CRM — Constantes globales
// Version 1.1.0 — Intégration Cal.com
// ============================================================

// ------------------------------------------------------------
// 1. BRAND
// ------------------------------------------------------------

export const BRAND = {
  name: 'KleiΩs',
  version: '1.1.0',
  appUrl: 'https://crm.ploutos-cgp.fr',
  supportEmail: 'contact@ploutos-cgp.fr',
  storagePrefix: 'kleios_',
} as const

// ------------------------------------------------------------
// 2. COULEURS PAR DÉFAUT
// ------------------------------------------------------------

export const DEFAULT_COLORS = {
  // ── Palette Kleios v2 ──
  navy:          '#0B3040',   // Pétrol profond — sidebar, headers, texte principal
  navyLight:     '#144260',   // Pétrol mid — dégradés sidebar
  gold:          '#C9A84C',   // Gold — logo, accents sidebar, nav actif
  goldLight:     '#E8D5A3',   // Gold clair — texte sur fond navy
  slate:         '#5B82A6',   // Slate blue — labels, tabs actifs, focus
  slateLight:    '#D6E4F0',   // Slate très clair — fonds sections
  bg:            '#EDE8DF',   // Sand chaud — fond application
  white:         '#FFFFFF',
  textPrimary:   '#0B3040',
  textSecondary: '#5E7A88',
  textMuted:     '#8FAAB6',
  border:        'rgba(11,48,64,0.10)',
  borderStrong:  'rgba(11,48,64,0.17)',
  success:       '#2E8B6E',
  warning:       '#D97706',
  danger:        '#DC2626',
  info:          '#5B82A6',
} as const

// ------------------------------------------------------------
// 3. CABINET PAR DÉFAUT
// ------------------------------------------------------------

export const DEFAULT_CABINET = {
  cabinetName: '',
  orias: '',
  rcp: '',
  mediateur: '',
  address: '',
  postalCode: '',
  city: '',
  phone: '',
  email: '',
  website: '',
  colorNavy: '#0B3040',
  colorGold: '#C9A84C',
  colorBg: '#EDE8DF',
  signatureProvider: 'none' as 'none' | 'yousign' | 'docusign' | 'hellosign',
  signatureApiKey: '',
  rdvProvider: 'none' as 'none' | 'cal' | 'calendly' | 'custom',
  rdvUrl: '',
  calApiKey: '',
  calUsername: '',
  senderName: '',
  senderEmail: '',
  commissionRates: [] as Array<{ insurer: string; entree: string; gestion: string; arbitrage: string }>,
  calEventTypes: [] as Array<{
    id: string;
    label: string;
    slug: string;
    url: string;
    duration: number;
    defaultChannel: 'tel' | 'visio' | 'physique';
  }>,
}

// ------------------------------------------------------------
// 4. LABELS MÉTIER
// ------------------------------------------------------------

export const CONTACT_STATUS_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  client: 'Client',
  vip: 'VIP',
  inactif: 'Inactif',
}

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  av: 'Assurance-vie',
  per: 'PER',
  scpi: 'SCPI',
  capitalisation: 'Capitalisation',
  pea: 'PEA',
  cto: 'CTO',
  prevoyance: 'Prévoyance',
  sante: 'Santé',
  iard: 'IARD',
  emprunteur: 'Emprunteur',
  retraite_collective: 'Retraite collective',
  autre: 'Autre',
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  rdv: 'Rendez-vous',
  note: 'Note',
  rappel: 'Rappel',
  email: 'Email',
  appel: 'Appel',
  tache: 'Tâche',
}

export const EVENT_STATUS_LABELS: Record<string, string> = {
  planifie: 'Planifié',
  realise: 'Réalisé',
  annule: 'Annulé',
  reporte: 'Reporté',
  no_show: 'Absent',
}

export const RDV_CHANNEL_LABELS: Record<string, string> = {
  tel: 'Téléphone',
  visio: 'Visioconférence',
  physique: 'Physique',
}

export const RDV_LOCATION_LABELS: Record<string, string> = {
  cabinet: 'Au cabinet',
  domicile_client: 'Domicile client',
  exterieur: 'Lieu extérieur',
}

export const EVENT_SOURCE_LABELS: Record<string, string> = {
  manuel: 'Saisie manuelle',
  cal_conseiller: 'Via Cal.com (conseiller)',
  cal_client: 'Via Cal.com (client)',
}

export const DEAL_STAGE_LABELS: Record<string, string> = {
  premier_contact: 'Premier contact',
  decouverte: 'Découverte',
  proposition: 'Proposition',
  negociation: 'Négociation',
  signe: 'Signé',
  perdu: 'Perdu',
}

export const COMPLIANCE_STATUS_LABELS: Record<string, string> = {
  a_generer: 'À générer',
  envoye: 'Envoyé',
  signe: 'Signé',
  expire: 'Expiré',
  na: 'N/A',
}

// ------------------------------------------------------------
// 5. STRUCTURES VIDES
// ------------------------------------------------------------

export const EMPTY_PERSON = {
  firstName: '',
  lastName: '',
  usageName: '',
  gender: 'M' as const,
  birthDate: '',
  birthPlace: '',
  birthDepartment: '',
  nationality: 'Française',
  email: '',
  phone: '',
  phonePro: '',
  address: '',
  postalCode: '',
  city: '',
  csp: '',
  employer: '',
  isPPE: false,
  isFATCA: false,
  taxCountry: 'France',
  isHandicapped: false,
}

export const EMPTY_EVENT = {
  id: '',
  contactId: '',
  userId: '',
  type: 'rdv' as const,
  status: 'planifie' as const,
  title: '',
  date: '',
  duration: 0,
  channel: null as 'tel' | 'visio' | 'physique' | null,
  location: null as 'cabinet' | 'domicile_client' | 'exterieur' | null,
  locationAddress: '',
  source: 'manuel' as const,
  initiatedBy: 'conseiller' as const,
  calBookingId: '',
  calEventTypeSlug: '',
  calLinked: false,
  body: '',
  needsFollowUp: false,
  followUpDate: '',
  followUpNote: '',
  contractIds: [] as string[],
  rdvLink: '',
  createdAt: '',
  updatedAt: '',
}

export const EMPTY_CONTACT_PAYLOAD = {
  contact: {
    id: '',
    userId: '',
    status: 'prospect' as const,
    ploutosClientId: null,
    person1: { ...EMPTY_PERSON },
    person2: null,
    civilStatus: 'celibataire' as const,
    matrimonialRegime: null,
    weddingDate: '',
    familyLinks: [],
    notes: '',
    createdAt: '',
    updatedAt: '',
    syncedAt: null,
  },
  contracts: [],
  events: [],
  deals: [],
  compliance: null,
  documents: [],
  commissions: [],
  portal: null,
}

// ------------------------------------------------------------
// 6. CAL.COM
// ------------------------------------------------------------

export const CAL_DEFAULT_DURATIONS = [15, 30, 45, 60, 90, 120] as const

// Délai rappel automatique après annulation sans redécalage (heures)
export const CAL_CANCELLATION_FOLLOWUP_HOURS = 48
