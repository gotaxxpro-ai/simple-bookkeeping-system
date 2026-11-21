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
  CheckCircle2,
  Wrench,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import BookkeepingLedger from './components/BookkeepingLedger';
import OfficeAdminTab from './components/OfficeAdminTab';
import ChangePasswordModal from './components/ChangePasswordModal';

const DEMO_EMAIL = 'demo@simplebookkeepingsystem.com';
const DEMO_PASSWORD = 'Demo1234!';

// Set VITE_STANDALONE_MODE=true in .env when deploying to your B2C / Etsy solo subdomain
const IS_STANDALONE_MODE =
  String(import.meta.env.VITE_STANDALONE_MODE || '').toLowerCase() === 'true';

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

function MissingSupabaseConfigScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white p-8 rounded-2xl border border-amber-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-amber-700">
          <Wrench className="w-7 h-7 shrink-0" />
          <h1 className="text-lg font-bold text-slate-900">
            Environment Configuration Required
          </h1>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          The Supabase client was not initialized in this build because{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">VITE_SUPABASE_URL</code> or{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">VITE_SUPABASE_ANON_KEY</code>{' '}
          was missing when <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">npm run build</code> executed.
        </p>
        <div className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono space-y-1 overflow-x-auto">
          <div>VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co</div>
          <div>VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY</div>
          <div>VITE_STANDALONE_MODE={IS_STANDALONE_MODE ? 'true' : 'false'}</div>
        </div>
        <p className="text-xs text-slate-500">
          Add these variables to your root <code className="bg-slate-100 px-1 rounded">.env</code> file (or Hostinger Environment Variables), run <code className="bg-slate-100 px-1 rounded">npm run build</code> again, and upload the updated <code className="bg-slate-100 px-1 rounded">dist/</code> contents.
        </p>
      </div>
    </div>
  );
}

