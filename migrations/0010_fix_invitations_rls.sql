-- Fix RLS policies for organization_invitations to allow proper access

-- Drop existing policies
drop policy if exists "Users can view invitations for their organizations" on public.organization_invitations;
drop policy if exists "Owners and admins can create invitations" on public.organization_invitations;
drop policy if exists "Owners and admins can delete invitations" on public.organization_invitations;

-- Create updated policies with better access control
-- Allow users to view invitations for organizations where they are owner/admin, or invitations sent to their email
create policy "Users can view invitations for their organizations" on public.organization_invitations
  for select using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_invitations.organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
    )
    or email = (select email from auth.users where id = auth.uid())
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
    or email = (select email from auth.users where id = auth.uid())
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
