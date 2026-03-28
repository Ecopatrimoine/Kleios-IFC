// src/App.tsx
// Chef d'orchestre de Kleios CRM
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { useLicense } from "./hooks/useLicense";
import { useAdmin } from "./hooks/useAdmin";
import { Layout } from "./components/layout/Layout";
import { DEFAULT_CABINET, DEFAULT_COLORS, BRAND } from "./constants";
import type { CabinetSettings, ContactRecord } from "./types/crm";
import { supabase } from "./lib/supabase";
import { useContacts } from "./hooks/useContacts";
import { ClientList } from "./components/ClientList";
import { FicheClient } from "./components/fiche/FicheClient";
import { NewContactModal } from "./components/NewContactModal";
import { AuthGate } from "./components/AuthGate";
import { LicenceGate } from "./components/LicenceGate";
import { AdminDashboard } from "./components/AdminDashboard";
import { SettingsPanel } from "./components/SettingsPanel";
import { useGoogleCalendar } from "./hooks/useGoogleCalendar";
import { MapView } from "./components/MapView";
import { ProspectionView } from "./components/ProspectionView";
import { SuiviTuteurs } from "./components/SuiviTuteurs";
import { PipelinePlacement } from "./components/PipelinePlacement";
import { ReferentielsAdmin } from "./components/ReferentielsAdmin";
import { useReferentiels } from "./hooks/useReferentiels";
import { SeedDemoIFC } from "./components/SeedDemoIFC";
import { AgendaIFC } from "./components/AgendaIFC";
import { DashboardRRE } from "./components/DashboardRRE";
import { DashboardDirection } from "./components/DashboardDirection";
import { CampagnesIFC } from "./components/CampagnesIFC";

type ActiveView =
  | "dashboard"
  | "entreprises"
  | "pipeline"
  | "suivi"
  | "carte"
  | "marketing"
  | "admin"
  | "parametres"
  | "referentiels"
  | "prospection"
  | "agenda"
  | "direction"
  | "marketing";

function Placeholder({ title }: { title: string }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "60vh",
      gap: 12,
      color: "#9CA3AF",
    }}>
      <div style={{ fontSize: 40 }}>🚧</div>
      <div style={{ fontSize: 16, fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: 13 }}>Module en cours de développement</div>
    </div>
  );
}

