import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Trash2, Download, Upload, FileSpreadsheet, TrendingUp, TrendingDown,
  CheckCircle2, AlertCircle, Calendar, Car, Package, Home, Wallet,
  CheckSquare, Save, Eye, X, Briefcase, Mail,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const DEFAULT_WORKSHEET = {
  business_name: '', business_activity: '', naics_code: '',
  vehicle_model: '', vehicle_type: '', vehicle_cost: 0, date_placed_in_service: '',
  business_miles: 0, commuting_miles: 0, other_miles: 0,
  available_off_duty: false, another_vehicle_available: true, has_written_evidence: true,
  cogs_beginning_inventory: 0, cogs_purchases: 0, cogs_personal_withdrawals: 0,
  cogs_labor: 0, cogs_materials_supplies: 0, cogs_other_costs: 0, cogs_ending_inventory: 0,
  home_office_method: 'simplified', home_total_sqft: 0, home_office_sqft: 0,
  home_mortgage_or_rent: 0, home_utilities: 0, home_insurance: 0, home_repairs: 0,
  next_steps_completed: {},
};

const NEXT_STEPS_LIST = [
  { id: 'profile', title: 'Complete Business Profile & NAICS Code', desc: 'Enter your legal business name, business activity, and 6-digit NAICS code.' },
  { id: 'income', title: 'Record All Gross Income & 1099s', desc: 'Log all client payments, Stripe/Square payouts, and 1099-NEC/1099-K income.' },
  { id: 'expenses', title: 'Categorize Operating Expenses', desc: 'Match every bank and business card charge to an IRS Schedule C expense line.' },
  { id: 'vehicle', title: 'Log Business Mileage & Vehicle Details', desc: 'Enter business, commuting, and personal miles plus date placed in service.' },
  { id: 'cogs_home', title: 'Review Cost of Goods Sold & Home Office', desc: 'Update inventory totals (if selling products) and home office square footage.' },
  { id: 'draws', title: 'Verify Owner’s Draws', desc: 'Ensure personal transfers are logged under Owner’s Draw and excluded from expenses.' },
  { id: 'export', title: 'Export Schedule C Report & Email Tax Office', desc: 'Download your Schedule C CSV summary and notify your tax preparer for review.' },
];

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeCsvDate(rawDate) {
  if (!rawDate) return null;
  const cleaned = rawDate.replace(/"/g, '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  const slashMatch = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const day = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3];
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(cleaned);
  return !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : null;
}

export default function BookkeepingLedger({
  targetUserId,
  targetUserName = null,
  readOnly = false,
  primaryColor = '#059669',
  supportEmail = '',
  officeName = 'Tax Office',
}) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState('income');

  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [worksheet, setWorksheet] = useState(DEFAULT_WORKSHEET);
  const [loading, setLoading] = useState(true);
  const [savingWorksheet, setSavingWorksheet] = useState(false);

  const [txForm, setTxForm] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    category_id: '', amount: '', vendor_or_client: '', description: '', payment_method: 'Bank / Card',
  });
  const [savingTx, setSavingTx] = useState(false);

  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvPreviewRows, setCsvPreviewRows] = useState([]);
  const [csvInvertSigns, setCsvInvertSigns] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const fileInputRef = useRef(null);

  const [statusMessage, setStatusMessage] = useState(null);

  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = currentYear; y >= currentYear - 4; y--) years.push(y);
    return years;
  }, [currentYear]);

  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      const { data, error } = await supabase
        .from('schedule_c_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (!error && data && isMounted) setCategories(data);
    }
    loadCategories();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (activeTab === 'income') {
      const firstInc = categories.find((c) => c.type === 'income');
      setTxForm((prev) => ({ ...prev, category_id: firstInc ? firstInc.id : '' }));
    } else if (activeTab === 'expenses') {
      const firstExp = categories.find((c) => c.type === 'expense');
      setTxForm((prev) => ({ ...prev, category_id: firstExp ? firstExp.id : '' }));
    } else if (activeTab === 'owners_draw') {
      setTxForm((prev) => ({ ...prev, category_id: '' }));
    }
  }, [activeTab, categories]);

  useEffect(() => {
    if (targetUserId) loadYearData();
  }, [targetUserId, selectedYear]);

  const loadYearData = async () => {
    setLoading(true);
    try {
      const [txRes, wsRes] = await Promise.all([
        supabase
          .from('bookkeeping_transactions')
          .select(`
            id, user_id, category_id, tax_year, transaction_date, type, amount,
            vendor_or_client, description, payment_method,
            schedule_c_categories (id, line_number, name, type, deduction_rate, sort_order)
          `)
          .eq('user_id', targetUserId)
          .eq('tax_year', selectedYear)
          .order('transaction_date', { ascending: false }),
        supabase
          .from('schedule_c_worksheets')
          .select('*')
          .eq('user_id', targetUserId)
          .eq('tax_year', selectedYear)
          .maybeSingle(),
      ]);

      if (txRes.error) throw txRes.error;
      setTransactions(txRes.data || []);

      if (!wsRes.error && wsRes.data) {
        setWorksheet({
          ...DEFAULT_WORKSHEET,
          ...wsRes.data,
          date_placed_in_service: wsRes.data.date_placed_in_service || '',
          next_steps_completed: wsRes.data.next_steps_completed || {},
        });
      } else {
        setWorksheet(DEFAULT_WORKSHEET);
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed to load ${selectedYear} records: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const suggestCategory = (descriptionText, txType) => {
    const matchingTypeCats = categories.filter((c) => c.type === txType);
    if (matchingTypeCats.length === 0) return '';
    const text = (descriptionText || '').toLowerCase();

    if (txType === 'income') {
      const incomeRules = [
        { keywords: ['consult', 'advisory', 'retainer', 'strategy'], name: 'Consulting Fees' },
        { keywords: ['subscription', 'membership', 'monthly plan', 'saas'], name: 'Subscription Income' },
        { keywords: ['commission', 'affiliate', 'referral'], name: 'Commissions' },
        { keywords: ['royalty', 'royalties', 'ascap', 'bmi', 'acx', 'ingram'], name: 'Royalty Income' },
        { keywords: ['rental', 'lease income'], name: 'Rental Income' },
        { keywords: ['service', 'labor', 'client payment', 'invoice'], name: 'Service Revenue' },
        { keywords: ['project', 'milestone', 'contract'], name: 'Project-Based Income' },
        { keywords: ['license', 'licensing'], name: 'Licensing Fees' },
        { keywords: ['interest', 'rebate', 'grant', 'dividend'], name: 'Non-Operating Income' },
      ];
      for (const rule of incomeRules) {
        if (rule.keywords.some((kw) => text.includes(kw))) {
          const matched = matchingTypeCats.find((c) => c.name === rule.name);
          if (matched) return matched.id;
        }
      }
      const defaultSales =
        matchingTypeCats.find((c) => c.name === 'Sales Revenue') ||
        matchingTypeCats.find((c) => c.line_number === 'Line 1');
      return defaultSales ? defaultSales.id : matchingTypeCats[0].id;
    }

    const expenseRules = [
      { keywords: ['facebook ads', 'meta ads', 'google ads', 'vistaprint', 'mailchimp'], line: 'Line 8' },
      { keywords: ['shell', 'chevron', 'exxon', 'bp ', 'autozone', 'oreilly', 'jiffy lube', 'parking'], line: 'Line 9' },
      { keywords: ['stripe fee', 'square fee', 'paypal fee', 'merchant fee'], line: 'Line 10' },
      { keywords: ['upwork', 'fiverr', 'contractor', 'subcontractor'], line: 'Line 11' },
      { keywords: ['geico', 'state farm', 'progressive', 'hiscox', 'liability ins'], line: 'Line 15' },
      { keywords: ['attorney', 'legal', 'cpa', 'tax prep', 'accounting', 'quickbooks'], line: 'Line 17' },
      { keywords: ['staples', 'office depot', 'adobe', 'microsoft', 'zoom', 'canva', 'hostinger', 'supabase'], line: 'Line 18' },
      { keywords: ['wework', 'regus', 'storage', 'rent', 'lease'], line: 'Line 20b' },
      { keywords: ['home depot', 'lowes', 'repair', 'maintenance'], line: 'Line 21' },
      { keywords: ['uline', 'amazon', 'walmart', 'target', 'supplies'], line: 'Line 22' },
      { keywords: ['secretary of state', 'license', 'permit', 'annual registration'], line: 'Line 23' },
      { keywords: ['delta', 'american airlines', 'united', 'marriott', 'hilton', 'airbnb', 'uber', 'lyft'], line: 'Line 24a' },
      { keywords: ['restaurant', 'cafe', 'coffee', 'starbucks', 'chick-fil-a', 'chipotle', 'grill', 'bistro'], line: 'Line 24b' },
      { keywords: ['comcast', 'xfinity', 'verizon', 'at&t', 't-mobile', 'internet', 'electric', 'water'], line: 'Line 25' },
    ];
    for (const rule of expenseRules) {
      if (rule.keywords.some((kw) => text.includes(kw))) {
        const matched = matchingTypeCats.find((c) => c.line_number === rule.line);
        if (matched) return matched.id;
      }
    }
    const fallbackOther = matchingTypeCats.find((c) => c.line_number === 'Line 27a');
    return fallbackOther ? fallbackOther.id : matchingTypeCats[0].id;
  };

  const handleCsvFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const rawText = event.target?.result || '';
      const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length < 2) {
        setStatusMessage({ type: 'error', text: 'CSV file must include a header row and at least one transaction.' });
        return;
      }

      const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
      const dateIdx = headers.findIndex((h) => h.includes('date'));
      const descIdx = headers.findIndex((h) =>
        h.includes('description') || h.includes('memo') || h.includes('payee') || h.includes('merchant') || h.includes('name')
      );
      const amountIdx = headers.findIndex((h) => h === 'amount' || h.includes('amount'));
      const debitIdx = headers.findIndex((h) => h.includes('debit') || h.includes('withdrawal') || h.includes('outflow'));
      const creditIdx = headers.findIndex((h) => h.includes('credit') || h.includes('deposit') || h.includes('inflow'));

      if (dateIdx === -1 || (amountIdx === -1 && debitIdx === -1 && creditIdx === -1)) {
        setStatusMessage({ type: 'error', text: 'Could not detect Date and Amount/Debit/Credit columns in this CSV file.' });
        return;
      }

      const parsedRows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const normalizedDate = normalizeCsvDate(cols[dateIdx]);
        if (!normalizedDate) continue;

        const vendorText = descIdx !== -1 && cols[descIdx] ? cols[descIdx].replace(/\s+/g, ' ').trim() : 'Bank CSV Entry';
        let rawNum = 0;
        let detectedType = 'expense';

        if (debitIdx !== -1 || creditIdx !== -1) {
          const debitVal = parseFloat((cols[debitIdx] || '0').replace(/[^0-9.-]/g, '')) || 0;
          const creditVal = parseFloat((cols[creditIdx] || '0').replace(/[^0-9.-]/g, '')) || 0;
          if (creditVal > 0 && debitVal === 0) {
            rawNum = creditVal;
            detectedType = 'income';
          } else if (debitVal !== 0) {
            rawNum = Math.abs(debitVal);
            detectedType = 'expense';
          }
        } else if (amountIdx !== -1) {
          const amtStr = (cols[amountIdx] || '0').replace(/[$,\s]/g, '');
          const isParenNeg = /^\(.*\)$/.test(amtStr);
          const cleanedNum = parseFloat(amtStr.replace(/[()]/g, '')) || 0;
          const signedNum = isParenNeg ? -Math.abs(cleanedNum) : cleanedNum;
          if (signedNum === 0) continue;
          detectedType = signedNum < 0 ? 'expense' : 'income';
          rawNum = Math.abs(signedNum);
        }

        if (rawNum <= 0) continue;
        parsedRows.push({
          rowId: `csv_${i}_${Date.now()}`,
          selected: true,
          transaction_date: normalizedDate,
          vendor_or_client: vendorText.slice(0, 120),
          type: detectedType,
          amount: rawNum,
          category_id: suggestCategory(vendorText, detectedType),
        });
      }

      if (parsedRows.length === 0) {
        setStatusMessage({ type: 'error', text: 'No valid transaction rows could be parsed from that CSV.' });
        return;
      }
      setCsvInvertSigns(false);
      setCsvPreviewRows(parsedRows);
      setShowCsvModal(true);
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const handleToggleInvertCsvSigns = () => {
    setCsvInvertSigns((prev) => !prev);
    setCsvPreviewRows((prev) =>
      prev.map((row) => {
        const flippedType = row.type === 'expense' ? 'income' : 'expense';
        return { ...row, type: flippedType, category_id: suggestCategory(row.vendor_or_client, flippedType) };
      })
    );
  };

  const handleCommitCsvImport = async () => {
    if (readOnly) return;
    const rowsToImport = csvPreviewRows.filter((r) => r.selected && r.amount > 0);
    if (rowsToImport.length === 0) {
      setStatusMessage({ type: 'error', text: 'Select at least one row to import.' });
      return;
    }
    setImportingCsv(true);
    setStatusMessage(null);
    try {
      const payload = rowsToImport.map((r) => ({
        user_id: targetUserId,
        transaction_date: r.transaction_date,
        type: r.type,
        category_id: r.category_id || suggestCategory(r.vendor_or_client, r.type),
        amount: Number(r.amount),
        vendor_or_client: r.vendor_or_client.trim() || 'Bank Import',
        description: `Imported from ${csvFileName}`,
        payment_method: 'Bank / Card',
      }));

      const { error } = await supabase.from('bookkeeping_transactions').insert(payload);
      if (error) throw error;

      setShowCsvModal(false);
      setCsvPreviewRows([]);
      await loadYearData();
      setStatusMessage({ type: 'success', text: `Successfully imported ${payload.length} transactions from ${csvFileName}.` });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `CSV import failed: ${err.message}` });
    } finally {
      setImportingCsv(false);
    }
  };

  const handleAddEntry = async (e, entryType) => {
    e.preventDefault();
    if (readOnly) return;
    const numericAmount = parseFloat(txForm.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid dollar amount greater than 0.' });
      return;
    }
    setSavingTx(true);
    setStatusMessage(null);
    try {
      const payload = {
        user_id: targetUserId,
        transaction_date: txForm.transaction_date,
        type: entryType,
        category_id: entryType === 'owners_draw' ? null : txForm.category_id,
        amount: numericAmount,
        vendor_or_client:
          txForm.vendor_or_client.trim() || (entryType === 'owners_draw' ? 'Owner Personal Draw' : 'Unspecified'),
        description: txForm.description.trim() || null,
        payment_method: txForm.payment_method,
      };
      const { error } = await supabase.from('bookkeeping_transactions').insert(payload);
      if (error) throw error;

      const txYear = parseInt(txForm.transaction_date.split('-')[0], 10);
      if (txYear !== selectedYear) setSelectedYear(txYear);
      else await loadYearData();

      setTxForm((prev) => ({ ...prev, amount: '', vendor_or_client: '', description: '' }));
      setStatusMessage({
        type: 'success',
        text: `${entryType === 'income' ? 'Income' : entryType === 'owners_draw' ? "Owner's Draw" : 'Expense'} saved.`,
      });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Could not save entry: ${err.message}` });
    } finally {
      setSavingTx(false);
    }
  };

  const handleDeleteEntry = async (txId) => {
    if (readOnly || !window.confirm('Delete this entry?')) return;
    try {
      const { error } = await supabase.from('bookkeeping_transactions').delete().eq('id', txId);
      if (error) throw error;
      setTransactions((prev) => prev.filter((t) => t.id !== txId));
      setStatusMessage({ type: 'success', text: 'Entry deleted.' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Delete failed: ${err.message}` });
    }
  };

  const handleSaveWorksheet = async (e, customNextSteps = null) => {
    if (e) e.preventDefault();
    if (readOnly) return;
    setSavingWorksheet(true);
    setStatusMessage(null);
    try {
      const payload = {
        user_id: targetUserId,
        tax_year: selectedYear,
        business_name: worksheet.business_name,
        business_activity: worksheet.business_activity,
        naics_code: worksheet.naics_code,
        vehicle_model: worksheet.vehicle_model,
        vehicle_type: worksheet.vehicle_type,
        vehicle_cost: Number(worksheet.vehicle_cost) || 0,
        date_placed_in_service: worksheet.date_placed_in_service || null,
        business_miles: Number(worksheet.business_miles) || 0,
        commuting_miles: Number(worksheet.commuting_miles) || 0,
        other_miles: Number(worksheet.other_miles) || 0,
        available_off_duty: Boolean(worksheet.available_off_duty),
        another_vehicle_available: Boolean(worksheet.another_vehicle_available),
        has_written_evidence: Boolean(worksheet.has_written_evidence),
        cogs_beginning_inventory: Number(worksheet.cogs_beginning_inventory) || 0,
        cogs_purchases: Number(worksheet.cogs_purchases) || 0,
        cogs_personal_withdrawals: Number(worksheet.cogs_personal_withdrawals) || 0,
        cogs_labor: Number(worksheet.cogs_labor) || 0,
        cogs_materials_supplies: Number(worksheet.cogs_materials_supplies) || 0,
        cogs_other_costs: Number(worksheet.cogs_other_costs) || 0,
        cogs_ending_inventory: Number(worksheet.cogs_ending_inventory) || 0,
        home_office_method: worksheet.home_office_method,
        home_total_sqft: Number(worksheet.home_total_sqft) || 0,
        home_office_sqft: Number(worksheet.home_office_sqft) || 0,
        home_mortgage_or_rent: Number(worksheet.home_mortgage_or_rent) || 0,
        home_utilities: Number(worksheet.home_utilities) || 0,
        home_insurance: Number(worksheet.home_insurance) || 0,
        home_repairs: Number(worksheet.home_repairs) || 0,
        next_steps_completed: customNextSteps || worksheet.next_steps_completed || {},
      };

      const { error } = await supabase
        .from('schedule_c_worksheets')
        .upsert(payload, { onConflict: 'user_id,tax_year' });
      if (error) throw error;
      if (!customNextSteps) {
        setStatusMessage({ type: 'success', text: `${selectedYear} business & worksheet details saved.` });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Save failed: ${err.message}` });
    } finally {
      setSavingWorksheet(false);
    }
  };

  const handleToggleNextStep = async (stepId) => {
    if (readOnly) return;
    const updatedSteps = {
      ...(worksheet.next_steps_completed || {}),
      [stepId]: !worksheet.next_steps_completed?.[stepId],
    };
    setWorksheet((prev) => ({ ...prev, next_steps_completed: updatedSteps }));
    await handleSaveWorksheet(null, updatedSteps);
  };
  const calculations = useMemo(() => {
    const netPurchases = (Number(worksheet.cogs_purchases) || 0) - (Number(worksheet.cogs_personal_withdrawals) || 0);
    const totalGoodsAvailable =
      (Number(worksheet.cogs_beginning_inventory) || 0) + netPurchases +
      (Number(worksheet.cogs_labor) || 0) + (Number(worksheet.cogs_materials_supplies) || 0) +
      (Number(worksheet.cogs_other_costs) || 0);
    const totalCogs = Math.max(0, totalGoodsAvailable - (Number(worksheet.cogs_ending_inventory) || 0));

    const bizMiles = Number(worksheet.business_miles) || 0;
    const commMiles = Number(worksheet.commuting_miles) || 0;
    const otherMiles = Number(worksheet.other_miles) || 0;
    const totalMiles = bizMiles + commMiles + otherMiles;
    const businessUsePct = totalMiles > 0 ? (bizMiles / totalMiles) * 100 : 0;

    const officeSqft = Number(worksheet.home_office_sqft) || 0;
    const totalHomeSqft = Number(worksheet.home_total_sqft) || 0;
    let homeOfficeDeduction = 0;
    let homeBusinessPct = 0;

    if (worksheet.home_office_method === 'simplified') {
      const cappedSqft = Math.min(officeSqft, 300);
      homeOfficeDeduction = cappedSqft * 5;
      homeBusinessPct = totalHomeSqft > 0 ? (cappedSqft / totalHomeSqft) * 100 : 0;
    } else {
      homeBusinessPct = totalHomeSqft > 0 ? (officeSqft / totalHomeSqft) * 100 : 0;
      const totalHomeExpenses =
        (Number(worksheet.home_mortgage_or_rent) || 0) + (Number(worksheet.home_utilities) || 0) +
        (Number(worksheet.home_insurance) || 0) + (Number(worksheet.home_repairs) || 0);
      homeOfficeDeduction = totalHomeExpenses * (homeBusinessPct / 100);
    }

    let grossReceipts = 0;
    let returnsAndAllowances = 0;
    let totalGrossExpenses = 0;
    let totalDeductibleExpenses = 0;
    let totalOwnersDraw = 0;

    const lineMap = new Map();
    categories.forEach((cat) => {
      lineMap.set(cat.id, { ...cat, grossTotal: 0, deductibleTotal: 0, txCount: 0 });
    });

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'owners_draw') { totalOwnersDraw += amt; return; }
      const cat = tx.schedule_c_categories;
      if (!cat) return;

      const existing = lineMap.get(cat.id) || { ...cat, grossTotal: 0, deductibleTotal: 0, txCount: 0 };
      existing.grossTotal += amt;
      existing.txCount += 1;

      if (tx.type === 'income') {
        if (cat.line_number === 'Line 2') returnsAndAllowances += amt;
        else grossReceipts += amt;
      } else if (tx.type === 'expense') {
        const rate = Number(cat.deduction_rate ?? 100) / 100;
        const ded = amt * rate;
        existing.deductibleTotal += ded;
        totalGrossExpenses += amt;
        totalDeductibleExpenses += ded;
      }
      lineMap.set(cat.id, existing);
    });

    const netSales = grossReceipts - returnsAndAllowances;
    const grossProfit = netSales - totalCogs;
    const netProfit = grossProfit - totalDeductibleExpenses - homeOfficeDeduction;
    const allLines = Array.from(lineMap.values()).sort((a, b) => a.sort_order - b.sort_order);

    return {
      grossReceipts, returnsAndAllowances, netSales, totalCogs, grossProfit,
      totalGrossExpenses, totalDeductibleExpenses, homeOfficeDeduction, homeBusinessPct,
      netProfit, totalOwnersDraw, totalMiles, businessUsePct,
      incomeLines: allLines.filter((l) => l.type === 'income'),
      expenseLines: allLines.filter((l) => l.type === 'expense'),
    };
  }, [transactions, categories, worksheet]);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const handleEmailTaxOffice = () => {
    const recipient = (supportEmail || '').trim();
    const businessLabel = worksheet.business_name || targetUserName || 'Client';
    const subject = encodeURIComponent(`${selectedYear} Schedule C Bookkeeping Ready for Review - ${businessLabel}`);
    const body = encodeURIComponent(
      `Hello ${officeName || 'Tax Team'},\n\n` +
      `I have updated my ${selectedYear} bookkeeping records and Schedule C summary.\n\n` +
      `Business Name: ${worksheet.business_name || 'N/A'}\n` +
      `Business Activity: ${worksheet.business_activity || 'N/A'}\n` +
      `NAICS Code: ${worksheet.naics_code || 'N/A'}\n` +
      `Net Sales (Part I): ${formatCurrency(calculations.netSales)}\n` +
      `Total Deductible Expenses: ${formatCurrency(calculations.totalDeductibleExpenses + calculations.homeOfficeDeduction)}\n` +
      `Estimated Net Profit (Line 31): ${formatCurrency(calculations.netProfit)}\n\n` +
      `I have exported my ${selectedYear} Schedule C CSV report and am ready for your review.\n\n` +
      `Best regards,\n${targetUserName || ''}`
    );
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  };

  const handleExportCsv = () => {
    const rows = [
      ['Tax Year', selectedYear],
      ['Business Name', `"${worksheet.business_name || ''}"`],
      ['Business Activity', `"${worksheet.business_activity || ''}"`],
      ['NAICS Code', `"${worksheet.naics_code || ''}"`],
      [],
      ['Section', 'IRS Line', 'Description', 'Transactions', 'Gross Amount', 'Deduction Rate', 'Allowable Amount'],
      ...calculations.incomeLines.map((l) => ['Part I - Income', l.line_number, `"${l.name}"`, l.txCount, l.grossTotal.toFixed(2), '100%', l.grossTotal.toFixed(2)]),
      ['Part III - COGS', 'Line 4', 'Cost of Goods Sold', '', calculations.totalCogs.toFixed(2), '100%', calculations.totalCogs.toFixed(2)],
      ['Part I Summary', 'Line 7', 'Gross Profit', '', '', '', calculations.grossProfit.toFixed(2)],
      ...calculations.expenseLines.map((l) => ['Part II - Expenses', l.line_number, `"${l.name}"`, l.txCount, l.grossTotal.toFixed(2), `${l.deduction_rate}%`, l.deductibleTotal.toFixed(2)]),
      ['Home Office', 'Line 30', `Business Use of Home (${worksheet.home_office_method})`, '', '', '', calculations.homeOfficeDeduction.toFixed(2)],
      ['Net Profit', 'Line 31', 'Net Profit or (Loss)', '', '', '', calculations.netProfit.toFixed(2)],
      [],
      ['Memo / Equity', 'Non-Deductible', 'Total Owner Draws', '', calculations.totalOwnersDraw.toFixed(2), '0%', '0.00'],
      ['Part IV - Vehicle', 'Miles', `Business: ${worksheet.business_miles} | Commuting: ${worksheet.commuting_miles} | Other: ${worksheet.other_miles} (${calculations.businessUsePct.toFixed(1)}% Business)`, '', '', '', ''],
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((r) => r.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    const safeName = (worksheet.business_name || targetUserName || 'Client').replace(/[^a-z0-9]/gi, '_');
    link.setAttribute('download', `Schedule_C_Complete_${safeName}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const navTabs = [
    { id: 'income', label: 'Income', icon: TrendingUp },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown },
    { id: 'vehicle', label: 'Vehicle Info', icon: Car },
    { id: 'cogs', label: 'Cost of Goods Sold', icon: Package },
    { id: 'home_office', label: 'Home Office', icon: Home },
    { id: 'owners_draw', label: "Owner's Draw", icon: Wallet },
    { id: 'schedule_c', label: 'Schedule C & Next Steps', icon: FileSpreadsheet },
  ];

  const incomeRows = transactions.filter((t) => t.type === 'income');
  const expenseRows = transactions.filter((t) => t.type === 'expense');
  const drawRows = transactions.filter((t) => t.type === 'owners_draw');
  const selectedCsvCount = csvPreviewRows.filter((r) => r.selected).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleCsvFileSelected} className="hidden" />

      {readOnly && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-sm font-medium">
          <Eye className="w-5 h-5 text-blue-600 shrink-0" />
          <span>Tax Preparer Inspection Mode: Reviewing <strong>{targetUserName || 'Client'}</strong>&apos;s {selectedYear} Bookkeeping & Schedule C Worksheets (Read-Only)</span>
        </div>
      )}

      {statusMessage && (
        <div className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-sm ${statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Top Bar: Tax Year Selector + Import CSV + Export CSV */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-600" />
            <label htmlFor="year-picker" className="text-xs font-semibold text-slate-600">Tax Year:</label>
            <select id="year-picker" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-transparent text-sm font-bold text-slate-900 focus:outline-none cursor-pointer">
              {yearOptions.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
            </select>
          </div>
          {worksheet.business_name && <span className="hidden md:inline-block text-sm font-semibold text-slate-700">{worksheet.business_name}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {!readOnly && (
            <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 text-white text-xs font-semibold rounded-xl shadow-sm" style={{ backgroundColor: primaryColor }}>
              <Upload className="w-4 h-4" />
              Import Bank CSV
            </button>
          )}
          <button type="button" onClick={handleExportCsv} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm">
            <Download className="w-4 h-4" />
            Export {selectedYear} Schedule C CSV
          </button>
        </div>
      </div>

      {/* Persistent Business Profile Card (Schedule C Lines A, B, C) */}
      <form onSubmit={handleSaveWorksheet} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Business Information — Schedule C Header ({selectedYear})</h3>
          </div>
          {!readOnly && (
            <button type="submit" disabled={savingWorksheet} className="inline-flex items-center gap-1.5 px-4 py-1.5 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 self-start sm:self-auto" style={{ backgroundColor: primaryColor }}>
              <Save className="w-3.5 h-3.5" />
              {savingWorksheet ? 'Saving...' : 'Save Business Information'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Business Name (Line C)</label>
            <input type="text" disabled={readOnly} placeholder="e.g., Smith Consulting LLC" value={worksheet.business_name} onChange={(e) => setWorksheet({ ...worksheet, business_name: e.target.value })} className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Business Activity / Profession (Line A)</label>
            <input type="text" disabled={readOnly} placeholder="e.g., IT Consulting, Trucking, E-Commerce" value={worksheet.business_activity} onChange={(e) => setWorksheet({ ...worksheet, business_activity: e.target.value })} className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">6-Digit NAICS Code (Line B)</label>
            <input type="text" maxLength={6} disabled={readOnly} placeholder="e.g., 541611" value={worksheet.naics_code} onChange={(e) => setWorksheet({ ...worksheet, naics_code: e.target.value.replace(/[^0-9]/g, '') })} className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono disabled:bg-slate-50" />
          </div>
        </div>
      </form>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Net Sales (Part I)</div>
          <div className="mt-1.5 text-xl font-bold text-slate-900">{formatCurrency(calculations.netSales)}</div>
          <div className="mt-1 text-[11px] text-slate-500">After COGS ({formatCurrency(calculations.totalCogs)}): {formatCurrency(calculations.grossProfit)}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Deductible Expenses</div>
          <div className="mt-1.5 text-xl font-bold text-slate-900">{formatCurrency(calculations.totalDeductibleExpenses + calculations.homeOfficeDeduction)}</div>
          <div className="mt-1 text-[11px] text-slate-500">Includes Home Office: {formatCurrency(calculations.homeOfficeDeduction)}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Est. Net Profit (Line 31)</div>
          <div className={`mt-1.5 text-xl font-bold ${calculations.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(calculations.netProfit)}</div>
          <div className="mt-1 text-[11px] text-slate-500">Schedule C Taxable Net</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Owner&apos;s Draw (YTD)</div>
          <div className="mt-1.5 text-xl font-bold text-blue-700">{formatCurrency(calculations.totalOwnersDraw)}</div>
          <div className="mt-1 text-[11px] text-slate-500">Non-deductible personal draw</div>
        </div>
      </div>

      {/* 7-Module Navigation Tabs */}
      <div className="flex overflow-x-auto gap-1.5 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${isActive ? 'text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`} style={isActive ? { backgroundColor: primaryColor } : undefined}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1 & 2: INCOME & EXPENSES */}
      {(activeTab === 'income' || activeTab === 'expenses') && (
        <div className="space-y-6">
          {!readOnly && (
            <form onSubmit={(e) => handleAddEntry(e, activeTab === 'income' ? 'income' : 'expense')} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{activeTab === 'income' ? 'Enter Business Income' : 'Enter Business Expense'}</h3>
                  <p className="text-xs text-slate-500">Add a single entry below or batch-import a bank/credit card CSV statement.</p>
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm self-start sm:self-auto">
                  <Upload className="w-4 h-4" />
                  Import Bank CSV
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input type="date" required value={txForm.transaction_date} onChange={(e) => setTxForm({ ...txForm, transaction_date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{activeTab === 'income' ? 'Client / Payer *' : 'Vendor / Merchant *'}</label>
                  <input type="text" required placeholder={activeTab === 'income' ? 'Client Name / Stripe' : 'Vendor Name'} value={txForm.vendor_or_client} onChange={(e) => setTxForm({ ...txForm, vendor_or_client: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Schedule C Category *</label>
                  <select required value={txForm.category_id} onChange={(e) => setTxForm({ ...txForm, category_id: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                    {categories.filter((c) => c.type === (activeTab === 'income' ? 'income' : 'expense')).map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.line_number} — {cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount ($) *</label>
                  <input type="number" step="0.01" min="0.01" required placeholder="0.00" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Business Purpose</label>
                  <input type="text" placeholder="Invoice #, project description, or receipt note" value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div className="flex items-end">
                  <button type="submit" disabled={savingTx} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
                    <Plus className="w-4 h-4" />
                    {savingTx ? 'Saving...' : activeTab === 'income' ? 'Add Income' : 'Add Expense'}
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">{selectedYear} {activeTab === 'income' ? 'Income Ledger' : 'Expense Ledger'}</h3>
              <span className="text-sm font-bold text-slate-900">Total: {formatCurrency(activeTab === 'income' ? calculations.grossReceipts : calculations.totalGrossExpenses)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6">{activeTab === 'income' ? 'Client' : 'Vendor'}</th>
                    <th className="py-3 px-6">Schedule C Line</th>
                    <th className="py-3 px-6 text-right">Amount</th>
                    {!readOnly && <th className="py-3 px-6 text-right">Delete</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr><td colSpan={readOnly ? 4 : 5} className="py-8 text-center text-slate-500">Loading entries...</td></tr>
                  ) : (activeTab === 'income' ? incomeRows : expenseRows).length === 0 ? (
                    <tr><td colSpan={readOnly ? 4 : 5} className="py-8 text-center text-slate-500">No {activeTab} entries recorded for {selectedYear} yet.</td></tr>
                  ) : (
                    (activeTab === 'income' ? incomeRows : expenseRows).map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-6 font-mono text-xs text-slate-600">{tx.transaction_date}</td>
                        <td className="py-3.5 px-6">
                          <div className="font-medium text-slate-900">{tx.vendor_or_client}</div>
                          {tx.description && <div className="text-xs text-slate-500">{tx.description}</div>}
                        </td>
                        <td className="py-3.5 px-6 text-xs">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-medium">{tx.schedule_c_categories?.line_number}: {tx.schedule_c_categories?.name}</span>
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono font-semibold">{formatCurrency(tx.amount)}</td>
                        {!readOnly && (
                          <td className="py-3.5 px-6 text-right">
                            <button type="button" onClick={() => handleDeleteEntry(tx.id)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VEHICLE INFO */}
      {activeTab === 'vehicle' && (
        <form onSubmit={handleSaveWorksheet} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Vehicle Information — Schedule C Part IV ({selectedYear})</h3>
              <p className="text-xs text-slate-500">Required by the IRS when claiming standard mileage or actual vehicle expenses.</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-500 uppercase">Business Use %</div>
              <div className="text-xl font-bold text-emerald-700">{calculations.businessUsePct.toFixed(1)}%</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Make / Model</label>
              <input type="text" disabled={readOnly} placeholder="e.g., Chevrolet / Ford" value={worksheet.vehicle_model} onChange={(e) => setWorksheet({ ...worksheet, vehicle_model: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Year & Type</label>
              <input type="text" disabled={readOnly} placeholder="e.g., 2022 F-150 Truck" value={worksheet.vehicle_type} onChange={(e) => setWorksheet({ ...worksheet, vehicle_type: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Purchase Cost ($)</label>
              <input type="number" step="0.01" disabled={readOnly} value={worksheet.vehicle_cost} onChange={(e) => setWorksheet({ ...worksheet, vehicle_cost: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date Placed in Service</label>
              <input type="date" disabled={readOnly} value={worksheet.date_placed_in_service} onChange={(e) => setWorksheet({ ...worksheet, date_placed_in_service: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase">{selectedYear} Mileage Breakdown (Total Miles: {calculations.totalMiles.toLocaleString()})</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Business Miles</label>
                <input type="number" step="0.1" disabled={readOnly} value={worksheet.business_miles} onChange={(e) => setWorksheet({ ...worksheet, business_miles: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Commuting Miles</label>
                <input type="number" step="0.1" disabled={readOnly} value={worksheet.commuting_miles} onChange={(e) => setWorksheet({ ...worksheet, commuting_miles: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Other / Personal Miles</label>
                <input type="number" step="0.1" disabled={readOnly} value={worksheet.other_miles} onChange={(e) => setWorksheet({ ...worksheet, other_miles: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono" />
              </div>
            </div>
          </div>
          <div className="space-y-3 text-sm text-slate-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" disabled={readOnly} checked={worksheet.available_off_duty} onChange={(e) => setWorksheet({ ...worksheet, available_off_duty: e.target.checked })} className="rounded border-slate-300 text-emerald-600" />
              <span>Was your vehicle available for personal use during off-duty hours?</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" disabled={readOnly} checked={worksheet.another_vehicle_available} onChange={(e) => setWorksheet({ ...worksheet, another_vehicle_available: e.target.checked })} className="rounded border-slate-300 text-emerald-600" />
              <span>Do you (or your spouse) have another vehicle available for personal use?</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" disabled={readOnly} checked={worksheet.has_written_evidence} onChange={(e) => setWorksheet({ ...worksheet, has_written_evidence: e.target.checked })} className="rounded border-slate-300 text-emerald-600" />
              <span>Do you have written evidence (mileage log / app) to support your deduction?</span>
            </label>
          </div>
          {!readOnly && (
            <div className="pt-2 flex justify-end">
              <button type="submit" disabled={savingWorksheet} className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
                <Save className="w-4 h-4" />
                {savingWorksheet ? 'Saving...' : 'Save Vehicle Information'}
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 4: COST OF GOODS SOLD */}
      {activeTab === 'cogs' && (
        <form onSubmit={handleSaveWorksheet} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Cost of Goods Sold — Schedule C Part III ({selectedYear})</h3>
              <p className="text-xs text-slate-500">For businesses that manufacture, wholesale, or retail physical inventory.</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-500 uppercase">Total COGS (Line 4)</div>
              <div className="text-xl font-bold text-slate-900">{formatCurrency(calculations.totalCogs)}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Inventory at Beginning of Year ($)</label>
              <input type="number" step="0.01" disabled={readOnly} value={worksheet.cogs_beginning_inventory} onChange={(e) => setWorksheet({ ...worksheet, cogs_beginning_inventory: e.target.value })} className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purchases ($)</label>
              <input type="number" step="0.01" disabled={readOnly} value={worksheet.cogs_purchases} onChange={(e) => setWorksheet({ ...worksheet, cogs_purchases: e.target.value })} className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Less: Cost of Items Withdrawn for Personal Use ($)</label>
              <input type="number" step="0.01" disabled={readOnly} value={worksheet.cogs_personal_withdrawals} onChange={(e) => setWorksheet({ ...worksheet, cogs_personal_withdrawals: e.target.value })} className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cost of Labor (Exclude amounts paid to yourself) ($)</label>
              <input type="number" step="0.01" disabled={readOnly} value={worksheet.cogs_labor} onChange={(e) => setWorksheet({ ...worksheet, cogs_labor: e.target.value })} className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Materials and Supplies ($)</label>
              <input type="number" step="0.01" disabled={readOnly} value={worksheet.cogs_materials_supplies} onChange={(e) => setWorksheet({ ...worksheet, cogs_materials_supplies: e.target.value })} className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Other Costs (Freight-in, Packaging) ($)</label>
              <input type="number" step="0.01" disabled={readOnly} value={worksheet.cogs_other_costs} onChange={(e) => setWorksheet({ ...worksheet, cogs_other_costs: e.target.value })} className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Inventory at End of Year ($)</label>
              <input type="number" step="0.01" disabled={readOnly} value={worksheet.cogs_ending_inventory} onChange={(e) => setWorksheet({ ...worksheet, cogs_ending_inventory: e.target.value })} className="w-full md:w-1/2 px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono" />
            </div>
          </div>
          {!readOnly && (
            <div className="pt-2 flex justify-end">
              <button type="submit" disabled={savingWorksheet} className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
                <Save className="w-4 h-4" />
                {savingWorksheet ? 'Saving...' : 'Save Cost of Goods Sold'}
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 5: HOME OFFICE */}
      {activeTab === 'home_office' && (
        <form onSubmit={handleSaveWorksheet} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Business Use of Home — Line 30 ({selectedYear})</h3>
              <p className="text-xs text-slate-500">Space used regularly and exclusively for your business.</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-500 uppercase">Calculated Deduction</div>
              <div className="text-xl font-bold text-emerald-700">{formatCurrency(calculations.homeOfficeDeduction)}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Calculation Method</label>
              <select disabled={readOnly} value={worksheet.home_office_method} onChange={(e) => setWorksheet({ ...worksheet, home_office_method: e.target.value })} className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="simplified">Simplified Option ($5 / sq ft, max 300 sq ft)</option>
                <option value="regular">Actual Expenses (Form 8829 Percentage)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Business Office Area (Sq Ft)</label>
              <input type="number" disabled={readOnly} value={worksheet.home_office_sqft} onChange={(e) => setWorksheet({ ...worksheet, home_office_sqft: e.target.value })} className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Home Area (Sq Ft)</label>
              <input type="number" disabled={readOnly} value={worksheet.home_total_sqft} onChange={(e) => setWorksheet({ ...worksheet, home_total_sqft: e.target.value })} className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono" />
            </div>
          </div>
          {worksheet.home_office_method === 'regular' && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase">Annual Home Expenses (Business Share: {calculations.homeBusinessPct.toFixed(1)}%)</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mortgage Interest or Rent ($)</label>
                  <input type="number" step="0.01" disabled={readOnly} value={worksheet.home_mortgage_or_rent} onChange={(e) => setWorksheet({ ...worksheet, home_mortgage_or_rent: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Home Utilities ($)</label>
                  <input type="number" step="0.01" disabled={readOnly} value={worksheet.home_utilities} onChange={(e) => setWorksheet({ ...worksheet, home_utilities: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Homeowners / Renters Ins. ($)</label>
                  <input type="number" step="0.01" disabled={readOnly} value={worksheet.home_insurance} onChange={(e) => setWorksheet({ ...worksheet, home_insurance: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Home Repairs & Maint. ($)</label>
                  <input type="number" step="0.01" disabled={readOnly} value={worksheet.home_repairs} onChange={(e) => setWorksheet({ ...worksheet, home_repairs: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono" />
                </div>
              </div>
            </div>
          )}
          {!readOnly && (
            <div className="pt-2 flex justify-end">
              <button type="submit" disabled={savingWorksheet} className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
                <Save className="w-4 h-4" />
                {savingWorksheet ? 'Saving...' : 'Save Home Office'}
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 6: OWNER'S DRAW */}
      {activeTab === 'owners_draw' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs leading-relaxed">
            <strong>IRS Tax Rule:</strong> Owner&apos;s Draws are personal transfers from your business bank account to yourself. They are tracked here so your bank balance reconciles, but they are <strong>not deductible</strong> and do not reduce your Schedule C Net Profit.
          </div>
          {!readOnly && (
            <form onSubmit={(e) => handleAddEntry(e, 'owners_draw')} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Record Owner&apos;s Draw</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input type="date" required value={txForm.transaction_date} onChange={(e) => setTxForm({ ...txForm, transaction_date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient / Account</label>
                  <input type="text" placeholder="Owner Personal Transfer" value={txForm.vendor_or_client} onChange={(e) => setTxForm({ ...txForm, vendor_or_client: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount ($) *</label>
                  <input type="number" step="0.01" min="0.01" required placeholder="0.00" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono" />
                </div>
                <div className="flex items-end">
                  <button type="submit" disabled={savingTx} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
                    <Plus className="w-4 h-4" />
                    {savingTx ? 'Saving...' : 'Add Draw'}
                  </button>
                </div>
              </div>
            </form>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">{selectedYear} Owner&apos;s Draws</h3>
              <span className="text-sm font-bold text-blue-700">Total Withdrawn: {formatCurrency(calculations.totalOwnersDraw)}</span>
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Description</th>
                  <th className="py-3 px-6 text-right">Amount</th>
                  {!readOnly && <th className="py-3 px-6 text-right">Delete</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {drawRows.length === 0 ? (
                  <tr><td colSpan={readOnly ? 3 : 4} className="py-8 text-center text-slate-500">No owner&apos;s draws recorded for {selectedYear}.</td></tr>
                ) : (
                  drawRows.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-6 font-mono text-xs text-slate-600">{tx.transaction_date}</td>
                      <td className="py-3.5 px-6 font-medium text-slate-900">{tx.vendor_or_client}</td>
                      <td className="py-3.5 px-6 text-right font-mono font-semibold text-blue-700">{formatCurrency(tx.amount)}</td>
                      {!readOnly && (
                        <td className="py-3.5 px-6 text-right">
                          <button type="button" onClick={() => handleDeleteEntry(tx.id)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
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

      {/* TAB 7: SCHEDULE C REPORT & NEXT STEPS */}
      {activeTab === 'schedule_c' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">IRS Form 1040 Schedule C Summary ({selectedYear})</h3>
              <span className="text-sm font-bold text-emerald-700">Net Profit (Line 31): {formatCurrency(calculations.netProfit)}</span>
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-2.5 px-6 w-28">Line</th>
                  <th className="py-2.5 px-6">Category</th>
                  <th className="py-2.5 px-6 text-right">Gross</th>
                  <th className="py-2.5 px-6 text-right">Allowable / Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {calculations.incomeLines.map((l) => (
                  <tr key={l.id} className={l.txCount === 0 ? 'text-slate-400' : ''}>
                    <td className="py-2.5 px-6 font-mono text-xs font-semibold">{l.line_number}</td>
                    <td className="py-2.5 px-6">{l.name}</td>
                    <td className="py-2.5 px-6 text-right font-mono">{formatCurrency(l.grossTotal)}</td>
                    <td className="py-2.5 px-6 text-right font-mono font-semibold text-emerald-700">{formatCurrency(l.grossTotal)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="py-2.5 px-6 font-mono text-xs">Line 4</td>
                  <td className="py-2.5 px-6">Cost of Goods Sold (Part III)</td>
                  <td className="py-2.5 px-6 text-right font-mono">{formatCurrency(calculations.totalCogs)}</td>
                  <td className="py-2.5 px-6 text-right font-mono">-{formatCurrency(calculations.totalCogs)}</td>
                </tr>
                <tr className="bg-emerald-50/50 font-bold">
                  <td className="py-2.5 px-6 font-mono text-xs">Line 7</td>
                  <td className="py-2.5 px-6">Gross Profit</td>
                  <td className="py-2.5 px-6 text-right">—</td>
                  <td className="py-2.5 px-6 text-right font-mono">{formatCurrency(calculations.grossProfit)}</td>
                </tr>
                {calculations.expenseLines.map((l) => (
                  <tr key={l.id} className={l.txCount === 0 ? 'text-slate-400' : ''}>
                    <td className="py-2.5 px-6 font-mono text-xs font-semibold">{l.line_number}</td>
                    <td className="py-2.5 px-6">
                      {l.name} {Number(l.deduction_rate) < 100 && <span className="text-xs text-amber-700">({l.deduction_rate}% limit)</span>}
                    </td>
                    <td className="py-2.5 px-6 text-right font-mono">{formatCurrency(l.grossTotal)}</td>
                    <td className="py-2.5 px-6 text-right font-mono font-semibold">{formatCurrency(l.deductibleTotal)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="py-2.5 px-6 font-mono text-xs">Line 30</td>
                  <td className="py-2.5 px-6">Expenses for Business Use of Home</td>
                  <td className="py-2.5 px-6 text-right">—</td>
                  <td className="py-2.5 px-6 text-right font-mono">{formatCurrency(calculations.homeOfficeDeduction)}</td>
                </tr>
                <tr className="bg-slate-900 text-white font-bold">
                  <td className="py-3.5 px-6 font-mono text-xs">Line 31</td>
                  <td className="py-3.5 px-6">Net Profit or (Loss)</td>
                  <td className="py-3.5 px-6 text-right">—</td>
                  <td className="py-3.5 px-6 text-right font-mono text-base">{formatCurrency(calculations.netProfit)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-800">Next Steps: {selectedYear} Tax Filing Readiness Checklist</h3>
              </div>
              {!readOnly && (
                <button type="button" onClick={handleEmailTaxOffice} className="inline-flex items-center gap-2 px-4 py-2 text-white text-xs font-semibold rounded-xl shadow-sm self-start sm:self-auto" style={{ backgroundColor: primaryColor }}>
                  <Mail className="w-4 h-4" />
                  {supportEmail ? `Email ${officeName || 'Tax Office'}` : 'Email Tax Office'}
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-200">
              {NEXT_STEPS_LIST.map((step) => {
                const checked = Boolean(worksheet.next_steps_completed?.[step.id]);
                return (
                  <label key={step.id} className="py-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50 px-2 rounded-lg">
                    <input type="checkbox" disabled={readOnly} checked={checked} onChange={() => handleToggleNextStep(step.id)} className="mt-1 rounded border-slate-300 text-emerald-600" />
                    <div>
                      <div className={`text-sm font-semibold ${checked ? 'line-through text-slate-400' : 'text-slate-900'}`}>{step.title}</div>
                      <div className="text-xs text-slate-500">{step.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CSV BANK STATEMENT IMPORTER MODAL */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Review Bank CSV Import ({csvFileName})</h3>
                <p className="text-xs text-slate-500">Uncheck personal items and verify Schedule C categories before importing.</p>
              </div>
              <button type="button" onClick={() => setShowCsvModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setCsvPreviewRows((prev) => prev.map((r) => ({ ...r, selected: true })))} className="font-semibold text-slate-700 hover:underline">Select All</button>
                <span className="text-slate-300">|</span>
                <button type="button" onClick={() => setCsvPreviewRows((prev) => prev.map((r) => ({ ...r, selected: false })))} className="font-semibold text-slate-700 hover:underline">Deselect All</button>
              </div>
              <button type="button" onClick={handleToggleInvertCsvSigns} className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-semibold text-slate-700 hover:bg-slate-100">
                Flip Income / Expense Signs (Credit Card CSV Mode)
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-4 w-10">Import</th>
                    <th className="py-2.5 px-4 w-28">Date</th>
                    <th className="py-2.5 px-4">Vendor / Payee</th>
                    <th className="py-2.5 px-4 w-28">Type</th>
                    <th className="py-2.5 px-4 w-64">Schedule C Category</th>
                    <th className="py-2.5 px-4 text-right w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {csvPreviewRows.map((row, idx) => {
                    const rowCats = categories.filter((c) => c.type === row.type);
                    return (
                      <tr key={row.rowId} className={row.selected ? 'bg-white' : 'bg-slate-50 opacity-50'}>
                        <td className="py-2.5 px-4">
                          <input type="checkbox" checked={row.selected} onChange={(e) => { const checked = e.target.checked; setCsvPreviewRows((prev) => prev.map((r, i) => (i === idx ? { ...r, selected: checked } : r))); }} className="rounded border-slate-300 text-emerald-600" />
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-700">{row.transaction_date}</td>
                        <td className="py-2.5 px-4">
                          <input type="text" value={row.vendor_or_client} onChange={(e) => { const val = e.target.value; setCsvPreviewRows((prev) => prev.map((r, i) => (i === idx ? { ...r, vendor_or_client: val } : r))); }} className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-slate-900" />
                        </td>
                        <td className="py-2.5 px-4">
                          <select value={row.type} onChange={(e) => { const newType = e.target.value; setCsvPreviewRows((prev) => prev.map((r, i) => (i === idx ? { ...r, type: newType, category_id: suggestCategory(r.vendor_or_client, newType) } : r))); }} className={`px-2 py-1 rounded font-semibold border ${row.type === 'income' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-4">
                          <select value={row.category_id} onChange={(e) => { const catId = e.target.value; setCsvPreviewRows((prev) => prev.map((r, i) => (i === idx ? { ...r, category_id: catId } : r))); }} className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-slate-800">
                            {rowCats.map((cat) => <option key={cat.id} value={cat.id}>{cat.line_number} — {cat.name}</option>)}
                          </select>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">{formatCurrency(row.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">{selectedCsvCount} of {csvPreviewRows.length} rows selected for import</span>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setShowCsvModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900">Cancel</button>
                <button type="button" disabled={importingCsv || selectedCsvCount === 0} onClick={handleCommitCsvImport} className="inline-flex items-center gap-2 px-5 py-2 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
                  <Upload className="w-4 h-4" />
                  {importingCsv ? 'Importing...' : `Import ${selectedCsvCount} Transaction${selectedCsvCount === 1 ? '' : 's'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
