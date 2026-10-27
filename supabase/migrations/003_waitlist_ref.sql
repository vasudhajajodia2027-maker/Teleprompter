-- Which shared link (?ref=...) a waitlist email came from. Run after
-- 002_payments.sql (Dashboard -> SQL Editor -> New Query).

alter table public.waitlist add column if not exists ref text
  check (ref is null or ref ~ '^[a-z0-9-]{1,40}$');
