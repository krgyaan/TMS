-- Drop unused enum value

ALTER TABLE "lead_followups" ADD COLUMN IF NOT EXISTS "subject" varchar(500);
ALTER TABLE "lead_followups" ADD COLUMN IF NOT EXISTS "status" varchar(50) DEFAULT 'active' NOT NULL;
ALTER TABLE "lead_followups" ADD COLUMN IF NOT EXISTS "stop_reason" varchar(255);
ALTER TABLE "lead_followups" ADD COLUMN IF NOT EXISTS "stopped_at" timestamptz;
