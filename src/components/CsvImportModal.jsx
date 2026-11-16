import React, { useState } from 'react';
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  formatCurrency,
} from '../lib/constants';
import {
  parseCSV,
  normalizeDate,
  parseAmount,
  matchCategory,
} from '../lib/csvUtils';
import { Upload, Download, X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CsvImportModal({ type, onClose, onBulkImport }) {
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const defaultCategory = type === 'income' ? 'Sales Revenue' : 'Office expense';

  const [step, setStep] = useState('upload'); // 'upload' | 'preview'
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [colMap, setColMap] = useState({
    date: 0,
    category: 1,
    description: 2,
    amount: 3,
  });
  const [previewRows, setPreviewRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleDownloadTemplate = () => {
    const sampleRows =
      type === 'income'
        ? [
            ['DATE', 'CATEGORY', 'DESCRIPTION', 'AMOUNT'],
            ['2026-01-15', 'Sales Revenue', 'Client Website Package', '1500.00'],
            ['2026-02-03', 'Consulting Fees', 'Strategy Session', '350.00'],
          ]
        : [
            ['DATE', 'CATEGORY', 'DESCRIPTION', 'AMOUNT'],
            ['2026-01-18', 'Office expense', 'Printer ink & paper', '64.99'],
            ['2026-02-10', 'Advertising', 'Social media ad campaign', '250.00'],
          ];
    const csv = sampleRows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_import_template.csv`;
    a.click();
  };

  const buildPreview = (rows, mapping) => {
    const mapped = rows.map((r, idx) => {
      const isoDate = normalizeDate(r[mapping.date]);
      const rawAmt = parseAmount(r[mapping.amount]);
      const absAmt = !isNaN(rawAmt) ? Math.abs(rawAmt) : NaN;
      const matchedCat =
        mapping.category === -1
          ? defaultCategory
          : matchCategory(r[mapping.category], categories, defaultCategory);
      const desc = mapping.description === -1 ? '' : r[mapping.description] || '';

      return {
        rowNum: idx + 2,
        include: Boolean(isoDate && !isNaN(absAmt) && absAmt > 0),
        tx_date: isoDate || '',
        category: matchedCat,
        description: desc,
        amount: !isNaN(absAmt) ? absAmt : 0,
        valid: Boolean(isoDate && !isNaN(absAmt) && absAmt > 0),
      };
    });
    setPreviewRows(mapped);
  };

  const handleFileChange = (e) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      const parsed = parseCSV(String(text || ''));
      if (parsed.length < 2) {
        setErrorMsg('The CSV file appears empty or only contains a header row.');
        return;
      }

      const headerRow = parsed[0];
      const dataRows = parsed.slice(1);
      setHeaders(headerRow);
      setRawRows(dataRows);

      // Auto-detect column indices by header names (matches Google Sheet DATE, CATEGORY, DESCRIPTION, AMOUNT)
      const lower = headerRow.map((h) => h.toLowerCase());
      const findCol = (keywords, fallback) => {
        const idx = lower.findIndex((h) => keywords.some((k) => h.includes(k)));
        return idx !== -1 ? idx : fallback;
      };

      const autoMap = {
        date: findCol(['date'], 0),
        category: findCol(['category', 'cat'], headerRow.length >= 4 ? 1 : -1),
        description: findCol(
          ['desc', 'memo', 'payee', 'merchant', 'name', 'note'],
          headerRow.length >= 4 ? 2 : 1
        ),
        amount: findCol(
          ['amount', 'total', 'debit', 'credit', 'price'],
          headerRow.length >= 4 ? 3 : 2
        ),
      };

      setColMap(autoMap);
      buildPreview(dataRows, autoMap);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (field, colIdx) => {
    const updated = { ...colMap, [field]: Number(colIdx) };
    setColMap(updated);
    buildPreview(rawRows, updated);
  };

  const updatePreviewRow = (index, field, value) => {
    setPreviewRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const updated = { ...row, [field]: value };
        const valid = Boolean(updated.tx_date && Number(updated.amount) > 0);
        return { ...updated, valid };
      })
    );
  };

  const selectedValidRows = previewRows.filter((r) => r.include && r.valid);

  const handleConfirmImport = async () => {
    if (selectedValidRows.length === 0) return;
    setImporting(true);
    const payload = selectedValidRows.map((r) => ({
      type,
      tx_date: r.tx_date,
      category: r.category,
      description: r.description,
      amount: Number(r.amount),
    }));
    await onBulkImport(payload);
    setImporting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Import {type === 'income' ? 'Income' : 'Expenses'} from CSV / Google Sheets
            </h3>
            <p className="text-xs text-slate-500">
              Export your Google Sheet tab (File → Download → CSV) or bank statement CSV and review rows before saving.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {step === 'upload' ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center bg-slate-50">
                <Upload className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-800 mb-1">
                  Select a CSV file to import
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Supports your Google Sheet columns (DATE, CATEGORY, DESCRIPTION, AMOUNT) or standard bank CSV exports.
                </p>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg cursor-pointer transition">
                  <Upload className="w-4 h-4" />
                  Choose CSV File
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between bg-slate-100 p-4 rounded-xl">
                <div className="text-xs text-slate-600">
                  <span className="font-bold text-slate-800">Need a clean starting file?</span>{' '}
                  Download a sample CSV template formatted for {type}.
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Template
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Column Mapping Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Date Column
                  </label>
                  <select
                    value={colMap.date}
                    onChange={(e) => handleMappingChange('date', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        {h || `Column ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Category Column
                  </label>
                  <select
                    value={colMap.category}
                    onChange={(e) => handleMappingChange('category', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value={-1}>-- Use Default ({defaultCategory}) --</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        {h || `Column ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Description Column
                  </label>
                  <select
                    value={colMap.description}
                    onChange={(e) => handleMappingChange('description', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value={-1}>-- None --</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        {h || `Column ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Amount Column
                  </label>
                  <select
                    value={colMap.amount}
                    onChange={(e) => handleMappingChange('amount', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        {h || `Column ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Editable Preview Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-80">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 sticky top-0 text-slate-600 uppercase">
                    <tr>
                      <th className="p-2 text-center">Import</th>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Category (Editable)</th>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-right">Amount ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className={!row.valid ? 'bg-rose-50/70' : 'hover:bg-slate-50'}>
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.include}
                            disabled={!row.valid}
                            onChange={(e) => updatePreviewRow(idx, 'include', e.target.checked)}
                            className="accent-emerald-600"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="date"
                            value={row.tx_date}
                            onChange={(e) => updatePreviewRow(idx, 'tx_date', e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={row.category}
                            onChange={(e) => updatePreviewRow(idx, 'category', e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                          >
                            {categories.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => updatePreviewRow(idx, 'description', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={row.amount}
                            onChange={(e) => updatePreviewRow(idx, 'amount', e.target.value)}
                            className="w-24 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-between">
          {step === 'preview' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
              >
                Choose Different File
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600">
                  Ready to import{' '}
                  <span className="font-bold text-slate-900">{selectedValidRows.length}</span> rows
                  (Total:{' '}
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(
                      selectedValidRows.reduce((s, r) => s + Number(r.amount || 0), 0)
                    )}
                  </span>
                  )
                </span>
                <button
                  type="button"
                  disabled={importing || selectedValidRows.length === 0}
                  onClick={handleConfirmImport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {importing ? 'Importing...' : `Import ${selectedValidRows.length} Entries`}
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
