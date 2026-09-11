-- 0135: Create claude_token_usage table for tracking Anthropic Claude API token consumption and costs per tender, user, and pipeline stage

CREATE TABLE "claude_token_usage" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "tender_id" bigint,
    "job_id" varchar(100),
    "call_type" varchar(50) DEFAULT 'main_extraction' NOT NULL,
    "model" varchar(100) DEFAULT 'claude-haiku-4-5-20251001' NOT NULL,
    "input_tokens" integer DEFAULT 0 NOT NULL,
    "output_tokens" integer DEFAULT 0 NOT NULL,
    "cache_creation_tokens" integer DEFAULT 0 NOT NULL,
    "cache_read_tokens" integer DEFAULT 0 NOT NULL,
    "total_tokens" integer DEFAULT 0 NOT NULL,
    "estimated_cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
    "duration_ms" integer,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "idx_claude_token_usage_created_at" ON "claude_token_usage" ("created_at");
CREATE INDEX "idx_claude_token_usage_user_id" ON "claude_token_usage" ("user_id");
CREATE INDEX "idx_claude_token_usage_tender_id" ON "claude_token_usage" ("tender_id");
CREATE INDEX "idx_claude_token_usage_call_type" ON "claude_token_usage" ("call_type");
