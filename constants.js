export const INCOME_CATEGORIES = [
  'Sales Revenue',
  'Service Revenue',
  'Consulting Fees',
  'Subscription Income',
  'Project-Based Income',
  'Commissions',
  'Licensing Fees',
  'Royalty Income',
  'Rental Income',
  'Non-Operating Income',
];

export const EXPENSE_CATEGORIES = [
  'Advertising',
  'Car and truck',
  'Commissions and fees',
  'Contract labor',
  'Depletion',
  'Depreciation and section 179',
  'Employee benefit programs',
  'Insurance',
  'Interest',
  'Mortgage',
  'Legal and professional services',
  'Office expense',
  'Pension',
  'Rent and lease: Vehicle',
  'Rent and lease: Machinery',
  'Rent and lease: Equipment',
  'Repairs and maintenance',
  'Supplies',
  'Taxes and licenses',
  'Travel',
  'Deductible meals',
  'Utilities',
  'Wages',
];

export const DRAW_METHODS = [
  'Bank Transfer / ACH',
  'Check',
  'Zelle / Venmo / Cash App',
  'Cash',
  'Debit / ATM Withdrawal',
];

export const MONTHS = [
  { value: 1, label: 'Jan', full: 'January' },
  { value: 2, label: 'Feb', full: 'February' },
  { value: 3, label: 'Mar', full: 'March' },
  { value: 4, label: 'Apr', full: 'April' },
  { value: 5, label: 'May', full: 'May' },
  { value: 6, label: 'Jun', full: 'June' },
  { value: 7, label: 'Jul', full: 'July' },
  { value: 8, label: 'Aug', full: 'August' },
  { value: 9, label: 'Sep', full: 'September' },
  { value: 10, label: 'Oct', full: 'October' },
  { value: 11, label: 'Nov', full: 'November' },
  { value: 12, label: 'Dec', full: 'December' },
];

export const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
};
