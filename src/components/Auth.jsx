import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DEFAULT_BRAND } from '../lib/tenant';

export default function Auth({ tenant }) {
  const brand = tenant || DEFAULT_BRAND;
  const primaryColor = brand.primary_color || '#059669';

  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [infoMsg, setInfoMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (isSignUp) {
        const cleanName = fullName.trim() || cleanEmail.split('@')[0];

        // Resolve the active tenant slug from props or URL query parameter
        const urlSlug = new URLSearchParams(window.location.search)
          .get('office')
          ?.trim()
          .toLowerCase();
        const activeSlug =
          brand.slug && brand.slug !== 'default' ? brand.slug : urlSlug || 'default';

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
              office_slug: activeSlug,
              role: 'client',
            },
          },
        });

        if (error) throw error;

        // If email confirmation is enabled in Supabase Auth settings, session will be null
        if (data?.user && !data?.session) {
          setInfoMsg(
            'Account created! Please check your email inbox to confirm your address before signing in.'
          );
          setIsSignUp(false);
          setPassword('');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) throw error;
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp((prev) => !prev);
    setErrorMsg(null);
    setInfoMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {brand.logo_url ? (
          <img
            src={brand.logo_url}
            alt={brand.brand_name}
            className="mx-auto h-14 w-auto object-contain mb-4"
          />
        ) : (
          <div
            className="mx-auto h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-sm mb-4"
            style={{ backgroundColor: primaryColor }}
          >
            <Building2 className="w-6 h-6" />
          </div>
        )}

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {brand.brand_name}
        </h1>
        {brand.tagline && (
          <p className="mt-1.5 text-sm text-slate-600">{brand.tagline}</p>
        )}

        {brand.slug && brand.slug !== 'default' && (
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-200/80 text-slate-700">
            Client & Staff Portal: {brand.slug}
          </div>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">
            {isSignUp ? 'Create Your Bookkeeping Account' : 'Sign In to Your Portal'}
          </h2>

          {errorMsg && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name or Business Contact
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': primaryColor }}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': primaryColor }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': primaryColor }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-white text-sm font-medium shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50 mt-2"
              style={{ backgroundColor: primaryColor }}
            >
              {loading
                ? isSignUp
                  ? 'Creating Account...'
                  : 'Signing In...'
                : isSignUp
                ? 'Create Account'
                : 'Sign In'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one"}
            </button>
          </div>
        </div>

        {brand.support_email && (
          <p className="mt-4 text-center text-xs text-slate-500">
            Need help accessing your account? Contact{' '}
            <a
              href={`mailto:${brand.support_email}`}
              className="font-medium underline text-slate-700"
            >
              {brand.support_email}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
