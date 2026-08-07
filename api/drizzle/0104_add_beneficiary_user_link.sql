ALTER TABLE "project_beneficiaries" ADD COLUMN "user_id" integer REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "project_payment_requests" ADD COLUMN "beneficiary_id" integer REFERENCES "project_beneficiaries"("id");--> statement-breakpoint
-- Best-effort backfill: link existing beneficiaries to users where the
-- normalized name matches exactly one user (ambiguous / vendor names stay NULL).
UPDATE project_beneficiaries pb
SET user_id = u.id
FROM (
    SELECT id, LOWER(BTRIM(name)) AS name
    FROM users
    WHERE (SELECT COUNT(DISTINCT u2.id)
           FROM users u2
           WHERE LOWER(BTRIM(u2.name)) = LOWER(BTRIM(users.name))) = 1
) u
WHERE pb.user_id IS NULL
  AND LOWER(BTRIM(pb.name)) = u.name;