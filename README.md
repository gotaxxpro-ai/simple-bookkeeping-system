# Simple Bookkeeping System v3.3 — Updated Pricing & Stripe Checkout

## Configured Pricing Models

1. **B2C Business Owner (`b2c_monthly` / `b2c_annual`):** **$15/month** or **$129/year** (interactive Monthly/Annual toggle on the pricing card).
2. **Service Bureau White-Label (`service_bureau`):** **$29/month** recurring white-label tax office portal.
3. **B2B White-Label License (`b2b_onetime`):** **$249 one-time fee** lifetime white-label tax office portal.

## Hostinger Environment Variables

Add these 4 Stripe Payment Links in Hostinger (alongside your existing Supabase variables):
- `VITE_STRIPE_LINK_B2C_MONTHLY` = your **$15/month** Stripe Payment Link
- `VITE_STRIPE_LINK_B2C_ANNUAL` = your **$129/year** Stripe Payment Link
- `VITE_STRIPE_LINK_SERVICE_BUREAU` = your **$29/month** Stripe Payment Link
- `VITE_STRIPE_LINK_B2B_ONETIME` = your **$249 one-time** Stripe Payment Link
- `VITE_STRIPE_CUSTOMER_PORTAL_URL` = your Stripe Customer Portal link

*(Remember to set the redirect URL on each Stripe Payment Link to `https://yourdomain.com/?checkout=success`.)*
