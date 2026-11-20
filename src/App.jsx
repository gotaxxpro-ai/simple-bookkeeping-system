import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Tooltip from './components/Tooltip';
import LegalModal from './components/LegalModal';
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
  Eye,
  EyeOff,
  Hash,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import BookkeepingLedger from './components/BookkeepingLedger';
import OfficeAdminTab from './components/OfficeAdminTab';
import ChangePasswordModal from './components/ChangePasswordModal';

const DEMO_EMAIL = 'demo@simplebookkeepingsystem.com';
const DEMO_PASSWORD = 'Demo1234!';

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
  const [launchingDemo, setLaunchingDemo] = useState(() => {
    return new URLSearchParams(window.location.search).get('demo') === 'true';
  });

  const initialUrlSlug = (new URLSearchParams(window.location.search).get('office') || '')
    .trim()
    .toLowerCase();

  const [showAuth, setShowAuth] = useState(() => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    return Boolean(
      (initialUrlSlug && initialUrlSlug !== 'default') || hash === 'login' || hash === 'signup'
    );
  });

  const [currentOrg, setCurrentOrg] = useState(DEFAULT_ORG);
  const [membership, setMembership] = useState(null);
  const [loadingMembership, setLoadingMembership] = useState(false);

  const [activeView, setActiveView] = useState('ledger');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState(null);

  const [isSignUp, setIsSignUp] = useState(() => {
    return window.location.hash.replace('#', '').toLowerCase() === 'signup';
  });
  const [fullName, setFullName] = useState('');
  const [officeSlugInput, setOfficeSlugInput] = useState(
    initialUrlSlug && initialUrlSlug !== 'default' ? initialUrlSlug : ''
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authMessage, setAuthMessage] = useState(null);

  const isDemoUser = session?.user?.email?.toLowerCase() === DEMO_EMAIL;
  const mustChangePassword =
    !isDemoUser && Boolean(session?.user?.user_metadata?.must_change_password);
  const primaryColor = currentOrg?.primary_color || '#059669';
  const hasUrlLockedOffice = Boolean(initialUrlSlug && initialUrlSlug !== 'default');

  useEffect(() => {
    const syncAuthFromHash = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash === 'login') {
        setIsSignUp(false);
        setAuthError(null);
        setAuthMessage(null);
        setConfirmPassword('');
        setShowPasswordText(false);
        setShowAuth(true);
      } else if (hash === 'signup') {
        setIsSignUp(true);
        setAuthError(null);
        setAuthMessage(null);
        setConfirmPassword('');
        setShowPasswordText(false);
        setShowAuth(true);
      }
    };

    window.addEventListener('hashchange', syncAuthFromHash);
    return () => window.removeEventListener('hashchange', syncAuthFromHash);
  }, []);

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
        setOfficeSlugInput(data.slug);
        document.title = data.brand_name || 'Simple Bookkeeping System';
      }
    }
    loadBrandingFromSlug();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initAuthAndDemo() {
      const params = new URLSearchParams(window.location.search);
      const wantsDemo = params.get('demo') === 'true';

      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (wantsDemo) {
        if (initialSession?.user?.email?.toLowerCase() === DEMO_EMAIL) {
          if (isMounted) {
            setSession(initialSession);
            setLaunchingDemo(false);
            setAuthLoading(false);
          }
          return;
        }

        if (initialSession) {
          await supabase.auth.signOut();
        }

        const { data: demoData, error: demoErr } = await supabase.auth.signInWithPassword({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        });

        if (isMounted) {
          if (!demoErr && demoData?.session) {
            setSession(demoData.session);
          } else {
            setAuthError(
              demoErr?.message ||
                'Demo workspace is temporarily unavailable. Please sign in or create a free trial account.'
            );
            setShowAuth(true);
          }
          setLaunchingDemo(false);
          setAuthLoading(false);
        }
        return;
      }

      if (isMounted) {
        setSession(initialSession);
        setLaunchingDemo(false);
        setAuthLoading(false);
      }
    }

    initAuthAndDemo();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        setShowPasswordModal(true);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (mustChangePassword) {
      setShowPasswordModal(true);
    }
  }, [mustChangePassword]);

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

            const orgSlug = memberData.organizations.slug;
            const currentUrlSlug = new URLSearchParams(window.location.search).get('office');
            if (orgSlug && orgSlug !== 'default' && currentUrlSlug !== orgSlug) {
              window.history.replaceState(null, '', `${window.location.pathname}?office=${orgSlug}`);
            }
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

  const handleOpenAuth = (mode = 'login') => {
    const signupMode = mode === 'signup';
    setIsSignUp(signupMode);
    setAuthError(null);
    setAuthMessage(null);
    setConfirmPassword('');
    setShowPasswordText(false);
    setShowAuth(true);
    if (typeof window !== 'undefined') {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}#${signupMode ? 'signup' : 'login'}`
      );
    }
  };

  const handleBackToHome = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.delete('demo');
      const cleanQuery = params.toString() ? `?${params.toString()}` : '';
      window.history.replaceState(null, '', `${window.location.pathname}${cleanQuery}`);
    }
    setAuthError(null);
    setAuthMessage(null);
    setShowAuth(false);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAuth(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();
      const cleanSlug = officeSlugInput.trim().toLowerCase();

      if (!cleanEmail || !cleanPassword) {
        throw new Error('Please enter both your email address and password.');
      }

      if (isSignUp) {
        if (!acceptedTerms) {
          throw new Error(
            'Please agree to the Terms of Service, Privacy Policy, and Tax Disclaimer to create your account.'
          );
        }
        if (cleanPassword.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        if (cleanPassword !== confirmPassword.trim()) {
          throw new Error('Passwords do not match.');
        }

        let matchedOrg = null;
        if (cleanSlug && cleanSlug !== 'default') {
          const { data: orgRow, error: orgErr } = await supabase
            .from('organizations')
            .select('*')
            .eq('slug', cleanSlug)
            .eq('is_active', true)
            .maybeSingle();

          if (orgErr || !orgRow) {
            throw new Error(
              `Tax Office code "${cleanSlug}" was not found. Check the code with your tax preparer or leave it blank for a direct business account.`
            );
          }
          matchedOrg = orgRow;
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: {
              full_name: fullName.trim(),
              office_slug: matchedOrg ? matchedOrg.slug : undefined,
              terms_accepted_at: new Date().toISOString(),
              terms_version: '1.0',
            },
          },
        });
        if (error) throw error;

        if (matchedOrg) {
          setCurrentOrg(matchedOrg);
          document.title = matchedOrg.brand_name || 'Simple Bookkeeping System';
        }

        if (data?.session) {
          if (matchedOrg) {
            await supabase.from('user_memberships').upsert(
              {
                user_id: data.session.user.id,
                organization_id: matchedOrg.id,
                full_name: fullName.trim() || null,
                role: 'client',
                is_active: true,
              },
              { onConflict: 'user_id' }
            );
            window.location.href = `${window.location.pathname}?office=${matchedOrg.slug}`;
            return;
          }
          setSession(data.session);
        } else {
          if (matchedOrg) {
            window.history.replaceState(
              null,
              '',
              `${window.location.pathname}?office=${matchedOrg.slug}#login`
            );
          }
          setAuthMessage('Account created! You can now sign in with your password.');
          setConfirmPassword('');
          setIsSignUp(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });
        if (error) throw error;
        if (data?.session) {
          setSession(data.session);
        }
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed. Check your email and password.');
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
    handleBackToHome();
  };

  if (authLoading || launchingDemo || (session && loadingMembership)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm font-medium text-slate-500">
        {launchingDemo ? 'Launching live interactive demo workspace...' : 'Loading workspace...'}
      </div>
    );
  }

  if (!session) {
    if (!showAuth) {
      return <LandingPage tenant={currentOrg} onOpenAuth={handleOpenAuth} />;
    }

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mb-3">
          <Tooltip text="Return to the home page and pricing plans" position="bottom">
            <button
              type="button"
              onClick={handleBackToHome}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              &larr; Back to Home
            </button>
          </Tooltip>
        </div>

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
              <>
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

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Tax Office Code / Slug{' '}
                      <span className="font-normal text-slate-400">(Optional)</span>
                    </label>
                    {hasUrlLockedOffice && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Linked to Office
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. smith-tax (leave blank if none)"
                      value={officeSlugInput}
                      readOnly={hasUrlLockedOffice}
                      onChange={(e) =>
                        setOfficeSlugInput(e.target.value.toLowerCase().replace(/\s+/g, '-'))
                      }
                      className={`w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg text-sm ${
                        hasUrlLockedOffice ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>
                </div>
              </>
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
                <label className="block text-xs font-semibold text-slate-700">
                  {isSignUp ? 'Create Password' : 'Password'}
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder={isSignUp ? 'Choose a password (min 6 chars)' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  aria-label={showPasswordText ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                >
                  {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPasswordText ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer pt-1 leading-relaxed">
                  <input
                    type="checkbox"
                    required
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600"
                  />
                  <span>
                    I have read and agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setLegalModalTab('terms')}
                      className="font-semibold text-emerald-700 underline"
                    >
                      Terms of Service
                    </button>
                    ,{' '}
                    <button
                      type="button"
                      onClick={() => setLegalModalTab('privacy')}
                      className="font-semibold text-emerald-700 underline"
                    >
                      Privacy Policy
                    </button>
                    , and{' '}
                    <button
                      type="button"
                      onClick={() => setLegalModalTab('disclaimer')}
                      className="font-semibold text-emerald-700 underline"
                    >
                      Financial Accuracy &amp; Tax Disclaimer
                    </button>
                    .
                  </span>
                </label>
              </>
            )}

            <Tooltip text={isSignUp ? 'Register your new bookkeeping account' : 'Sign in to your dashboard'}>
              <button
                type="submit"
                disabled={submittingAuth}
                className="w-full py-2.5 text-white text-sm font-semibold rounded-xl shadow-sm disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {submittingAuth ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </Tooltip>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  const nextIsSignUp = !isSignUp;
                  setIsSignUp(nextIsSignUp);
                  setConfirmPassword('');
                  setAuthError(null);
                  setAuthMessage(null);
                  window.history.replaceState(
                    null,
                    '',
                    `${window.location.pathname}${window.location.search}#${nextIsSignUp ? 'signup' : 'login'}`
                  );
                }}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 underline"
              >
                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Create One'}
              </button>
            </div>
          </form>
        </div>

        <LegalModal
          isOpen={Boolean(legalModalTab)}
          initialTab={legalModalTab || 'terms'}
          onClose={() => setLegalModalTab(null)}
          brandName={currentOrg.brand_name}
          supportEmail={currentOrg.support_email}
          primaryColor={primaryColor}
        />
      </div>
    );
  }

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
          <Tooltip text="Sign out of this suspended account">
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </Tooltip>
        </div>
      </div>
    );
  }

  const userRole = (membership?.role || 'client').toLowerCase();
  const isAdmin = userRole === 'super_admin' || userRole === 'office_admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {isDemoUser && (
        <div className="bg-emerald-900 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-center gap-3">
          <span>
            <strong>Live Demo Mode:</strong> You are exploring a read-only sample 2026 Schedule C ledger.
          </span>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/#signup';
            }}
            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
          >
            Start Your 7-Day Free Trial &rarr;
          </button>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {currentOrg?.logo_url ? (
              <img src={currentOrg.logo_url} alt={currentOrg.brand_name} className="h-8 object-contain" />
            ) : (
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {(currentOrg.brand_name || 'S')[0]}
              </span>
            )}
            <div>
              <div className="text-base font-bold text-slate-900 leading-tight">
                {currentOrg.brand_name}
              </div>
              <div className="text-[11px] text-slate-500">{currentOrg.tagline}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <Tooltip text="Open your personal business bookkeeping & Schedule C ledger" position="bottom">
                  <button
                    type="button"
                    onClick={() => setActiveView('ledger')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activeView === 'ledger'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    My Books
                  </button>
                </Tooltip>
                <Tooltip text="Manage white-label branding, client logins, and tax office reports" position="bottom">
                  <button
                    type="button"
                    onClick={() => setActiveView('admin')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activeView === 'admin'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {userRole === 'super_admin' ? 'Platform & Office Admin' : 'Office Admin'}
                  </button>
                </Tooltip>
              </div>
            )}

            {!isDemoUser && (
              <Tooltip text="Change your login password" position="bottom">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecoveryMode(false);
                    setShowPasswordModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                  Change Password
                </button>
              </Tooltip>
            )}

            <Tooltip text={isDemoUser ? 'Exit the live demo workspace' : 'Sign out of your account'} position="bottom">
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                {isDemoUser ? 'Exit Demo' : 'Sign Out'}
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        {isAdmin && activeView === 'admin' ? (
          <OfficeAdminTab
            membership={membership}
            currentOrg={currentOrg}
            onOrgUpdated={(updatedOrg) => setCurrentOrg(updatedOrg)}
          />
        ) : (
          <BookkeepingLedger
            targetUserId={session.user.id}
            targetUserName={membership?.full_name || session.user.email}
            readOnly={isDemoUser}
            primaryColor={primaryColor}
            supportEmail={currentOrg?.support_email}
            officeName={currentOrg?.brand_name}
          />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            © {new Date().getFullYear()} {currentOrg.brand_name}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setLegalModalTab('terms')}
              className="hover:text-slate-900 underline"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => setLegalModalTab('privacy')}
              className="hover:text-slate-900 underline"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setLegalModalTab('disclaimer')}
              className="hover:text-slate-900 underline"
            >
              Tax Disclaimer
            </button>
            <button
              type="button"
              onClick={() => setLegalModalTab('security')}
              className="hover:text-slate-900 underline"
            >
              Security Policy
            </button>
            <button
              type="button"
              onClick={() => setLegalModalTab('retention')}
              className="hover:text-slate-900 underline"
            >
              Data Ownership
            </button>
          </div>
        </div>
      </footer>

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

      <LegalModal
        isOpen={Boolean(legalModalTab)}
        initialTab={legalModalTab || 'terms'}
        onClose={() => setLegalModalTab(null)}
        brandName={currentOrg.brand_name}
        supportEmail={currentOrg.support_email}
        primaryColor={primaryColor}
      />
    </div>
  );
}
