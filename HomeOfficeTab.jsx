import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../lib/constants';
import { Home, Save } from 'lucide-react';

export default function HomeOfficeTab({ selectedYear, homeOffice, onSaveHomeOffice }) {
  const [form, setForm] = useState({
    total_home_sqft: 0,
    business_area_sqft: 0,
    calculation_method: 'Simplified',
    indirect_expenses: 0,
    direct_expenses: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (homeOffice) {
      setForm({
        total_home_sqft: homeOffice.total_home_sqft || 0,
        business_area_sqft: homeOffice.business_area_sqft || 0,
        calculation_method: homeOffice.calculation_method || 'Simplified',
        indirect_expenses: homeOffice.indirect_expenses || 0,
        direct_expenses: homeOffice.direct_expenses || 0,
      });
    } else {
      setForm({
        total_home_sqft: 0,
        business_area_sqft: 0,
        calculation_method: 'Simplified',
        indirect_expenses: 0,
        direct_expenses: 0,
      });
    }
  }, [homeOffice, selectedYear]);

  const totalSq = Number(form.total_home_sqft) || 0;
  const bizSq = Number(form.business_area_sqft) || 0;
  const businessPct = totalSq > 0 ? (bizSq / totalSq) * 100 : 0;
  const cappedSqFt = Math.min(bizSq, 300);
  const simplifiedTotal = cappedSqFt * 5;
  const actualTotal =
    (Number(form.indirect_expenses) || 0) * (businessPct / 100) +
    (Number(form.direct_expenses) || 0);

  const activeDeduction =
    form.calculation_method === 'Simplified' ? simplifiedTotal : actualTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSaveHomeOffice({
      tax_year: selectedYear,
      total_home_sqft: totalSq,
      business_area_sqft: bizSq,
      calculation_method: form.calculation_method,
      indirect_expenses: Number(form.indirect_expenses) || 0,
      direct_expenses: Number(form.direct_expenses) || 0,
    });
    setSaving(false);
  };

  return (
    <div className="max-w-3xl bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Home className="w-5 h-5 text-emerald-600" />
        <h2 className="text-lg font-bold text-slate-900">
          Home Office Deduction ({selectedYear})
        </h2>
      </div>
      <p className="text-xs text-slate-500 mb-6">
        Calculate your Form 8829 / Schedule C business use of home deduction using either the Simplified or Actual Expense method.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
          <label className="sm:col-span-2 text-sm font-medium text-slate-700">
            Total Home Square Footage
          </label>
          <input
            type="number"
            value={form.total_home_sqft}
            onChange={(e) => setForm({ ...form, total_home_sqft: e.target.value })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
          <label className="sm:col-span-2 text-sm font-medium text-slate-700">
            Business Area Square Footage
          </label>
          <input
            type="number"
            value={form.business_area_sqft}
            onChange={(e) => setForm({ ...form, business_area_sqft: e.target.value })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
          />
        </div>

        <div className="flex justify-between items-center py-2.5 px-3 bg-slate-100 rounded-lg text-sm font-semibold">
          <span>Business Use Percentage</span>
          <span>{businessPct.toFixed(2)}%</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
          <label className="sm:col-span-2 text-sm font-medium text-slate-700">
            Calculation Method
          </label>
          <select
            value={form.calculation_method}
            onChange={(e) => setForm({ ...form, calculation_method: e.target.value })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="Simplified">Simplified Method ($5/sq ft up to 300)</option>
            <option value="Actual">Actual Expense Method</option>
          </select>
        </div>

        {form.calculation_method === 'Simplified' ? (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Simplified Method Capped Sq Ft (Max 300):</span>
              <span className="font-semibold">{cappedSqFt.toFixed(2)} sq ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Simplified Deduction Rate:</span>
              <span className="font-semibold">$5.00 / sq ft</span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <p className="text-xs text-slate-500">
              Split expenses into Indirect (for the whole house, prorated automatically by{' '}
              {businessPct.toFixed(2)}%) and Direct (specifically for the office space, 100% deductible).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
              <label className="sm:col-span-2 text-sm font-medium text-slate-700">
                Total Indirect Whole-House Expenses ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.indirect_expenses}
                onChange={(e) => setForm({ ...form, indirect_expenses: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
              <label className="sm:col-span-2 text-sm font-medium text-slate-700">
                Direct Office-Only Expenses ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.direct_expenses}
                onChange={(e) => setForm({ ...form, direct_expenses: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
              />
            </div>
          </div>
        )}

        <div className="flex justify-between items-center py-3 px-4 bg-emerald-50 border border-emerald-200 rounded-lg font-bold text-base text-emerald-900">
          <span>Home Office Deduction Total ({selectedYear})</span>
          <span>{formatCurrency(activeDeduction)}</span>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : `Save ${selectedYear} Home Office`}
        </button>
      </form>
    </div>
  );
}
