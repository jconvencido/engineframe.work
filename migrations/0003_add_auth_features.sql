-- Update profiles table to include all required fields
alter table public.profiles
  add column if not exists mobile_number text,
  add column if not exists avatar_url text,
  add column if not exists locale text default 'en';

-- Create index for better performance
create index if not exists idx_profiles_user_id on public.profiles(user_id);

-- Failed login attempts tracking
create table if not exists public.failed_login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  attempted_at timestamp with time zone default now(),
  ip_address text,
  user_agent text
);

create index if not exists idx_failed_login_email on public.failed_login_attempts(email);
create index if not exists idx_failed_login_time on public.failed_login_attempts(attempted_at);

-- Function to clean up old failed login attempts (older than 1 hour)
create or replace function public.cleanup_old_failed_attempts()
returns void as $$
begin
  delete from public.failed_login_attempts
  where attempted_at < now() - interval '1 hour';
end;
$$ language plpgsql security definer;

-- Enable RLS for failed_login_attempts
alter table public.failed_login_attempts enable row level security;

-- Only allow service role to manage failed attempts
create policy "Service role can manage failed attempts" on public.failed_login_attempts
  for all using (auth.role() = 'service_role');
