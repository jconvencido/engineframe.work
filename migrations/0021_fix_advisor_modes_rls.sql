-- Fix RLS policies for advisor_modes table
-- Remove conflicting policies and create a single consolidated one

-- Drop all existing policies
drop policy if exists "Anyone can view global advisor modes" on public.advisor_modes;
drop policy if exists "Users can view their org advisor modes" on public.advisor_modes;
drop policy if exists "View advisor modes" on public.advisor_modes;

-- Create single consolidated policy
-- Allows: Anyone to view is_global=true modes, authenticated users to view their org modes
create policy "View advisor modes"
  on public.advisor_modes
  for select
  using (
    is_global = true 
    or 
    (
      auth.uid() is not null
      and organization_id in (
        select organization_id 
        from organization_members 
        where user_id = auth.uid()
      )
    )
  );
