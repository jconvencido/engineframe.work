-- Fix RLS policies for organization_invitations (version 2)
-- This fixes the auth.users reference issue from the previous migration

-- Drop all existing policies
drop policy if exists "Users can view invitations for their organizations" on public.organization_invitations;
drop policy if exists "Owners and admins can create invitations" on public.organization_invitations;
drop policy if exists "Owners and admins can update invitations" on public.organization_invitations;
drop policy if exists "Owners and admins can delete invitations" on public.organization_invitations;

-- Create updated policies with correct email access from profiles table
-- Allow users to view invitations for organizations where they are owner/admin, or invitations sent to their email
create policy "Users can view invitations for their organizations" on public.organization_invitations
  for select using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_invitations.organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
    )
    or email in (
      select email from public.profiles where id = auth.uid()
    )
  );

-- Allow owners and admins to create invitations
create policy "Owners and admins can create invitations" on public.organization_invitations
  for insert with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_invitations.organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
    )
  );

-- Allow owners and admins to update invitations (for accepting)
create policy "Owners and admins can update invitations" on public.organization_invitations
  for update using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_invitations.organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
    )
    or email in (
      select email from public.profiles where id = auth.uid()
    )
  );

-- Allow owners and admins to delete invitations
create policy "Owners and admins can delete invitations" on public.organization_invitations
  for delete using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_invitations.organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
    )
  );
