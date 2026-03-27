// src/components/layout/Sidebar.tsx
// Sidebar collapsible — ouverte (220px) ou réduite (52px)
// Se collapse automatiquement à l'entrée d'une fiche client
// ─────────────────────────────────────────────────────────



// ── Types ────────────────────────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  section?: string; // label de section affiché au-dessus du groupe
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeNav: string;
  onNavChange: (id: string) => void;
  cabinetName: string;
  userEmail: string;
  isAdmin: boolean;
  onAdmin: () => void;
  onSignOut: () => void;
  // logoSrc : base64 ou URL locale — jamais depuis Supabase
  logoSrc?: string | null;
  colorNavy: string;
  colorGold: string;
  onImportContrats?: () => void;
}

// ── Icônes SVG inline ────────────────────────────────────────────────────────
// On définit les icônes ici pour éviter une dépendance lucide-react au départ.
// On pourra les remplacer par lucide plus tard sans toucher aux autres fichiers.

const Icons = {
  import: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 2v8M5 7l3 3 3-3"/>
      <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2"/>
    </svg>
  ),
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1.5"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5"/>
    </svg>
  ),
  clients: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="5" r="3"/>
      <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6H2z"/>
    </svg>
  ),
  contrats: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="1" width="12" height="14" rx="2"/>
      <path d="M5 5h6M5 8h6M5 11h4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  agenda: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="3" width="14" height="12" rx="2"/>
      <path d="M1 7h14M5 1v4M11 1v4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  conformite: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1L2 4v5c0 3 2.5 5.5 6 6 3.5-.5 6-3 6-6V4L8 1z"/>
    </svg>
  ),
  ged: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/>
      <path d="M10 2v3h3" stroke="white" fill="none" strokeWidth="1.2"/>
    </svg>
  ),
  carte: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2l4 2v10l-4-2-4 2-4-2V2l4 2 4-2z"/>
      <circle cx="6" cy="6" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  marketing: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M2 11L6 7l3 3 5-6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="13" cy="3" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  commissions: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="8" r="6" stroke="currentColor" fill="none" strokeWidth="1.5"/>
      <path d="M8 4v8M6 5.5h3a1.5 1.5 0 010 3H7a1.5 1.5 0 010 3h3"
        stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  admin: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1l1.5 3 3.5.5-2.5 2.5.5 3.5L8 9l-3 1.5.5-3.5L3 4.5 6.5 4z"/>
    </svg>
  ),
  chevronLeft: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  chevronRight: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 10a2 2 0 100-4 2 2 0 000 4z"/>
      <path fillRule="evenodd" d="M8 1a.75.75 0 01.74.637l.205 1.434a5.02 5.02 0 011.298.538l1.215-.73a.75.75 0 01.952.131l.849.848a.75.75 0 01.132.952l-.73 1.216a5.02 5.02 0 01.537 1.297l1.435.206A.75.75 0 0115 8a.75.75 0 01-.637.74l-1.435.206a5.02 5.02 0 01-.537 1.297l.73 1.216a.75.75 0 01-.132.952l-.849.848a.75.75 0 01-.952.132l-1.215-.73a5.02 5.02 0 01-1.298.537l-.205 1.435A.75.75 0 018 15a.75.75 0 01-.74-.637l-.205-1.435a5.02 5.02 0 01-1.298-.537l-1.215.73a.75.75 0 01-.952-.132l-.849-.848a.75.75 0 01-.131-.952l.73-1.216a5.02 5.02 0 01-.538-1.297L1.637 8.74A.75.75 0 011 8a.75.75 0 01.637-.74l1.434-.206a5.02 5.02 0 01.538-1.297l-.73-1.216a.75.75 0 01.131-.952l.849-.848a.75.75 0 01.952-.131l1.215.73a5.02 5.02 0 011.298-.538L7.26 1.637A.75.75 0 018 1z" clipRule="evenodd"/>
    </svg>
  ),
  logout: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

