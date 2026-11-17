import React, { useState, useEffect } from 'react';
import {
  LogOut,
  ShieldCheck,
  BookOpen,
  KeyRound,
  AlertTriangle,
  Building2,
  Mail,
  Lock,
  User,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import BookkeepingLedger from './components/BookkeepingLedger';
import OfficeAdminTab from './components/OfficeAdminTab';
import ChangePasswordModal from './components/ChangePasswordModal';

const DEFAULT_ORG = {
  id: 'default',
  slug: 'default',
  brand_name: 'Simple Bookkeeping System',
  tagline: 'Simple Multi-Year Business Ledger & Schedule C Reports',
  primary_color: '#059669',
  logo_url: null,
  support_email: '',
  is_active: true,
};

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [currentOrg, setCurrentOrg] = useState(DEFAULT_ORG);
  const [membership, setMembership] = useState(null);
  const [loadingMembership, setLoadingMembership] = useState(false);

  // Navigation & Password Modal state
  const [activeView, setActiveView] = useState('ledger'); // 'ledger' | 'admin'
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  // Login / Signup form state
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authMessage, setAuthMessage] = useState(null);

  const mustChangePassword = Boolean(session?.user?.user_metadata?.must_change_password);
  const primaryColor = currentOrg?.primary_color || '#059669';

  // 1. Resolve white-label organization from ?office=slug URL parameter
  useEffect(() => {
    let isMounted = true;
    async function loadBrandingFromSlug() {
      const params = new URLSearchParams(window.location.search);
      const slug = (params.get('office') || '').trim().toLowerCase();
      if (!slug || slug === 'default') return;

      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (!error && data && isMounted) {
        setCurrentOrg(data);
        document.title = data.brand_name || 'Simple Bookkeeping System';
      }
    }
    loadBrandingFromSlug();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Listen to Supabase Auth state & PASSWORD_RECOVERY links
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        setShowPasswordModal(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3. Auto-prompt password change when signed in with temporary password
  useEffect(() => {
    if (mustChangePassword) {
      setShowPasswordModal(true);
    }
  }, [mustChangePassword]);

  // 4. Load user_memberships & assigned organization once logged in
  useEffect(() => {
    if (!session?.user?.id) {
      setMembership(null);
      return;
    }

    let isMounted = true;
    async function loadUserMembership() {
      setLoadingMembership(true);
      try {
        const { data: memberData, error } = await supabase
          .from('user_memberships')
          .select('*, organizations(*)')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!error && memberData && isMounted) {
          setMembership(memberData);
          if (memberData.organizations) {
            setCurrentOrg(memberData.organizations);
            document.title = memberData.organizations.brand_name || 'Simple Bookkeeping System';
          }
        }
      } finally {
        if (isMounted) setLoadingMembership(false);
      }
    }

    loadUserMembership();
    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  // Auth handlers (in component body, BEFORE return)
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAuth(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              office_slug: currentOrg?.slug !== 'default' ? currentOrg?.slug : undefined,
            },
          },
        });
        if (error) throw error;
        setAuthMessage('Account created! Check your email to confirm or sign in.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed.');
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleForgotPassword = async () => {
    setAuthError(null);
    setAuthMessage(null);

    if (!email.trim()) {
      setAuthError('Enter your email address above first, then click Forgot Password.');
      return;
    }

    const redirectUrl =
      currentOrg?.slug && currentOrg.slug !== 'default'
        ? `${window.location.origin}/?office=${currentOrg.slug}`
        : window.location.origin;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: redirectUrl,
    });

    if (error) {
      setAuthError(error.message);
    } else {
      setAuthMessage('Password reset email sent! Check your inbox for the reset link.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMembership(null);
    setActiveView('ledger');
  };

  // Loading state
  if (authLoading || (session && loadingMembership)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm font-medium text-slate-500">
        Loading workspace...
      </div>
    );
  }

  // Unauthenticated Login / Sign-Up Screen
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div
            className="px-6 py-6 text-white text-center space-y-1.5"
            style={{ backgroundColor: primaryColor }}
          >
            {currentOrg?.logo_url ? (
              <img
                src={currentOrg.logo_url}
                alt={currentOrg.brand_name}
                className="h-10 mx-auto mb-2 object-contain"
              />
            ) : (
              <Building2 className="w-8 h-8 mx-auto mb-1 opacity-90" />
            )}
            <h1 className="text-xl font-bold tracking-tight">{currentOrg.brand_name}</h1>
            <p className="text-xs opacity-90">{currentOrg.tagline}</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="p-6 space-y-4">
            {authError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
                {authError}
              </div>
            )}
            {authMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                {authMessage}
              </div>
            )}

            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="you@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingAuth}
              className="w-full py-2.5 text-white text-sm font-semibold rounded-xl shadow-sm disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {submittingAuth ? 'Please wait...' : isSignUp ? 'Create Client Account' : 'Sign In'}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError(null);
                  setAuthMessage(null);
                }}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 underline"
              >
                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Suspended Account Lockout Screen
  if (membership && membership.is_active === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-red-200 shadow-sm text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Account Suspended</h2>
          <p className="text-sm text-slate-600">
            Your access to <strong>{currentOrg.brand_name}</strong> has been paused by your tax office administrator.
            {currentOrg.support_email && (
              <>
                {' '}
                Please contact{' '}
                <a
                  href={`mailto:${currentOrg.support_email}`}
                  className="font-semibold text-emerald-700 underline"
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
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const userRole = (membership?.role || 'client').toLowerCase();
  const isAdmin = userRole === 'super_admin' || userRole === 'office_admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top White-Label Header */}
      <header className="
