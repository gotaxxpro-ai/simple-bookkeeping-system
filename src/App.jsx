import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  ShieldCheck,
  LogOut,
  Building2,
  AlertOctagon,
  Loader2,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { resolveTenantOrganization, DEFAULT_BRAND } from './lib/tenant';
import Auth from './components/Auth';
import BookkeepingLedger from './components/BookkeepingLedger';
import OfficeAdminTab from './components/OfficeAdminTab';

export default function App() {
  const [session, setSession] = useState(null);
  const [membership, setMembership] = useState(null);
  const [currentOrg, setCurrentOrg] = useState(DEFAULT_BRAND);
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'admin'
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Load user membership & resolve white-label organization branding
  const loadSessionContext = useCallback(async (currentSession) => {
    setAuthError(null);

    if (!currentSession?.user) {
      setMembership(null);
      const publicOrg = await resolveTenantOrganization(null);
      setCurrentOrg(publicOrg);
      setActiveTab('ledger');
      setInitializing(false);
      return;
    }

    try {
      // 1. Fetch user's role, organization_id, and active status
      const { data: memberData, error: memberError } = await supabase
        .from('user_memberships')
        .select('user_id, organization_id, role, is_active, email, full_name')
        .eq('user_id', currentSession.user.id)
        .maybeSingle();

      if (memberError) {
        throw new Error(`Could not verify account membership: ${memberError.message}`);
      }

      // Fallback default client membership if trigger hasn't populated yet
      const activeMembership = memberData || {
        user_id: currentSession.user.id,
        organization_id: null,
        role: 'client',
        is_active: true,
        email: currentSession.user.email,
        full_name: currentSession.user.user_metadata?.full_name || currentSession.user.email,
      };

      setMembership(activeMembership);

      // 2. Resolve tenant organization (uses ?office=slug if present, otherwise user's organization_id)
      const resolvedOrg = await resolveTenantOrganization(activeMembership.organization_id);
      setCurrentOrg(resolvedOrg);

      // 3. Default office_admin / super_admin users to the Admin tab if desired, or keep ledger accessible
      if (['office_admin', 'super_admin'].includes(activeMembership.role)) {
        setActiveTab('admin');
      } else {
        setActiveTab('ledger');
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setInitializing(false);
    }
  }, []);

  // Initialize Supabase session listener on mount
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setInitializing(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      setSession(initialSession);
      loadSessionContext(initialSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
      if (!isMounted) return;
      setSession(updatedSession);
      loadSessionContext(updatedSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadSessionContext]);

  // Update browser document title to match active white-label brand
  useEffect(() => {
    if (currentOrg?.brand_name) {
      document.title = currentOrg.brand_name;
    }
  }, [currentOrg?.brand_name]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  // Guard: Missing .env keys
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-red-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-red-700 font-bold">
            <AlertOctagon className="w-5 h-5" />
            <span>Supabase Configuration Missing</span>
          </div>
          <p className="text-sm text-slate-600">
            Verify that <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> are set in your local <code>.env</code> file and Hostinger environment variables, then rebuild.
          </p>
        </div>
      </div>
    );
  }

  // Loading spinner while checking session & branding
  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-600">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium">Loading portal...</p>
      </div>
    );
  }

  // Unauthenticated view -> Render white-label Auth screen
  if (!session) {
    return <Auth tenant={currentOrg} />;
  }

  // Suspended Account Lockout Screen
  if (membership && membership.is_active === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-red-200 shadow-sm text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Account Suspended</h2>
          <p className="text-sm text-slate-600">
            Your portal access has been paused by your tax office administrator.
            {currentOrg?.support_email && (
              <>
                {' '}
                Please contact{' '}
                <a
                  href={`mailto:${currentOrg.support_email}`}
                  className="font-semibold underline text-slate-800"
                >
                  {currentOrg.support_email}
                </a>{' '}
                for assistance.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = ['office_admin', 'super_admin'].includes(membership?.role);
  const primaryColor = currentOrg?.primary_color || '#059669';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top White-Label Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 min-w-0">
            {currentOrg?.logo_url ? (
              <img
                src={currentOrg.logo_url}
                alt={currentOrg.brand_name}
                className="h-9 w-auto object-contain shrink-0"
              />
            ) : (
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                <Building2 className="w-5 h-5" />
              </div>
            )}
            <div className="truncate">
              <h1 className="text-base font-bold text-slate-900 truncate">
                {currentOrg?.brand_name || DEFAULT_BRAND.brand_name}
              </h1>
              {currentOrg?.tagline && (
                <p className="text-xs text-slate-500 truncate hidden sm:block">
                  {currentOrg.tagline}
                </p>
              )}
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'ledger'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              My Ledger & Schedule C
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'admin'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {membership?.role === 'super_admin' ? 'Platform & Office Admin' : 'Office Admin'}
              </button>
            )}
          </nav>

          {/* Right User Info & Sign Out */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:block text-right">
              <div className="text-xs font-semibold text-slate-800">
                {membership?.full_name || session.user.email}
              </div>
              <div className="text-[11px] text-slate-500 capitalize">
                {(membership?.role || 'client').replace('_', ' ')}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-8 px-4 sm:px-6">
        {authError && (
          <div className="max-w-5xl mx-auto mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
            {authError}
          </div>
        )}

        {activeTab === 'admin' && isAdmin ? (
          <OfficeAdminTab
            membership={membership}
            currentOrg={currentOrg}
            onOrgUpdated={(updatedOrg) => setCurrentOrg(updatedOrg)}
          />
        ) : (
          <BookkeepingLedger
            targetUserId={session.user.id}
            targetUserName={membership?.full_name || session.user.email}
            readOnly={false}
            primaryColor={primaryColor}
          />
        )}
      </main>

      {/* White-Label Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 text-center text-xs text-slate-500">
        <span>{currentOrg?.brand_name || DEFAULT_BRAND.brand_name}</span>
        {currentOrg?.support_email && (
          <>
            {' • '}
            Support:{' '}
            <a
              href={`mailto:${currentOrg.support_email}`}
              className="underline hover:text-slate-800"
            >
              {currentOrg.support_email}
            </a>
          </>
        )}
      </footer>
    </div>
  );
}