function HiddenFunnelOfferPage({
  standaloneMode = false,
  brandName = 'Simple Bookkeeping System',
  brandColor = '#059669',
  videoEmbedUrl = 'https://www.youtube.com/embed/YOUR_VIDEO_ID',
  stripeLinks = {
    clientPromo: 'https://buy.stripe.com/YOUR_CLIENT_SPECIAL_LINK',
    clientLifetimePromo: 'https://buy.stripe.com/YOUR_CLIENT_LIFETIME_LINK',
    officeMonthlyPromo: 'https://buy.stripe.com/YOUR_OFFICE_MONTHLY_LINK',
    officeWhiteLabelPromo: 'https://buy.stripe.com/YOUR_WHITE_LABEL_SPECIAL_LINK',
  },
  onExitToMain,
}) {
  const [activeGuideModal, setActiveGuideModal] = useState(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div
        className="px-4 py-2.5 text-center text-xs font-semibold tracking-wide text-white"
        style={{ backgroundColor: brandColor }}
      >
        {standaloneMode
          ? 'VIP SOLO FOUNDER ACCESS • SPECIAL ONE-TIME LICENSE OFFER'
          : 'PRIVATE INVITATION PAGE • SPECIAL PARTNER & TRAINING ACCESS'}
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              {brandName} — VIP Fast-Track
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
              Watch the 5-Minute Walkthrough &amp; Claim Your Special Offer
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              {standaloneMode
                ? 'See how freelancers, Etsy sellers, and single-member LLCs stay IRS Schedule C ready year-round without messy spreadsheets.'
                : 'See how tax offices and small business owners stay IRS Schedule C ready year-round—and unlock exclusive bundle pricing below.'}
            </p>
          </div>

          {typeof onExitToMain === 'function' && (
            <button
              type="button"
              onClick={onExitToMain}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              Go to Main Portal →
            </button>
          )}
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="aspect-video w-full bg-black">
            <iframe
              src={videoEmbedUrl}
              title="Simple Bookkeeping System Training Walkthrough"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-5 py-3.5 text-xs text-slate-300">
            <span>
              <strong>Training Overview:</strong>{' '}
              {standaloneMode
                ? 'Schedule C income & expense tracking, bank CSV imports, mileage deductions, and 1-click Schedule C PDF exports.'
                : 'Client Schedule C tracking, automated mileage, PDF tax reports, and White-Label Tax Office branding.'}
            </span>
            <a href="/?demo=true" className="font-semibold text-emerald-400 hover:underline">
              Launch Live Interactive Demo →
            </a>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">
                {standaloneMode
                  ? 'Included Schedule C Quick-Start Implementation Guide'
                  : 'Included Quick-Start Implementation Guides'}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Preview the step-by-step launch checklist included with your account:
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {!standaloneMode && (
                <button
                  type="button"
                  onClick={() => setActiveGuideModal('office')}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition"
                >
                  Read Office Admin Quick-Start Guide
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveGuideModal('client')}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                Read Schedule C Client Guide
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-center text-xl font-bold text-white sm:text-2xl">
            Select Your Special Offer Access
          </h2>
          <p className="mt-1 text-center text-xs text-slate-400">
            Instant account activation after checkout — set your password and log in immediately.
          </p>

          {standaloneMode ? (
            <div className="mt-6 mx-auto max-w-3xl grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div>
                  <span className="inline-block rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-300">
                    MONTHLY PLAN
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-white">Solo Bookkeeping Monthly</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Flexible month-to-month access for freelancers and 1099 contractors.
                  </p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">$19</span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-xs text-slate-300">
                    <li>✓ Unlimited income &amp; Schedule C expense tracking</li>
                    <li>✓ Bank CSV statement auto-categorizer</li>
                    <li>✓ Multi-vehicle mileage &amp; Home Office worksheets</li>
                    <li>✓ 1-Click IRS Schedule C PDF &amp; CSV exports</li>
                  </ul>
                </div>

                <a
                  href={stripeLinks.clientPromo}
                  className="mt-6 block w-full rounded-xl border border-slate-700 bg-slate-800 py-3 text-center text-xs font-bold text-white hover:bg-slate-700 transition"
                >
                  Start Monthly Access →
                </a>
              </div>

              <div
                className="flex flex-col justify-between rounded-2xl border-2 bg-slate-900 p-6 shadow-xl"
                style={{ borderColor: brandColor }}
              >
                <div>
                  <span
                    className="inline-block rounded-full px-3 py-1 text-[11px] font-bold text-white"
                    style={{ backgroundColor: brandColor }}
                  >
                    BEST VALUE • ONE-TIME FEE
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-white">
                    Lifetime Solo Schedule C Access
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Pay once, own your multi-year Schedule C bookkeeping workspace forever.
                  </p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">$39</span>
                    <span className="text-xs text-slate-400">one-time payment</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-xs text-slate-300">
                    <li>✓ No recurring monthly subscription fees</li>
                    <li>✓ Unlimited tax years &amp; Schedule C PDF exports</li>
                    <li>✓ Bank CSV importer, COGS &amp; Home Office tools</li>
                    <li>✓ Includes Schedule C Quick-Start Guide</li>
                  </ul>
                </div>

                <a
                  href={stripeLinks.clientLifetimePromo}
                  className="mt-6 block w-full rounded-xl py-3 text-center text-xs font-bold text-white shadow-lg hover:opacity-95 transition"
                  style={{ backgroundColor: brandColor }}
                >
                  Unlock Lifetime Access →
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div>
                  <span className="inline-block rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-300">
                    SMALL BUSINESS / 1099
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-white">Solo Bookkeeping</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    For self-employed filers, freelancers, and single-member LLCs.
                  </p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">$19</span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-xs text-slate-300">
                    <li>✓ Unlimited income &amp; Schedule C expense tracking</li>
                    <li>✓ Automated business mileage log</li>
                    <li>✓ 1-Click IRS Schedule C PDF export</li>
                    <li>✓ Schedule C Client Quick-Start Guide</li>
                  </ul>
                </div>

                <a
                  href={stripeLinks.clientPromo}
                  className="mt-6 block w-full rounded-xl border border-slate-700 bg-slate-800 py-3 text-center text-xs font-bold text-white hover:bg-slate-700 transition"
                >
                  Claim Solo Access →
                </a>
              </div>

              <div
                className="flex flex-col justify-between rounded-2xl border-2 bg-slate-900 p-6 shadow-xl"
                style={{ borderColor: brandColor }}
              >
                <div>
                  <span
                    className="inline-block rounded-full px-3 py-1 text-[11px] font-bold text-white"
                    style={{ backgroundColor: brandColor }}
                  >
                    MOST POPULAR • TAX OFFICE WHITE-LABEL
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-white">
                    White-Label Tax Office Portal
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Your logo, colors, custom ?office=slug URL, and client roster management.
                  </p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">$249</span>
                    <span className="text-xs text-slate-400">one-time license</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-xs text-slate-300">
                    <li>✓ Custom firm branding, logo &amp; portal link</li>
                    <li>✓ Add &amp; manage unlimited Schedule C clients</li>
                    <li>✓ &ldquo;Open Books&rdquo; live view into every client ledger</li>
                    <li>✓ Office Admin + Client Quick-Start Guides</li>
                  </ul>
                </div>

                <a
                  href={stripeLinks.officeWhiteLabelPromo}
                  className="mt-6 block w-full rounded-xl py-3 text-center text-xs font-bold text-white shadow-lg hover:opacity-95 transition"
                  style={{ backgroundColor: brandColor }}
                >
                  Unlock White-Label Portal →
                </a>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div>
                  <span className="inline-block rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-300">
                    FLEXIBLE MONTHLY
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-white">Service Bureau Monthly</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Start your branded client bookkeeping portal with low monthly overhead.
                  </p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">$29</span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-xs text-slate-300">
                    <li>✓ Full White-Label Office Admin dashboard</li>
                    <li>✓ Client account creation &amp; password resets</li>
                    <li>✓ Year-round client Schedule C PDF exports</li>
                    <li>✓ Cancel anytime</li>
                  </ul>
                </div>

                <a
                  href={stripeLinks.officeMonthlyPromo}
                  className="mt-6 block w-full rounded-xl border border-slate-700 bg-slate-800 py-3 text-center text-xs font-bold text-white hover:bg-slate-700 transition"
                >
                  Start Monthly Portal →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {activeGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white">
                {activeGuideModal === 'office'
                  ? 'Office Admin Quick-Start Guide (4 Steps)'
                  : 'Schedule C Client Quick-Start Guide (4 Steps)'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveGuideModal(null)}
                className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Close ✕
              </button>
            </div>

            {activeGuideModal === 'office' ? (
              <div className="mt-4 space-y-4 text-xs leading-relaxed text-slate-300">
                <div>
                  <p className="font-bold text-emerald-400">1. Brand Your Client Portal (2 Mins)</p>
                  <p>Open the <strong>Office Admin</strong> tab, enter your firm name, tagline, logo URL, support email, and brand color, then save.</p>
                </div>
                <div>
                  <p className="font-bold text-emerald-400">2. Copy &amp; Share Your Portal Link</p>
                  <p>Share your unique <code>?office=your-slug</code> URL on your website and onboarding emails so clients always see your brand.</p>
                </div>
                <div>
                  <p className="font-bold text-emerald-400">3. Add &amp; Onboard Clients</p>
                  <p>Click <strong>+ Add Client</strong> to create a client login with a temporary password, or let clients self-register through your branded link.</p>
                </div>
                <div>
                  <p className="font-bold text-emerald-400">4. Open Books &amp; Export Schedule C PDFs</p>
                  <p>Click <strong>Open Books</strong> next to any client to review their live ledger and generate an IRS Schedule C PDF summary.</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4 text-xs leading-relaxed text-slate-300">
                <div>
                  <p className="font-bold text-emerald-400">1. Set Up Your Business Profile (1 Min)</p>
                  <p>Enter your Business Name, Business Activity, 6-digit NAICS code, and Tax Year.</p>
                </div>
                <div>
                  <p className="font-bold text-emerald-400">2. Log Business Income &amp; Expenses</p>
                  <p>Record gross payments received (or import your bank CSV) and categorize business expenses under IRS Schedule C lines.</p>
                </div>
                <div>
                  <p className="font-bold text-emerald-400">3. Track Business Mileage</p>
                  <p>Log work trips with business, commuting, and personal miles to capture your vehicle deduction.</p>
                </div>
                <div>
                  <p className="font-bold text-emerald-400">4. Export Your Tax-Ready PDF Report</p>
                  <p>Open the <strong>Schedule C &amp; Next Steps</strong> tab and click <strong>Create Schedule C PDF</strong> for tax filing.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardQuickStartCard({
  role = 'client',
  standaloneMode = false,
  brandColor = '#059669',
  officeSlug = '',
  onOpenAdminView,
}) {
  const normalizedRole = String(role || 'client').toLowerCase();
  const isOfficeAdmin =
    !standaloneMode &&
    (normalizedRole === 'office_admin' || normalizedRole === 'super_admin');

  const storageKey = isOfficeAdmin
    ? 'sbs_office_admin_quickstart_collapsed_v1'
    : 'sbs_client_quickstart_collapsed_v1';

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  });

  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    try {
      setIsCollapsed(localStorage.getItem(storageKey) === 'true');
    } catch {
      setIsCollapsed(false);
    }
  }, [storageKey]);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem(storageKey, String(next));
    } catch {}
  };

  const handleCopyPortalLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const portalUrl =
      officeSlug && officeSlug !== 'default'
        ? `${origin}/?office=${encodeURIComponent(officeSlug)}`
        : origin;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(portalUrl).catch(() => {});
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const officeAdminSteps = [
    {
      num: '1',
      title: 'Brand Your Client Portal',
      desc: 'Set your firm name, logo, support email, and brand color so clients see your tax practice.',
      actionLabel: 'Open Office Admin',
      onClick: onOpenAdminView,
    },
    {
      num: '2',
      title: 'Share Your Portal Link',
      desc: 'Copy your custom ?office=slug link to put on your website, email signature, and welcome emails.',
      actionLabel: copiedLink ? 'Copied Portal Link!' : 'Copy Portal Link',
      onClick: handleCopyPortalLink,
    },
    {
      num: '3',
      title: 'Add & Onboard Clients',
      desc: 'Click + Add Client in Office Admin to create accounts with a temporary password in seconds.',
      actionLabel: 'Manage Clients',
      onClick: onOpenAdminView,
    },
    {
      num: '4',
      title: 'Review & Export Schedule C',
      desc: 'Click Open Books on any client to inspect their live ledger and export tax-ready totals.',
      actionLabel: 'View Client Roster',
      onClick: onOpenAdminView,
    },
  ];

  const clientSteps = [
    {
      num: '1',
      title: 'Set Up Business Profile',
      desc: 'Add your business name, business activity, and NAICS code so your Schedule C header is ready.',
    },
    {
      num: '2',
      title: 'Log Income & Expenses',
      desc: 'Record gross payments received (or import a bank CSV) and categorize bills under Schedule C lines.',
    },
    {
      num: '3',
      title: 'Track Business Mileage',
      desc: 'Log business, commuting, and personal miles in Vehicle Info to maximize your vehicle deduction.',
    },
    {
      num: '4',
      title: 'Export Tax-Ready PDF',
      desc: 'Open Schedule C & Next Steps and click Create Schedule C PDF for tax filing.',
    },
  ];

  const steps = isOfficeAdmin ? officeAdminSteps : clientSteps;

  return (
    <div className="max-w-6xl mx-auto mb-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 py-3.5 bg-slate-50 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: brandColor }}
          >
            {isOfficeAdmin ? '★' : '?'}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {isOfficeAdmin
                ? 'Office Admin Quick-Start Guide: Launch Your White-Label Portal'
                : 'Quick-Start Guide: Stay Tax-Ready in 10 Minutes a Week'}
            </h3>
            {isCollapsed && (
              <p className="text-xs text-slate-500">
                {isOfficeAdmin
                  ? '4 steps to brand your portal, copy your client link, add clients, and export Schedule C reports.'
                  : '4 simple steps to log income, categorize expenses, track mileage, and export Schedule C.'}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
        >
          {isCollapsed ? 'Show Guide' : 'Hide Guide'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.num}
                className="flex flex-col justify-between rounded-lg border border-slate-200/90 bg-slate-50/60 p-4"
              >
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: brandColor }}
                    >
                      {step.num}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {step.title}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">{step.desc}</p>
                </div>

                {typeof step.onClick === 'function' && (
                  <button
                    type="button"
                    onClick={step.onClick}
                    className="mt-3 self-start text-xs font-semibold hover:underline"
                    style={{ color: brandColor }}
                  >
                    {step.actionLabel} →
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50/70 border border-emerald-200/70 px-4 py-2.5 text-xs text-slate-700">
            <span>
              {isOfficeAdmin ? (
                <>
                  <strong>Pro Tip:</strong> Add a test client using a second email and click{' '}
                  <strong>Open Books</strong> to experience your branded client view firsthand.
                </>
              ) : (
                <>
                  <strong>Weekly Habit:</strong> Every Friday, log the week&apos;s deposits,
                  business receipts over $75, and work miles.
                </>
              )}
            </span>
            <span className="text-slate-500">Your preference is saved automatically.</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  if (!supabase) {
    return <MissingSupabaseConfigScreen />;
  }

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const initialParams = new URLSearchParams(window.location.search);
  const initialUrlSlug = IS_STANDALONE_MODE
    ? ''
    : (initialParams.get('office') || '').trim().toLowerCase();
  const checkoutSessionId = (initialParams.get('checkout_session_id') || '').trim();

  const [showHiddenOffer, setShowHiddenOffer] = useState(() => {
    return initialParams.get('offer') === 'vip' || initialParams.get('funnel') === 'special';
  });

  const [launchingDemo, setLaunchingDemo] = useState(() => {
    return initialParams.get('demo') === 'true';
  });

  const [checkoutInfo, setCheckoutInfo] = useState(null);
  const [loadingCheckoutInfo, setLoadingCheckoutInfo] = useState(Boolean(checkoutSessionId));
  const [checkoutPassword, setCheckoutPassword] = useState('');
  const [checkoutConfirmPassword, setCheckoutConfirmPassword] = useState('');
  const [showCheckoutPasswordText, setShowCheckoutPasswordText] = useState(false);
  const [completingCheckout, setCompletingCheckout] = useState(false);

  const [showAuth, setShowAuth] = useState(() => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    return Boolean(
      (!IS_STANDALONE_MODE && initialUrlSlug && initialUrlSlug !== 'default') ||
        hash === 'login' ||
        hash === 'signup'
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
    !IS_STANDALONE_MODE && initialUrlSlug && initialUrlSlug !== 'default' ? initialUrlSlug : ''
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
  const hasUrlLockedOffice =
    !IS_STANDALONE_MODE && Boolean(initialUrlSlug && initialUrlSlug !== 'default');

  useEffect(() => {
    if (!checkoutSessionId) return;
    let isMounted = true;

    async function loadCheckoutPreview() {
      try {
        const { data, error } = await supabase.functions.invoke('complete-stripe-onboarding', {
          body: { session_id: checkoutSessionId },
        });
        if (!error && data?.email && isMounted) {
          setCheckoutInfo(data);
        } else if (isMounted) {
          setAuthError(
            data?.error ||
              error?.message ||
              'Could not verify your Stripe checkout session. Please contact support or sign in below.'
          );
        }
      } catch (err) {
        if (isMounted) {
          setAuthError(err.message || 'Could not verify your Stripe checkout session.');
        }
      } finally {
        if (isMounted) setLoadingCheckoutInfo(false);
      }
    }

    loadCheckoutPreview();
    return () => {
      isMounted = false;
    };
  }, [checkoutSessionId]);

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
    if (IS_STANDALONE_MODE) return;
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
          if (!IS_STANDALONE_MODE && memberData.organizations) {
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
      params.delete('checkout_session_id');
      const cleanQuery = params.toString() ? `?${params.toString()}` : '';
      window.history.replaceState(null, '', `${window.location.pathname}${cleanQuery}`);
    }
    setAuthError(null);
    setAuthMessage(null);
    setShowAuth(false);
  };

  const handleCompleteCheckoutOnboarding = async (e) => {
    e.preventDefault();
    setAuthError(null);

    const cleanPass = checkoutPassword.trim();
    if (cleanPass.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }
    if (cleanPass !== checkoutConfirmPassword.trim()) {
      setAuthError('Passwords do not match.');
      return;
    }

    setCompletingCheckout(true);
    try {
      const { data, error } = await supabase.functions.invoke('complete-stripe-onboarding', {
        body: {
          session_id: checkoutSessionId,
          password: cleanPass,
        },
      });

      if (error) {
        let detailedMsg = error.message;
        try {
          if (error.context && typeof error.context.json === 'function') {
            const errBody = await error.context.json();
            if (errBody?.error) detailedMsg = errBody.error;
          }
        } catch (_) {}
        throw new Error(detailedMsg);
      }
      if (data?.error) throw new Error(data.error);

      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: cleanPass,
      });
      if (signInErr) throw signInErr;

      const nextUrl =
        !IS_STANDALONE_MODE && data.org_slug
          ? `${window.location.pathname}?office=${data.org_slug}`
          : window.location.pathname;
      window.history.replaceState(null, '', nextUrl);

      if (signInData?.session) {
        setSession(signInData.session);
      }
    } catch (err) {
      setAuthError(err.message || 'Account activation failed.');
    } finally {
      setCompletingCheckout(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAuth(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();
      const cleanSlug = IS_STANDALONE_MODE ? '' : officeSlugInput.trim().toLowerCase();

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
        if (!IS_STANDALONE_MODE && cleanSlug && cleanSlug !== 'default') {
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
      !IS_STANDALONE_MODE && currentOrg?.slug && currentOrg.slug !== 'default'
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

  if (showHiddenOffer) {
    return (
      <HiddenFunnelOfferPage
        standaloneMode={IS_STANDALONE_MODE}
        brandName={currentOrg.brand_name}
        brandColor={primaryColor}
        videoEmbedUrl="https://www.youtube.com/embed/YOUR_TRAINING_VIDEO_ID"
        stripeLinks={{
          clientPromo: 'https://buy.stripe.com/YOUR_CLIENT_SPECIAL_LINK',
          clientLifetimePromo: 'https://buy.stripe.com/YOUR_CLIENT_LIFETIME_LINK',
          officeMonthlyPromo: 'https://buy.stripe.com/YOUR_OFFICE_MONTHLY_LINK',
          officeWhiteLabelPromo: 'https://buy.stripe.com/YOUR_WHITE_LABEL_SPECIAL_LINK',
        }}
        onExitToMain={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete('offer');
          url.searchParams.delete('funnel');
          window.history.replaceState({}, '', url.toString());
          setShowHiddenOffer(false);
        }}
      />
    );
  }

  if (authLoading || launchingDemo || (session && loadingMembership)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm font-medium text-slate-500">
        {launchingDemo ? 'Launching live interactive demo workspace...' : 'Loading workspace...'}
      </div>
    );
  }

  if (!session && checkoutSessionId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-6 bg-emerald-600 text-white text-center space-y-1.5">
            <CheckCircle2 className="w-9 h-9 mx-auto mb-1 text-emerald-100" />
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
              Payment Confirmed
            </div>
            <h1 className="text-xl font-bold tracking-tight">Choose Your Password</h1>
            <p className="text-xs text-emerald-50">
              {checkoutInfo?.plan_name || 'Simple Bookkeeping System'}
            </p>
          </div>

          {loadingCheckoutInfo ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Verifying your Stripe checkout...
            </div>
          ) : (
            <form onSubmit={handleCompleteCheckoutOnboarding} className="p-6 space-y-4">
              {authError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
                  {authError}
                </div>
              )}

              {checkoutInfo && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  {checkoutInfo.full_name && (
                    <div className="font-semibold text-slate-900">{checkoutInfo.full_name}</div>
                  )}
                  <div className="font-mono text-slate-600">{checkoutInfo.email}</div>
                  <div className="text-[11px] text-emerald-700 font-medium pt-0.5">
                    Account Type:{' '}
                    {!IS_STANDALONE_MODE && checkoutInfo.role === 'office_admin'
                      ? 'Tax Office / Service Bureau Admin'
                      : 'Solo Business Ledger'}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Create Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showCheckoutPasswordText ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    value={checkoutPassword}
                    onChange={(e) => setCheckoutPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCheckoutPasswordText(!showCheckoutPasswordText)}
                    aria-label={showCheckoutPasswordText ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                  >
                    {showCheckoutPasswordText ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showCheckoutPasswordText ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Re-enter your password"
                    value={checkoutConfirmPassword}
                    onChange={(e) => setCheckoutConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={completingCheckout || !checkoutInfo}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm disabled:opacity-50"
              >
                {completingCheckout ? 'Activating & Signing In...' : 'Activate & Open My Ledger'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    window.history.replaceState(null, '', `${window.location.pathname}#login`);
                    window.location.reload();
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Already have a password? Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (!session) {
    if (!showAuth) {
      return (
        <LandingPage
          tenant={currentOrg}
          standaloneMode={IS_STANDALONE_MODE}
          onOpenAuth={handleOpenAuth}
        />
      );
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

                {!IS_STANDALONE_MODE && (
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
                )}
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
                    ,{' '}
                    <button
                      type="button"
                      onClick={() => setLegalModalTab('cookies')}
                      className="font-semibold text-emerald-700 underline"
                    >
                      Cookie Policy
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
            Your access to <strong>{currentOrg.brand_name}</strong> has been paused.
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
  const isAdmin =
    !IS_STANDALONE_MODE && (userRole === 'super_admin' || userRole === 'office_admin');

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
              window.location.href = '/#pricing';
            }}
            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
          >
            {IS_STANDALONE_MODE ? 'Get Your Own Ledger →' : 'Start Your 7-Day Free Trial →'}
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
        <DashboardQuickStartCard
          role={userRole}
          standaloneMode={IS_STANDALONE_MODE}
          brandColor={primaryColor}
          officeSlug={IS_STANDALONE_MODE ? '' : currentOrg?.slug || ''}
          onOpenAdminView={() => setActiveView('admin')}
        />

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
              onClick={() => setLegalModalTab('cookies')}
              className="hover:text-slate-900 underline"
            >
              Cookie Policy
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
