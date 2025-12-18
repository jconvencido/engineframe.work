-- Allow users to view profiles of members in their organizations

-- Add policy to allow viewing profiles of organization members
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
  );
