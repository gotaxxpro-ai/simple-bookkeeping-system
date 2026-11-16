import React from 'react';
import { CheckCircle2, ArrowRight, FileText } from 'lucide-react';

export default function NextStepsTab({ selectedYear, onNavigate }) {
  const steps = [
    {
      title: '1. Complete Your Business Profile',
      desc: 'Enter your Business Name, Activity, and NAICS Code on the Dashboard so they appear on your printed Schedule C report.',
      actionLabel: 'Go to Dashboard',
      targetTab: 'dashboard',
    },
    {
      title: '2. Record All Income & Operating Expenses',
      desc: 'Log every business receipt and deductible expense under its matching IRS Schedule C category.',
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
      title: '5. Export & Send Your Tax Report',
      desc: 'Return to the Dashboard, filter by tax year, and click Export CSV Report or Print / Save PDF to send to your tax preparer.',
      actionLabel: 'Run Report',
      targetTab: 'dashboard',
    },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-900">
            Tax Filing & Bookkeeping Next Steps ({selectedYear})
          </h2>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Follow these steps to wrap up your {selectedYear} books and prepare your records for tax filing.
        </p>

        <div className="space-y-4">
          {steps.map((step) => (
            <div
              key={step.title}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{step.title}</h3>
                  <p className="text-xs text-slate-600 mt-1">{step.desc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(step.targetTab)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg whitespace-nowrap transition"
              >
                {step.actionLabel}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
