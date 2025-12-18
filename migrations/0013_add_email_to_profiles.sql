-- Add email column to profiles table and sync it from auth.users

-- Add email column
alter table public.profiles
  add column if not exists email text;

-- Create index on email
create index if not exists idx_profiles_email on public.profiles(email);

-- Update existing profiles with emails from auth.users
update public.profiles p
set email = u.email
from auth.users u
where p.user_id = u.id and p.email is null;

-- Create a function to sync email from auth.users on profile creation/update
create or replace function public.sync_profile_email()
returns trigger as $$
begin
  new.email := (select email from auth.users where id = new.user_id);
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger to automatically sync email
drop trigger if exists sync_profile_email_trigger on public.profiles;
create trigger sync_profile_email_trigger
  before insert or update on public.profiles
  for each row
  execute function public.sync_profile_email();
