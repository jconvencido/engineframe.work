-- Test to verify current policies on organizations table
-- Run this in Supabase SQL Editor to see what policies exist

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'organizations';
