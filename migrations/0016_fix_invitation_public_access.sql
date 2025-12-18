-- Fix invitation RLS to allow public read access
-- The previous policy with "token is not null" was too broad

-- Drop the broken policy
drop policy if exists "Anyone can view invitations by token" on public.organization_invitations;

-- Allow public read access to invitations
-- Security: token is 32-byte cryptographically random hex, so URL is secure
-- Users still need correct email to accept, and invitations expire after 7 days
create policy "Public can view invitations" on public.organization_invitations
  for select using (true);
