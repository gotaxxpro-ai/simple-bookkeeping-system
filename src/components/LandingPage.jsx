import React, { useState, useEffect } from 'react';
import CheckoutModal from './CheckoutModal';
import {
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Building2,
  UserCheck,
  FileSpreadsheet,
  PieChart,
  Car,
  Home,
  Package,
  Wallet,
  Upload,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function LandingPage({ tenant, onOpenAuth }) {
  const [audience, setAudience] = useState('tax_pros'); // 'tax_pros' | 'business_owners'
  const [openFaq, setOpenFaq] = useState(0);
  const [logoError, setLogoError] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('checkout') === 'success') {
        setCheckoutSuccess(true);
      }
    }
  }, []);

  const isCustomTenant = tenant && tenant.slug && tenant.slug !== 'default';
  const brandName = tenant?.brand_name || 'Simple Bookkeeping System';
  const accentColor = tenant?.primary_color || '#059669';
  const logoSrc = tenant?.logo_url || '/logo.png';

  const faqs = [
    {
      q: 'Do my clients or users need a Google account to use this?',
      a: 'No. Users register with any email address and password. All income, expenses, mileage, COGS, and home office records are stored securely in their private account.',
    },
    {
      q: 'How does the White-Label Tax Office license work?',
      a: 'You receive a custom branded URL with your tax office logo, brand name, colors, and appointment booking link. When your clients sign up through your link, you can view and export their Schedule C reports directly from your Tax Office Admin portal.',
    },
    {
      q: 'Can users import existing data from Google Sheets or bank statements?',
      a: 'Yes. Both the Income and Expenses ledgers include a smart CSV importer with automatic column mapping, date formatting, and bulk editing tools.',
    },
    {
      q: 'Why is Owner’s Draw tracked separately from Expenses?',
      a: 'For sole proprietors and single-member LLCs, personal withdrawals (Owner’s Draw) are reductions of owner equity—not Schedule C deductible expenses. Separating them prevents clients from accidentally overstating business deductions.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {checkoutSuccess && (
        <div className="bg-emerald-600 text-white px-4 py-3 text-center text-xs sm:text-sm font-semibold flex flex-wrap items-center justify-center gap-3">
          <span>
            Payment received! Your white-label tax office portal is ready. Sign up or sign in with your admin email to open your Tax Office Admin dashboard.
          </span>
          <button
            type="button"
            onClick={() => onOpenAuth('signup')}
            className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
          >
            Create Admin Login →
          </button>
        </div>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!logoError && logoSrc ? (
              <img
                src={logoSrc}
                alt={brandName}
                onError={() => setLogoError(true)}
                className="h-9 w-auto object-contain rounded"
              />
            ) : (
              <div style={{ backgroundColor: accentColor }} className="p-2 rounded-lg text-white">
                <BookOpen className="w-5 h-5" />
              </div>
            )}
            <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900">
              {brandName}
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900">How It Works</a>
            {!isCustomTenant && (
              <a href="#pricing" className="hover:text-slate-900">White-Label Pricing</a>
            )}
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              style={{ backgroundColor: accentColor }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-95 shadow-sm transition"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-slate-900 text-white py-16 sm:py-24 px-4">
        <div className="max-w-6xl mx-auto text-center">
          {/* Audience Switcher Pill (Shown on main domain; hidden when viewing a specific Tax Office's white-label link) */}
          {!isCustomTenant && (
            <div className="inline-flex p-1 rounded-full bg-slate-800 border border-slate-700 mb-8">
              <button
                type="button"
                onClick={() => setAudience('tax_pros')}
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition ${
                  audience === 'tax_pros'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                For Tax Offices & EROs
              </button>
              <button
                type="button"
                onClick={() => setAudience('business_owners')}
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition ${
                  audience === 'business_owners'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                For Self-Employed & LLCs
              </button>
            </div>
          )}

          {isCustomTenant || audience === 'business_owners' ? (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Built Specifically for IRS Schedule C Filers
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
                Stop Dreading Tax Season. Turn Receipts Into a Clean Schedule C Report in Minutes.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
                Track business income, 23 IRS expense categories, vehicle mileage, inventory COGS, home office deductions, and owner’s draws—without bloated accounting software or spreadsheets.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  style={{ backgroundColor: accentColor }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-bold text-white rounded-xl hover:opacity-95 shadow-lg transition"
                >
                  Create Free Bookkeeping Account
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="w-full sm:w-auto px-7 py-3.5 text-base font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition"
                >
                  Sign In to Existing Account
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-4">
                <Building2 className="w-3.5 h-3.5" />
                White-Label Bookkeeping Portal for Tax Professionals
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
                Eliminate Shoebox Receipts. Give Every Schedule C Client a Bookkeeping App With{' '}
                <span className="text-emerald-400">Your Logo</span>.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
                License your own white-label bookkeeping portal. Your clients categorize their income, expenses, mileage, and home office year-round—and you download their tax-ready Schedule C summary in one click.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="#pricing"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg transition"
                >
                  See White-Label Plans
                  <ArrowRight className="w-5 h-5" />
                </a>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="w-full sm:w-auto px-7 py-3.5 text-base font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition"
                >
                  Try Live App Demo
                </button>
              </div>
            </>
          )}

          {/* Product Preview Mockup Card */}
          <div className="mt-14 max-w-5xl mx-auto bg-slate-800/80 border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="ml-2 text-xs font-mono text-slate-400">
                  Schedule C Dashboard • Tax Year 2026
                </span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300">
                1-Click PDF & CSV Export
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-700">
                <p className="text-[11px] uppercase text-slate-400 font-semibold">Gross Income</p>
                <p className="text-xl font-bold text-white mt-1">$142,850.00</p>
              </div>
              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-700">
                <p className="text-[11px] uppercase text-slate-400 font-semibold">Schedule C Exp.</p>
                <p className="text-xl font-bold text-white mt-1">$38,410.00</p>
              </div>
              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-700">
                <p className="text-[11px] uppercase text-slate-400 font-semibold">COGS & Office</p>
                <p className="text-xl font-bold text-white mt-1">$11,200.00</p>
              </div>
              <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-500/40">
                <p className="text-[11px] uppercase text-emerald-400 font-semibold">Net Profit</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">$93,240.00</p>
              </div>
              <div className="bg-indigo-950/60 p-4 rounded-xl border border-indigo-500/40 col-span-2 lg:col-span-1">
                <p className="text-[11px] uppercase text-indigo-300 font-semibold">Owner’s Draw</p>
                <p className="text-xl font-bold text-indigo-200 mt-1">$54,000.00</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-16 sm:py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
            Everything Needed for Schedule C — Nothing You Don’t
          </h2>
          <p className="mt-3 text-slate-600">
            Every tab maps directly to IRS Schedule C line items so business owners stay organized and tax preparers save hours per return.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: FileSpreadsheet,
              title: '23 IRS Schedule C Categories',
              desc: 'Pre-loaded with all 10 income streams and 23 deductible expense lines from Advertising and Contract Labor to Utilities and Wages.',
            },
            {
              icon: Upload,
              title: 'CSV Import & Bulk Editing',
              desc: 'Upload bank statements or exported Google Sheets in seconds. Auto-map columns, preview rows, and bulk-categorize dozens of transactions at once.',
            },
            {
              icon: Car,
              title: 'Vehicle Mileage & Part IV Tracker',
              desc: 'Track multiple business vehicles per year, automatically calculate Business Use %, and log IRS substantiation answers.',
            },
            {
              icon: Home,
              title: 'Home Office Calculator',
              desc: 'Compare the Simplified Method ($5/sq ft up to 300 sq ft) against the Actual Expense Method with automatic indirect expense prorating.',
            },
            {
              icon: Package,
              title: 'Cost of Goods Sold (Part III)',
              desc: 'Track beginning inventory, purchases less personal withdrawals, labor, materials, and closing inventory per tax year.',
            },
            {
              icon: Wallet,
              title: 'Separate Owner’s Draw Ledger',
              desc: 'Keep personal withdrawals isolated from business expenses so owners know their true cashflow without distorting net profit.',
            },
          ].map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition"
              >
                <div
                  style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">{feat.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white border-y border-slate-200 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div
                style={{ backgroundColor: accentColor }}
                className="w-10 h-10 rounded-full text-white font-bold flex items-center justify-center mx-auto mb-4"
              >
                1
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-1">
                Create Your Free Account
              </h3>
              <p className="text-sm text-slate-600">
                Sign up with your email and password in 15 seconds—no Google account or credit card required to start logging entries.
              </p>
            </div>

            <div className="text-center">
              <div
                style={{ backgroundColor: accentColor }}
                className="w-10 h-10 rounded-full text-white font-bold flex items-center justify-center mx-auto mb-4"
              >
                2
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-1">
                Log or Import Transactions
              </h3>
              <p className="text-sm text-slate-600">
                Enter income, expenses, mileage, and home office figures throughout the year—or bulk-import your CSV bank statements.
              </p>
            </div>

            <div className="text-center">
              <div
                style={{ backgroundColor: accentColor }}
                className="w-10 h-10 rounded-full text-white font-bold flex items-center justify-center mx-auto mb-4"
              >
                3
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-1">
                Run Year-End Tax Reports
              </h3>
              <p className="text-sm text-slate-600">
                Filter any tax year or date range on the Dashboard and export a clean CSV or print-ready PDF Schedule C summary.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* White-Label Pricing Section (Shown on Main Domain) */}
      {!isCustomTenant && (
        <section id="pricing" className="py-16 sm:py-20 px-4 max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              White-Label Licensing for Tax Offices & EROs
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mt-1">
              Launch Your Own Branded Client Portal Today
            </h2>
            <p className="mt-3 text-slate-600">
              Your logo, your colors, and your client invite link. Every plan includes the Tax Office Admin Portal so you can open and export any client’s Schedule C report on demand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Solo / Starter */}
            <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Solo Preparer</h3>
                <p className="text-xs text-slate-500 mt-1">
                  For independent preparers & side-hustle tax pros
                </p>
                <div className="my-5">
                  <span className="text-4xl font-extrabold text-slate-900">$97</span>
                  <span className="text-sm text-slate-500">/month</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-600 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Up to 50 Schedule C client accounts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Custom logo, brand name & colors
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Tax Office Admin client report viewer
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    CSV import, PDF export & Owner’s Draw
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutPlan('solo')}
                className="w-full text-center py-2.5 px-4 rounded-xl border border-slate-300 font-semibold text-sm text-slate-800 hover:bg-slate-50 transition"
              >
                Start Solo License ($97/mo)
              </button>
            </div>

            {/* Growth Tax Office (Most Popular) */}
            <div className="bg-slate-900 text-white rounded-2xl border-2 border-emerald-500 p-7 shadow-xl flex flex-col justify-between relative">
              <span className="absolute -top-3.5 right-6 bg-emerald-500 text-slate-950 text-[11px] font-extrabold uppercase px-3 py-0.5 rounded-full">
                Most Popular
              </span>
              <div>
                <h3 className="font-bold text-lg">Growth Tax Office</h3>
                <p className="text-xs text-slate-400 mt-1">
                  For established tax offices & multi-preparer firms
                </p>
                <div className="my-5">
                  <span className="text-4xl font-extrabold">$197</span>
                  <span className="text-sm text-slate-400">/month</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-300 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    Up to 250 Schedule C client accounts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    Full white-label branding & booking link
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    Multiple Office Admin staff logins
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    Priority onboarding & branded client link
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutPlan('growth')}
                className="w-full text-center py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm text-white transition"
              >
                Launch Growth Office ($197/mo)
              </button>
            </div>

            {/* Enterprise / Service Bureau */}
            <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Service Bureau</h3>
                <p className="text-xs text-slate-500 mt-1">
                  For high-volume firms & ERO networks
                </p>
                <div className="my-5">
                  <span className="text-4xl font-extrabold text-slate-900">$297</span>
                  <span className="text-sm text-slate-500">/month</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-600 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Unlimited Schedule C client accounts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Custom subdomain (`yourfirm.domain.com`)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Done-for-you setup & staff training call
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Annual billing discount available
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutPlan('bureau')}
                className="w-full text-center py-2.5 px-4 rounded-xl border border-slate-300 font-semibold text-sm text-slate-800 hover:bg-slate-50 transition"
              >
                Start Service Bureau ($297/mo)
              </button>
            </div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section id="faq" className="bg-white border-t border-slate-200 py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={item.q}
                  className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between font-bold text-sm text-slate-900"
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-10 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{brandName}</span>
          </div>
          <p>
            © {new Date().getFullYear()} {brandName}. Built for IRS Schedule C Bookkeeping & Tax Preparation.
          </p>
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="text-emerald-400 hover:underline font-semibold"
          >
            Client & Preparer Login →
          </button>
        </div>
      </footer>

      {checkoutPlan && (
        <CheckoutModal
          planTier={checkoutPlan}
          fallbackEmail={tenant?.support_email || 'gotaxxpro@gmail.com'}
          onClose={() => setCheckoutPlan(null)}
        />
      )}
    </div>
  );
}
