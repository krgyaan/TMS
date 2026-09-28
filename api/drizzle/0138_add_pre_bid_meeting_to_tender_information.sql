-- 0138: Add pre_bid_meeting to tender_information (composed free-text string from AI extraction:
-- date/time, venue, MS Teams ID/passcode, video-conference note). Nullable; NA sentinels stored as NULL.
ALTER TABLE "tender_information" ADD COLUMN IF NOT EXISTS "pre_bid_meeting" text;
