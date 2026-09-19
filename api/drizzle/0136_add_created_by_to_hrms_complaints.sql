-- 0134: Add created_by to hrms_complaints
-- Tracks who filed the complaint. Currently identical to complainant_id
-- (self-filed via support page); will differ once HR can file complaints
-- on behalf of other employees.

ALTER TABLE "hrms_complaints" ADD COLUMN "created_by" bigint;

