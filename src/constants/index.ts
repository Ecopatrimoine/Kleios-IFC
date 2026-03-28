// ============================================================
// KLEIOS IFC — Constantes globales
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
  navy:          '#0B3040',
  navyLight:     '#144260',
  gold:          '#C9A84C',
  goldLight:     '#E8D5A3',
  slate:         '#5B82A6',
  slateLight:    '#D6E4F0',
  bg:            '#EDE8DF',
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
  googlePlacesApiKey: '',   // clé Google Places API — saisie par le client dans Paramètres
  campus: '',               // campus IFC du RRE
  isAdmin: false,           // accès multi-campus
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
// 4. LABELS MÉTIER IFC
// ------------------------------------------------------------

export const CONTACT_STATUS_LABELS: Record<string, string> = {
  partenaire: 'Partenaire',
  prospect: 'Prospect',
  inactif: 'Inactif',
}

// Conservés pour compatibilité composants hérités — à nettoyer progressivement
export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  av: 'Assurance-vie', per: 'PER', scpi: 'SCPI',
  capitalisation: 'Capitalisation', pea: 'PEA', cto: 'CTO',
  prevoyance: 'Prévoyance', sante: 'Santé', iard: 'IARD',
  emprunteur: 'Emprunteur', retraite_collective: 'Retraite collective', autre: 'Autre',
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  rdv: 'Rendez-vous', note: 'Note', rappel: 'Rappel',
  email: 'Email', appel: 'Appel', tache: 'Tâche',
}

export const EVENT_STATUS_LABELS: Record<string, string> = {
  planifie: 'Planifié', realise: 'Réalisé', annule: 'Annulé',
  reporte: 'Reporté', no_show: 'Absent',
}

export const RDV_CHANNEL_LABELS: Record<string, string> = {
  tel: 'Téléphone', visio: 'Visioconférence', physique: 'Physique',
}

export const RDV_LOCATION_LABELS: Record<string, string> = {
  cabinet: 'Au cabinet', domicile_client: 'Domicile client', exterieur: 'Lieu extérieur',
}

export const EVENT_SOURCE_LABELS: Record<string, string> = {
  manuel: 'Saisie manuelle',
  cal_conseiller: 'Via Cal.com (conseiller)',
  cal_client: 'Via Cal.com (client)',
}

export const DEAL_STAGE_LABELS: Record<string, string> = {
  premier_contact: 'Premier contact', decouverte: 'Découverte',
  proposition: 'Proposition', negociation: 'Négociation',
  signe: 'Signé', perdu: 'Perdu',
}

export const COMPLIANCE_STATUS_LABELS: Record<string, string> = {
  a_generer: 'À générer', envoye: 'Envoyé', signe: 'Signé',
  expire: 'Expiré', na: 'N/A',
}


export const EMPTY_PERSON = {
  firstName: '', lastName: '', usageName: '',
  gender: 'M' as const,
  birthDate: '', birthPlace: '', birthDepartment: '',
  nationality: 'Française',
  email: '', phone: '', phonePro: '',
  address: '', postalCode: '', city: '',
  csp: '', employer: '',
  isPPE: false, isFATCA: false,
  taxCountry: 'France', isHandicapped: false,
}

// ------------------------------------------------------------
// 5. STRUCTURE VIDE PAYLOAD CONTACT
// ------------------------------------------------------------

export const EMPTY_CONTACT_PAYLOAD = {
  contact: {
    id: '', userId: '', formeJuridique: '', nom: '', enseigne: '',
    siret: '', codeApe: '', codeIdcc: '', numeroTva: '',
    address1: '', address2: '', postalCode: '', city: '',
    email: '', telFixe: '', telMobile: '', website: '',
    nbSalaries: '', activite: '', conventionCollective: '',
    opco: '', caisseRetraite: '', organismePrevoyanc: '',
    nonAssujeti: false, status: 'prospect' as const,
    campus: '', notes: '', scoreRelation: 0,
    prochainerelance: '', createdAt: '', updatedAt: '', syncedAt: null,
  },
  contacts: [] as any[],
  alternants: [] as any[],
  postes: [] as any[],
  echanges: [] as any[],
  documents: [] as any[],
  // Champs conservés pour compatibilité Supabase jsonb existant
  contracts: [] as any[],
  events: [] as any[],
  deals: [] as any[],
  compliance: null as any,
  commissions: [] as any[],
  portal: null as any,
}

// ------------------------------------------------------------
// 6. CAL.COM (conservé pour composants hérités)
// ------------------------------------------------------------

export const CAL_DEFAULT_DURATIONS = [15, 30, 45, 60, 90, 120] as const
export const CAL_CANCELLATION_FOLLOWUP_HOURS = 48
