-- 0005_organizations_down.sql
-- Rollback Organizations, Teams & Roles functionality

-- Drop triggers
drop trigger if exists on_auth_user_create_org on auth.users;

-- Drop functions
drop function if exists public.create_default_organization();
drop function if exists public.cleanup_expired_invitations();
drop function if exists public.get_user_organizations(uuid);

-- Drop RLS policies for advisor_modes (new ones)
drop policy if exists "Users can view advisor modes in their orgs or global modes" on public.advisor_modes;
drop policy if exists "Owners and admins can create advisor modes" on public.advisor_modes;
drop policy if exists "Owners and admins can update advisor modes" on public.advisor_modes;
drop policy if exists "Owners and admins can delete advisor modes" on public.advisor_modes;

-- Drop RLS policies for analyses (new ones)
drop policy if exists "Users can view analyses in their organizations" on public.analyses;
drop policy if exists "Members can create analyses in their organizations" on public.analyses;

-- Restore original RLS policies for analyses
create policy "Users see own analyses" on public.analyses
  for select using (auth.uid() = user_id);

create policy "Users insert own analyses" on public.analyses
  for insert with check (auth.uid() = user_id);

-- Drop RLS policies for organization tables
drop policy if exists "Users can view invitations for their organizations" on public.organization_invitations;
drop policy if exists "Owners and admins can create invitations" on public.organization_invitations;
drop policy if exists "Owners and admins can delete invitations" on public.organization_invitations;

drop policy if exists "Users can view members of their organizations" on public.organization_members;
drop policy if exists "System can insert organization members" on public.organization_members;
drop policy if exists "Owners and admins can update member roles" on public.organization_members;
drop policy if exists "Owners and admins can remove members" on public.organization_members;

drop policy if exists "Users can view organizations they are members of" on public.organizations;
drop policy if exists "Users can create organizations" on public.organizations;
drop policy if exists "Owners and admins can update organizations" on public.organizations;
drop policy if exists "Only owners can delete organizations" on public.organizations;

-- Drop indexes
drop index if exists idx_advisor_modes_org_id;
drop index if exists idx_analyses_org_id;
drop index if exists idx_org_invitations_token;
drop index if exists idx_org_invitations_email;
drop index if exists idx_org_invitations_org_id;
drop index if exists idx_org_members_user_id;
drop index if exists idx_org_members_org_id;

-- Remove columns from existing tables
alter table public.advisor_modes 
  drop column if exists is_global,
  drop column if exists organization_id;

alter table public.analyses 
  drop column if exists organization_id;

-- Drop tables
drop table if exists public.organization_invitations;
drop table if exists public.organization_members;
drop table if exists public.organizations;

-- Drop enum type
drop type if exists organization_role;
