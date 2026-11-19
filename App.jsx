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
  const [launchingDemo, setLaunchingDemo] = useState(false);

  const [showAuth, setShowAuth] = useState(() => {
    const slug = new URLSearchParams(window.location.search).get('office');
    const hash = window.location.hash.replace('#', '').toLowerCase();
    return Boolean((slug && slug !== 'default') || hash === 'login' || hash === 'signup');
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authMessage, setAuthMessage] = useState(null);

  const mustChangePassword = Boolean(session?.user?.user_metadata?.must_change_password);
  const isDemoUser = session?.user?.email?.toLowerCase() === 'demo@simplebookkeepingsystem.com';
  const primaryColor = currentOrg?.primary_color || '#059669';

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
        document.title = data.brand_name || 'Simple Bookkeeping System';
      }
    }
    loadBrandingFromSlug();
    return () => {
      isMounted = false;
    };
  }, []);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') !== 'true' || authLoading || session || launchingDemo) return;

    let isMounted = true;
    async function autoLoginDemo() {
      setLaunchingDemo(true);
      setAuthError(null);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'demo@simplebookkeepingsystem.com',
          password: 'DemoPreview2026!',
        });
        if (error) throw error;
        if (data?.session && isMounted) {
          setSession(data.session);
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (err) {
        if (isMounted) {
          setAuthError(`Demo unavailable: ${err.message}`);
          setShowAuth(true);
        }
      } finally {
        if (isMounted) setLaunchingDemo(false);
      }
    }

    autoLoginDemo();
    return () => {
      isMounted = false;
    };
  }, [authLoading, session, launchingDemo]);

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
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
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

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: {
              full_name: fullName.trim(),
              office_slug: currentOrg?.slug !== 'default' ? currentOrg?.slug : undefined,
              terms_accepted_at: new Date().toISOString(),
              terms_version: '1.0',
            },
          },
        });
        if (error) throw error;

        if (data?.session) {
          setSession(data.session);
        } else {
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
      current
