-- 0001_init_mvp.sql

-- Profiles table (linked to Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = user_id);

create policy "Profiles are insertable by owner" on public.profiles
  for insert with check (auth.uid() = user_id);

create policy "Profiles are updatable by owner" on public.profiles
  for update using (auth.uid() = user_id);

-- Advisor modes (seed a few for MVP)
create table if not exists public.advisor_modes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  created_at timestamp with time zone default now()
);

-- Analyses (one per question run)
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  advisor_mode_id uuid references public.advisor_modes(id),
  prompt text not null,
  created_at timestamp with time zone default now()
);

alter table public.analyses enable row level security;

create policy "Users see own analyses" on public.analyses
  for select using (auth.uid() = user_id);

create policy "Users insert own analyses" on public.analyses
  for insert with check (auth.uid() = user_id);

-- Analysis outputs (structured sections)
create table if not exists public.analysis_outputs (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  section_name text not null,
  content text not null,
  position integer not null default 0,
  created_at timestamp with time zone default now()
);

-- Seed a couple of modes
insert into public.advisor_modes (slug, name, description)
values
  ('product', 'Product Mode', 'Analyze product clarity, value prop, and UX.'),
  ('sales', 'Sales Mode', 'Analyze sales messaging, funnel, and objections.'),
  ('startup', 'Startup Mode', 'High-level clarity for founders.')
on conflict (slug) do nothing;
