// src/kleios.config.ts
// Configuration par version de Kleios
// Chaque déploiement charge sa propre config via BUILD_TARGET
// ─────────────────────────────────────────────────────────────────────────────

export interface KleiosConfig {
  // Identité
  appName: string;
  appSubtitle: string;
  appUrl: string;

  // Couleurs par défaut (surchargeables dans Paramètres cabinet)
  colorNavy: string;
  colorGold: string;
  colorBg: string;

  // Modules activés
  modules: {
    clients: boolean;
    contrats: boolean;
    agenda: boolean;
    conformite: boolean;
    ged: boolean;
    commissions: boolean;
    marketing: boolean;
    carte: boolean;
    espaceClient: boolean;
  };

  // Stripe — liens abonnement
  stripe: {
    monthly: string;
    annual: string;
  };

  // Supabase (peut être différent par version)
  supabaseUrl: string;
  supabaseAnonKey: string;

  // Support
  supportEmail: string;
  contactEmail: string;
}

// ── Config par défaut (base commune) ─────────────────────────────────────────
const defaultModules = {
  clients:      true,
  contrats:     true,
  agenda:       true,
  conformite:   true,
  ged:          true,
  commissions:  true,
  marketing:    true,
  carte:        true,
  espaceClient: false, // en cours de dev
};

// ── EcoPatrimoine — version perso David ──────────────────────────────────────
export const configEcopatrimoine: KleiosConfig = {
  appName:     "Kleios",
  appSubtitle: "CRM Patrimonial",
  appUrl:      "https://crm.ploutos-cgp.fr",
  colorNavy:   "#0B3040",
  colorGold:   "#C9A84C",
  colorBg:     "#EDE8DF",
  modules:     { ...defaultModules, commissions: true },
  stripe: {
    monthly: "https://buy.stripe.com/TODO_monthly",
    annual:  "https://buy.stripe.com/TODO_annual",
  },
  supabaseUrl:      import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey:  import.meta.env.VITE_SUPABASE_ANON_KEY,
  supportEmail:     "david.perry@ecopatrimoine-conseil.com",
  contactEmail:     "contact@ploutos-cgp.fr",
};

// ── Démo / Jeu ───────────────────────────────────────────────────────────────
export const configDemo: KleiosConfig = {
  ...configEcopatrimoine,
  appName:     "Kleios Demo",
  appSubtitle: "Mode démonstration",
  appUrl:      "https://demo.ploutos-cgp.fr",
  colorNavy:   "#1A3A5C",
  colorGold:   "#D4A843",
};

// ── IFC (futur) ───────────────────────────────────────────────────────────────
export const configIfc: KleiosConfig = {
  ...configEcopatrimoine,
  appName:     "Kleios IFC",
  appSubtitle: "CRM Commercial",
  appUrl:      "https://ifc.ploutos-cgp.fr",
  colorNavy:   "#1B3A6B",
  colorGold:   "#C9A84C",
  modules: {
    ...defaultModules,
    commissions: false,   // pas de commissions pour les commerciaux
    conformite:  false,   // pas de DDA/MIF2
  },
};

// ── Résolution selon BUILD_TARGET ─────────────────────────────────────────────
const configs: Record<string, KleiosConfig> = {
  ecopatrimoine: configEcopatrimoine,
  demo:          configDemo,
  ifc:           configIfc,
};

const target = import.meta.env.VITE_BUILD_TARGET ?? "ecopatrimoine";
export const kleiosConfig: KleiosConfig = configs[target] ?? configEcopatrimoine;
