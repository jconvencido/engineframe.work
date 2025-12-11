-- 0008_create_org_function_down.sql
-- Drop the organization creation function

drop function if exists public.create_organization(text, text);
