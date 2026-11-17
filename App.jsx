import React, { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { resolveTenantOrganization, DEFAULT_BRAND } from './lib/tenant';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import TransactionLedger from './components/TransactionLedger';
import OwnersDrawTab from './components/OwnersDrawTab';
import VehicleTab from './components/VehicleTab';
import CogsTab from './components/CogsTab';
import HomeOfficeTab from './components/HomeOfficeTab';
import NextStepsTab from './components/NextStepsTab';
import OfficeAdminTab from './components/OfficeAdminTab';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Wallet,
  Car,
  Package,
  Home,
  CheckSquare,
  Building2,
  LogOut,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [logoError, setLogoError] = useState(false);

  // Multi-tenant white-label state
  const [tenant, setTenant] = useState(DEFAULT_BRAND);
  const [membership, setMembership] = useState(null);
  const [inspectedClient, setInspectedClient] = useState(null); // When an Office Admin opens a client's report

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [draws, setDraws] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [cogsList, setCogsList] = useState([]);
  const [homeOfficeList, setHomeOfficeList] = useState([]);

  // Resolve white-label branding immediately on load (even before login)
  useEffect(() => {
    resolveTenantOrganization(null).then((org) => {
      if (org) {
        setTenant(org);
        document.title = org.brand_name || 'Simple Bookkeeping System';
      }
    });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoadingAuth(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      initializeUserAndTenant(session.user);
    } else {
      setMembership(null);
      setInspectedClient(null);
    }
  }, [session]);

  const initializeUserAndTenant = async (user) => {
    const resolvedOrg = await resolveTenantOrganization(user.id);
    if (resolvedOrg) {
      setTenant(resolvedOrg);
      document.title = resolvedOrg.brand_name || 'Simple Bookkeeping System';
    }
    const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const mustChangePassword = Boolean(session?.user?.user_metadata?.must_change_password);

  // Automatically open the modal if the user has a temporary password flag
  useEffect(() => {
    if (mustChangePassword) {
      setShowPasswordModal(true);
    }
  }, [mustChangePassword]);
    <ChangePasswordModal
  isOpen={showPasswordModal || mustChangePassword}
  onClose={() => {
    if (!mustChangePassword) {
      setShowPasswordModal(false);
      setIsRecoveryMode(false);
    }
  }}
  primaryColor={primaryColor}
  isRecoveryMode={isRecoveryMode}
  forceChange={mustChangePassword}
/>

    // Ensure user_memberships row exists (handles users who confirmed via email link)
    let { data: mem } = await supabase
      .from('user_memberships')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!mem && resolvedOrg?.id) {
      const superEmail = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || '').toLowerCase();
      const role =
        (user.email || '').toLowerCase() === superEmail ? 'super_admin' : 'client';

      const { data: createdMem } = await supabase
        .from('user_memberships')
        .upsert({
          user_id: user.id,
          organization_id: user.user_metadata?.organization_id || resolvedOrg.id,
          role,
          full_name: user.user_metadata?.full_name || '',
          email: user.email || '',
        })
        .select()
        .single();
      mem = createdMem;
    }

    setMembership(mem);
    await fetchUserBookkeepingData(user.id);
  };

  const fetchUserBookkeepingData = async (targetUserId) => {
    const [profRes, txRes, drawRes, vehRes, cogsRes, hoRes] = await Promise.all([
      supabase.from('business_profiles').select('*').eq('user_id', targetUserId).maybeSingle(),
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', targetUserId)
        .order('tx_date', { ascending: false }),
      supabase
        .from('owners_draws')
        .select('*')
        .eq('user_id', targetUserId)
        .order('draw_date', { ascending: false }),
      supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: true }),
      supabase.from('cogs_records').select('*').eq('user_id', targetUserId),
      supabase.from('home_office_records').select('*').eq('user_id', targetUserId),
    ]);

    setProfile(profRes.data || null);
    setTransactions(txRes.data || []);
    setDraws(drawRes.data || []);
    setVehicles(vehRes.data || []);
    setCogsList(cogsRes.data || []);
    setHomeOfficeList(hoRes.data || []);
  };

  const handleInspectClient = async (clientMembership) => {
    setInspectedClient(clientMembership);
    await fetchUserBookkeepingData(clientMembership.user_id);
    setActiveTab('dashboard');
  };

  const handleExitClientInspection = async () => {
    setInspectedClient(null);
    await fetchUserBookkeepingData(session.user.id);
    setActiveTab('office_admin');
  };

  // Compute dynamic year selector options
  const availableYears = useMemo(() => {
    const yrs = new Set([currentYear - 1, currentYear, currentYear + 1, 2024, 2025, 2026]);
    transactions.forEach((t) => yrs.add(Number(t.tx_year)));
    draws.forEach((d) => yrs.add(Number(d.draw_year)));
    vehicles.forEach((v) => yrs.add(Number(v.tax_year)));
    return Array.from(yrs).sort((a, b) => b - a);
  }, [transactions, draws, vehicles, currentYear]);

  // CRUD Handlers (Disabled when an Office Admin is inspecting a client's read-only report)
  const effectiveUserId = inspectedClient ? inspectedClient.user_id : session?.user?.id;

  const handleSaveProfile = async (updates) => {
    if (inspectedClient) return;
    const payload = { user_id: effectiveUserId, ...updates, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('business_profiles')
      .upsert(payload)
      .select()
      .single();
    if (!error && data) setProfile(data);
  };

  const handleAddTransaction = async (tx) => {
    if (inspectedClient) return;
    const { data, error } = await supabase
      .from('transactions')
      .insert([{ ...tx, user_id: effectiveUserId }])
      .select()
      .single();
    if (!error && data) {
      setTransactions((prev) => [data, ...prev]);
      setSelectedYear(Number(data.tx_year));
    }
  };

  const handleBulkImportTransactions = async (rows) => {
    if (inspectedClient) return;
    const payload = rows.map((r) => ({ ...r, user_id: effectiveUserId }));
    const { data, error } = await supabase.from('transactions').insert(payload).select();
    if (!error && data) {
      setTransactions((prev) => [...data, ...prev]);
      if (data[0]?.tx_year) setSelectedYear(Number(data[0].tx_year));
    }
  };

  const handleUpdateTransaction = async (id, updates) => {
    if (inspectedClient) return;
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      setTransactions((prev) => prev.map((t) => (t.id === id ? data : t)));
    }
  };

  const handleBulkUpdateTransactions = async (ids, updates) => {
    if (inspectedClient) return;
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .in('id', ids)
      .select();
    if (!error && data) {
      const updatedMap = new Map(data.map((d) => [d.id, d]));
      setTransactions((prev) => prev.map((t) => updatedMap.get(t.id) || t));
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (inspectedClient) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleBulkDeleteTransactions = async (ids) => {
    if (inspectedClient) return;
    const { error } = await supabase.from('transactions').delete().in('id', ids);
    if (!error) {
      const idSet = new Set(ids);
      setTransactions((prev) => prev.filter((t) => !idSet.has(t.id)));
    }
  };

  const handleAddDraw = async (draw) => {
    if (inspectedClient) return;
    const { data, error } = await supabase
      .from('owners_draws')
      .insert([{ ...draw, user_id: effectiveUserId }])
      .select()
      .single();
    if (!error && data) {
      setDraws((prev) => [data, ...prev]);
      setSelectedYear(Number(data.draw_year));
    }
  };

  const handleDeleteDraw = async (id) => {
    if (inspectedClient) return;
    const { error } = await supabase.from('owners_draws').delete().eq('id', id);
    if (!error) setDraws((prev) => prev.filter((d) => d.id !== id));
  };

  const handleAddVehicle = async (veh) => {
    if (inspectedClient) return;
    const { data, error } = await supabase
      .from('vehicles')
      .insert([{ ...veh, user_id: effectiveUserId }])
      .select()
      .single();
    if (!error && data) setVehicles((prev) => [...prev, data]);
  };

  const handleDeleteVehicle = async (id) => {
    if (inspectedClient) return;
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (!error) setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  const handleSaveCogs = async (record) => {
    if (inspectedClient) return;
    const { data, error } = await supabase
      .from('cogs_records')
      .upsert(
        { ...record, user_id: effectiveUserId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,tax_year' }
      )
      .select()
      .single();
    if (!error && data) {
      setCogsList((prev) => [...prev.filter((c) => c.tax_year !== data.tax_year), data]);
    }
  };

  const handleSaveHomeOffice = async (record) => {
    if (inspectedClient) return;
    const { data, error } = await supabase
      .from('home_office_records')
      .upsert(
        { ...record, user_id: effectiveUserId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,tax_year' }
      )
      .select()
      .single();
    if (!error && data) {
      setHomeOfficeList((prev) => [...prev.filter((h) => h.tax_year !== data.tax_year), data]);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100">
        <div className="max-w-lg bg-white p-8 rounded-2xl shadow border border-slate-200">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Database Connection Required</h1>
          <p className="text-sm text-slate-600">
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in Hostinger.
          </p>
        </div>
      </div>
    );
  }

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>
    );
  }

  if (!session) {
    return <Auth tenant={tenant} />;
  }

  const activeVehicles = vehicles.filter((v) => Number(v.tax_year) === Number(selectedYear));
  const activeCogs = cogsList.find((c) => Number(c.tax_year) === Number(selectedYear));
  const activeHomeOffice = homeOfficeList.find((h) => Number(h.tax_year) === Number(selectedYear));

  const isAdmin = membership?.role === 'office_admin' || membership?.role === 'super_admin';
  const accentColor = tenant?.primary_color || '#059669';
  const logoSrc = tenant?.logo_url || '/logo.png';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard & Reports', icon: LayoutDashboard },
    { id: 'income', label: 'Income', icon: TrendingUp },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown },
    { id: 'owners_draw', label: "Owner's Draw", icon: Wallet },
    { id: 'vehicle', label: 'Vehicle Info', icon: Car },
    { id: 'cogs', label: 'Cost of Goods Sold', icon: Package },
    { id: 'home_office', label: 'Home Office', icon: Home },
    { id: 'next_steps', label: 'Next Steps', icon: CheckSquare },
    ...(isAdmin && !inspectedClient
      ? [{ id: 'office_admin', label: 'Tax Office Admin', icon: Building2 }]
      : []),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Client Inspection Banner for Tax Office Admins */}
      {inspectedClient && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between no-print">
          <span>
            Viewing Client Report:{' '}
            {inspectedClient.profile?.business_name ||
              inspectedClient.full_name ||
              inspectedClient.email}{' '}
            (Read-Only Mode)
          </span>
          <button
            onClick={handleExitClientInspection}
            className="inline-flex items-center gap-1 bg-slate-900 text-white px-3 py-1 rounded-md text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Tax Office Admin
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!logoError && logoSrc ? (
              <img
                src={logoSrc}
                alt={tenant?.brand_name}
                onError={() => setLogoError(true)}
                className="h-9 w-auto object-contain rounded"
              />
            ) : (
              <div style={{ backgroundColor: accentColor }} className="p-2 rounded-lg">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <span className="font-bold text-base tracking-tight">
                {tenant?.brand_name || 'Simple Bookkeeping System'}
              </span>
              {isAdmin && (
                <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-emerald-400">
                  {membership?.role === 'super_admin' ? 'Super Admin' : 'Office Admin'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-xs text-slate-400">{session.user.email}</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-800/80 border-t border-slate-700/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-1 py-1.5">
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={isActive ? { backgroundColor: accentColor } : undefined}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                    isActive
                      ? 'text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            tenant={tenant}
            profile={profile}
            onSaveProfile={handleSaveProfile}
            transactions={transactions}
            draws={draws}
            vehicles={activeVehicles}
            cogs={activeCogs}
            homeOffice={activeHomeOffice}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            availableYears={availableYears}
          />
        )}

        {activeTab === 'income' && (
          <TransactionLedger
            type="income"
            transactions={transactions}
            selectedYear={selectedYear}
            onAddTransaction={handleAddTransaction}
            onBulkImportTransactions={handleBulkImportTransactions}
            onUpdateTransaction={handleUpdateTransaction}
            onBulkUpdateTransactions={handleBulkUpdateTransactions}
            onDeleteTransaction={handleDeleteTransaction}
            onBulkDeleteTransactions={handleBulkDeleteTransactions}
          />
        )}

        {activeTab === 'expenses' && (
          <TransactionLedger
            type="expense"
            transactions={transactions}
            selectedYear={selectedYear}
            onAddTransaction={handleAddTransaction}
            onBulkImportTransactions={handleBulkImportTransactions}
            onUpdateTransaction={handleUpdateTransaction}
            onBulkUpdateTransactions={handleBulkUpdateTransactions}
            onDeleteTransaction={handleDeleteTransaction}
            onBulkDeleteTransactions={handleBulkDeleteTransactions}
          />
        )}

        {activeTab === 'owners_draw' && (
          <OwnersDrawTab
            selectedYear={selectedYear}
            draws={draws}
            onAddDraw={handleAddDraw}
            onDeleteDraw={handleDeleteDraw}
          />
        )}

        {activeTab === 'vehicle' && (
          <VehicleTab
            selectedYear={selectedYear}
            vehicles={activeVehicles}
            onAddVehicle={handleAddVehicle}
            onDeleteVehicle={handleDeleteVehicle}
          />
        )}

        {activeTab === 'cogs' && (
          <CogsTab selectedYear={selectedYear} cogs={activeCogs} onSaveCogs={handleSaveCogs} />
        )}

        {activeTab === 'home_office' && (
          <HomeOfficeTab
            selectedYear={selectedYear}
            homeOffice={activeHomeOffice}
            onSaveHomeOffice={handleSaveHomeOffice}
          />
        )}

        {activeTab === 'next_steps' && (
          <NextStepsTab
            tenant={tenant}
            selectedYear={selectedYear}
            onNavigate={(tabId) => setActiveTab(tabId)}
          />
        )}

        {activeTab === 'office_admin' && isAdmin && (
          <OfficeAdminTab
            tenant={tenant}
            membership={membership}
            onTenantUpdated={(updated) => setTenant(updated)}
            onInspectClient={handleInspectClient}
            selectedYear={selectedYear}
          />
        )}
      </main>
    </div>
  );
}
