-- Migration: Remove designations, add team category
-- Steps:
--   1. Drop designation_id from user_profiles
--   2. Drop designations table
--   3. Add category column to teams
--   4. Set default category on existing teams

ALTER TABLE user_profiles DROP COLUMN IF EXISTS designation_id;
DROP TABLE IF EXISTS designations;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS category VARCHAR(20);
UPDATE teams SET category = CASE id
    WHEN 1 THEN 'primary'
    WHEN 2 THEN 'primary'
    WHEN 3 THEN 'secondary'
    WHEN 4 THEN 'secondary'
    WHEN 5 THEN 'primary'
    WHEN 6 THEN 'primary'
    WHEN 7 THEN 'primary'
    WHEN 8 THEN 'primary'
END
WHERE id IN (1,2,3,4,5,6,7,8);
