import React, { useState, useMemo } from 'react';
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  MONTHS,
  formatCurrency,
} from '../lib/constants';
import {
  Printer,
  Download,
  Save,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Wallet,
} from 'lucide-react';

export default function Dashboard({
  profile,
  onSaveProfile,
  transactions,
  draws,
  vehicles,
  cogs,
  homeOffice,
  selectedYear,
  setSelectedYear,
  availableYears,
}) {
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bizName, setBizName] = useState(profile?.business_name || '');
  const [bizActivity, setBizActivity] = useState(profile?.business_activity || '');
  const [naicsCode, setNaicsCode] = useState(profile?.naics_code || '');
  const [savingProfile, setSavingProfile] = useState(false);

  React.useEffect(() => {
    setBizName(profile?.business_name || '');
    setBizActivity(profile?.business_activity || '');
    setNaicsCode(profile?.naics_code || '');
  }, [profile]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    await onSaveProfile({
      business_name: bizName,
      business_activity: bizActivity,
      naics_code: naicsCode,
    });
    setSavingProfile(false);
  };

  // Filter transactions by Year, Month, and optional Custom Date Range
  const filteredTx = useMemo(() => {
    return transactions.filter((tx) => {
      if (Number(tx.tx_year) !== Number(selectedYear)) return false;
      if (selectedMonth !== 'ALL' && Number(tx.tx_month) !== Number(selectedMonth)) {
        return false;
      }
      if (startDate && tx.tx_date < startDate) return false;
      if (endDate && tx.tx_date > endDate) return false;
      return true;
    });
  }, [transactions, selectedYear, selectedMonth, startDate, endDate]);

  // Filter Owner's Draws using the same Year, Month, and Date Range filters
  const filteredDraws = useMemo(() => {
    return (draws || []).filter((d) => {
      if (Number(d.draw_year) !== Number(selectedYear)) return false;
      if (selectedMonth !== 'ALL' && Number(d.draw_month) !== Number(selectedMonth)) {
        return false;
      }
      if (startDate && d.draw_date < startDate) return false;
      if (endDate && d.draw_date > endDate) return false;
      return true;
    });
  }, [draws, selectedYear, selectedMonth, startDate, endDate]);

  const totalOwnersDraw = useMemo(
    () => filteredDraws.reduce((sum, d) => sum + Number(d.amount), 0),
    [filteredDraws]
  );

  // Year-only transactions for the 12-month Jan-Dec table & chart
  const yearTx = useMemo(() => {
    return transactions.filter((tx) => Number(tx.tx_year) === Number(selectedYear));
  }, [transactions, selectedYear]);

  // Category totals
  const incomeByCategory = useMemo(() => {
    const map = {};
    INCOME_CATEGORIES.forEach((cat) => (map[cat] = 0));
    filteredTx
      .filter((t) => t.type === 'income')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + Number(t.amount);
      });
    return map;
  }, [filteredTx]);

  const expenseByCategory = useMemo(() => {
    const map = {};
    EXPENSE_CATEGORIES.forEach((cat) => (map[cat] = 0));
    filteredTx
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + Number(t.amount);
      });
    return map;
  }, [filteredTx]);

  const totalIncome = useMemo(
    () => Object.values(incomeByCategory).reduce((a, b) => a + b, 0),
    [incomeByCategory]
  );

  const totalExpenses = useMemo(
    () => Object.values(expenseByCategory).reduce((a, b) => a + b, 0),
    [expenseByCategory]
  );

  // COGS calculation for selected year
  const cogsTotal = useMemo(() => {
    if (!cogs) return 0;
    const beg = Number(cogs.beginning_inventory) || 0;
    const pur = Number(cogs.purchases_less_personal) || 0;
    const lab = Number(cogs.cost_of_labor) || 0;
    const mat = Number(cogs.materials_supplies) || 0;
    const oth = Number(cogs.other_costs) || 0;
    const end = Number(cogs.ending_inventory) || 0;
    return Math.max(0, beg + pur + lab + mat + oth - end);
  }, [cogs]);

  // Home Office deduction for selected year
  const homeOfficeDeduction = useMemo(() => {
    if (!homeOffice) return 0;
    const totalSq = Number(homeOffice.total_home_sqft) || 0;
    const bizSq = Number(homeOffice.business_area_sqft) || 0;
    if (homeOffice.calculation_method === 'Actual') {
      const pct = totalSq > 0 ? bizSq / totalSq : 0;
      const indirect = (Number(homeOffice.indirect_expenses) || 0) * pct;
      const direct = Number(homeOffice.direct_expenses) || 0;
      return indirect + direct;
    }
    const capped = Math.min(bizSq, 300);
    return capped * 5;
  }, [homeOffice]);

  const grossProfit = totalIncome - (selectedMonth === 'ALL' && !startDate && !endDate ? cogsTotal : 0);
  const netProfit =
    grossProfit -
    totalExpenses -
    (selectedMonth === 'ALL' && !startDate && !endDate ? homeOfficeDeduction : 0);

  // Monthly breakdown (Jan - Dec)
  const monthlyBreakdown = useMemo(() => {
    return MONTHS.map((m) => {
      const mTx = yearTx.filter((t) => Number(t.tx_month) === m.value);
      const inc = mTx
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + Number(t.amount), 0);
      const exp = mTx
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + Number(t.amount), 0);
      return {
        ...m,
        income: inc,
        expenses: exp,
        profit: inc - exp,
      };
    });
  }, [yearTx]);

  const maxMonthVal = useMemo(() => {
    const vals = monthlyBreakdown.flatMap((m) => [m.income, m.expenses]);
    return Math.max(...vals, 100);
  }, [monthlyBreakdown]);

  // Export CSV Report
  const handleExportCSV = () => {
    const rows = [
      ['SIMPLE BOOKKEEPING SYSTEM - FINANCIAL REPORT'],
      ['Business Name', bizName || 'N/A'],
      ['Business Activity', bizActivity || 'N/A'],
      ['NAICS Code', naicsCode || 'N/A'],
      ['Report Year', selectedYear],
      [
        'Month Filter',
        selectedMonth === 'ALL'
          ? 'Full Year'
          : MONTHS.find((m) => m.value === Number(selectedMonth))?.full,
      ],
      [
        'Date Range Filter',
        startDate || endDate ? `${startDate || 'Start'} to ${endDate || 'End'}` : 'None',
      ],
      [],
      ['SCHEDULE C PROFIT & LOSS SUMMARY'],
      ['Total Income', totalIncome.toFixed(2)],
      ['Cost of Goods Sold (Annual)', cogsTotal.toFixed(2)],
      ['Total Operating Expenses', totalExpenses.toFixed(2)],
      ['Home Office Deduction (Annual)', homeOfficeDeduction.toFixed(2)],
      ['Taxable Net Profit / (Loss)', netProfit.toFixed(2)],
      [],
      ['EQUITY / NON-DEDUCTIBLE WITHDRAWALS'],
      ["Owner's Draw (Not a Schedule C Expense)", totalOwnersDraw.toFixed(2)],
      ['Net Cash Retained After Draw', (netProfit - totalOwnersDraw).toFixed(2)],
      [],
      ['INCOME BY CATEGORY', 'TOTAL'],
      ...INCOME_CATEGORIES.map((c) => [c, incomeByCategory[c].toFixed(2)]),
      [],
      ['EXPENSES BY CATEGORY', 'TOTAL'],
      ...EXPENSE_CATEGORIES.map((c) => [c, expenseByCategory[c].toFixed(2)]),
      [],
      ['TRANSACTION LEDGER'],
      ['Date', 'Type', 'Category', 'Description', 'Amount'],
      ...filteredTx.map((t) => [
        t.tx_date,
        t.type.toUpperCase(),
        t.category,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        Number(t.amount).toFixed(2),
      ]),
      [],
      ["OWNER'S DRAW LEDGER"],
      ['Date', 'Method', 'Memo', 'Amount'],
      ...filteredDraws.map((d) => [
        d.draw_date,
        d.payment_method,
        `"${(d.description || '').replace(/"/g, '""')}"`,
        Number(d.amount).toFixed(2),
      ]),
    ];

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bookkeeping_Report_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Business Header & Report Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Financial Dashboard & Tax Report</h2>
            <p className="text-sm text-slate-500">
              Filter by year, month, or custom date range and export or print your Schedule C summary.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition"
            >
              <Download className="w-4 h-4" />
              Export CSV Report
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* Business Metadata Form */}
        <form onSubmit={handleProfileSave} className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-5">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Business Name
            </label>
            <input
              type="text"
              value={bizName}
              onChange={(e) => setBizName(e.target.value)}
              placeholder="e.g., Acme Consulting LLC"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Business Activity
            </label>
            <input
              type="text"
              value={bizActivity}
              onChange={(e) => setBizActivity(e.target.value)}
              placeholder="e.g., Tax & Accounting Services"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              NAICS Code
            </label>
            <input
              type="text"
              value={naicsCode}
              onChange={(e) => setNaicsCode(e.target.value)}
              placeholder="e.g., 541213"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex items-end no-print">
            <button
              type="submit"
              disabled={savingProfile}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-sm rounded-lg border border-slate-300 transition"
            >
              <Save className="w-4 h-4" />
              {savingProfile ? 'Saving...' : 'Save Business Info'}
            </button>
          </div>
        </form>
      </div>

      {/* Report Filter Bar (Year, Month, Date Range) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Select Year
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold bg-emerald-50 text-emerald-900"
          >
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Select Month
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="ALL">All Months (Full Year)</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.full}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            From Date (Optional)
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            To Date (Optional)
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        {(selectedMonth !== 'ALL' || startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setSelectedMonth('ALL');
              setStartDate('');
              setEndDate('');
            }}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 underline no-print"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* KPI Summary Cards (5 Cards including Non-Deductible Owner's Draw) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Gross Income</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totalIncome)}</p>
          <p className="text-xs text-slate-400 mt-1">
            {filteredTx.filter((t) => t.type === 'income').length} entries
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Operating Expenses</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totalExpenses)}</p>
          <p className="text-xs text-slate-400 mt-1">
            {filteredTx.filter((t) => t.type === 'expense').length} entries
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>COGS & Home Office</span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(cogsTotal + homeOfficeDeduction)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            COGS: {formatCurrency(cogsTotal)} | Office: {formatCurrency(homeOfficeDeduction)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Net Profit (Schedule C)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p
            className={`text-2xl font-bold mt-2 ${
              netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatCurrency(netProfit)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {selectedMonth === 'ALL' && !startDate && !endDate
              ? 'Includes annual COGS & Home Office'
              : 'Filtered period cashflow'}
          </p>
        </div>

        <div className="bg-indigo-50/70 rounded-xl border border-indigo-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-indigo-700 text-xs font-semibold uppercase">
            <span>Owner's Draw</span>
            <Wallet className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-900 mt-2">
            {formatCurrency(totalOwnersDraw)}
          </p>
          <p className="text-xs text-indigo-600 mt-1">
            {filteredDraws.length} draws (Non-deductible)
          </p>
        </div>
      </div>

      {/* Monthly Visual Chart + Jan-Dec Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">{selectedYear} Monthly Income vs. Expenses</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-rose-400 inline-block" /> Expenses
              </span>
            </div>
          </div>

          <div className="h-64 flex items-end gap-2 pt-6 border-b border-slate-200">
            {monthlyBreakdown.map((m) => {
              const incHeight = Math.round((m.income / maxMonthVal) * 100);
              const expHeight = Math.round((m.expenses / maxMonthVal) * 100);
              return (
                <div
                  key={m.value}
                  className="flex-1 flex flex-col items-center h-full justify-end group"
                >
                  <div className="w-full flex items-end justify-center gap-1 h-52">
                    <div
                      style={{ height: `${Math.max(incHeight, m.income > 0 ? 4 : 0)}%` }}
                      title={`${m.full} Income: ${formatCurrency(m.income)}`}
                      className="w-2.5 sm:w-3.5 bg-emerald-500 rounded-t transition-all"
                    />
                    <div
                      style={{ height: `${Math.max(expHeight, m.expenses > 0 ? 4 : 0)}%` }}
                      title={`${m.full} Expenses: ${formatCurrency(m.expenses)}`}
                      className="w-2.5 sm:w-3.5 bg-rose-400 rounded-t transition-all"
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 mt-2">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-x-auto">
          <h3 className="font-bold text-slate-800 mb-3">{selectedYear} Monthly Breakdown</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase">
                <th className="py-2 text-left">Month</th>
                <th className="py-2 text-right">Income</th>
                <th className="py-2 text-right">Expenses</th>
                <th className="py-2 text-right">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyBreakdown.map((m) => (
                <tr key={m.value} className="hover:bg-slate-50">
                  <td className="py-1.5 font-medium text-slate-700">{m.label}</td>
                  <td className="py-1.5 text-right text-slate-600">{formatCurrency(m.income)}</td>
                  <td className="py-1.5 text-right text-slate-600">{formatCurrency(m.expenses)}</td>
                  <td
                    className={`py-1.5 text-right font-semibold ${
                      m.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatCurrency(m.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-3">Income by Category</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                <th className="py-2 text-left">Income Category</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {INCOME_CATEGORIES.map((cat) => (
                <tr key={cat}>
                  <td className="py-2 text-slate-700">{cat}</td>
                  <td className="py-2 text-right font-medium text-slate-900">
                    {formatCurrency(incomeByCategory[cat])}
                  </td>
                </tr>
              ))}
              <tr className="bg-emerald-50 font-bold">
                <td className="py-2.5 px-2 text-emerald-900">Total Gross Income</td>
                <td className="py-2.5 px-2 text-right text-emerald-900">
                  {formatCurrency(totalIncome)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-3">Expenses by Schedule C Category</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                <th className="py-2 text-left">Expense Category</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {EXPENSE_CATEGORIES.map((cat) => (
                <tr key={cat}>
                  <td className="py-2 text-slate-700">{cat}</td>
                  <td className="py-2 text-right font-medium text-slate-900">
                    {formatCurrency(expenseByCategory[cat])}
                  </td>
                </tr>
              ))}
              <tr className="bg-rose-50 font-bold">
                <td className="py-2.5 px-2 text-rose-900">Total Operating Expenses</td>
                <td className="py-2.5 px-2 text-right text-rose-900">
                  {formatCurrency(totalExpenses)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Owner's Draw Summary Section in Report */}
      {filteredDraws.length > 0 && (
        <div className="bg-white rounded-xl border border-indigo-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="font-bold text-slate-800">
                {selectedYear} Owner's Draw Summary (Equity Withdrawals)
              </h3>
              <p className="text-xs text-slate-500">
                Informational equity record only — excluded from Schedule C deductible expenses.
              </p>
            </div>
            <div className="text-sm font-bold text-indigo-700">
              Total Draws: {formatCurrency(totalOwnersDraw)}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                  <th className="py-2 text-left">Date</th>
                  <th className="py-2 text-left">Payment Method</th>
                  <th className="py-2 text-left">Memo</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDraws.map((d) => (
                  <tr key={d.id}>
                    <td className="py-2 text-slate-700">{d.draw_date}</td>
                    <td className="py-2 text-slate-600">{d.payment_method}</td>
                    <td className="py-2 text-slate-600">{d.description || '—'}</td>
                    <td className="py-2 text-right font-semibold text-indigo-700">
                      {formatCurrency(d.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vehicle Summary in Report if vehicles exist for the year */}
      {vehicles.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-3">{selectedYear} Vehicle Mileage Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                  <th className="py-2 text-left">Vehicle</th>
                  <th className="py-2 text-left">In Service</th>
                  <th className="py-2 text-right">Business Mi</th>
                  <th className="py-2 text-right">Commuting Mi</th>
                  <th className="py-2 text-right">Other Mi</th>
                  <th className="py-2 text-right">Business Use %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((v) => {
                  const totalMi =
                    Number(v.business_miles) + Number(v.commuting_miles) + Number(v.other_miles);
                  const pct =
                    totalMi > 0 ? ((Number(v.business_miles) / totalMi) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={v.id}>
                      <td className="py-2 font-medium text-slate-800">
                        {v.vehicle_model || 'Vehicle'}
                      </td>
                      <td className="py-2 text-slate-600">{v.date_in_service || '—'}</td>
                      <td className="py-2 text-right">
                        {Number(v.business_miles).toLocaleString()}
                      </td>
                      <td className="py-2 text-right">
                        {Number(v.commuting_miles).toLocaleString()}
                      </td>
                      <td className="py-2 text-right">{Number(v.other_miles).toLocaleString()}</td>
                      <td className="py-2 text-right font-semibold text-emerald-600">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
