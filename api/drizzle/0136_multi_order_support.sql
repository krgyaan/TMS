-- 0136: Support multiple & repeated orders per tender
-- wo_basic_details.order_type   : 'single' (default) | 'multiple' — several POs for one won tender
-- wo_basic_details.order_sequence: 1, 2, 3... numbering each order within the same tender
-- projects.wo_basic_detail_id   : direct 1:1 link from a basic detail to its project (replaces tenderId LIMIT 1 subquery)
-- wo_order_revisions            : history of repeated/revised orders for a basic detail (no new project created)

ALTER TABLE "wo_basic_details" ADD COLUMN "order_type" varchar(20) DEFAULT 'single';
ALTER TABLE "wo_basic_details" ADD COLUMN "order_sequence" integer DEFAULT 1;

ALTER TABLE "projects" ADD COLUMN "wo_basic_detail_id" bigint;
CREATE INDEX "idx_projects_wo_basic_detail" ON "projects" ("wo_basic_detail_id");

CREATE TABLE "wo_order_revisions" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "wo_basic_detail_id" bigint NOT NULL REFERENCES "wo_basic_details"("id") ON DELETE CASCADE,
    "wo_number" varchar(255),
    "wo_date" date,
    "wo_value_pre_gst" numeric(20, 2),
    "wo_value_gst_amt" numeric(20, 2),
    "wo_draft" varchar(255),
    "revision_number" integer NOT NULL,
    "revision_date" timestamp with time zone DEFAULT now() NOT NULL,
    "revised_by" bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "revision_notes" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "idx_wo_order_revisions_basic_detail" ON "wo_order_revisions" ("wo_basic_detail_id");

-- Backfill: link each project to its matching basic detail (one per tender historically)
UPDATE "projects" p
SET "wo_basic_detail_id" = (
    SELECT wbd."id"
    FROM "wo_basic_details" wbd
    WHERE wbd."tender_id" = p."tender_id"
    LIMIT 1
)
WHERE p."wo_basic_detail_id" IS NULL
  AND p."tender_id" IS NOT NULL;

-- Backfill order metadata for existing records
UPDATE "wo_basic_details" SET "order_type" = 'single' WHERE "order_type" IS NULL;
UPDATE "wo_basic_details" SET "order_sequence" = 1 WHERE "order_sequence" IS NULL;