import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Car,
  Package,
  Home,
  Wallet,
  CheckSquare,
  Save,
  Eye,
  X,
  Briefcase,
  Mail,
  Copy,
  Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const DEFAULT_WORKSHEET = {
  business_name: '',
  business_activity: '',
  naics_code: '',
  vehicle_model: '',
  vehicle_type: '',
  vehicle_cost: 0,
  date_placed_in_service: '',
  business_miles: 0,
  commuting_miles: 0,
  other_miles: 0,
  available_off_duty: false,
  another_vehicle_available: true,
  has_written_evidence: true,
  cogs_beginning_inventory: 0,
  cogs_purchases: 0,
  cogs_personal_withdrawals: 0,
  cogs_labor: 0,
  cogs_materials_supplies: 0,
  cogs_other_costs: 0,
  cogs_ending_inventory: 0,
  home_office_method: 'simplified',
  home_total_sqft: 0,
  home_office_sqft: 0,
  home_mortgage_or_rent: 0,
  home_utilities: 0,
  home_insurance: 0,
  home_repairs: 0,
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
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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
    category_id: '',
    amount: '',
    vendor_or_client: '',
    description: '',
    payment_method: 'Bank / Card',
  });
  const [savingTx, setSavingTx] = useState(false);

  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvPreviewRows, setCsvPreviewRows] = useState([]);
  const [csvInvertSigns, setCsvInvertSigns] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const fileInputRef = useRef(null);

  const [copiedSummary, setCopiedSummary] = useState(false);
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
    return () => {
      isMounted = false;
    };
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
        { keywords: ['royalty', 'royalties', 'ascap', 'bmi', 'acx', '
