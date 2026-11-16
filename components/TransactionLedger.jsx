import React, { useState } from 'react';
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  MONTHS,
  formatCurrency,
} from '../lib/constants';
import CsvImportModal from './CsvImportModal';
import {
  Plus,
  Trash2,
  Search,
  Upload,
  Pencil,
  Check,
  X,
  Layers,
} from 'lucide-react';

export default function TransactionLedger({
  type,
  transactions,
  selectedYear,
  onAddTransaction,
  onBulkImportTransactions,
  onUpdateTransaction,
  onBulkUpdateTransactions,
  onDeleteTransaction,
  onBulkDeleteTransactions,
}) {
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const today = new Date().toISOString().split('T')[0];

  // Single Entry State
  const [txDate, setTxDate] = useState(today);
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('ALL');

  // CSV Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);

  // Inline Single-Row Edit State
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({
    tx_date: '',
    category: '',
    description: '',
    amount: '',
  });

  // Bulk Selection & Bulk Action State
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkCategory, setBulkCategory] = useState(categories[0]);
  const [bulkDate, setBulkDate] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

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

  // Selection Helpers
  const allVisibleSelected =
    yearEntries.length > 0 && yearEntries.every((item) => selectedIds.includes(item.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleSet = new Set(yearEntries.map((i) => i.id));
      setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...yearEntries.map((i) => i.id)]);
      setSelectedIds(Array.from(merged));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Inline Edit Handlers
  const startEditing = (item) => {
    setEditingId(item.id);
    setEditDraft({
      tx_date: item.tx_date,
      category: item.category,
      description: item.description || '',
      amount: item.amount,
    });
  };

  const saveEdit = async (id) => {
    if (!editDraft.tx_date || Number(editDraft.amount) <= 0) return;
    await onUpdateTransaction(id, {
      tx_date: editDraft.tx_date,
      category: editDraft.category,
      description: editDraft.description,
      amount: Number(editDraft.amount),
    });
    setEditingId(null);
  };

  // Bulk Action Handlers
  const handleApplyBulkCategory = async () => {
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    await onBulkUpdateTransactions(selectedIds, { category: bulkCategory });
    setSelectedIds([]);
    setBulkProcessing(false);
  };

  const handleApplyBulkDate = async () => {
    if (selectedIds.length === 0 || !bulkDate) return;
    setBulkProcessing(true);
    await onBulkUpdateTransactions(selectedIds, { tx_date: bulkDate });
    setSelectedIds([]);
    setBulkDate('');
    setBulkProcessing(false);
  };

  const handleApplyBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    await onBulkDeleteTransactions(selectedIds);
    setSelectedIds([]);
    setBulkProcessing(false);
  };

  return (
    <div className="space-y-6">
      {/* Entry Form + CSV Import Trigger */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Add {type === 'income' ? 'Income' : 'Expense'} Entry
            </h2>
            <p className="text-xs text-slate-500">
              Add individual entries below or import multiple rows from Google Sheets / CSV.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition self-start"
          >
            <Upload className="w-4 h-4" />
            Import CSV / Spreadsheet
          </button>
        </div>

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

      {/* Bulk Action Bar (Appears whenever 1 or more rows are checked) */}
      {selectedIds.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <Layers className="w-4 h-4 text-amber-700" />
            <span>{selectedIds.length} selected</span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs font-medium text-amber-700 underline ml-2"
            >
              Clear
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Bulk Re-Categorize */}
            <div className="flex items-center gap-1.5">
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="px-2.5 py-1.5 border border-amber-300 rounded-lg text-xs bg-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={bulkProcessing}
                onClick={handleApplyBulkCategory}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg"
              >
                Change Category
              </button>
            </div>

            {/* Bulk Change Date */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                className="px-2.5 py-1.5 border border-amber-300 rounded-lg text-xs bg-white"
              />
              <button
                type="button"
                disabled={bulkProcessing || !bulkDate}
                onClick={handleApplyBulkDate}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
              >
                Set Date
              </button>
            </div>

            {/* Bulk Delete */}
            <button
              type="button"
              disabled={bulkProcessing}
              onClick={handleApplyBulkDelete}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

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
                <th className="py-2.5 px-2 text-center w-8">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    title="Select all visible rows"
                    className="accent-emerald-600"
                  />
                </th>
                <th className="py-2.5 text-left">Date</th>
                <th className="py-2.5 text-left">Category</th>
                <th className="py-2.5 text-left">Description</th>
                <th className="py-2.5 text-center">Year</th>
                <th className="py-2.5 text-center">Month</th>
                <th className="py-2.5 text-right">Amount</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {yearEntries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No {type} entries recorded for {selectedYear} yet. Add one above or import a CSV file.
                  </td>
                </tr>
              ) : (
                yearEntries.map((item) => {
                  const monthObj = MONTHS.find((m) => m.value === Number(item.tx_month));
                  const isEditing = editingId === item.id;
                  const isChecked = selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={isChecked ? 'bg-amber-50/50' : 'hover:bg-slate-50'}
                    >
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(item.id)}
                          className="accent-emerald-600"
                        />
                      </td>

                      {isEditing ? (
                        <>
                          <td className="py-2">
                            <input
                              type="date"
                              value={editDraft.tx_date}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, tx_date: e.target.value })
                              }
                              className="px-2 py-1 border border-slate-300 rounded text-xs"
                            />
                          </td>
                          <td className="py-2">
                            <select
                              value={editDraft.category}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, category: e.target.value })
                              }
                              className="px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2">
                            <input
                              type="text"
                              value={editDraft.description}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, description: e.target.value })
                              }
                              className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                            />
                          </td>
                          <td className="py-2 text-center text-slate-400 text-xs">Auto</td>
                          <td className="py-2 text-center text-slate-400 text-xs">Auto</td>
                          <td className="py-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={editDraft.amount}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, amount: e.target.value })
                              }
                              className="w-24 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                            />
                          </td>
                          <td className="py-2 text-right whitespace-nowrap">
                            <button
                              onClick={() => saveEdit(item.id)}
                              className="text-emerald-600 hover:text-emerald-800 p-1"
                              title="Save changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-slate-400 hover:text-slate-700 p-1"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
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
                          <td className="py-2.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => startEditing(item)}
                              className="text-slate-400 hover:text-emerald-600 p-1"
                              title="Edit entry"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteTransaction(item.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Delete entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showImportModal && (
        <CsvImportModal
          type={type}
          onClose={() => setShowImportModal(false)}
          onBulkImport={onBulkImportTransactions}
        />
      )}
    </div>
  );
}
