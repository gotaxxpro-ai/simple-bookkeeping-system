# Simple Bookkeeping System v2 — Web App

A multi-year small business bookkeeping and Schedule C reporting web application built with **React + Vite + Tailwind CSS** and backed by **Supabase (PostgreSQL + Auth)**.

Users register with their own email and password (no Google account required), enter Income, Expenses, Vehicle Mileage, Cost of Goods Sold, and Home Office data year after year, and generate printable PDF or CSV reports filtered by Year, Month, or Date Range.

---

## Step 1: Set Up the Free Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Open **SQL Editor** in the left sidebar, paste the contents of `supabase/schema.sql`, and click **Run**.
   - This creates the 5 database tables (`business_profiles`, `transactions`, `vehicles`, `cogs_records`, `home_office_records`) and enables **Row-Level Security (RLS)** so users can only view and edit their own financial records.
3. Go to **Project Settings → API** and copy:
   - **Project URL** (`VITE_SUPABASE_URL`)
   - **anon public key** (`VITE_SUPABASE_ANON_KEY`)

*(Optional)* Under **Authentication → Providers → Email**, you can toggle off "Confirm email" if you want new users to log in immediately after signing up.

---

## Step 2: Push to GitHub

1. Create a new repository on GitHub (e.g., `simple-bookkeeping-webapp`).
2. Extract this ZIP and push all files to your repository:
   ```bash
   git init
   git add .
   git commit -m "Initial Simple Bookkeeping System v2 web app"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/simple-bookkeeping-webapp.git
   git push -u origin main
   ```

---

## Step 3: Deploy on Hostinger from GitHub

1. Log in to **Hostinger hPanel** → **Websites** → **Add Website** → select **Node.js / Static / GitHub Deployment** (or **Hostinger Web Hosting → Git**).
2. Connect your GitHub account and select your `simple-bookkeeping-webapp` repository (`main` branch).
3. Configure the build settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add your two Environment Variables in Hostinger's deployment settings:
   - `VITE_SUPABASE_URL` = your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon public key
5. Click **Deploy**. Every time you push updates to GitHub, Hostinger will automatically rebuild and publish your app.
