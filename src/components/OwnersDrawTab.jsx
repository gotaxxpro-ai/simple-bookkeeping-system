import React, { useState } from 'react';
import { DRAW_METHODS, MONTHS, formatCurrency } from '../lib/constants';
import { Wallet, Plus, Trash2, Search } from 'lucide-react';

export default function OwnersDrawTab({ selectedYear, draws, onAddDraw, onDeleteDraw }) {
  const today = new Date().toISOString().split('T')[0];
  const [drawDate, setDrawDate] = useState(today);
  const [paymentMethod, setPaymentMethod] = useState(DRAW_METHODS[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setSubmitting(true);
    await onAddDraw({
      draw_date: drawDate,
      payment_method: paymentMethod,
      description,
      amount: Number(amount),
    });
    setDescription('');
    setAmount('');
    setSubmitting(false);
  };

  const yearDraws = (draws || [])
    .filter((d) => Number(d.draw_year) === Number(selectedYear))
    .filter((d) =>
      searchTerm
        ? (d.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (d.payment_method || '').toLowerCase().includes(searchTerm.toLowerCase())
        : true
    );

  const totalDraws = yearDraws.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className="space-y-6">
      {/* Entry Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">
            Add Owner's Draw Entry
          </h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Record personal funds withdrawn from your business. Owner's draws are tracked as owner equity withdrawals and do not reduce Schedule C taxable net profit.
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={drawDate}
              onChange={(e) => setDrawDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {DRAW_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Memo / Note
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Monthly owner transfer to personal checking"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="md:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </form>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-slate-800">{selectedYear} Owner's Draw Ledger</h3>
            <p className="text-xs text-slate-500">
              Showing {yearDraws.length} draws totaling{' '}
              <span className="font-bold text-indigo-700">{formatCurrency(totalDraws)}</span>
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search memo or method..."
              className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                <th className="py-2.5 text-left">Date</th>
                <th className="py-2.5 text-left">Method</th>
                <th className="py-2.5 text-left">Memo</th>
                <th className="py-2.5 text-center">Year</th>
                <th className="py-2.5 text-center">Month</th>
                <th className="py-2.5 text-right">Amount</th>
                <th className="py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {yearDraws.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No owner's draws recorded for {selectedYear} yet. Use the form above to add one.
                  </td>
                </tr>
              ) : (
                yearDraws.map((item) => {
                  const monthObj = MONTHS.find((m) => m.value === Number(item.draw_month));
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-slate-800">{item.draw_date}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                          {item.payment_method}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-600">{item.description || '—'}</td>
                      <td className="py-2.5 text-center text-slate-500">{item.draw_year}</td>
                      <td className="py-2.5 text-center text-slate-500">{monthObj?.label}</td>
                      <td className="py-2.5 text-right font-semibold text-indigo-700">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => onDeleteDraw(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
