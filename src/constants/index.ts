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
  // ── Palette IFC ──
  navy:          '#E8722A',   // Orange IFC — sidebar, headers, boutons primaires
  navyLight:     '#F08C4B',   // Orange clair — dégradés sidebar
  gold:          '#FFD100',   // Jaune IFC — accents, nav actif, badges
  goldLight:     '#FFF3A3',   // Jaune pâle — fonds dorés
  slate:         '#5B82A6',   // Slate — labels, tabs
  slateLight:    '#D6E4F0',   // Slate très clair — fonds sections
  bg:            '#DADDE1',   // Gris-bleu IFC — fond application
  white:         '#FFFFFF',
  textPrimary:   '#2B2B2B',   // Anthracite — texte principal (couleur du texte logo IFC)
  textSecondary: '#6B6B6B',
  textMuted:     '#9CA3AF',
  border:        'rgba(43,43,43,0.10)',
  borderStrong:  'rgba(43,43,43,0.17)',
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
  colorNavy: '#E8722A',   // Orange IFC
  colorGold: '#FFD100',   // Jaune IFC
  colorBg: '#F5F4F2',    // Blanc cassé
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
  // Objectifs direction
  objectifVisitesMois:    6,   // visites tuteurs / mois
  objectifTauxPlacement:  80,  // taux placement cible (%)
  objectifPartenaires:    50,  // nb entreprises partenaires cible
  objectifProspects:      10,  // nb prospects à contacter / mois
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
