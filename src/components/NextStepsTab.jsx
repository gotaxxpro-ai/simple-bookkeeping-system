import React from 'react';
import { CheckCircle2, ArrowRight, FileText, CalendarCheck, Mail } from 'lucide-react';

export default function NextStepsTab({ selectedYear, onNavigate, tenant }) {
  const brandName = tenant?.brand_name || 'Your Tax Office';
  const accentColor = tenant?.primary_color || '#059669';

  const steps = [
    {
      title: '1. Complete Your Business Profile',
      desc: 'Enter your Business Name, Activity, and NAICS Code on the Dashboard so they appear on your printed Schedule C report.',
      actionLabel: 'Go to Dashboard',
      targetTab: 'dashboard',
    },
    {
      title: '2. Record All Income & Operating Expenses',
      desc: 'Log every business receipt and deductible expense under its matching IRS Schedule C category (or import your CSV).',
      actionLabel: 'Add Expenses',
      targetTab: 'expenses',
    },
    {
      title: "3. Log Owner's Draws Separately",
      desc: "Record any personal funds withdrawn from the business under the Owner's Draw tab so they stay separate from deductible business expenses.",
      actionLabel: "Go to Owner's Draw",
      targetTab: 'owners_draw',
    },
    {
      title: '4. Add Vehicle, COGS & Home Office Deductions',
      desc: 'Complete your mileage log, inventory figures, or home office square footage before generating your year-end report.',
      actionLabel: 'Enter Vehicle Info',
      targetTab: 'vehicle',
    },
    {
      title: '5. Export & Submit Your Tax Report',
      desc: `Return to the Dashboard, filter by ${selectedYear}, and click Export CSV Report or Print / Save PDF for ${brandName}.`,
      actionLabel: 'Run Report',
      targetTab: 'dashboard',
    },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <FileText style={{ color: accentColor }} className="w-5 h-5" />
          <h2 className="text-xl font-bold text-slate-900">
            Tax Filing & Bookkeeping Next Steps ({selectedYear})
          </h2>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Follow these steps to wrap up your {selectedYear} books and prepare your records for{' '}
          <span className="font-semibold text-slate-700">{brandName}</span>.
        </p>

        <div className="space-y-4">
          {steps.map((step) => (
            <div
              key={step.title}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 style={{ color: accentColor }} className="w-5 h-5 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{step.title}</h3>
                  <p className="text-xs text-slate-600 mt-1">{step.desc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(step.targetTab)}
                style={{ backgroundColor: accentColor }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 hover:opacity-90 text-white text-xs font-semibold rounded-lg whitespace-nowrap transition"
              >
                {step.actionLabel}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {(tenant?.booking_url || tenant?.support_email) && (
          <div className="mt-6 p-5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base">Ready to File Your {selectedYear} Taxes?</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Connect directly with {brandName} once your bookkeeping report is ready.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {tenant?.booking_url && (
                <a
                  href={tenant.booking_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ backgroundColor: accentColor }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-semibold rounded-lg hover:opacity-90"
                >
                  <CalendarCheck className="w-4 h-4" />
                  Book Tax Appointment
                </a>
              )}
              {tenant?.support_email && (
                <a
                  href={`mailto:${tenant.support_email}?subject=${encodeURIComponent(
                    `${selectedYear} Bookkeeping Report`
                  )}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
                >
                  <Mail className="w-4 h-4" />
                  Email {brandName}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
