-- Fix RLS policy to allow users to accept their own invitations
-- The issue: profiles.id should be profiles.user_id in the email lookup

-- Drop the incorrect update policy
drop policy if exists "Owners and admins can update invitations" on public.organization_invitations;

-- Recreate with correct column reference (user_id instead of id)
create policy "Owners and admins can update invitations" on public.organization_invitations
  for update using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_invitations.organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
    )
    or email in (
      select email from public.profiles where user_id = auth.uid()
    )
  );
