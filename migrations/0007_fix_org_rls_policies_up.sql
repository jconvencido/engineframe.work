-- 0007_fix_org_rls_policies_up.sql
-- Fix RLS policies for client-side organization creation

-- Drop ALL existing insert policies for organizations
drop policy if exists "Authenticated users can create organizations" on public.organizations;
drop policy if exists "Users can create organizations" on public.organizations;
drop policy if exists "Allow organization member creation" on public.organization_members;
drop policy if exists "System can insert organization members" on public.organization_members;

-- Create a simple, permissive insert policy for organizations
-- This allows any authenticated user to insert if they set themselves as created_by
create policy "users_insert_own_organizations" on public.organizations
  for insert 
  with check (auth.uid() = created_by);

-- Allow users to insert organization members for orgs they created
create policy "users_insert_org_members" on public.organization_members
  for insert 
  with check (
    -- User is adding themselves to any org
    user_id = auth.uid()
    or
    -- Or user is the creator of the organization
    exists (
      select 1 from public.organizations 
      where id = organization_id 
      and created_by = auth.uid()
    )
  );
