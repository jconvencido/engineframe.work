-- Update profiles RLS policy to allow searching by email for organization admins

-- Drop the existing policy
drop policy if exists "Users can view profiles of organization members" on public.profiles;

-- Create updated policy that allows viewing by email for org admins/owners
create policy "Users can view profiles of organization members" on public.profiles
  for select using (
    -- Can view own profile
    auth.uid() = id
    or
    -- Can view profiles of users in same organizations
    id in (
      select om.user_id 
      from public.organization_members om
      where om.organization_id in (
        select organization_id 
        from public.organization_members 
        where user_id = auth.uid()
      )
    )
    or
    -- Org admins/owners can search profiles by email to invite members
    exists (
      select 1 from public.organization_members om
      where om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
    )
  );
