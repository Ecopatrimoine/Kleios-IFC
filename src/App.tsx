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
import { Dashboard } from "./components/Dashboard";
import { AgendaView } from "./components/AgendaView";
import { useCalSync } from "./hooks/useCalSync";
import { useGoogleCalendar } from "./hooks/useGoogleCalendar";
import { ContratsView } from "./components/ContratsView";
import { ConformiteView } from "./components/ConformiteView";
import { ImportContrats } from "./components/ImportContrats";
import { GedView } from "./components/GedView";
import { CommissionsView } from "./components/CommissionsView";
import { TabMarketing } from "./components/TabMarketing";
import { MapView } from "./components/MapView";
import { SeedDemo } from "./components/SeedDemo";

type ActiveView =
  | "dashboard"
  | "clients"
  | "contrats"
  | "agenda"
  | "conformite"
  | "ged"
  | "commissions"
  | "marketing"
  | "carte"
  | "admin"
  | "parametres";

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
  const { isAdmin } = useAdmin(auth.user?.email);
  const {
    contacts,
    syncStatus,
    loading: contactsLoading,
    createContact,
    saveContact,
    syncNow,
  } = useContacts(userId);

  // ── Navigation ──
  const [activeNav, setActiveNav] = useState<ActiveView>("clients");
  const [isFicheOpen, setIsFicheOpen] = useState(false);
  const [topbarTitle, setTopbarTitle] = useState("Clients");

  // ── Contact ouvert ──
  const [openContact, setOpenContact] = useState<ContactRecord | null>(null);

  // ── Modal création ──
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [showImport, setShowImport] = useState(false);

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
        setCabinet(prev => ({ ...DEFAULT_CABINET, ...prev, ...saved }));
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
          setCabinet(prev => ({ ...DEFAULT_CABINET, ...prev, ...saved }));
          const localKey = `${BRAND.storagePrefix}cabinet_${userId}`;
          localStorage.setItem(localKey, JSON.stringify(saved));
        }
      })
      .catch(() => { /* hors-ligne */ });
  }, [userId]);

  // ── Sync Cal.com ──
  const { orphanBookings, isSyncing: calSyncing, syncError: calError, linkBooking, dismissBooking, getBusySlotsForWeek } = useCalSync(
    userId,
    cabinet,
    contacts,
    saveContact
  );

  // ── Google Calendar ──
  const google = useGoogleCalendar(userId);

  // ── Fusion des slots Cal.com + Google Calendar ──
  const getMergedBusySlots = useCallback((weekKey: string) => {
    const calCache = getBusySlotsForWeek(weekKey);
    // On retourne le cache Cal.com enrichi des slots Google en temps réel
    // Les slots Google sont chargés async dans WeekCalendar via fetchBusySlotsForWeek
    return calCache;
  }, [getBusySlotsForWeek]);

  // ── Handlers ──

  const handleNavChange = useCallback((id: string) => {
    setActiveNav(id as ActiveView);
    setIsFicheOpen(false);
    setOpenContact(null);
    setSearchValue("");
    const titles: Record<string, string> = {
      dashboard:   "Tableau de bord",
      clients:     "Clients",
      contrats:    "Contrats",
      agenda:      "Agenda & RDV",
      conformite:  "Conformité DDA / MIF2 / KYC",
      ged:         "Gestion documentaire",
      commissions: "Commissions & honoraires",
      marketing:   "Marketing & Campagnes",
      carte:       "Carte clients",
      admin:       "Administration",
      parametres:  "Paramètres cabinet",
    };
    setTopbarTitle(titles[id] ?? id);
  }, []);

  const handleOpenFiche = useCallback((record: ContactRecord) => {
    setOpenContact(record);
    setIsFicheOpen(true);
    setTopbarTitle("Fiche client");
  }, []);

  const handleCloseFiche = useCallback(() => {
    setIsFicheOpen(false);
    setOpenContact(null);
    setTopbarTitle("Clients");
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

  const handleImportContrats = useCallback(() => {
    setShowImport(true);
  }, []);

  const handleDeleteDemo = useCallback(() => {
    if (!confirm("Supprimer tous les clients de démonstration ?")) return;
    const nonDemo = contacts.filter(c => !(c as any)._isDemoData);
    nonDemo.forEach(c => saveContact(c));
    // Supprimer les contacts démo du localStorage
    const demoIds = contacts.filter(c => (c as any)._isDemoData).map(c => c.id);
    demoIds.forEach(_id => {
      try {
        const key = `${BRAND.storagePrefix}clients_${userId}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const all = JSON.parse(raw);
          const filtered = all.filter((c: any) => !c._isDemoData);
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      } catch { /* ignore */ }
    });
    window.location.reload();
  }, [contacts, saveContact, userId]);

  const handleSeedContacts = useCallback((demoContacts: import("./types/crm").ContactRecord[]) => {
    if (!userId) return;
    try {
      const key = `${BRAND.storagePrefix}contacts_${userId}`;
      const existing = JSON.parse(localStorage.getItem(key) ?? "[]");
      const merged = [...existing, ...demoContacts];
      localStorage.setItem(key, JSON.stringify(merged));
      window.location.reload();
    } catch { /* ignore */ }
  }, [userId]);

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
          record={openContact}
          onSave={(updated) => {
            saveContact(updated);
            setOpenContact(updated);
          }}
          onClose={handleCloseFiche}
          colorNavy={cabinet.colorNavy}
          colorGold={cabinet.colorGold}
          getBusySlotsForWeek={getMergedBusySlots}
          fetchGoogleSlotsForWeek={google.isConnected ? google.fetchBusySlotsForWeek : undefined}
          onCreateGoogleEvent={google.isConnected ? google.createEvent : undefined}
          cabinet={cabinet}
        />
      );
    }

    switch (activeNav) {
      case "dashboard":
        return (
          <Dashboard
            contacts={contacts}
            colorNavy={cabinet.colorNavy}
            colorGold={cabinet.colorGold}
            onOpenContact={handleOpenFiche}
            onNavigate={handleNavChange}
            onSaveContact={saveContact}
          />
        );
      case "clients":
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
      case "contrats":
        return (
          <ContratsView
            contacts={contacts}
            colorNavy={cabinet.colorNavy}
            colorGold={cabinet.colorGold}
            onOpenContact={handleOpenFiche}
          />
        );
      case "agenda":
        return (
          <AgendaView
            contacts={contacts}
            colorNavy={cabinet.colorNavy}
            colorGold={cabinet.colorGold}
            rdvUrl={cabinet.rdvUrl}
            rdvProvider={cabinet.rdvProvider}
            onOpenContact={handleOpenFiche}
            orphanBookings={orphanBookings}
            onLinkBooking={linkBooking}
            onDismissBooking={dismissBooking}
            calSyncing={calSyncing}
            calError={calError}
          />
        );
      case "conformite":
        return (
          <ConformiteView
            contacts={contacts}
            colorNavy={cabinet.colorNavy}
            colorGold={cabinet.colorGold}
            onOpenContact={handleOpenFiche}
          />
        );
      case "ged":
        return (
          <GedView
            contacts={contacts}
            colorNavy={cabinet.colorNavy}
            colorGold={cabinet.colorGold}
            onOpenContact={handleOpenFiche}
          />
        );
      case "commissions":
        return (
          <CommissionsView
            contacts={contacts}
            colorNavy={cabinet.colorNavy}
            colorGold={cabinet.colorGold}
            onOpenContact={handleOpenFiche}
          />
        );
      case "carte":
        return (
          <MapView
            contacts={contacts}
            onSaveContact={saveContact}
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
          <TabMarketing
            contacts={contacts}
            cabinet={cabinet}
            userId={userId ?? ""}
            colorNavy={cabinet.colorNavy}
            colorGold={cabinet.colorGold}
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
            onClose={() => handleNavChange("clients")}
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
        showSearch={activeNav === "clients" && !isFicheOpen}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onNewContact={activeNav === "clients" && !isFicheOpen ? handleNewContact : undefined}
        cabinetName={cabinet.cabinetName}
        userEmail={auth.user?.email ?? ""}
        isAdmin={isAdmin}
        onAdmin={handleAdmin}
        onSignOut={handleSignOut}
        onImportContrats={handleImportContrats}
        logoSrc={logoSrc}
        colorNavy={cabinet.colorNavy}
        colorGold={cabinet.colorGold}
        licence={licence}
        userId={userId ?? ""}
      >
        {renderView()}
      </Layout>

      {showImport && (
        <ImportContrats
          contacts={contacts}
          onUpdateContact={saveContact}
          colorNavy={cabinet.colorNavy}
          colorGold={cabinet.colorGold}
          onClose={() => setShowImport(false)}
        />
      )}
      <SeedDemo
        userId={userId ?? ""}
        contacts={contacts}
        onContactsCreated={handleSeedContacts}
        onDeleteDemo={handleDeleteDemo}
        colorNavy={cabinet.colorNavy}
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
