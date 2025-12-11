-- 0009_enable_rls_missing_tables_down.sql
-- Rollback: Disable RLS for advisor_modes and analysis_outputs tables

-- Drop RLS policies for analysis_outputs
drop policy if exists "Users can view analysis outputs for their own analyses" on public.analysis_outputs;
drop policy if exists "Users can insert analysis outputs for their own analyses" on public.analysis_outputs;
drop policy if exists "Users can update analysis outputs for their own analyses" on public.analysis_outputs;
drop policy if exists "Users can delete analysis outputs for their own analyses" on public.analysis_outputs;

-- Disable RLS on analysis_outputs
alter table public.analysis_outputs disable row level security;

-- Disable RLS on advisor_modes
alter table public.advisor_modes disable row level security;
