// src/components/layout/Layout.tsx
// Composant racine de mise en page — assemble Sidebar + Topbar + contenu
// Gère l'état collapsed de la sidebar et l'expose aux enfants via props
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { DEFAULT_COLORS } from "../../constants";
import { LicenceBanner } from "../LicenceBanner";
import type { LicenceInfo } from "../../hooks/useLicense";

interface LayoutProps {
  // Navigation
  activeNav: string;
  onNavChange: (id: string) => void;
  topbarTitle: string;

  // Fiche client ouverte ? → collapse auto de la sidebar
  isFicheOpen: boolean;

  // Topbar
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  onNewContact?: () => void;

  // Utilisateur & cabinet
  cabinetName: string;
  userEmail: string;
  isAdmin: boolean;
  onAdmin: () => void;
  onSignOut: () => void;
  logoSrc: string | null;

  // Couleurs personnalisables (depuis cabinet_settings Supabase)
  colorNavy?: string;
  colorGold?: string;

  // Licence (pour la bannière trial)
  licence: LicenceInfo;
  userId: string;

  // Contenu principal
  children: React.ReactNode;
  onImportContrats?: () => void;
}

export function Layout({
  activeNav,
  onNavChange,
  topbarTitle,
  isFicheOpen,
  showSearch,
  searchValue,
  onSearchChange,
  onNewContact,
  cabinetName,
  userEmail,
  isAdmin,
  onAdmin,
  onSignOut,
  logoSrc,
  colorNavy = DEFAULT_COLORS.navy,
  colorGold = DEFAULT_COLORS.gold,
  licence,
  userId,
  children,
  onImportContrats,
}: LayoutProps) {

  // collapsed = true automatiquement quand une fiche est ouverte
  // L'utilisateur peut forcer l'ouverture manuellement avec le bouton toggle
  const [manualCollapse, setManualCollapse] = useState<boolean | null>(null);

  // Si l'utilisateur n'a pas encore toggleé manuellement,
  // on suit l'état automatique (isFicheOpen).
  // Dès qu'il toggle manuellement, on respecte son choix jusqu'à ce qu'il retoggle.
  const collapsed = manualCollapse !== null ? manualCollapse : isFicheOpen;

  const handleToggle = useCallback(() => {
    setManualCollapse(prev => {
      // Si pas encore de préférence manuelle → inverser l'état courant
      if (prev === null) return !isFicheOpen;
      return !prev;
    });
  }, [isFicheOpen]);

  // Quand on quitte une fiche, on reset la préférence manuelle
  // → la sidebar se rouvre automatiquement en retournant à la liste
  const handleNavChange = useCallback((id: string) => {
    setManualCollapse(null); // reset préférence manuelle
    onNavChange(id);
  }, [onNavChange]);

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* ── Sidebar ── */}
      <Sidebar
        collapsed={collapsed}
        onToggle={handleToggle}
        activeNav={activeNav}
        onNavChange={handleNavChange}
        cabinetName={cabinetName}
        userEmail={userEmail}
        isAdmin={isAdmin}
        onAdmin={onAdmin}
        onSignOut={onSignOut}
        logoSrc={logoSrc}
        colorNavy={colorNavy}
        colorGold={colorGold}
        onImportContrats={onImportContrats}
      />

      {/* ── Zone principale ── */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minWidth: 0, // empêche le débordement flex
      }}>
        {/* ── Topbar ── */}
        <Topbar
          title={topbarTitle}
          onNewContact={onNewContact}
          showSearch={showSearch}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          colorNavy={colorNavy}
          colorGold={colorGold}
        />

        {/* ── Bannière licence (trial / cancelling / paid) ── */}
        <LicenceBanner
          licence={licence}
          userId={userId}
          colorNavy={colorNavy}
          colorGold={colorGold}
        />

        {/* ── Contenu scrollable ── */}
        <main style={{
          flex: 1,
          overflowY: "auto",
          padding: "18px 22px",
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
