const isB2cPlan = planTier === 'b2c_monthly' || planTier === 'b2c_annual';

const session = await stripe.checkout.sessions.create({
  mode: planTier === 'b2b_onetime' ? 'payment' : 'subscription',
  customer_email: customerEmail,
  allow_promotion_codes: true,
  line_items: [{ price: priceId, quantity: 1 }],
  ...(isB2cPlan
    ? {
        subscription_data: {
          trial_period_days: 7,
        },
      }
    : {}),
  success_url: `${origin}/?checkout=success`,
  cancel_url: `${origin}/#pricing`,
});