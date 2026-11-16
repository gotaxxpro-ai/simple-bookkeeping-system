import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../lib/constants';
import { Package, Save } from 'lucide-react';

export default function CogsTab({ selectedYear, cogs, onSaveCogs }) {
  const [form, setForm] = useState({
    beginning_inventory: 0,
    inventory_diff_explanation: '',
    purchases_less_personal: 0,
    cost_of_labor: 0,
    materials_supplies: 0,
    other_costs: 0,
    ending_inventory: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cogs) {
      setForm({
        beginning_inventory: cogs.beginning_inventory || 0,
        inventory_diff_explanation: cogs.inventory_diff_explanation || '',
        purchases_less_personal: cogs.purchases_less_personal || 0,
        cost_of_labor: cogs.cost_of_labor || 0,
        materials_supplies: cogs.materials_supplies || 0,
        other_costs: cogs.other_costs || 0,
        ending_inventory: cogs.ending_inventory || 0,
      });
    } else {
      setForm({
        beginning_inventory: 0,
        inventory_diff_explanation: '',
        purchases_less_personal: 0,
        cost_of_labor: 0,
        materials_supplies: 0,
        other_costs: 0,
        ending_inventory: 0,
      });
    }
  }, [cogs, selectedYear]);

  const subtotal =
    Number(form.beginning_inventory) +
    Number(form.purchases_less_personal) +
    Number(form.cost_of_labor) +
    Number(form.materials_supplies) +
    Number(form.other_costs);

  const costOfGoodsSold = Math.max(0, subtotal - Number(form.ending_inventory));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSaveCogs({
      tax_year: selectedYear,
      beginning_inventory: Number(form.beginning_inventory) || 0,
      inventory_diff_explanation: form.inventory_diff_explanation,
      purchases_less_personal: Number(form.purchases_less_personal) || 0,
      cost_of_labor: Number(form.cost_of_labor) || 0,
      materials_supplies: Number(form.materials_supplies) || 0,
      other_costs: Number(form.other_costs) || 0,
      ending_inventory: Number(form.ending_inventory) || 0,
    });
    setSaving(false);
  };

  return (
    <div className="max-w-3xl bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Package className="w-5 h-5 text-emerald-600" />
        <h2 className="text-lg font-bold text-slate-900">Cost of Goods Sold ({selectedYear})</h2>
      </div>
      <p className="text-xs text-slate-500 mb-6">
        If you sell products and carry inventory, complete Part III figures below for {selectedYear}.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
          <label className="sm:col-span-2 text-sm font-medium text-slate-700">
            Inventory at beginning of the year
          </label>
          <input
            type="number"
            step="0.01"
            value={form.beginning_inventory}
            onChange={(e) => setForm({ ...form, beginning_inventory: e.target.value })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            If different from last year's closing inventory, attach explanation:
          </label>
          <input
            type="text"
            value={form.inventory_diff_explanation}
            onChange={(e) => setForm({ ...form, inventory_diff_explanation: e.target.value })}
            placeholder="Optional explanation..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
          <label className="sm:col-span-2 text-sm font-medium text-slate-700">
            Purchases less cost of items withdrawn for personal use
          </label>
          <input
            type="number"
            step="0.01"
            value={form.purchases_less_personal}
            onChange={(e) => setForm({ ...form, purchases_less_personal: e.target.value })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
          <label className="sm:col-span-2 text-sm font-medium text-slate-700">
            Cost of labor (Do not include any amounts paid to yourself)
          </label>
          <input
            type="number"
            step="0.01"
            value={form.cost_of_labor}
            onChange={(e) => setForm({ ...form, cost_of_labor: e.target.value })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
          <label className="sm:col-span-2 text-sm font-medium text-slate-700">
            Materials and supplies
          </label>
          <input
            type="number"
            step="0.01"
            value={form.materials_supplies}
            onChange={(e) => setForm({ ...form, materials_supplies: e.target.value })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
          <label className="sm:col-span-2 text-sm font-medium text-slate-700">Other Costs</label>
          <input
            type="number"
            step="0.01"
            value={form.other_costs}
            onChange={(e) => setForm({ ...form, other_costs: e.target.value })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
          />
        </div>

        <div className="flex justify-between items-center py-2.5 px-3 bg-slate-100 rounded-lg font-semibold text-sm">
          <span>Totals (Inventory + Purchases + Labor + Materials + Other)</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
          <label className="sm:col-span-2 text-sm font-medium text-slate-700">
            Inventory at end of year
          </label>
          <input
            type="number"
            step="0.01"
            value={form.ending_inventory}
            onChange={(e) => setForm({ ...form, ending_inventory: e.target.value })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
          />
        </div>

        <div className="flex justify-between items-center py-3 px-4 bg-emerald-50 border border-emerald-200 rounded-lg font-bold text-base text-emerald-900">
          <span>Cost of Goods Sold ({selectedYear})</span>
          <span>{formatCurrency(costOfGoodsSold)}</span>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : `Save ${selectedYear} COGS`}
        </button>
      </form>
    </div>
  );
}
