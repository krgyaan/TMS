-- Add OAuth token tracking fields to oauth_accounts table
ALTER TABLE "oauth_accounts" ADD COLUMN "last_refreshed_at" timestamp with time zone;
ALTER TABLE "oauth_accounts" ADD COLUMN "refresh_failure_count" integer DEFAULT 0;
ALTER TABLE "oauth_accounts" ADD COLUMN "is_active" boolean DEFAULT true;
