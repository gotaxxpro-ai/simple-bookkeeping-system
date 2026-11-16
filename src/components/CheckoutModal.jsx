import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, ArrowRight, ShieldCheck, Building2, AlertCircle } from 'lucide-react';

const PLAN_DETAILS = {
  solo: {
    name: 'Solo Preparer Plan',
    price: '$97/month',
    clients: 'Up to 50 Schedule C clients',
    envKey: 'VITE_STRIPE_LINK_SOLO',
  },
  growth: {
    name: 'Growth Tax Office Plan',
    price: '$197/month',
    clients: 'Up to 250 Schedule C clients',
    envKey: 'VITE_STRIPE_LINK_GROWTH',
  },
  bureau: {
    name: 'Service Bureau Plan',
    price: '$297/month',
    clients: 'Unlimited Schedule C clients',
    envKey: 'VITE_STRIPE_LINK_BUREAU',
  },
};

export default function CheckoutModal({ planTier = 'growth', onClose, fallbackEmail }) {
  const plan = PLAN_DETAILS[planTier] || PLAN_DETAILS.growth;

  const stripeLinks = {
    solo: import.meta.env.VITE_STRIPE_LINK_SOLO || '',
    growth: import.meta.env.VITE_STRIPE_LINK_GROWTH || '',
    bureau: import.meta.env.VITE_STRIPE_LINK_BUREAU || '',
  };
  const activeStripeUrl = stripeLinks[planTier];

  const [brandName, setBrandName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#059669');
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleBrandNameChange = (val) => {
    setBrandName(val);
    const autoSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30);
    setSlug(autoSlug);
  };

  const handleProceedToStripe = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanSlug = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');

    if (!cleanSlug || cleanSlug === 'default') {
      setErrorMsg('Please choose a valid URL slug for your tax office.');
      return;
    }

    if (!activeStripeUrl) {
      setErrorMsg(
        `Stripe Payment Link (${plan.envKey}) is not configured yet. Add it in your Hostinger environment variables.`
      );
      return;
    }

    setLoading(true);
    try {
      // Check if slug is already taken
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (existingOrg) {
        setErrorMsg('That portal URL slug is already taken. Please try another name.');
        setLoading(false);
        return;
      }

      // Save pending checkout record so Stripe webhook provisions the tenant automatically
      const { data: pending, error } = await supabase
        .from('pending_checkouts')
        .insert([
          {
            slug: cleanSlug,
            brand_name: brandName.trim(),
            admin_email: adminEmail.trim().toLowerCase(),
            plan_tier: planTier,
            primary_color: primaryColor,
            logo_url: logoUrl.trim(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Remember this slug locally so when Stripe redirects back, the buyer lands on their branded portal
      localStorage.setItem('active_office_slug', cleanSlug);
      localStorage.setItem('pending_admin_email', adminEmail.trim().toLowerCase());

      // Redirect to Stripe Payment Link with client_reference_id & prefilled_email
      const separator = activeStripeUrl.includes('?') ? '&' : '?';
      const checkoutUrl = `${activeStripeUrl}${separator}client_reference_id=${encodeURIComponent(
        pending.id
      )}&prefilled_email=${encodeURIComponent(adminEmail.trim())}`;

      window.location.href = checkoutUrl;
    } catch (err) {
      setErrorMsg(err.message || 'Unable to start checkout.');
      setLoading(false);
    }
  };

  const previewUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?office=${slug || 'your-office'}`
      : `https://yourdomain.com/?office=${slug || 'your-office'}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">Set Up Your White-Label Portal</h3>
              <p className="text-xs text-slate-300">
                {plan.name} • {plan.price} ({plan.clients})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleProceedToStripe} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p>{errorMsg}</p>
                {!activeStripeUrl && fallbackEmail && (
                  <a
                    href={`mailto:${fallbackEmail}?subject=${encodeURIComponent(
                      `White-Label Setup - ${plan.name}`
                    )}`}
                    className="underline font-bold mt-1 inline-block"
                  >
                    Or email {fallbackEmail} to activate manually →
                  </a>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Tax Office Brand Name
            </label>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => handleBrandNameChange(e.target.value)}
              placeholder="e.g., Apex Tax & Accounting"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Portal URL Slug
            </label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
              }
              placeholder="apex-tax"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1 truncate">
              Your client link: <span className="font-mono text-emerald-700">{previewUrl}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Tax Office Admin Email
            </label>
            <input
              type="email"
              required
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="owner@apextax.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Use this same email when signing in to access your Tax Office Admin panel.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Brand Accent Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-9 w-12 border border-slate-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Logo URL (Optional)
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://.../logo.png"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow transition disabled:opacity-50"
            >
              {loading ? 'Preparing Checkout...' : `Continue to Stripe Checkout (${plan.price})`}
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Secure subscription billing powered by Stripe. Cancel anytime.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
