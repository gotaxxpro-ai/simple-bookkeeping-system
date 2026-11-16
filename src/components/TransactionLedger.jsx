import React, { useState } from 'react';
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  MONTHS,
  formatCurrency,
} from '../lib/constants';
import { Plus, Trash2, Search } from 'lucide-react';

export default function TransactionLedger({
  type, // 'income' | 'expense'
  transactions,
  selectedYear,
  onAddTransaction,
  onDeleteTransaction,
}) {
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const today = new Date().toISOString().split('T')[0];

  const [txDate, setTxDate] = useState(today);
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('ALL');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setSubmitting(true);
    await onAddTransaction({
      type,
      tx_date: txDate,
      category,
      description,
      amount: Number(amount),
    });
    setDescription('');
    setAmount('');
    setSubmitting(false);
  };

  const yearEntries = transactions
    .filter((t) => t.type === type && Number(t.tx_year) === Number(selectedYear))
    .filter((t) => (filterCat === 'ALL' ? true : t.category === filterCat))
    .filter((t) =>
      searchTerm
        ? (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.category.toLowerCase().includes(searchTerm.toLowerCase())
        : true
    );

  const totalAmount = yearEntries.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="space-y-6">
      {/* Entry Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          Add {type === 'income' ? 'Income' : 'Expense'} Entry
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Year and Month are calculated automatically from the transaction date so you can log entries across any year.
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'income' ? 'e.g., Client invoice #104' : 'e.g., Office supplies at Staples'
              }
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
              className={`w-full inline-flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-white font-semibold text-sm transition ${
                type === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
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
            <h3 className="font-bold text-slate-800">
              {selectedYear} {type === 'income' ? 'Income' : 'Expenses'} Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Showing {yearEntries.length} transactions totaling{' '}
              <span className="font-bold text-slate-800">{formatCurrency(totalAmount)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search description..."
                className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                <th className="py-2.5 text-left">Date</th>
                <th className="py-2.5 text-left">Category</th>
                <th className="py-2.5 text-left">Description</th>
                <th className="py-2.5 text-center">Year</th>
                <th className="py-2.5 text-center">Month</th>
                <th className="py-2.5 text-right">Amount</th>
                <th className="py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {yearEntries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No {type} entries recorded for {selectedYear} yet. Use the form above to add one.
                  </td>
                </tr>
              ) : (
                yearEntries.map((item) => {
                  const monthObj = MONTHS.find((m) => m.value === Number(item.tx_month));
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-slate-800">{item.tx_date}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-600">{item.description || '—'}</td>
                      <td className="py-2.5 text-center text-slate-500">{item.tx_year}</td>
                      <td className="py-2.5 text-center text-slate-500">{monthObj?.label}</td>
                      <td className="py-2.5 text-right font-semibold text-slate-900">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => onDeleteTransaction(item.id)}
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
