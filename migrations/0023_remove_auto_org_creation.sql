-- Remove automatic organization creation on user signup
-- Users can manually create organizations when needed

-- Drop the trigger that auto-creates organizations
drop trigger if exists on_auth_user_create_org on auth.users;

-- Drop the function (optional, keeping it in case we need it later)
-- Uncomment the line below if you want to completely remove the function
-- drop function if exists public.create_default_organization();