// ── Navigation items ──────────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",   label: "Tableau de bord",  icon: Icons.dashboard,   section: "Principal" },
  { id: "clients",     label: "Clients",           icon: Icons.clients },
  { id: "contrats",    label: "Contrats",          icon: Icons.contrats },
  { id: "agenda",      label: "Agenda & RDV",      icon: Icons.agenda },
  { id: "conformite",  label: "DDA / MIF2 / KYC",  icon: Icons.conformite,  section: "Conformité" },
  { id: "ged",         label: "GED",               icon: Icons.ged },
  { id: "commissions", label: "Commissions",       icon: Icons.commissions, section: "Finance" },
  { id: "carte",       label: "Carte clients",       icon: Icons.carte,       section: "Marketing" },
  { id: "marketing",   label: "Marketing",          icon: Icons.marketing },
  { id: "parametres",  label: "Paramètres",         icon: Icons.settings,    section: "Cabinet" },
];

// ── Composant ─────────────────────────────────────────────────────────────────

export function Sidebar({
  collapsed,
  onToggle,
  activeNav,
  onNavChange,
  cabinetName,
  userEmail,
  isAdmin,
  onAdmin,
  onSignOut,
  logoSrc: _logoSrc,
  colorNavy,
  colorGold,
  onImportContrats,
}: SidebarProps) {

  // Initiales pour l'avatar utilisateur
  const initials = cabinetName
    ? cabinetName.slice(0, 2).toUpperCase()
    : userEmail.slice(0, 2).toUpperCase();

  return (
    <aside
      style={{
        width: collapsed ? 52 : 220,
        minWidth: collapsed ? 52 : 220,
        background: `linear-gradient(160deg, ${colorNavy}E0 0%, ${colorNavy} 55%, ${colorNavy}F5 100%)`,
        boxShadow: "inset 1px 0 0 rgba(255,255,255,0.09), 6px 0 24px rgba(8,31,46,0.45), 14px 0 40px rgba(8,31,46,0.18)",
        borderRight: "1px solid rgba(0,0,0,0.28)",
        position: "relative" as const,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        transition: "width 200ms ease, min-width 200ms ease",
        flexShrink: 0,
      }}
    >
      {/* Reflet 3D gauche */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "linear-gradient(to bottom, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.04) 40%, transparent 100%)", pointerEvents: "none", zIndex: 1 }} />
      {/* Ombre portée droite 3D */}
      <div style={{ position: "absolute", top: 0, right: -28, width: 28, height: "100%", background: "linear-gradient(to right, rgba(8,31,46,0.30) 0%, rgba(8,31,46,0.09) 60%, transparent 100%)", pointerEvents: "none", zIndex: 10 }} />

      {/* ── Logo ── */}
      <div style={{
        padding: collapsed ? "16px 0" : "20px 18px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 10,
        minHeight: 64,
      }}>
        {/* Icône ϰ cerclée — toujours visible */}
        <div style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          border: `1.5px solid ${colorGold}`,
          background: `${colorGold}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 16,
          color: colorGold,
          fontFamily: "Georgia, serif",
        }}>
          ϰ
        </div>

        {/* Nom "KleiΩs" — masqué si collapsed */}
        {!collapsed && (
          <div>
            <div style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#fff",
              letterSpacing: "-0.3px",
              lineHeight: 1,
              fontFamily: "Georgia, serif",
            }}>
              Klei<span style={{ color: colorGold }}>Ω</span>s
            </div>
            <div style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              marginTop: 3,
            }}>
              CRM Patrimonial
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: collapsed ? "12px 6px" : "12px 10px", overflowY: "auto" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeNav === item.id;

          return (
            <div key={item.id}>
              {/* Label de section — masqué si collapsed */}
              {item.section && !collapsed && (
                <div style={{
                  fontSize: 9,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.25)",
                  padding: "10px 8px 4px",
                  fontWeight: 500,
                }}>
                  {item.section}
                </div>
              )}
              {/* Séparateur si collapsed */}
              {item.section && collapsed && (
                <div style={{
                  height: 1,
                  background: "rgba(255,255,255,0.07)",
                  margin: "8px 4px",
                }}/>
              )}

              {/* Item de navigation */}
              <button
                onClick={() => onNavChange(item.id)}
                title={collapsed ? item.label : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: collapsed ? "8px 0" : "8px 10px",
                  width: "100%",
                  justifyContent: collapsed ? "center" : "flex-start",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: isActive ? `${colorGold}25` : "transparent",
                  color: isActive ? colorGold : "rgba(255,255,255,0.5)",
                  fontSize: 12.5,
                  fontWeight: 400,
                  transition: "all 0.15s",
                  marginBottom: 2,
                  position: "relative",
                  fontFamily: "inherit",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)";
                  }
                }}
              >
                {/* Icône */}
                <span style={{
                  width: 16,
                  height: 16,
                  flexShrink: 0,
                  opacity: isActive ? 1 : 0.7,
                  color: isActive ? colorGold : "currentColor",
                }}>
                  {item.icon}
                </span>

                {/* Label — masqué si collapsed */}
                {!collapsed && <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>}

                {/* Badge — masqué si collapsed */}
                {!collapsed && item.badge && item.badge > 0 && (
                  <span style={{
                    background: colorGold,
                    color: colorNavy,
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 20,
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            </div>
          );
        })}

        {/* ── Bouton Import contrats ── */}
        {onImportContrats && (
          <button
            onClick={onImportContrats}
            title={collapsed ? "Importer des contrats" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: collapsed ? "8px 0" : "8px 10px",
              width: "100%",
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: "transparent",
              color: "rgba(255,255,255,0.6)",
              fontSize: 12.5,
              marginTop: 4,
              fontFamily: "inherit",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
          >
            <span style={{ width: 16, height: 16, flexShrink: 0 }}>{Icons.import}</span>
            {!collapsed && <span>Importer des contrats</span>}
          </button>
        )}

        {/* ── Bouton Admin (si admin) ── */}
        {isAdmin && (
          <button
            onClick={onAdmin}
            title={collapsed ? "Admin" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: collapsed ? "8px 0" : "8px 10px",
              width: "100%",
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: "transparent",
              color: colorGold,
              fontSize: 12.5,
              marginTop: 8,
              fontFamily: "inherit",
            }}
          >
            <span style={{ width: 16, height: 16, flexShrink: 0 }}>{Icons.admin}</span>
            {!collapsed && <span>Admin</span>}
          </button>
        )}
      </nav>

      {/* ── Bas de sidebar — utilisateur + toggle ── */}
      <div style={{
        padding: collapsed ? "10px 6px" : "10px",
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}>
        {/* Carte utilisateur */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: collapsed ? "8px 0" : "8px",
          justifyContent: collapsed ? "center" : "flex-start",
          borderRadius: 6,
          cursor: "pointer",
        }}>
          {/* Avatar */}
          <div style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: `1.5px solid ${colorGold}`,
            background: `${colorGold}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 600,
            color: colorGold,
            flexShrink: 0,
          }}>
            {initials}
          </div>

          {/* Nom cabinet */}
          {!collapsed && (
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.75)",
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {cabinetName || userEmail}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                Cabinet
              </div>
            </div>
          )}

          {/* Bouton déconnexion — masqué si collapsed */}
          {!collapsed && (
            <button
              onClick={onSignOut}
              title="Déconnexion"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.3)",
                padding: 4,
                borderRadius: 4,
                display: "flex",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
            >
              {Icons.logout}
            </button>
          )}
        </div>

        {/* Bouton toggle collapse/expand */}
        <button
          onClick={onToggle}
          title={collapsed ? "Ouvrir la sidebar" : "Réduire la sidebar"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "6px 0",
            marginTop: 4,
            background: "rgba(255,255,255,0.04)",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            color: "rgba(255,255,255,0.3)",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
        >
          {collapsed ? Icons.chevronRight : Icons.chevronLeft}
        </button>
      </div>
    </aside>
  );
}
