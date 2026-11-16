import React, { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import TransactionLedger from './components/TransactionLedger';
import OwnersDrawTab from './components/OwnersDrawTab';
import VehicleTab from './components/VehicleTab';
import CogsTab from './components/CogsTab';
import HomeOfficeTab from './components/HomeOfficeTab';
import NextStepsTab from './components/NextStepsTab';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Wallet,
  Car,
  Package,
  Home,
  CheckSquare,
  LogOut,
  BookOpen,
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [logoError, setLogoError] = useState(false);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [draws, setDraws] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [cogsList, setCogsList] = useState([]);
  const [homeOfficeList, setHomeOfficeList] = useState([]);

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
      fetchAllUserData(session.user.id);
    }
  }, [session]);

  const fetchAllUserData = async (userId) => {
    const [profRes, txRes, drawRes, vehRes, cogsRes, hoRes] = await Promise.all([
      supabase.from('business_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('tx_date', { ascending: false }),
      supabase
        .from('owners_draws')
        .select('*')
        .eq('user_id', userId)
        .order('draw_date', { ascending: false }),
      supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      supabase.from('cogs_records').select('*').eq('user_id', userId),
      supabase.from('home_office_records').select('*').eq('user_id', userId),
    ]);

    if (profRes.data) setProfile(profRes.data);
    if (txRes.data) setTransactions(txRes.data);
    if (drawRes.data) setDraws(drawRes.data);
    if (vehRes.data) setVehicles(vehRes.data);
    if (cogsRes.data) setCogsList(cogsRes.data);
    if (hoRes.data) setHomeOfficeList(hoRes.data);
  };

  // Compute dynamic year selector options
  const availableYears = useMemo(() => {
    const yrs = new Set([currentYear - 1, currentYear, currentYear + 1, 2024, 2025, 2026]);
    transactions.forEach((t) => yrs.add(Number(t.tx_year)));
    draws.forEach((d) => yrs.add(Number(d.draw_year)));
    vehicles.forEach((v) => yrs.add(Number(v.tax_year)));
    return Array.from(yrs).sort((a, b) => b - a);
  }, [transactions, draws, vehicles, currentYear]);

  // CRUD Handlers
  const handleSaveProfile = async (updates) => {
    const payload = { user_id: session.user.id, ...updates, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('business_profiles')
      .upsert(payload)
      .select()
      .single();
    if (!error && data) setProfile(data);
  };

  const handleAddTransaction = async (tx) => {
    const { data, error } = await supabase
      .from('transactions')
      .insert([{ ...tx, user_id: session.user.id }])
      .select()
      .single();
    if (!error && data) {
      setTransactions((prev) => [data, ...prev]);
      setSelectedYear(Number(data.tx_year));
    }
  };

  const handleDeleteTransaction = async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddDraw = async (draw) => {
    const { data, error } = await supabase
      .from('owners_draws')
      .insert([{ ...draw, user_id: session.user.id }])
      .select()
      .single();
    if (!error && data) {
      setDraws((prev) => [data, ...prev]);
      setSelectedYear(Number(data.draw_year));
    }
  };

  const handleDeleteDraw = async (id) => {
    const { error } = await supabase.from('owners_draws').delete().eq('id', id);
    if (!error) setDraws((prev) => prev.filter((d) => d.id !== id));
  };

  const handleAddVehicle = async (veh) => {
    const { data, error } = await supabase
      .from('vehicles')
      .insert([{ ...veh, user_id: session.user.id }])
      .select()
      .single();
    if (!error && data) setVehicles((prev) => [...prev, data]);
  };

  const handleDeleteVehicle = async (id) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (!error) setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  const handleSaveCogs = async (record) => {
    const { data, error } = await supabase
      .from('cogs_records')
      .upsert(
        { ...record, user_id: session.user.id, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,tax_year' }
      )
      .select()
      .single();
    if (!error && data) {
      setCogsList((prev) => [...prev.filter((c) => c.tax_year !== data.tax_year), data]);
    }
  };

  const handleSaveHomeOffice = async (record) => {
    const { data, error } = await supabase
      .from('home_office_records')
      .upsert(
        { ...record, user_id: session.user.id, updated_at: new Date().toISOString() },
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
          <p className="text-sm text-slate-600 mb-4">
            Add your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>{' '}
            environment variables in Hostinger (or your local <code>.env</code> file) to enable user
            accounts and database storage.
          </p>
          <p className="text-xs text-slate-500">
            See <code>README.md</code> in this repository for step-by-step setup instructions.
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
    return <Auth />;
  }

  const activeVehicles = vehicles.filter((v) => Number(v.tax_year) === Number(selectedYear));
  const activeCogs = cogsList.find((c) => Number(c.tax_year) === Number(selectedYear));
  const activeHomeOffice = homeOfficeList.find((h) => Number(h.tax_year) === Number(selectedYear));

  const navItems = [
    { id: 'dashboard', label: 'Dashboard & Reports', icon: LayoutDashboard },
    { id: 'income', label: 'Income', icon: TrendingUp },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown },
    { id: 'owners_draw', label: "Owner's Draw", icon: Wallet },
    { id: 'vehicle', label: 'Vehicle Info', icon: Car },
    { id: 'cogs', label: 'Cost of Goods Sold', icon: Package },
    { id: 'home_office', label: 'Home Office', icon: Home },
    { id: 'next_steps', label: 'Next Steps', icon: CheckSquare },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!logoError ? (
              <img
                src="/logo.png"
                alt="Logo"
                onError={() => setLogoError(true)}
                className="h-9 w-auto object-contain rounded"
              />
            ) : (
              <div className="p-2 bg-emerald-600 rounded-lg">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <span className="font-bold text-base tracking-tight">Simple Bookkeeping System</span>
              <span className="hidden sm:inline-block ml-2 text-xs text-emerald-400 font-medium">
                v2.1
              </span>
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
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
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
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {activeTab === 'expenses' && (
          <TransactionLedger
            type="expense"
            transactions={transactions}
            selectedYear={selectedYear}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
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
            selectedYear={selectedYear}
            onNavigate={(tabId) => setActiveTab(tabId)}
          />
        )}
      </main>
    </div>
  );
}
