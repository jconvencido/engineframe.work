-- 0006_fix_organization_rls.sql
-- Fix RLS policies for organization creation

-- Drop the problematic policies
drop policy if exists "Users can create organizations" on public.organizations;
drop policy if exists "System can insert organization members" on public.organization_members;

-- Allow authenticated users to create organizations
create policy "Authenticated users can create organizations" on public.organizations
  for insert to authenticated with check (auth.uid() = created_by);

-- Allow the trigger function to insert organization members using security definer
create policy "Allow organization member creation" on public.organization_members
  for insert with check (true);

-- Recreate the create_default_organization function with proper permissions
create or replace function public.create_default_organization()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
  org_id uuid;
  org_slug text;
begin
  -- Generate unique slug from email
  org_slug := split_part(new.email, '@', 1) || '-org-' || substr(new.id::text, 1, 8);
  
  -- Create organization
  insert into public.organizations (name, slug, created_by)
  values (
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) || '''s Organization',
    org_slug,
    new.id
  )
  returning id into org_id;
  
  -- Add user as owner
  insert into public.organization_members (organization_id, user_id, role)
  values (org_id, new.id, 'owner');
  
  return new;
exception
  when others then
    -- Log error but don't fail user creation
    raise warning 'Failed to create default organization for user %: %', new.id, sqlerrm;
    return new;
end;
$$;
