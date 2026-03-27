// src/constants/assureurs.ts
// Dictionnaire des assureurs français — logos via favicon Google
// ─────────────────────────────────────────────────────────────────────────────

export interface AssureurInfo {
  label: string;       // Nom affiché
  domain: string;      // Domaine pour le logo
  color: string;       // Couleur principale (fallback si logo absent)
  aliases: string[];   // Noms alternatifs pour la détection automatique
}

// URL du logo via Google Favicon API (libre, pas de clé)
export function getLogoUrl(domain: string, size = 32): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

// Normalise un nom d'assureur pour la recherche
export function normalizeAssureurName(name: string): string {
  return name.toLowerCase()
    .replace(/[àáâã]/g, "a").replace(/[éèêë]/g, "e")
    .replace(/[îï]/g, "i").replace(/[ôö]/g, "o").replace(/[ùûü]/g, "u")
    .replace(/[^a-z0-9]/g, "");
}

export const ASSUREURS: Record<string, AssureurInfo> = {
  april:        { label: "April",                domain: "april.fr",              color: "#E30613", aliases: ["april assurance", "april sante", "april prevoyance"] },
  swisslife:    { label: "Swiss Life",            domain: "swisslife.fr",          color: "#003062", aliases: ["swiss life", "swisslife assurance", "swisslife patrimoine"] },
  generali:     { label: "Generali",              domain: "generali.fr",           color: "#C4161C", aliases: ["generali france", "generali vie", "generali retraite"] },
  cardif:       { label: "BNP Paribas Cardif",    domain: "cardif.fr",             color: "#009A44", aliases: ["cardif", "bnp paribas cardif", "cardif libertés"] },
  axa:          { label: "AXA",                   domain: "axa.fr",                color: "#00008F", aliases: ["axa france", "axa vie", "axa assurances"] },
  allianz:      { label: "Allianz",               domain: "allianz.fr",            color: "#003781", aliases: ["allianz france", "allianz vie", "allianz iard"] },
  aviva:        { label: "Aviva",                 domain: "aviva.fr",              color: "#009B77", aliases: ["aviva france", "aviva vie"] },
  apicil:       { label: "Apicil",                domain: "apicil.com",            color: "#0070B8", aliases: ["apicil epargne"] },
  suravenir:    { label: "Suravenir",             domain: "suravenir.fr",          color: "#005BAC", aliases: ["suravenir assurances"] },
  spirica:      { label: "Spirica",               domain: "spirica.fr",            color: "#6B2D8B", aliases: [] },
  predica:      { label: "Crédit Agricole Assurances", domain: "ca-assurances.fr", color: "#008A00", aliases: ["predica", "credit agricole assurances", "ca assurances"] },
  sogecap:      { label: "Sogécap",               domain: "societegenerale.fr",    color: "#E2001A", aliases: ["sogecap", "societe generale assurances"] },
  oradea:       { label: "Oradéa Vie",            domain: "oradeavie.fr",          color: "#E2001A", aliases: ["oradea", "oradea vie"] },
  afer:         { label: "AFER",                  domain: "afer.fr",               color: "#004A97", aliases: [] },
  conservateur: { label: "Le Conservateur",       domain: "leconservateur.fr",     color: "#004A97", aliases: ["le conservateur"] },
  mondiale:     { label: "La Mondiale",           domain: "lamondiale.fr",         color: "#E2001A", aliases: ["la mondiale", "ag2r la mondiale"] },
  ag2r:         { label: "AG2R La Mondiale",      domain: "ag2rlamondiale.fr",     color: "#E2001A", aliases: ["ag2r", "ag2r la mondiale"] },
  groupama:     { label: "Groupama",              domain: "groupama.fr",           color: "#007A33", aliases: ["groupama gan vie"] },
  maif:         { label: "MAIF",                  domain: "maif.fr",               color: "#E2001A", aliases: [] },
  macif:        { label: "MACIF",                 domain: "macif.fr",              color: "#E2001A", aliases: [] },
  macsf:        { label: "MACSF",                 domain: "macsf.fr",              color: "#003A87", aliases: [] },
  gmf:          { label: "GMF",                   domain: "gmf.fr",                color: "#D4002A", aliases: [] },
  matmut:       { label: "Matmut",                domain: "matmut.fr",             color: "#009B4E", aliases: ["ociane matmut"] },
  mma:          { label: "MMA",                   domain: "mma.fr",                color: "#E2001A", aliases: [] },
  gan:          { label: "GAN Eurocourtage",      domain: "gan.fr",                color: "#00A0DC", aliases: ["gan", "gan eurocourtage", "groupama gan"] },
  malakoff:     { label: "Malakoff Humanis",      domain: "malakoffhumanis.com",   color: "#E2001A", aliases: ["malakoff humanis", "humanis"] },
  klesia:       { label: "Klésia",                domain: "klesia.fr",             color: "#004A97", aliases: ["klesia"] },
  cnp:          { label: "CNP Assurances",        domain: "cnp.fr",               color: "#009B77", aliases: ["cnp assurances", "cnp"] },
  metlife:      { label: "MetLife",               domain: "metlife.fr",            color: "#0078CF", aliases: ["met life"] },
  abeille:      { label: "Abeille Assurances",    domain: "abeille-assurances.fr", color: "#F5A800", aliases: ["abeille", "aviva (abeille)"] },
  entoria:      { label: "Entoria",               domain: "entoria.fr",            color: "#004A97", aliases: [] },
  eres:         { label: "Eres",                  domain: "eres-groupe.com",       color: "#004A97", aliases: ["eres groupe"] },
  francemutualiste: { label: "La France Mutualiste", domain: "la-france-mutualiste.fr", color: "#004A97", aliases: ["france mutualiste", "la france mutualiste"] },
  gaipare:      { label: "Gaipare",               domain: "gaipare.fr",            color: "#004A97", aliases: [] },
  mutex:        { label: "Mutex",                 domain: "mutex.fr",              color: "#004A97", aliases: [] },
  primonial:    { label: "Primonial",             domain: "primonial.fr",          color: "#8B0000", aliases: ["primonial reim"] },
  nortia:       { label: "Nortia",                domain: "nortia.fr",             color: "#004A97", aliases: [] },
  alpheys:      { label: "Alpheys",               domain: "alpheys.com",           color: "#004A97", aliases: [] },
};

// Cherche un assureur par nom — retourne la clé ou null
export function findAssureur(name: string): AssureurInfo | null {
  if (!name) return null;
  const n = normalizeAssureurName(name);

  // Recherche exacte sur la clé
  if (ASSUREURS[n]) return ASSUREURS[n];

  // Recherche sur le label normalisé
  for (const info of Object.values(ASSUREURS)) {
    if (normalizeAssureurName(info.label) === n) return info;
    // Recherche sur les aliases
    if (info.aliases.some(a => normalizeAssureurName(a) === n)) return info;
    // Recherche partielle (contient)
    if (n.includes(normalizeAssureurName(info.label)) || normalizeAssureurName(info.label).includes(n)) return info;
  }

  return null;
}
