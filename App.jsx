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

        if (!error && memberData && isMounted