function Spinner({ message }: { message: string }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      gap: 16,
      background: DEFAULT_COLORS.bg,
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        border: `2px solid ${DEFAULT_COLORS.gold}`,
        background: DEFAULT_COLORS.navy,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        color: DEFAULT_COLORS.gold,
        fontFamily: "Georgia, serif",
        animation: "pulse 1.5s ease-in-out infinite",
      }}>
        ϰ
      </div>
      <div style={{ fontSize: 13, color: DEFAULT_COLORS.textSecondary }}>
        {message}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  // ── Auth & Licence ──
  const auth = useAuth();
  const userId = auth.user?.id ?? null;
  const { licence } = useLicense(userId);
  const { isAdmin, userRole } = useAdmin(auth.user?.email);
  const {
    contacts,
    syncStatus,
    loading: contactsLoading,
    createContact,
    saveContact,
    deleteContact,
    syncNow,
  } = useContacts(userId);

  // ── Navigation ──
  const [activeNav, setActiveNav] = useState<ActiveView>("dashboard");
  const [isFicheOpen, setIsFicheOpen] = useState(false);
  const [topbarTitle, setTopbarTitle] = useState("Entreprises");

  // ── Contact ouvert ──
  const [openContact, setOpenContact] = useState<ContactRecord | null>(null);

  // ── Modal création ──
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [pendingVisite, setPendingVisite] = useState<{ entrepriseId: string; entrepriseNom: string } | null>(null);

  // ── Recherche ──
  const [searchValue, setSearchValue] = useState("");

  // ── Paramètres cabinet ──
  const [cabinet, setCabinet] = useState<CabinetSettings>(DEFAULT_CABINET);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);

  // ── Chargement cabinet depuis Supabase ──
  useEffect(() => {
    if (!userId) return;

    try {
      const localKey = `${BRAND.storagePrefix}cabinet_${userId}`;
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const saved = JSON.parse(raw);
        // Migration : remplacer les anciennes couleurs CGP par les couleurs IFC
        const migratedNavy = ['#0B3040','#1A2E44','#101B3B','#0d1b2e','#0D1B2E','#1a2e44'].includes(saved.colorNavy?.toLowerCase?.() ?? '') || !saved.colorNavy ? '#E8722A' : saved.colorNavy;
        const migratedGold = ['#C9A84C','#E3AF64','#c9a84c','#e3af64'].includes(saved.colorGold?.toLowerCase?.() ?? '') || !saved.colorGold ? '#FFD100' : saved.colorGold;
        setCabinet(prev => ({ ...DEFAULT_CABINET, ...prev, ...saved, colorNavy: migratedNavy, colorGold: migratedGold }));
      }
      const logo = localStorage.getItem(`${BRAND.storagePrefix}logo_${userId}`);
      if (logo) setLogoSrc(logo);
    } catch { /* ignore */ }

    Promise.resolve(
      supabase
        .from("cabinet_settings")
        .select("settings")
        .eq("user_id", userId)
        .single()
    ).then(({ data }) => {
        if (data?.settings) {
          const saved = data.settings as Partial<CabinetSettings>;
          // Migration : remplacer les anciennes couleurs CGP par les couleurs IFC
          const migratedNavy = ['#0B3040','#1A2E44'].includes(saved.colorNavy ?? '') ? '#E8722A' : (saved.colorNavy ?? '#E8722A');
          const migratedGold = ['#C9A84C','#E3AF64','#c9a84c','#e3af64'].includes(saved.colorGold?.toLowerCase?.() ?? '') || !saved.colorGold ? '#FFD100' : saved.colorGold;
          const migrated = { ...saved, colorNavy: migratedNavy, colorGold: migratedGold };
          setCabinet(prev => ({ ...DEFAULT_CABINET, ...prev, ...migrated }));
          const localKey = `${BRAND.storagePrefix}cabinet_${userId}`;
          localStorage.setItem(localKey, JSON.stringify(migrated));
        }
      })
      .catch(() => { /* hors-ligne */ });
  }, [userId]);

  // ── Sync Cal.com ──
  // useCalSync désactivé dans Kleios IFC

  // ── Référentiels campus / formations ──
  const { campus, formations } = useReferentiels();
  const campusList = campus.map(c => c.nom);
  const formationList = formations.map(f => f.code);

  // ── Google Calendar ──
  const google = useGoogleCalendar(userId);

  // ── Fusion des slots Cal.com + Google Calendar ──


  // ── Handlers ──

  const handleNavChange = useCallback((id: string) => {
    setActiveNav(id as ActiveView);
    setIsFicheOpen(false);
    setOpenContact(null);
    setSearchValue("");
    const titles: Record<string, string> = {
      // Pilotage
      dashboard:    "Tableau de bord",
      direction:    "Dashboard direction",
      // Entreprises
      entreprises:  "Entreprises",
      prospection:  "Prospection entreprises",
      carte:        "Carte des entreprises",
      // Alternance
      pipeline:     "Pipeline de placement",
      suivi:        "Suivi tuteurs",
      // Planification
      agenda:       "Agenda",
      // Administration
      referentiels: "Campus & Formations",
      parametres:   "Paramètres",
      admin:        "Administration",
    };
    setTopbarTitle(titles[id] ?? id);
  }, []);

  const handleOpenFiche = useCallback((record: ContactRecord) => {
    setOpenContact(record);
    setIsFicheOpen(true);
    setTopbarTitle("Fiche entreprise");
  }, []);

  const handleCloseFiche = useCallback(() => {
    setIsFicheOpen(false);
    setOpenContact(null);
    setTopbarTitle("Entreprises");
  }, []);

  const handleNewContact = useCallback(() => {
    setShowNewContactModal(true);
  }, []);

  const handleConfirmNewContact = useCallback((displayName: string, status: string) => {
    const newRecord = createContact(displayName, status);
    setShowNewContactModal(false);
    handleOpenFiche(newRecord);
  }, [createContact, handleOpenFiche]);

  const handleSignOut = useCallback(async () => {
    await auth.signOut();
  }, [auth]);

  const handlePlanifierVisite = useCallback((entrepriseId: string, entrepriseNom: string) => {
    setPendingVisite({ entrepriseId, entrepriseNom });
    handleNavChange("suivi");
  }, [handleNavChange]);

  const handleAdmin = useCallback(() => {
    setActiveNav("admin");
    setTopbarTitle("Administration");
  }, []);

  // ── Rendu conditionnel ──

  // 1. Chargement auth
  if (auth.authState === "loading") {
    return <Spinner message="Vérification de la session..." />;
  }

  // 2. Non connecté ou session expirée → AuthGate
  if (auth.authState === "unauthenticated" || auth.authState === "expired") {
    return (
      <AuthGate
        authHook={auth}
        colorNavy={DEFAULT_COLORS.navy}
        colorGold={DEFAULT_COLORS.gold}
      />
    );
  }

  // 3. Reset password en cours (lien email) → AuthGate en mode reset
  if (auth.isPasswordRecovery) {
    return (
      <AuthGate
        authHook={auth}
        colorNavy={DEFAULT_COLORS.navy}
        colorGold={DEFAULT_COLORS.gold}
      />
    );
  }

  // 4. Chargement licence
  if (licence.loading) {
    return <Spinner message="Vérification de la licence..." />;
  }

  // 5. Licence invalide → LicenceGate
  if (!licence.isValid) {
    return (
      <LicenceGate
        licence={licence}
        userId={userId ?? ""}
        onSignOut={handleSignOut}
        colorNavy={DEFAULT_COLORS.navy}
        colorGold={DEFAULT_COLORS.gold}
      />
    );
  }

  // ── App connectée & licenciée ──

  const renderView = () => {
    if (isFicheOpen && openContact) {
      return (
        <FicheClient
          onTabChange={() => {}}
          record={openContact}
          onSave={(updated) => {
            saveContact(updated);
            setOpenContact(updated);
          }}
          onClose={handleCloseFiche}
          onPlanifierVisite={handlePlanifierVisite}
          colorNavy={cabinet.colorNavy}
          colorGold={cabinet.colorGold}
        />
      );
    }

    switch (activeNav) {
      case "dashboard":
        return (
          <DashboardRRE
            contacts={contacts}
            userId={userId ?? ""}
            colorNavy={cabinet.colorNavy}
            colorGold={cabinet.colorGold}
            campusRRE={cabinet.campus ?? ""}
            userRole={userRole}
            objectifVisitesMois={(cabinet as any).objectifVisitesMois ?? 6}
            onNavigate={handleNavChange}
            onOpenContact={handleOpenFiche}
          />
        );
      case "direction":
        return (
          <DashboardDirection
            contacts={contacts}
            userId={userId ?? ""}
            colorNavy={cabinet.colorNavy}
            colorGold={cabinet.colorGold}
            campusList={campusList}
            campusRRE={cabinet.campus ?? ""}
            isAdmin={isAdmin}
            userRole={userRole}
            onNavigate={handleNavChange}
            objectifVisitesMois={(cabinet as any).objectifVisitesMois ?? 6}
            objectifTauxPlacement={(cabinet as any).objectifTauxPlacement ?? 80}
            objectifPartenaires={(cabinet as any).objectifPartenaires ?? 50}
            objectifProspects={(cabinet as any).objectifProspects ?? 10}
          />
        );
      case "entreprises":
        return (
          <ClientList
            contacts={contacts}
            syncStatus={syncStatus}
            loading={contactsLoading}
            searchValue={searchValue}
            onOpenContact={handleOpenFiche}
            onNewContact={handleNewContact}
            onSyncNow={syncNow}
            colorNavy={cabinet.colorNavy}
            colorGold={cabinet.colorGold}
          />
        );
      case "pipeline":
        return (
          <PipelinePlacement
            contacts={contacts}
            userId={userId ?? ""}
            colorNavy={cabinet.colorNavy}
            colorGold={cabinet.colorGold}
            campusList={campusList}
            formationList={formationList}
          />
        );
      case "suivi":
        return (
          <SuiviTuteurs
            contacts={contacts}
            userId={userId ?? ""}
            colorNavy={cabinet.colorNavy}
            colorGold={cabinet.colorGold}
            campusRRE={cabinet.campus}
            defaultEntrepriseId={pendingVisite?.entrepriseId}
            defaultEntrepriseNom={pendingVisite?.entrepriseNom}
            onPendingVisiteHandled={() => setPendingVisite(null)}
            objectifVisitesMois={(cabinet as any).objectifVisitesMois ?? 6}
          />
        );
      case "referentiels":
        return <ReferentielsAdmin />;
      case "prospection":
        return (
          <ProspectionView
            contacts={contacts}
            userId={userId ?? ""}
            onImport={newRecords => { newRecords.forEach(r => saveContact(r)); }}
            colorNavy={cabinet.colorNavy}
            colorGold={cabinet.colorGold}
              googleApiKey={cabinet.googlePlacesApiKey ?? ""}
          />
        );
      case "carte":
        return (
          <MapView
            onSaveContact={saveContact}
            contacts={contacts}
            onOpenContact={handleOpenFiche}
            onOpenMarketing={(contactIds) => {
              handleNavChange("marketing");
              // Stocker les IDs sélectionnés pour pré-remplir le filtre marketing
              sessionStorage.setItem("kleios_marketing_preselect", JSON.stringify(contactIds));
            }}
            colorNavy={cabinet.colorNavy}
            colorGold={cabinet.colorGold}
          />
        );
      case "marketing":
        return (
          <CampagnesIFC
            contacts={contacts}
            colorNavy={cabinet.colorNavy}
            colorGold={cabinet.colorGold}
            campusList={campusList}
          />
        );
      case "parametres":
        return (
          <SettingsPanel
            cabinet={cabinet}
              userId={userId ?? ""}
            logoSrc={logoSrc}
            onUpdate={setCabinet}
            onLogoChange={setLogoSrc}
            colorNavy={cabinet.colorNavy}
            colorGold={cabinet.colorGold}
            googleConnected={google.isConnected}
            onGoogleConnect={google.handleConnect}
            onGoogleDisconnect={google.handleDisconnect}
            googleError={google.error}
          />
        );
      case "admin":
        return (
          <AdminDashboard
            colorNavy={cabinet.colorNavy}
            colorGold={cabinet.colorGold}
            onClose={() => handleNavChange("entreprises")}
          />
        );
      case "agenda":
        return (
          <AgendaIFC
            contacts={contacts}
            userId={userId ?? ""}
            colorNavy={cabinet.colorNavy}
            colorGold={cabinet.colorGold}
            userEmail={auth.user?.email ?? ""}
            onOpenContact={handleOpenFiche}
            onOpenEchanges={(record) => {
              handleOpenFiche(record);
            }}
          />
        );
      default:
        return <Placeholder title="Module à venir" />;
    }
  };

  return (
    <>
      <Layout
        activeNav={activeNav}
        onNavChange={handleNavChange}
        topbarTitle={topbarTitle}
        isFicheOpen={isFicheOpen}
        showSearch={activeNav === "entreprises" && !isFicheOpen}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onNewContact={activeNav === "entreprises" && !isFicheOpen ? handleNewContact : undefined}
        cabinetName={cabinet.cabinetName}
        userEmail={auth.user?.email ?? ""}
        isAdmin={isAdmin}
        onAdmin={handleAdmin}
        onSignOut={handleSignOut}
        logoSrc={logoSrc}
        colorNavy={cabinet.colorNavy}
        colorGold={cabinet.colorGold}
        licence={licence}
        userId={userId ?? ""}
      >
        {renderView()}
      </Layout>

      <SeedDemoIFC
        userId={userId ?? ""}
        contacts={contacts}
        onSeed={newRecords => { newRecords.forEach(r => saveContact(r)); }}
        onClear={ids => { ids.forEach(id => deleteContact(id)); }}
      />

      {showNewContactModal && (
        <NewContactModal
          onConfirm={handleConfirmNewContact}
          onClose={() => setShowNewContactModal(false)}
          colorNavy={cabinet.colorNavy}
          colorGold={cabinet.colorGold}
        />
      )}
    </>
  );
}
