-- Supabase Schema & Row Level Security (RLS) Setup
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. WAITLIST TABLE
create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.waitlist enable row level security;

-- Policy: Anyone (anon & authenticated) can insert into waitlist
drop policy if exists "Allow public insert to waitlist" on public.waitlist;
create policy "Allow public insert to waitlist"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

-- No SELECT policy is created, so no client role can read the waitlist entries.


-- 2. SCRIPTS TABLE
create table if not exists public.scripts (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  episode_tag text,
  category text default 'draft' not null,
  content text not null,
  pacing_wpm integer default 140 not null,
  word_count integer default 0 not null,
  estimated_read_time text default '1m 00s' not null,
  updated_at text default 'Just now' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.scripts enable row level security;

-- Policies: Signed-in users can CRUD only their own scripts
drop policy if exists "Users can view their own scripts" on public.scripts;
create policy "Users can view their own scripts"
  on public.scripts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own scripts" on public.scripts;
create policy "Users can insert their own scripts"
  on public.scripts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own scripts" on public.scripts;
create policy "Users can update their own scripts"
  on public.scripts
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own scripts" on public.scripts;
create policy "Users can delete their own scripts"
  on public.scripts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- 3. LICENSES TABLE
create table if not exists public.licenses (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  is_pro boolean default false not null,
  tier text default 'Free Tier' not null,
  activated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security
alter table public.licenses enable row level security;

-- Policy: Signed-in users can only SELECT their own license row
drop policy if exists "Users can select their own license" on public.licenses;
create policy "Users can select their own license"
  on public.licenses
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No INSERT or UPDATE policy for client roles (prevents unauthorized client license modification)
