// Lightweight CSV parser & date/category normalizer for spreadsheet & bank CSV imports

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current.trim());
        current = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(current.trim());
        rows.push(row);
        row = [];
        current = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(current.trim());
        rows.push(row);
        row = [];
        current = '';
      } else {
        current += ch;
      }
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell !== ''));
}

// Converts MM/DD/YYYY, M/D/YY, or YYYY-MM-DD into YYYY-MM-DD
export function normalizeDate(raw) {
  if (!raw) return null;
  const cleaned = String(raw).trim();

  // Already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // MM/DD/YYYY or M/D/YYYY or MM-DD-YYYY
  const mdy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (mdy) {
    const month = mdy[1].padStart(2, '0');
    const day = mdy[2].padStart(2, '0');
    let year = mdy[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return null;
}

// Strips $, commas, spaces, and handles parentheses ($120.50) -> 120.50
export function parseAmount(raw) {
  if (raw === null || raw === undefined) return NaN;
  let str = String(raw).trim();
  if (!str) return NaN;
  const isParenNeg = /^\(.*\)$/.test(str);
  str = str.replace(/[$,\s()]/g, '');
  let val = Number(str);
  if (isNaN(val)) return NaN;
  if (isParenNeg) val = -Math.abs(val);
  return val;
}

// Case-insensitive category matcher with fallback to defaultCategory
export function matchCategory(rawCat, validCategories, defaultCategory) {
  if (!rawCat) return defaultCategory;
  const target = String(rawCat).trim().toLowerCase();
  const exact = validCategories.find((c) => c.toLowerCase() === target);
  if (exact) return exact;
  const partial = validCategories.find(
    (c) => c.toLowerCase().includes(target) || target.includes(c.toLowerCase())
  );
  return partial || defaultCategory;
}
