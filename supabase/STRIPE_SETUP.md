# Turning on paid purchases

Until `VITE_PAYMENTS_ENABLED=true` is set in Vercel, the checkout page stays a waitlist.

1. **Stripe product.** In the Stripe dashboard, create a product "First Take" with a one-time price
   (₹199, with a USD $2 currency option). Copy the price id (`price_...`).
2. **Database.** Run `supabase/migrations/002_stripe.sql` in the Supabase SQL Editor.
3. **Functions.** With the Supabase CLI (`npx supabase login`, then `npx supabase link --project-ref dgxfvntlgnrcluhlbdbd`):
   ```
   npx supabase functions deploy create-checkout-session
   npx supabase functions deploy stripe-webhook --no-verify-jwt
   ```
4. **Webhook.** In Stripe → Developers → Webhooks, add the endpoint
   `https://dgxfvntlgnrcluhlbdbd.supabase.co/functions/v1/stripe-webhook` with the events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `charge.refunded`.
   Copy its signing secret (`whsec_...`).
5. **Secrets.** In Supabase → Edge Functions → Secrets (or `npx supabase secrets set`):
   `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL=https://getfirsttake.app`.
6. **Switch on.** Set `VITE_PAYMENTS_ENABLED=true` in Vercel and redeploy.

Test the whole flow with Stripe test-mode keys and card `4242 4242 4242 4242` before using live keys.
