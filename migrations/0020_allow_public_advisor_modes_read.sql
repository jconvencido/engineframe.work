-- Allow anyone to read global advisor modes
-- This is needed for the homepage to display available modes

-- Enable RLS on advisor_modes if not already enabled
alter table public.advisor_modes enable row level security;

-- Drop existing policy if it exists
drop policy if exists "Anyone can view global advisor modes" on public.advisor_modes;

-- Create policy to allow public read access to global modes
create policy "Anyone can view global advisor modes"
  on public.advisor_modes
  for select
  using (is_global = true);

-- Optional: Allow authenticated users to see org-specific modes they belong to
drop policy if exists "Users can view their org advisor modes" on public.advisor_modes;

create policy "Users can view their org advisor modes"
  on public.advisor_modes
  for select
  using (
    is_global = true 
    or 
    organization_id in (
      select organization_id 
      from organization_members 
      where user_id = auth.uid()
    )
  );
