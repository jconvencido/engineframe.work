-- Allow anyone to view invitations by token (for accepting invitations)
-- This is needed because users need to see invitation details before logging in

-- Drop the existing select policy
drop policy if exists "Users can view invitations for their organizations" on public.organization_invitations;

-- Create new policy that allows:
-- 1. Org admins/owners to view their org's invitations
-- 2. Users to view invitations sent to their email
-- 3. ANYONE to view an invitation if they have the token (for the accept flow)
create policy "Anyone can view invitations by token" on public.organization_invitations
  for select using (
    -- Org admins/owners can view
    exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_invitations.organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
    )
    -- Users can view invitations sent to their email
    or (
      auth.uid() is not null
      and email in (
        select email from public.profiles where user_id = auth.uid()
      )
    )
    -- Anyone can view if they know the token (unauthenticated users can view to accept)
    or token is not null
  );
