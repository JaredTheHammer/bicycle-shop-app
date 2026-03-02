import { useState, useEffect, useRef } from "react";
import { Bike, User, LogOut, WifiOff, Smartphone, RefreshCw, CloudOff, Menu, X } from "lucide-react";

// ─── Lib ─────────────────────────────────────────────────────────────
import { loadDB, fetchDB, saveDB, defaultDB, DB_SCHEMA_VERSION, retrySyncNow, onSyncStatusChange } from "./lib/db.js";
import { loadAuth, saveAuth, getPermissions, signOut, onAuthStateChange, getSession } from "./lib/auth.js";
import { ALL_NAV_ITEMS } from "./lib/constants.js";

// ─── Components ──────────────────────────────────────────────────────
import { LoginScreen } from "./components/LoginScreen.jsx";
import { ConfirmProvider, ToastProvider, LoadingSkeleton, useConfirm, useToast } from "./components/ui.jsx";

// ─── Feature Modules ─────────────────────────────────────────────────
import { Dashboard } from "./modules/Dashboard.jsx";
import { TechQueueDashboard } from "./modules/TechQueue.jsx";
import { ClientDashboard } from "./modules/ClientDashboard.jsx";
import { ClientIssueForm } from "./modules/ClientIssueForm.jsx";
import { BicyclesModule } from "./modules/BicyclesModule.jsx";
import { ClientsModule } from "./modules/ClientsModule.jsx";
import { ToolsModule } from "./modules/ToolsModule.jsx";
import { WorkOrdersModule, autoGeneratePMWorkOrders } from "./modules/WorkOrdersModule.jsx";
import { PartsModule } from "./modules/PartsModule.jsx";
import { SuppliesModule } from "./modules/SuppliesModule.jsx";
import { TripModule } from "./modules/TripModule.jsx";
import { BikeBookingModule, BookingWizard } from "./modules/BookingModule.jsx";

// ─── App (wrapped with providers at bottom) ─────────────────────────
export default function App() {
  return (
    <ConfirmProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </ConfirmProvider>
  );
}

