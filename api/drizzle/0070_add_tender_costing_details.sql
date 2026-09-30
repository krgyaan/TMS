CREATE TABLE IF NOT EXISTS "tender_costing_details" (
    "id" bigserial PRIMARY KEY,
    "tender_costing_sheets_id" bigint NOT NULL,
    "submitted_final_price" numeric(15, 2),
    "submitted_receipt_price" numeric(15, 2),
    "submitted_budget_price" numeric(15, 2),
    "submitted_gross_margin" numeric(8, 4),
    "te_remarks" text,
    "submitted_by" bigint,
    "submitted_at" timestamptz,
    "final_price" numeric(15, 2),
    "receipt_price" numeric(15, 2),
    "budget_price" numeric(15, 2),
    "gross_margin" numeric(8, 4),
    "tl_remarks" text,
    "rejection_reason" text,
    "approved_by" bigint,
    "approved_at" timestamptz,
    "status" costing_sheet_status DEFAULT 'Pending',
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "tender_costing_details_sheet_id_idx" ON "tender_costing_details" ("tender_costing_sheets_id");--> statement-breakpoint

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tender_costing_sheets' AND column_name = 'submitted_final_price'
    ) THEN
        EXECUTE '
        INSERT INTO "tender_costing_details" (
            "tender_costing_sheets_id",
            "submitted_final_price",
            "submitted_receipt_price",
            "submitted_budget_price",
            "submitted_gross_margin",
            "te_remarks",
            "submitted_by",
            "submitted_at",
            "final_price",
            "receipt_price",
            "budget_price",
            "gross_margin",
            "tl_remarks",
            "rejection_reason",
            "approved_by",
            "approved_at",
            "status",
            "created_at",
            "updated_at"
        )
        SELECT
            "id",
            "submitted_final_price",
            "submitted_receipt_price",
            "submitted_budget_price",
            "submitted_gross_margin",
            "te_remarks",
            "submitted_by",
            "submitted_at",
            "final_price",
            "receipt_price",
            "budget_price",
            "gross_margin",
            "tl_remarks",
            "rejection_reason",
            "approved_by",
            "approved_at",
            COALESCE("status", ''Pending''),
            "created_at",
            "updated_at"
        FROM "tender_costing_sheets"';
    END IF;
END $$;--> statement-breakpoint
