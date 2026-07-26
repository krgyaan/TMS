-- Migration: Remove designations, add team category
-- Steps:
--   1. Drop FK from user_profiles -> designations (if any)
--   2. Drop designation_id from user_profiles
--   3. Drop designations table
--   4. Add category column to teams

ALTER TABLE user_profiles DROP COLUMN IF EXISTS designation_id;
DROP TABLE IF EXISTS designations;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS category VARCHAR(20);
