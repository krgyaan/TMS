CREATE TABLE IF NOT EXISTS "tender_result_details" (
    "id" bigserial PRIMARY KEY,
    "tender_result_id" bigint NOT NULL REFERENCES "tender_results"("id"),
    "result" varchar(50),
    "l1_price" numeric(15, 2),
    "l2_price" numeric(15, 2),
    "our_price" numeric(15, 2),
    "qualified_parties_screenshot" text,
    "final_result_screenshot" text,
    "result_uploaded_at" timestamptz,
    "result_reason" text,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "tender_result_details_result_id_idx" ON "tender_result_details" ("tender_result_id");--> statement-breakpoint

-- Backfill existing data from tender_results into tender_result_details
INSERT INTO "tender_result_details" (
    "tender_result_id",
    "result",
    "l1_price",
    "l2_price",
    "our_price",
    "qualified_parties_screenshot",
    "final_result_screenshot",
    "result_uploaded_at",
    "result_reason"
)
SELECT
    "id",
    "result",
    "l1_price",
    "l2_price",
    
    "our_price",
    "qualified_parties_screenshot",
    "final_result_screenshot",
    "result_uploaded_at",
    "result_reason"
FROM "tender_results";
