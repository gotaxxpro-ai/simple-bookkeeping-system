# Simple Bookkeeping System v3.0 — Multi-Tenant White-Label Edition

Single-codebase, multi-tenant bookkeeping SaaS ready to license and white-label to multiple tax offices using **one GitHub repo, one Hostinger deployment, and one Supabase database**.

## Setup & Upgrade Guide

1. **Run `supabase/schema.sql` in Supabase SQL Editor:**
   - Creates `organizations` (white-label tax offices) and `user_memberships` (linking clients and `office_admin` preparers to their tax office) plus multi-tenant Row-Level Security policies.
2. **Add Your Super Admin Email in Hostinger Environment Variables:**
   - Alongside `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, add:
     `VITE_SUPER_ADMIN_EMAIL=gotaxxpro@gmail.com`
   - When you log in with that email, you automatically receive `super_admin` access inside the **Tax Office Admin** tab, where you can create new white-label tax offices and generate their branded URLs (`https://yourdomain.com/?office=their-slug`).
3. **Onboarding a Paying Tax Office:**
   - In the **Tax Office Admin** tab, create a new Tax Office with a unique URL slug (e.g., `apex-tax`).
   - Have the tax office owner sign up at `https://yourdomain.com/?office=apex-tax`, then switch their role in the roster from `Client` to `Office Admin`.
   - They can immediately customize their own logo URL, brand color, support email, and booking link, and view/export all of their clients' Schedule C reports.
