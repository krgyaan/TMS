-- Migration: Move role_id from user_roles to users
-- Steps:
--   1. Add role_id column to users table
--   2. Migrate existing data from user_roles
--   3. Drop user_roles table

ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id BIGINT REFERENCES roles(id);

UPDATE users u
SET role_id = ur.role_id
FROM user_roles ur
WHERE ur.user_id = u.id;

DROP TABLE IF EXISTS user_roles;
