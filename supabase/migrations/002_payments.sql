-- Dodo Payments purchases. Run after 001_init.sql (Dashboard -> SQL Editor -> New Query).
-- Rows are written only by the dodo-webhook Edge Function with the service
-- role key; client roles still have SELECT on their own row and nothing else.

alter table public.licenses add column if not exists dodo_payment_id text;
alter table public.licenses add column if not exists amount_paid integer;
alter table public.licenses add column if not exists currency text;

create index if not exists licenses_dodo_payment_id_idx
  on public.licenses (dodo_payment_id);
