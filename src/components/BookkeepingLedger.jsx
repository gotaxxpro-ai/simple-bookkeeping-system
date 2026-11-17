import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Download,
  FileSpreadsheet,
  ListFilter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Search,
  Eye,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function BookkeepingLedger({
  targetUserId,
  targetUserName = null,
  readOnly = false,
  primaryColor = '#059669',
}) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeSubTab, setActiveSubTab] = useState('ledger'); // 'ledger' | 'schedule_c'

  // Database state
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'income' | 'expense'
  const [searchTerm, setSearchTerm] = useState('');

  // Add transaction form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'expense',
    category_id: '',
    amount: '',
    vendor_or_client: '',
    description: '',
    payment_method: 'Bank / Card',
  });

  // Feedback banner
  const [statusMessage, setStatusMessage] = useState(null);

  // Build selectable year options (current year + past 4 years)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = currentYear; y >= currentYear - 4; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  // 1. Fetch master IRS Schedule C categories once
  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      const { data, error } = await supabase
        .from('schedule_c_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!error && data && isMounted) {
        setCategories(data);
        const defaultExpense = data.find((c) => c.type === 'expense');
        if (defaultExpense) {
          setFormData((prev) => ({ ...prev, category_id: defaultExpense.id }));
        }
      }
    }

    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch transactions for targetUserId and selectedYear
  useEffect(() => {
    if (!targetUserId) return;
    fetchTransactions();
  }, [targetUserId, selectedYear]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookkeeping_transactions')
        .select(`
          id,
          user_id,
          category_id,
          tax_year,
          transaction_date,
          type,
          amount,
          vendor_or_client,
          description,
          payment_method,
          is_reconciled,
          schedule_c_categories (
            id,
            line_number,
            name,
            type,
            deduction_rate,
            sort_order
          )
        `)
        .eq('user_id', targetUserId)
        .eq('tax_year', selectedYear)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed to load transactions: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Switch default category automatically when toggling Income vs Expense in form
  const handleFormTypeChange = (newType) => {
    const matchingCat = categories.find((c) => c.type === newType);
    setFormData({
      ...formData,
      type: newType,
      category_id: matchingCat ? matchingCat.id : '',
    });
  };

  // Insert a new bookkeeping entry
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (readOnly) return;

    const numericAmount = parseFloat(formData.amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid positive dollar amount.' });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const { error } = await supabase.from('bookkeeping_transactions').insert({
        user_id: targetUserId,
        transaction_date: formData.transaction_date,
        type: formData.type,
        category_id: formData.category_id,
        amount: numericAmount,
        vendor_or_client: formData.vendor_or_client.trim(),
        description: formData.description.trim() || null,
        payment_method: formData.payment_method,
      });

      if (error) throw error;

      const txYear = parseInt(formData.transaction_date.split('-')[0], 10);
      if (txYear !== selectedYear) {
        setSelectedYear(txYear);
      } else {
        await fetchTransactions();
      }

      setFormData((prev) => ({
        ...prev,
        amount: '',
        vendor_or_client: '',
        description: '',
      }));
      setShowAddForm(false);
      setStatusMessage({ type: 'success', text: 'Transaction recorded.' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Could not save transaction: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  // Delete a transaction
  const handleDeleteTransaction = async (txId) => {
    if (readOnly) return;
    if (!window.confirm('Delete this ledger entry?')) return;

    try {
      const { error } = await supabase
        .from('bookkeeping_transactions')
        .delete()
        .eq('id', txId);

      if (error) throw error;
      setTransactions((prev) => prev.filter((t) => t.id !== txId));
      setStatusMessage({ type: 'success', text: 'Entry deleted.' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Delete failed: ${err.message}` });
    }
  };

  // Filtered ledger rows
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const vendorMatch = tx.vendor_or_client?.toLowerCase().includes(q);
        const descMatch = tx.description?.toLowerCase().includes(q);
        const catMatch = tx.schedule_c_categories?.name?.toLowerCase().includes(q);
        const lineMatch = tx.schedule_c_categories?.line_number?.toLowerCase().includes(q);
        return vendorMatch || descMatch || catMatch || lineMatch;
      }
      return true;
    });
  }, [transactions, typeFilter, searchTerm]);

  // Schedule C Rollup Calculations (Part I Income, Part II Expenses with Deduction Rates, Net Profit)
  const scheduleCSummary = useMemo(() => {
    let grossIncome = 0;
    let returnsAndAllowances = 0;
    let totalGrossExpenses = 0;
    let totalDeductibleExpenses = 0;

    const lineMap = new Map();

    // Pre-populate active categories so tax preparers see zeroed lines or active lines cleanly
    categories.forEach((cat) => {
      lineMap.set(cat.id, {
        ...cat,
        grossTotal: 0,
        deductibleTotal: 0,
        txCount: 0,
      });
    });

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      const cat = tx.schedule_c_categories;
      if (!cat) return;

      const existing = lineMap.get(cat.id) || {
        ...cat,
        grossTotal: 0,
        deductibleTotal: 0,
        txCount: 0,
      };

      existing.grossTotal += amt;
      existing.txCount += 1;

      if (tx.type === 'income') {
        if (cat.line_number === 'Line 2') {
          returnsAndAllowances += amt;
        } else {
          grossIncome += amt;
        }
      } else {
        const rate = Number(cat.deduction_rate ?? 100) / 100;
        const deductibleAmt = amt * rate;
        existing.deductibleTotal += deductibleAmt;
        totalGrossExpenses += amt;
        totalDeductibleExpenses += deductibleAmt;
      }

      lineMap.set(cat.id, existing);
    });

    const netIncome = grossIncome - returnsAndAllowances;
    const netProfit = netIncome - totalDeductibleExpenses;

    const allLines = Array.from(lineMap.values()).sort((a, b) => a.sort_order - b.sort_order);
    const incomeLines = allLines.filter((l) => l.type === 'income');
    const expenseLines = allLines.filter((l) => l.type === 'expense');

    return {
      grossIncome,
      returnsAndAllowances,
      netIncome,
      totalGrossExpenses,
      totalDeductibleExpenses,
      netProfit,
      incomeLines,
      expenseLines,
    };
  }, [transactions, categories]);

  // Export Schedule C CSV for Tax Preparer
  const handleExportScheduleCCsv = () => {
    const rows = [
      ['Tax Year', 'Part', 'Schedule C Line', 'Category', 'Transactions', 'Gross Amount', 'Deduction Rate', 'Allowable Amount'],
      ...scheduleCSummary.incomeLines.map((l) => [
        selectedYear,
        'Part I - Income',
        l.line_number,
        `"${l.name}"`,
        l.txCount,
        l.grossTotal.toFixed(2),
        '100%',
        l.grossTotal.toFixed(2),
      ]),
      ...scheduleCSummary.expenseLines.map((l) => [
        selectedYear,
        'Part II - Expenses',
        l.line_number,
        `"${l.name}"`,
        l.txCount,
        l.grossTotal.toFixed(2),
        `${l.deduction_rate}%`,
        l.deductibleTotal.toFixed(2),
      ]),
      [],
      ['Summary', '', '', 'Net Business Income (Part I)', '', '', '', scheduleCSummary.netIncome.toFixed(2)],
      ['Summary', '', '', 'Total Deductible Expenses (Part II)', '', '', '', scheduleCSummary.totalDeductibleExpenses.toFixed(2)],
      ['Summary', '', '', 'Estimated Net Profit / (Loss) (Line 31)', '', '', '', scheduleCSummary.netProfit.toFixed(2)],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((r) => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const safeLabel = targetUserName ? targetUserName.replace(/[^a-z0-9]/gi, '_') : 'Client';
    link.setAttribute('download', `Schedule_C_${safeLabel}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const availableFormCategories = categories.filter((c) => c.type === formData.type);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Read-Only Tax Preparer Banner */}
      {readOnly && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <Eye className="w-5 h-5 text-blue-600 shrink-0" />
            <span>
              Tax Preparer Inspection Mode: Viewing{' '}
              <strong>{targetUserName || 'Client'}</strong>&apos;s {selectedYear} Ledger (Read-Only)
            </span>
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {statusMessage && (
        <div
          className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Top Controls: Tax Year Selector, View Switcher, & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500" />
            <label htmlFor="tax-year-select" className="text-xs font-semibold text-slate-600">
              Tax Year:
            </label>
            <select
              id="tax-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              {yearOptions.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSubTab('ledger')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeSubTab === 'ledger'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              Transaction Ledger
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('schedule_c')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeSubTab === 'schedule_c'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Schedule C Report
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportScheduleCCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg border border-slate-300"
          >
            <Download className="w-3.5 h-3.5" />
            Export Schedule C CSV
          </button>

          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('ledger');
                setShowAddForm((prev) => !prev);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-semibold rounded-lg shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus className="w-4 h-4" />
              {showAddForm ? 'Close Form' : 'Add Entry'}
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Net Business Income ({selectedYear})</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(scheduleCSummary.netIncome)}
          </div>
          <p className="mt-1 text-xs text-slate-500">Schedule C Part I (Lines 1–7)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Deductible Expenses ({selectedYear})</span>
            <TrendingDown className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(scheduleCSummary.totalDeductibleExpenses)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Gross Spend: {formatCurrency(scheduleCSummary.totalGrossExpenses)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Est. Net Profit / Loss (Line 31)</span>
            <DollarSign className="w-4 h-4 text-slate-700" />
          </div>
          <div
            className={`mt-2 text-2xl font-bold ${
              scheduleCSummary.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {formatCurrency(scheduleCSummary.netProfit)}
          </div>
          <p className="mt-1 text-xs text-slate-500">Taxable Schedule C Net Earnings</p>
        </div>
      </div>

      {/* Add Transaction Form */}
      {!readOnly && showAddForm && (
        <form
          onSubmit={handleAddTransaction}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Record Income or Business Expense
            </h3>
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => handleFormTypeChange('expense')}
                className={`px-3 py-1 rounded-md text-xs font-semibold ${
                  formData.type === 'expense'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => handleFormTypeChange('income')}
                className={`px-3 py-1 rounded-md text-xs font-semibold ${
                  formData.type === 'income'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {formData.type === 'income' ? 'Client / Payer *' : 'Vendor / Merchant *'}
              </label>
              <input
                type="text"
                required
                placeholder={formData.type === 'income' ? 'Acme Corp' : 'Staples / Delta / Uber'}
                value={formData.vendor_or_client}
                onChange={(e) => setFormData({ ...formData, vendor_or_client: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Schedule C Category *
              </label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {availableFormCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.line_number} — {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business Purpose / Memo (Audit Trail)
              </label>
              <input
                type="text"
                placeholder="e.g., Client lunch meeting, Q3 software subscription, Invoice #104"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="Bank / Card">Business Bank / Card</option>
                <option value="Cash">Cash</option>
                <option value="Zelle / ACH">Zelle / ACH / Wire</option>
                <option value="Check">Check</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {saving ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      )}

      {/* VIEW 1: TRANSACTION LEDGER */}
      {activeSubTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search vendor, memo, or Schedule C line..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              {['all', 'income', 'expense'].map((filterVal) => (
                <button
                  key={filterVal}
                  type="button"
                  onClick={() => setTypeFilter(filterVal)}
                  className={`px-3 py-1.5 rounded-lg font-semibold capitalize border ${
                    typeFilter === filterVal
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {filterVal}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Vendor / Client</th>
                  <th className="py-3 px-5">Schedule C Line</th>
                  <th className="py-3 px-5 text-right">Amount</th>
                  {!readOnly && <th className="py-3 px-5 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={readOnly ? 4 : 5} className="py-10 text-center text-slate-500">
                      Loading {selectedYear} transactions...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={readOnly ? 4 : 5} className="py-10 text-center text-slate-500">
                      No transactions recorded for {selectedYear}.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-5 text-xs font-mono text-slate-600 whitespace-nowrap">
                        {tx.transaction_date}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-medium text-slate-900">{tx.vendor_or_client}</div>
                        {tx.description && (
                          <div className="text-xs text-slate-500">{tx.description}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-800">
                          {tx.schedule_c_categories?.line_number}: {tx.schedule_c_categories?.name}
                        </span>
                      </td>
                      <td
                        className={`py-3.5 px-5 text-right font-mono font-semibold whitespace-nowrap ${
                          tx.type === 'income' ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </td>
                      {!readOnly && (
                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="text-slate-400 hover:text-red-600 p-1"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: IRS SCHEDULE C TAX SUMMARY REPORT */}
      {activeSubTab === 'schedule_c' && (
        <div className="space-y-6">
          {/* Part I: Income */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">
                Schedule C — Part I: Income ({selectedYear})
              </h3>
              <span className="text-sm font-bold text-emerald-700">
                Net Income: {formatCurrency(scheduleCSummary.netIncome)}
              </span>
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50/50">
                  <th className="py-2.5 px-6 w-28">IRS Line</th>
                  <th className="py-2.5 px-6">Category</th>
                  <th className="py-2.5 px-6 text-center">Entries</th>
                  <th className="py-2.5 px-6 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {scheduleCSummary.incomeLines.map((line) => (
                  <tr key={line.id} className={line.txCount > 0 ? 'bg-white' : 'bg-slate-50/40 text-slate-400'}>
                    <td className="py-3 px-6 font-mono text-xs font-semibold">{line.line_number}</td>
                    <td className="py-3 px-6 font-medium">{line.name}</td>
                    <td className="py-3 px-6 text-center text-xs">{line.txCount}</td>
                    <td className="py-3 px-6 text-right font-mono font-semibold">
                      {formatCurrency(line.grossTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Part II: Expenses */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">
                Schedule C — Part II: Business Expenses ({selectedYear})
              </h3>
              <span className="text-sm font-bold text-slate-900">
                Allowable Deductions: {formatCurrency(scheduleCSummary.totalDeductibleExpenses)}
              </span>
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50/50">
                  <th className="py-2.5 px-6 w-28">IRS Line</th>
                  <th className="py-2.5 px-6">Expense Category</th>
                  <th className="py-2.5 px-6 text-center">Entries</th>
                  <th className="py-2.5 px-6 text-right">Gross Spend</th>
                  <th className="py-2.5 px-6 text-right">Deductible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {scheduleCSummary.expenseLines.map((line) => (
                  <tr key={line.id} className={line.txCount > 0 ? 'bg-white' : 'bg-slate-50/40 text-slate-400'}>
                    <td className="py-3 px-6 font-mono text-xs font-semibold">{line.line_number}</td>
                    <td className="py-3 px-6">
                      <div className="font-medium">{line.name}</div>
                      {Number(line.deduction_rate) < 100 && (
                        <span className="text-[11px] text-amber-700 font-medium">
                          IRS {line.deduction_rate}% deduction limit applied
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-center text-xs">{line.txCount}</td>
                    <td className="py-3 px-6 text-right font-mono text-slate-600">
                      {formatCurrency(line.grossTotal)}
                    </td>
                    <td className="py-3 px-6 text-right font-mono font-semibold">
                      {formatCurrency(line.deductibleTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
