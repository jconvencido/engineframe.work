-- 0005_organizations_up.sql
-- Add Organizations, Teams & Roles functionality

-- Create organizations table
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create organization members table with roles
create type organization_role as enum ('owner', 'admin', 'member', 'viewer');

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role organization_role not null default 'member',
  joined_at timestamp with time zone default now(),
  unique(organization_id, user_id)
);

-- Create organization invitations table
create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role organization_role not null default 'member',
  invited_by uuid not null references auth.users(id) on delete cascade,
  token text unique not null,
  expires_at timestamp with time zone not null,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(organization_id, email)
);

-- Add organization_id to existing tables
alter table public.analyses 
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.advisor_modes 
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists is_global boolean default false;

-- Create indexes for better performance
create index if not exists idx_org_members_org_id on public.organization_members(organization_id);
create index if not exists idx_org_members_user_id on public.organization_members(user_id);
create index if not exists idx_org_invitations_org_id on public.organization_invitations(organization_id);
create index if not exists idx_org_invitations_email on public.organization_invitations(email);
create index if not exists idx_org_invitations_token on public.organization_invitations(token);
create index if not exists idx_analyses_org_id on public.analyses(organization_id);
create index if not exists idx_advisor_modes_org_id on public.advisor_modes(organization_id);

-- Enable RLS on new tables
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;

-- Create a helper function to get user's organizations without recursion
create or replace function public.get_user_organizations(uid uuid)
returns table (organization_id uuid) as $$
begin
  return query
  select om.organization_id
  from public.organization_members om
  where om.user_id = uid;
end;
$$ language plpgsql stable security definer;

-- RLS Policies for organizations
create policy "Users can view organizations they are members of" on public.organizations
  for select using (
    id in (select public.get_user_organizations(auth.uid()))
  );

create policy "Users can create organizations" on public.organizations
  for insert with check (auth.uid() = created_by);

create policy "Owners and admins can update organizations" on public.organizations
  for update using (
    id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

create policy "Only owners can delete organizations" on public.organizations
  for delete using (
    id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
      and role = 'owner'
    )
  );

-- RLS Policies for organization_members (NO RECURSION)
create policy "Users can view members of their organizations" on public.organization_members
  for select using (
    user_id = auth.uid()
    or organization_id in (select public.get_user_organizations(auth.uid()))
  );

create policy "System can insert organization members" on public.organization_members
  for insert with check (true);

create policy "Owners and admins can update member roles" on public.organization_members
  for update using (
    organization_id in (
      select om.organization_id from public.organization_members om
      where om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
    )
  );

create policy "Owners and admins can remove members" on public.organization_members
  for delete using (
    organization_id in (
      select om.organization_id from public.organization_members om
      where om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
    )
  );

-- RLS Policies for organization_invitations
create policy "Users can view invitations for their organizations" on public.organization_invitations
  for select using (
    organization_id in (
      select om.organization_id from public.organization_members om
      where om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
    )
    or email = (select email from auth.users where id = auth.uid())
  );

create policy "Owners and admins can create invitations" on public.organization_invitations
  for insert with check (
    organization_id in (
      select om.organization_id from public.organization_members om
      where om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
    )
  );

create policy "Owners and admins can delete invitations" on public.organization_invitations
  for delete using (
    organization_id in (
      select om.organization_id from public.organization_members om
      where om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
    )
  );

-- Update RLS policies for analyses (org-level access)
drop policy if exists "Users see own analyses" on public.analyses;
drop policy if exists "Users insert own analyses" on public.analyses;

create policy "Users can view analyses in their organizations" on public.analyses
  for select using (
    organization_id in (select public.get_user_organizations(auth.uid()))
  );

create policy "Members can create analyses in their organizations" on public.analyses
  for insert with check (
    organization_id in (
      select om.organization_id from public.organization_members om
      where om.user_id = auth.uid()
      and om.role in ('owner', 'admin', 'member')
    )
  );

-- Update RLS policies for advisor_modes (org-level + global)
create policy "Users can view advisor modes in their orgs or global modes" on public.advisor_modes
  for select using (
    is_global = true
    or organization_id in (select public.get_user_organizations(auth.uid()))
  );

create policy "Owners and admins can create advisor modes" on public.advisor_modes
  for insert with check (
    organization_id in (
      select om.organization_id from public.organization_members om
      where om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
    )
  );

create policy "Owners and admins can update advisor modes" on public.advisor_modes
  for update using (
    organization_id in (
      select om.organization_id from public.organization_members om
      where om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
    )
  );

create policy "Owners and admins can delete advisor modes" on public.advisor_modes
  for delete using (
    organization_id in (
      select om.organization_id from public.organization_members om
      where om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
    )
  );

-- Function to automatically create default organization for new users
create or replace function public.create_default_organization()
returns trigger as $$
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
end;
$$ language plpgsql security definer;

-- Update the handle_new_user trigger to also create default organization
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger on_auth_user_create_org
  after insert on auth.users
  for each row execute procedure public.create_default_organization();

-- Function to clean up expired invitations
create or replace function public.cleanup_expired_invitations()
returns void as $$
begin
  delete from public.organization_invitations
  where expires_at < now() and accepted_at is null;
end;
$$ language plpgsql security definer;

-- Mark existing advisor modes as global
update public.advisor_modes set is_global = true where organization_id is null;
