-- Stripe purchases. Run after 001_init.sql (Dashboard -> SQL Editor -> New Query).
-- Rows are written only by the stripe-webhook Edge Function with the service
-- role key; client roles still have SELECT on their own row and nothing else.

alter table public.licenses add column if not exists stripe_checkout_session_id text;
alter table public.licenses add column if not exists stripe_payment_intent_id text;

create index if not exists licenses_stripe_payment_intent_id_idx
  on public.licenses (stripe_payment_intent_id);
