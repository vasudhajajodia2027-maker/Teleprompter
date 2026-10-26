# Taking payments with Dodo Payments

Until `VITE_PAYMENTS_ENABLED=true` is set in Vercel, the checkout page stays a waitlist.

1. **Dodo account.** Sign up at https://app.dodopayments.com, finish business verification (KYC),
   and add the bank account that should receive payouts.
2. **Product.** Products → Create: "First Take", one-time price. Copy the product id (`pdt_...`).
3. **API key.** Developer → API Keys → create a key.
4. **Database.** Run `supabase/migrations/002_payments.sql` in the Supabase SQL Editor.
5. **Functions.** With the Supabase CLI (`npx supabase login`, then `npx supabase link --project-ref dgxfvntlgnrcluhlbdbd`):
   ```
   npx supabase functions deploy create-checkout-session
   npx supabase functions deploy dodo-webhook --no-verify-jwt
   ```
6. **Webhook.** Developer → Webhooks → Add endpoint
   `https://dgxfvntlgnrcluhlbdbd.supabase.co/functions/v1/dodo-webhook` with the events
   `payment.succeeded`, `refund.succeeded`, `dispute.lost` and `dispute.accepted`. Copy its signing secret (`whsec_...`).
7. **Secrets.** Supabase → Edge Functions → Secrets:
   `DODO_PAYMENTS_API_KEY`, `DODO_PRODUCT_ID`, `DODO_WEBHOOK_SECRET`,
   `DODO_ENVIRONMENT` (`test_mode` first, `live_mode` later), `SITE_URL=https://getfirsttake.app`.
8. **Switch on.** Set `VITE_PAYMENTS_ENABLED=true` in Vercel and redeploy.

Test the whole flow in test mode before switching the key, product and webhook to live mode.
