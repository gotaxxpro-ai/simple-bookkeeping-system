import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, Lock, Mail, ArrowRight, User } from 'lucide-react';

export default function Auth({ tenant }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const brandName = tenant?.brand_name || 'Simple Bookkeeping System';
  const tagline = tenant?.tagline || 'Multi-Year Small Business Ledger & Schedule C Reports';
  const accentColor = tenant?.primary_color || '#059669';
  const logoSrc = tenant?.logo_url || '/logo.png';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              organization_id: tenant?.id || null,
            },
          },
        });
        if (error) throw error;

        // If session is immediately available (Confirm Email OFF), create membership row now
        if (data?.user && tenant?.id) {
          const superEmail = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || '').toLowerCase();
          const assignedRole =
            email.trim().toLowerCase() === superEmail ? 'super_admin' : 'client';

          await supabase.from('user_memberships').upsert({
            user_id: data.user.id,
            organization_id: tenant.id,
            role: assignedRole,
            full_name: fullName,
            email: email.trim(),
          });
        }

        setMessage({
          type: 'success',
          text: 'Account created! Check your email to confirm (or sign in immediately if email confirmation is disabled).',
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          {!logoError && logoSrc ? (
            <img
              src={logoSrc}
              alt={brandName}
              onError={() => setLogoError(true)}
              className="h-11 w-auto object-contain rounded-lg"
            />
          ) : (
            <div
              style={{ backgroundColor: accentColor }}
              className="p-3 text-white rounded-xl"
            >
              <BookOpen className="w-6 h-6" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-900">{brandName}</h1>
            <p className="text-xs text-slate-500">{tagline}</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-slate-800 mb-1">
          {isSignUp ? 'Create your business account' : 'Sign in to your books'}
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          No Google account required. Your financial records are stored privately in your account.
        </p>

        {message.text && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              message.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Your Name / Business Owner
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:border-slate-500 outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:border-slate-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:border-slate-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: accentColor }}
            className="w-full flex items-center justify-center gap-2 hover:opacity-95 text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage({ type: '', text: '' });
            }}
            style={{ color: accentColor }}
            className="font-semibold hover:underline"
          >
            {isSignUp ? 'Sign In' : 'Sign Up Free'}
          </button>
        </div>
      </div>
    </div>
  );
}
