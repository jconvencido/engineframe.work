-- Fix: Set is_global to true for all existing advisor modes
-- The migration 0019 inserted with is_global = false by default

UPDATE advisor_modes
SET is_global = true
WHERE is_global = false OR is_global IS NULL;

-- Verify the update
SELECT slug, name, is_global
FROM advisor_modes
ORDER BY created_at;
