-- 0008_create_org_function_up.sql
-- Create a database function to handle organization creation with proper RLS bypass

-- Function to create an organization with the calling user as owner
create or replace function public.create_organization(
  org_name text,
  org_slug text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  result json;
begin
  -- Check if user is authenticated
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Insert organization
  insert into public.organizations (name, slug, created_by)
  values (org_name, org_slug, auth.uid())
  returning id into new_org_id;

  -- Insert user as owner
  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, auth.uid(), 'owner');

  -- Return the new organization
  select json_build_object(
    'id', id,
    'name', name,
    'slug', slug,
    'created_by', created_by,
    'created_at', created_at
  ) into result
  from public.organizations
  where id = new_org_id;

  return result;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.create_organization(text, text) to authenticated;