function AppInner() {
  const [db, setDb] = useState(() => {
    const initial = loadDB();
    const withPM = autoGeneratePMWorkOrders(initial);
    if (withPM !== initial) saveDB(withPM);
    return withPM;
  });
  const [auth, setAuth] = useState(() => loadAuth());
  const [page, setPage] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const confirm = useConfirm();
  const toast = useToast();

  // ─── PWA: Online status, install prompt, update banner ──────────
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ pendingCount: 0, syncing: false });

  // ─── Sync status listener ─────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onSyncStatusChange(setSyncStatus);
    return unsubscribe;
  }, []);

  // ─── Supabase hydration: fetch fresh data on mount ────────────
  useEffect(() => {
    fetchDB().then(freshDb => {
      if (!freshDb) { setHydrating(false); return; }
      const withPM = autoGeneratePMWorkOrders(freshDb);
      setDb(withPM);
      if (withPM !== freshDb) saveDB(withPM);
    }).catch(e => console.warn("Supabase fetch failed, using local data", e))
      .finally(() => setHydrating(false));
  }, []);

  // ─── Supabase Auth: validate session + listen for changes ──────
  useEffect(() => {
    getSession().then(session => {
      if (session) {
        setAuth(session);
      } else if (navigator.onLine) {
        saveAuth(null);
        setAuth(null);
      }
    }).catch(() => {
      // Network error; keep cached auth for offline use
    });

    const subscription = onAuthStateChange((newAuth) => {
      setAuth(newAuth);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      retrySyncNow().catch(e => console.warn("Reconnection sync failed:", e));
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    const onInstallPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);

    const onSwUpdate = () => setShowUpdateBanner(true);
    window.addEventListener("sw-update-available", onSwUpdate);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("sw-update-available", onSwUpdate);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") setInstallPrompt(null);
  };

  const currentUser = auth ? db.users.find(u => u.id === auth.userId) : null;
  const role = currentUser?.role || "client";
  const perms = getPermissions(role);
  const navItems = ALL_NAV_ITEMS.filter(n => n.roles.includes(role));

  // Set default page based on role when auth changes
  useEffect(() => {
    if (auth && currentUser) {
      const defaultPage = role === "tech" ? "myqueue" : role === "client" ? "clienthome" : "dashboard";
      setPage(prev => {
        if (!prev) return defaultPage;
        const accessible = ALL_NAV_ITEMS.find(n => n.key === prev);
        if (accessible && accessible.roles.includes(role)) return prev;
        return defaultPage;
      });
    }
  }, [auth, currentUser, role]);

  const handleLogin = (session) => setAuth(session);

  const handleLogout = async () => {
    await signOut();
    setAuth(null);
    setPage(null);
  };

  // ─── Login gate ────────────────────────────────────────────────────
  if (!auth || !currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // ─── Loading skeleton during Supabase hydration ──────────────────
  // Show skeleton only briefly while Supabase data loads (localStorage data is already in state)
  // We don't block the whole app — just show it overlaid if still hydrating after auth

  const roleColors = {
    owner: "bg-purple-100 text-purple-800",
    manager: "bg-blue-100 text-blue-800",
    tech: "bg-green-100 text-green-800",
    client: "bg-gray-100 text-gray-800",
  };

  const handleNavClick = (key) => {
    setPage(key);
    setMobileMenuOpen(false);
  };

  // Shared sidebar content (used in both desktop sidebar and mobile drawer)
  const sidebarContent = (isMobile) => {
    const expanded = isMobile || sidebarOpen;
    return (
      <>
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          {isMobile ? (
            <>
              <Bike size={24} className="text-blue-600" />
              <span className="font-bold text-gray-900 flex-1">Bike Shop</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={20} className="text-gray-500" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <Bike size={24} className="text-blue-600" />
              </button>
              {sidebarOpen && <span className="font-bold text-gray-900">Bike Shop</span>}
            </>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(n => (
            <button key={n.key} onClick={() => handleNavClick(n.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${page === n.key ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
              <n.icon size={18} />
              {expanded && n.label}
            </button>
          ))}
        </nav>

        {/* PWA install button */}
        {installPrompt && (
          <div className={`border-t border-gray-200 ${expanded ? "p-3" : "p-2"}`}>
            <button onClick={handleInstallClick}
              className={`flex items-center gap-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ${expanded ? "w-full px-3 py-2.5" : "p-2 justify-center"}`}
              title="Install App">
              <Smartphone size={18} />
              {expanded && "Install App"}
            </button>
          </div>
        )}

        {/* Offline / Sync indicator */}
        {(!isOnline || syncStatus.pendingCount > 0) && (
          <div className={`border-t border-gray-200 ${expanded ? "px-3 py-2" : "p-2"}`}>
            <div className={`flex items-center gap-2 text-xs font-medium ${!isOnline ? "text-amber-600" : "text-blue-600"} ${!expanded && "justify-center"}`}
                 title={!isOnline ? "Offline" : `${syncStatus.pendingCount} pending sync`}>
              {!isOnline ? <WifiOff size={14} /> : syncStatus.syncing ? <RefreshCw size={14} className="animate-spin" /> : <CloudOff size={14} />}
              {expanded && (!isOnline ? "Offline" : `${syncStatus.pendingCount} pending`)}
            </div>
          </div>
        )}

        {/* User panel */}
        <div className="border-t border-gray-200">
          {expanded ? (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                  <User size={16} className="text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{currentUser.name}</p>
                  <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-medium ${roleColors[role]}`}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </span>
                </div>
              </div>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <LogOut size={16} /> Sign Out
              </button>
              {perms.deleteRecords && (
                <>
                  <p className="text-xs text-gray-400">Data stored locally</p>
                  <button onClick={async () => { if (await confirm("This will erase all local data and reload defaults from Supabase. This cannot be undone.", { title: "Reset all data?", variant: "danger", confirmLabel: "Reset" })) { const fresh = { ...defaultDB, _schemaVersion: DB_SCHEMA_VERSION }; saveDB(fresh); setDb(fresh); toast.success("Data reset to defaults"); } }}
                    className="text-xs text-red-400 hover:text-red-600">Reset to defaults</button>
                </>
              )}
            </div>
          ) : (
            <div className="p-2 flex flex-col items-center gap-2">
              <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Sign Out">
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ── Desktop Sidebar (hidden on mobile) ────────────────────── */}
      <div className={`hidden md:flex ${sidebarOpen ? "w-64" : "w-16"} bg-white border-r border-gray-200 flex-col transition-all duration-200 shrink-0`}>
        {sidebarContent(false)}
      </div>

      {/* ── Mobile Drawer Overlay ─────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
            {sidebarContent(true)}
          </div>
        </div>
      )}

      {/* ── Main Content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={() => setMobileMenuOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Menu size={22} className="text-gray-700" />
          </button>
          <Bike size={22} className="text-blue-600" />
          <span className="font-bold text-gray-900 flex-1">Bike Shop</span>
          <div className="flex items-center gap-2">
            {!isOnline && <WifiOff size={16} className="text-amber-500" />}
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
              <User size={14} className="text-gray-600" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {(!isOnline || syncStatus.pendingCount > 0) && (
            <div className={`${!isOnline ? "bg-amber-500" : "bg-blue-500"} text-white px-4 py-2 flex items-center gap-2 text-sm font-medium`}>
              {!isOnline ? (
                <>
                  <WifiOff size={16} />
                  <span className="hidden sm:inline">You are offline. Changes are saved locally.</span>
                  <span className="sm:hidden">Offline</span>
                  {syncStatus.pendingCount > 0 && <span className="hidden sm:inline">{` (${syncStatus.pendingCount} pending sync)`}</span>}
                </>
              ) : syncStatus.syncing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Syncing {syncStatus.pendingCount} pending changes...
                </>
              ) : (
                <>
                  <CloudOff size={16} />
                  {syncStatus.pendingCount} changes pending sync.
                  <button onClick={() => retrySyncNow()} className="ml-2 px-2 py-0.5 bg-white text-blue-700 rounded text-xs font-bold hover:bg-blue-50">Retry</button>
                </>
              )}
            </div>
          )}
          {showUpdateBanner && (
            <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-2"><RefreshCw size={16} /> A new version is available.</span>
              <button onClick={() => window.location.reload()} className="px-3 py-1 bg-white text-blue-700 rounded text-xs font-bold hover:bg-blue-50">
                Reload
              </button>
            </div>
          )}
          <div className="max-w-6xl mx-auto p-4 sm:p-6">
            {page === "dashboard" && perms.dashboardFull && <Dashboard db={db} />}
            {page === "myqueue" && <TechQueueDashboard db={db} setDb={setDb} currentUser={currentUser} />}
            {page === "clienthome" && perms.clientDashboard && <ClientDashboard db={db} currentUser={currentUser} onReportIssue={() => setPage("reportissue")} onBookBike={() => setPage("booking")} />}
            {page === "booking" && perms.bookingsCreate && <BookingWizard db={db} setDb={setDb} currentUser={currentUser} onBack={() => setPage("clienthome")} preselectedClientId={currentUser.properties?.[0]} />}
            {page === "bookings" && perms.bookingsView && <BikeBookingModule db={db} setDb={setDb} perms={perms} currentUser={currentUser} />}
            {page === "reportissue" && perms.clientReportIssue && <ClientIssueForm db={db} setDb={setDb} currentUser={currentUser} onBack={() => setPage("clienthome")} />}
            {page === "bicycles" && <BicyclesModule db={db} setDb={setDb} perms={perms} currentUser={currentUser} />}
            {page === "clients" && perms.clientsAll && <ClientsModule db={db} setDb={setDb} perms={perms} />}
            {page === "tools" && <ToolsModule db={db} setDb={setDb} perms={perms} currentUser={currentUser} />}
            {page === "workorders" && <WorkOrdersModule db={db} setDb={setDb} perms={perms} currentUser={currentUser} />}
            {page === "parts" && <PartsModule db={db} setDb={setDb} perms={perms} />}
            {page === "supplies" && <SuppliesModule db={db} setDb={setDb} perms={perms} />}
            {page === "trip" && perms.trip && <TripModule db={db} setDb={setDb} />}
          </div>
        </div>
      </div>
    </div>
  );
}
