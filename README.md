# Simple Bookkeeping System v2.1 — Web App

A multi-year small business bookkeeping and Schedule C reporting web application built with **React + Vite + Tailwind CSS** and backed by **Supabase (PostgreSQL + Auth)**.

Includes:
- **Dashboard & Reports** (Year, Month, and Date Range filtering, CSV export, PDF print)
- **Income & Operating Expenses** (10 Income categories + 23 IRS Schedule C categories)
- **Owner's Draw** (Non-deductible equity withdrawals tracked separately from business expenses)
- **Vehicle Information, Cost of Goods Sold, & Home Office Calculators**
- **Next Steps Checklist** & **Custom Logo Support** (`public/logo.png`)

## Upgrading an Existing Installation

1. **Run `supabase/schema.sql` in Supabase SQL Editor:**
   - Open your Supabase project → **SQL Editor**, paste the entire `supabase/schema.sql` file, and click **Run**. It safely adds the `owners_draws` table without touching your existing tables or data.
2. **Add Your Logo (Optional):**
   - Place your logo file inside `public/logo.png` (it automatically replaces the default icon in both the navbar and login page; if no `logo.png` is present, it falls back cleanly to the default icon).
3. **Upload Updated Files to GitHub:**
   - Upload the updated files to your GitHub repository—Hostinger will automatically rebuild and deploy v2.1.
