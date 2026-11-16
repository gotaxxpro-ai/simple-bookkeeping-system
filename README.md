# Simple Bookkeeping System v2.2 — Web App

Added in v2.2:
- **CSV / Spreadsheet Import (`src/components/CsvImportModal.jsx`):** Upload CSVs exported from Google Sheets or bank statements, map columns automatically, review/edit categories in a preview table, and bulk-insert into Supabase.
- **Inline Row Edit & Bulk Edit (`src/components/TransactionLedger.jsx`):** Edit any single transaction inline, or check multiple rows to bulk-change Category, bulk-update Date, or bulk-delete.

## Database Note
No new SQL changes are required if you already ran `supabase/schema.sql` from v2.1—your existing `transactions` table and Row-Level Security policies already allow bulk inserts, updates, and deletes per user.
