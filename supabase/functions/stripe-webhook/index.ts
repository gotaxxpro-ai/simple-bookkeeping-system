// Supabase Edge Function: stripe-webhook
// Deploy with: supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets required in Supabase:
//   STRIPE_SECRET_KEY = sk_live_... (or sk_test_...)
//   STRIPE_WEBHOOK_SECRET = whsec_...

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import Stripe from 'npm:stripe@14.25.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const PLAN_CONFIG: Record<string, { max_clients: number; is_b2b_org: boolean }> = {
  b2c_monthly: { max_clients: 1, is_b2b_org: false },
  b2c_annual: { max_clients: 1, is_b2b_org: false },
  service_bureau: { max_clients: 999999, is_b2b_org: true },
  b2b_onetime: { max_clients: 999999, is_b2b_org: true },
};

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Missing Stripe signature or webhook secret', { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const checkoutId = session.client_reference_id;
      const stripeCustomerId = String(session.customer || '');
      const stripeSubscriptionId = String(session.subscription || ''); // Empty for $249 one-time payment
      const customerEmail = (session.customer_details?.email || '').trim().toLowerCase();

      if (checkoutId) {
        const { data: pending } = await supabaseAdmin
          .from('pending_checkouts')
          .select('*')
          .eq('id', checkoutId)
          .maybeSingle();

        if (pending) {
          const cfg = PLAN_CONFIG[pending.plan_tier] || PLAN_CONFIG.service_bureau;

          if (cfg.is_b2b_org) {
            // B2B ($249 one-time) or Service Bureau ($29/mo): create/activate white-label Tax Office
            const { data: org, error: orgErr } = await supabaseAdmin
              .from('organizations')
              .upsert(
                {
                  slug: pending.slug,
                  brand_name: pending.brand_name,
                  support_email: pending.admin_email || customerEmail,
                  primary_color: pending.primary_color || '#059669',
                  logo_url: pending.logo_url || '',
                  plan_tier: pending.plan_tier,
                  max_clients: cfg.max_clients,
                  subscription_status: pending.plan_tier === 'b2b_onetime' ? 'lifetime' : 'active',
                  stripe_customer_id: stripeCustomerId,
                  stripe_subscription_id: stripeSubscriptionId,
                  is_active: true,
                },
                { onConflict: 'slug' }
              )
              .select()
              .single();

            if (orgErr) throw orgErr;

            // Promote buyer to office_admin if they already have an account
            const targetEmail = (pending.admin_email || customerEmail).toLowerCase();
            if (targetEmail && org?.id) {
              const { data: existingMember } = await supabaseAdmin
                .from('user_memberships')
                .select('user_id')
                .ilike('email', targetEmail)
                .maybeSingle();

              if (existingMember?.user_id) {
                await supabaseAdmin
                  .from('user_memberships')
                  .update({
                    organization_id: org.id,
                    role: 'office_admin',
                  })
                  .eq('user_id', existingMember.user_id);
              }
            }
          }

          await supabaseAdmin
            .from('pending_checkouts')
            .update({ status: 'completed' })
            .eq('id', checkoutId);
        }
      }
    }

    // Handle recurring subscription updates/cancellations (B2C $15/mo, $129/yr & Service Bureau $29/mo)
    if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const isStillActive = ['active', 'trialing'].includes(sub.status);

      await supabaseAdmin
        .from('organizations')
        .update({
          subscription_status: sub.status,
          is_active: isStillActive,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', sub.id);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return new Response(`Server Error: ${err.message}`, { status: 500 });
  }
});
