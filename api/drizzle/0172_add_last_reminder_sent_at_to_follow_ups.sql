ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "last_reminder_sent_at" timestamp with time zone;
