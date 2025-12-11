-- 0009_enable_rls_missing_tables_up.sql
-- Enable RLS for advisor_modes and analysis_outputs tables

-- Enable RLS on advisor_modes
alter table public.advisor_modes enable row level security;

-- Enable RLS on analysis_outputs
alter table public.analysis_outputs enable row level security;

-- Add RLS policies for analysis_outputs
-- Users can view analysis outputs if they can view the parent analysis
create policy "Users can view analysis outputs for their own analyses" on public.analysis_outputs
  for select using (
    analysis_id in (
      select id from public.analyses
      where user_id = auth.uid()
    )
  );

-- Users can insert analysis outputs for their own analyses
create policy "Users can insert analysis outputs for their own analyses" on public.analysis_outputs
  for insert with check (
    analysis_id in (
      select id from public.analyses
      where user_id = auth.uid()
    )
  );

-- Users can update analysis outputs for their own analyses
create policy "Users can update analysis outputs for their own analyses" on public.analysis_outputs
  for update using (
    analysis_id in (
      select id from public.analyses
      where user_id = auth.uid()
    )
  );

-- Users can delete analysis outputs for their own analyses
create policy "Users can delete analysis outputs for their own analyses" on public.analysis_outputs
  for delete using (
    analysis_id in (
      select id from public.analyses
      where user_id = auth.uid()
    )
  );
