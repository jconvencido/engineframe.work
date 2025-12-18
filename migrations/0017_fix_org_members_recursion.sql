-- Fix infinite recursion in organization_members policies
-- The issue: DELETE and UPDATE policies query organization_members table within their checks,
-- causing infinite recursion when Postgres evaluates the policies

-- Drop the problematic policies
drop policy if exists "Owners and admins can remove members" on public.organization_members;
drop policy if exists "Owners and admins can update member roles" on public.organization_members;
drop policy if exists "Users can view members of their organizations" on public.organization_members;

-- Recreate SELECT policy (this one is safe as it uses the function)
create policy "Users can view members of their organizations" on public.organization_members
  for select using (
    user_id = auth.uid()
    or organization_id in (select public.get_user_organizations(auth.uid()))
  );

-- Create a helper function to check if user is admin/owner WITHOUT querying organization_members
-- This breaks the recursion by using a security definer function
create or replace function public.is_org_admin(org_id uuid, check_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org_id
    and user_id = check_user_id
    and role in ('owner', 'admin')
  );
$$;

-- Now create UPDATE policy using the helper function (no recursion)
create policy "Owners and admins can update member roles" on public.organization_members
  for update using (
    public.is_org_admin(organization_id, auth.uid())
  );

-- Create DELETE policy using the helper function (no recursion)
create policy "Owners and admins can remove members" on public.organization_members
  for delete using (
    public.is_org_admin(organization_id, auth.uid())
  );
