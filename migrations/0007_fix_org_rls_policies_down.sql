-- 0007_fix_org_rls_policies_down.sql
-- Rollback RLS policy fixes

-- Drop the fixed policies
drop policy if exists "users_insert_own_organizations" on public.organizations;
drop policy if exists "users_insert_org_members" on public.organization_members;

-- Restore previous policies (from 0006)
create policy "Authenticated users can create organizations" on public.organizations
  for insert to authenticated with check (auth.uid() = created_by);

create policy "Allow organization member creation" on public.organization_members
  for insert with check (true);
