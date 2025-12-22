-- Debug query - Run this in Supabase SQL Editor to see what's in the table

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'advisor_modes'
ORDER BY ordinal_position;

-- Check actual data
SELECT id, slug, name, is_global, organization_id
FROM advisor_modes;

-- Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'advisor_modes';

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'advisor_modes';
