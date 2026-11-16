# Simple Bookkeeping System v3.2 — Stripe Checkout & Automated White-Label Provisioning

## How the Automated Stripe Flow Works

1. A tax office visits your landing page, clicks **Start Solo License ($97/mo)**, **Launch Growth Office ($197/mo)**, or **Start Service Bureau ($297/mo)**, and enters their **Brand Name**, **URL Slug**, and **Admin Email**.
2. The app saves a `pending_checkouts` record in Supabase and redirects them to your **Stripe Payment Link** with `?client_reference_id=<checkout_id>&prefilled_email=<email>`.
3. When payment succeeds, Stripe fires `checkout.session.completed` to your **Supabase Edge Function** (`supabase/functions/stripe-webhook/index.ts`), which verifies the Stripe signature and automatically creates/activates their white-label `organizations` row in Supabase.
4. Stripe redirects the buyer back to `https://yourdomain.com/?checkout=success`, where they sign up/in with their admin email and immediately unlock their **Tax Office Admin** portal.

---

## Setup Checklist (10 Minutes)

### Step 1: Run Updated SQL in Supabase
Open **Supabase → SQL Editor**, paste `supabase/schema.sql`, and click **Run** to add `pending_checkouts` and the subscription status columns on `organizations`.

### Step 2: Create 3 Payment Links in Stripe
In your [Stripe Dashboard](https://dashboard.stripe.com) → **Product catalog / Payment Links**:
1. Create recurring products for **$97/mo** (Solo), **$197/mo** (Growth), and **$297/mo** (Service Bureau).
2. Create a **Payment Link** for each price. Under **After payment**, choose **Redirect customers to your website** and enter:
   `https://yourdomain.com/?checkout=success`
3. *(Optional)* Enable Stripe's **Customer Portal** under **Settings → Billing → Customer portal** and copy the portal login link (`VITE_STRIPE_CUSTOMER_PORTAL_URL`) so tax offices can update cards or cancel subscriptions themselves.

### Step 3: Add Stripe Link Environment Variables in Hostinger
In Hostinger's deployment environment variables, add:
- `VITE_STRIPE_LINK_SOLO` = your $97/mo Stripe Payment Link
- `VITE_STRIPE_LINK_GROWTH` = your $197/mo Stripe Payment Link
- `VITE_STRIPE_LINK_BUREAU` = your $297/mo Stripe Payment Link
- `VITE_STRIPE_CUSTOMER_PORTAL_URL` = your Stripe Customer Portal link

### Step 4: Deploy the Stripe Webhook Edge Function in Supabase
1. Deploy `supabase/functions/stripe-webhook/index.ts` in your Supabase project (via Supabase CLI `supabase functions deploy stripe-webhook --no-verify-jwt` or the Supabase Dashboard Edge Functions editor with **Verify JWT** turned OFF).
2. In **Stripe Dashboard → Developers → Webhooks**, add an endpoint pointing to:
   `https://YOUR-PROJECT-ID.supabase.co/functions/v1/stripe-webhook`
   Select events: `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
3. Copy the Webhook Signing Secret (`whsec_...`) and add two secrets in **Supabase → Edge Functions → Secrets**:
   - `STRIPE_SECRET_KEY` = `sk_live_...`
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...`
