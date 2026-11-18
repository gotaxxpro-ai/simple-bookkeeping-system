import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Shield,
  AlertTriangle,
  Lock,
  Database,
  Printer,
} from 'lucide-react';

const POLICY_TABS = [
  { id: 'terms', label: 'Terms of Service', icon: FileText },
  { id: 'privacy', label: 'Privacy Policy', icon: Shield },
  { id: 'disclaimer', label: 'Tax & Accuracy Disclaimer', icon: AlertTriangle },
  { id: 'security', label: 'Security & Breach Policy', icon: Lock },
  { id: 'retention', label: 'Data Ownership & Termination', icon: Database },
];

export default function LegalModal({
  isOpen,
  initialTab = 'terms',
  onClose,
  brandName = 'Simple Bookkeeping System',
  supportEmail = 'gotaxxpro@gmail.com',
  primaryColor = '#059669',
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'terms');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const effectiveDate = 'November 17, 2026';
  const contactEmail = supportEmail || 'gotaxxpro@gmail.com';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              {brandName} — Legal, Privacy &amp; Compliance Policies
            </h2>
            <p className="text-xs text-slate-400">Effective Date: {effectiveDate} • Version 1.0</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              title="Print or Save Policy as PDF"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close legal policies"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Policy Selector Tabs */}
        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex overflow-x-auto gap-1.5">
          {POLICY_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
                }`}
                style={active ? { backgroundColor: primaryColor } : undefined}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Policy Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-5 text-sm text-slate-700 leading-relaxed">
          {activeTab === 'terms' && (
            <>
              <h3 className="text-xl font-extrabold text-slate-900">1. Terms of Service</h3>
              <p>
                These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of{' '}
                <strong>{brandName}</strong> (&ldquo;Platform,&rdquo; &ldquo;Service,&rdquo; &ldquo;we,&rdquo; or &ldquo;us&rdquo;), including our bookkeeping ledgers, CSV statement importers, Schedule C summary generators, and white-label tax office portals. By creating an account, checking the acceptance box during registration, or using the Service, you agree to be bound by these Terms.
              </p>

              <h4 className="font-bold text-slate-900">1.1 User Responsibility for Financial Accuracy</h4>
              <p>
                The Platform is a self-directed recordkeeping and organizational software tool. You are solely responsible for entering, importing, reviewing, categorizing, and verifying all business income, deductible expenses, vehicle mileage logs, Cost of Goods Sold (Part III), Home Office measurements (Line 30), and Owner&apos;s Draws, including any figures used to prepare IRS Form 1040 Schedule C or state tax filings.
              </p>

              <h4 className="font-bold text-slate-900">1.2 White-Label Tax Office &amp; Service Bureau Portals</h4>
              <p>
                If you access the Platform through a branded tax office or service bureau portal (<code>?office=slug</code>), you acknowledge that your designated tax office administrator may view your bookkeeping entries and Schedule C reports in read-only inspection mode to assist with tax preparation. Independent tax offices are separate entities and are solely responsible for their own tax preparation services, pricing, and client relationships.
              </p>

              <h4 className="font-bold text-slate-900">1.3 Limitation of Liability</h4>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL {brandName.toUpperCase()}, ITS FOUNDERS, AFFILIATES, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, TAX PENALTIES, IRS AUDIT ASSESSMENTS, INTEREST, OR LOSS OF DATA ARISING OUT OF YOUR USE OF THE SERVICE. OUR TOTAL CUMULATIVE LIABILITY FOR ANY CLAIM ARISING UNDER THESE TERMS SHALL NOT EXCEED THE AMOUNT PAID BY YOU FOR THE SERVICE DURING THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY.
              </p>

              <h4 className="font-bold text-slate-900">1.4 Service Availability, Modifications &amp; Suspension</h4>
              <p>
                We reserve the right to perform scheduled or emergency maintenance, update tax-year mileage rates or Schedule C line mappings, modify features, or suspend or terminate accounts that violate these Terms or have unpaid subscription balances.
              </p>

              <h4 className="font-bold text-slate-900">1.5 Governing Law &amp; Dispute Resolution</h4>
              <p>
                These Terms are governed by the laws of the State of Georgia, without regard to conflict-of-law principles. Before initiating formal legal proceedings, both parties agree to attempt good-faith resolution by sending written notice to{' '}
                <a href={`mailto:${contactEmail}`} className="text-emerald-700 font-semibold underline">
                  {contactEmail}
                </a>
                . Any unresolved dispute shall be brought exclusively in the state or federal courts located in Georgia, and you agree to resolve disputes on an individual basis rather than as part of a class or representative action.
              </p>
            </>
          )}

          {activeTab === 'privacy' && (
            <>
              <h3 className="text-xl font-extrabold text-slate-900">2. Privacy Policy</h3>
              <p>
                This Privacy Policy explains how <strong>{brandName}</strong> collects, uses, stores, shares, and protects personal and business financial information when you use our web application.
              </p>

              <h4 className="font-bold text-slate-900">2.1 Information We Collect</h4>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Account &amp; Profile Information:</strong> Full name, email address, encrypted authentication credentials, and optional white-label tax office association.
                </li>
                <li>
                  <strong>Business &amp; Financial Records:</strong> Business name, business activity, 6-digit NAICS code, income entries, expense entries, vendor/client names, CSV bank statement uploads, vehicle mileage logs, inventory/COGS figures, home office square footage, and Owner&apos;s Draw records.
                </li>
                <li>
                  <strong>Billing Information:</strong> Subscription tier and payment status processed securely through Stripe. We do not store raw credit card numbers on our application servers.
                </li>
              </ul>

              <h4 className="font-bold text-slate-900">2.2 How We Use &amp; Share Information</h4>
              <p>
                We use collected data strictly to operate your bookkeeping ledger, generate Schedule C summaries, process subscription billing, and provide customer support. We do not sell or rent your financial records to third-party data brokers. Data is processed using trusted infrastructure providers—including Supabase (database and authentication), Stripe (payment processing), and Hostinger (web hosting)—under strict confidentiality and security obligations. If your account is linked to a white-label tax office, authorized administrators of that office can view your ledger for tax preparation support.
              </p>

              <h4 className="font-bold text-slate-900">2.3 Retention, Deletion &amp; User Privacy Rights</h4>
              <p>
                You may review, edit, or export your bookkeeping data in CSV format at any time inside your dashboard. You may request account deletion by contacting{' '}
                <a href={`mailto:${contactEmail}`} className="text-emerald-700 font-semibold underline">
                  {contactEmail}
                </a>
                . Upon verified request, active records are deleted within 30 days, subject to temporary encrypted backup rotation and statutory tax/billing recordkeeping obligations.
              </p>
            </>
          )}

          {activeTab === 'disclaimer' && (
            <>
              <h3 className="text-xl font-extrabold text-slate-900">
                3. Financial Accuracy &amp; Tax Compliance Disclaimer
              </h3>

              <h4 className="font-bold text-slate-900">3.1 No CPA, Accounting, or Legal Relationship</h4>
              <p>
                <strong>{brandName}</strong> is a bookkeeping software provider—not a Certified Public Accountant (CPA) firm, enrolled agent practice, law firm, or registered tax advisor. Your use of the Software does not create a CPA-client, accountant-client, or fiduciary relationship, and software outputs do not constitute formal tax, accounting, or legal advice.
              </p>

              <h4 className="font-bold text-slate-900">3.2 Dependence on User-Supplied Data</h4>
              <p>
                Schedule C summaries, Net Profit calculations (Line 31), Home Office calculations (Line 30), Cost of Goods Sold totals (Part III), and IRS standard mileage previews depend entirely on the completeness and accuracy of the entries and CSV files you upload. Automated CSV category suggestions are provided solely as a convenience and must be reviewed by you prior to saving.
              </p>

              <h4 className="font-bold text-slate-900">3.3 Deductibility &amp; IRS Substantiation</h4>
              <p>
                Assigning an expense to a Schedule C line inside the Software does not independently establish that the expense is ordinary, necessary, or legally deductible under the Internal Revenue Code. You are responsible for maintaining contemporaneous receipts, mileage logs, and written substantiation required by IRS rules (including IRC &sect; 274(d) for vehicle and travel deductions) and verifying all figures with a qualified tax professional before filing any tax return.
              </p>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <h3 className="text-xl font-extrabold text-slate-900">
                4. Data Security &amp; Breach Notification Policy
              </h3>

              <h4 className="font-bold text-slate-900">4.1 Technical &amp; Administrative Safeguards</h4>
              <p>
                We implement industry-standard safeguards to protect confidential bookkeeping records, including TLS/HTTPS encryption in transit, encryption at rest via our cloud database infrastructure, hashed password storage, strict Row-Level Security (RLS) policies isolating each user&apos;s financial records, and role-based access controls separating standard clients, office administrators, and platform administrators. While we maintain rigorous security practices, no internet-based system can guarantee absolute immunity from unauthorized access.
              </p>

              <h4 className="font-bold text-slate-900">4.2 Shared Security Responsibilities</h4>
              <p>
                You are responsible for maintaining the confidentiality of your password, promptly replacing temporary passwords issued by a tax office, securing devices used to access your ledger, and ensuring that CSV files uploaded to the Platform are obtained from trusted financial institutions. White-label tax offices are responsible for managing staff permissions and promptly suspending access for departed personnel.
              </p>

              <h4 className="font-bold text-slate-900">4.3 Incident Response &amp; Breach Notification</h4>
              <p>
                In the event of a confirmed security breach affecting unencrypted personal or financial information, we will immediately investigate, contain unauthorized access, preserve forensic logs, and notify affected users and white-label office administrators in accordance with applicable state and federal breach notification statutes, including affected data categories and recommended protective steps.
              </p>
            </>
          )}

          {activeTab === 'retention' && (
            <>
              <h3 className="text-xl font-extrabold text-slate-900">
                5. Data Ownership, Retention &amp; Service Termination Policy
              </h3>

              <h4 className="font-bold text-slate-900">5.1 Customer Ownership of Bookkeeping Records</h4>
              <p>
                You retain 100% ownership of all business profiles, transaction entries, CSV uploads, vehicle mileage logs, and Schedule C worksheets you enter into <strong>{brandName}</strong>. You grant us a limited, non-exclusive license solely to host, process, back up, and display your records as required to provide the Service to you and your authorized tax preparer.
              </p>

              <h4 className="font-bold text-slate-900">5.2 Data Export &amp; Account Closure</h4>
              <p>
                You may export your complete Schedule C summary in CSV format at any time at no additional charge using the <strong>Export Schedule C CSV</strong> button in your ledger. Upon subscription expiration or account cancellation, we recommend downloading all tax-year CSV reports prior to closure. Suspended accounts restrict login access until reactivated by your tax office or billing resolution, without immediately erasing underlying records.
              </p>

              <h4 className="font-bold text-slate-900">5.3 Backup Limitations &amp; Record Preservation</h4>
              <p>
                While our cloud database performs automated daily backups for disaster recovery, the Platform is not a substitute for your own statutory tax archive. Under IRS guidelines, taxpayers should retain supporting tax records for at least three (3) to seven (7) years; you are responsible for saving local copies of your exported CSV reports and receipts. Accounts terminated or inactive for more than twelve (12) months after subscription expiration may be permanently purged unless subject to a legal hold or active white-label agreement.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Questions? Contact{' '}
            <a href={`mailto:${contactEmail}`} className="font-semibold text-slate-700 underline">
              {contactEmail}
            </a>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
