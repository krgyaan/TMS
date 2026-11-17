-- Payment categories: reusable master of categories grouped by purpose.
-- Purpose 'fixed' drives the Fixed Expenses type dropdown; other purposes can
-- reuse the same table later (variable, etc.).

CREATE TABLE IF NOT EXISTS "payment_category" (
    "id" bigserial NOT NULL PRIMARY KEY,
    "purpose" varchar(50) NOT NULL,
    "category" varchar(100) NOT NULL,
    "sub_category" varchar(100),
    "status" varchar(20) NOT NULL DEFAULT 'active',
    "created_by" bigint NOT NULL REFERENCES "users"("id"),
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_payment_category_purpose" ON "payment_category" ("purpose");

-- Link fixed expenses to their category. Legacy rows stay NULL until backfilled.
ALTER TABLE "fixed_expenses" ADD COLUMN IF NOT EXISTS "category_id" bigint
    REFERENCES "payment_category"("id");
CREATE INDEX IF NOT EXISTS "idx_fixed_expenses_category_id" ON "fixed_expenses" ("category_id");

-- Snapshot of payment_category.category / sub_category at save time.
ALTER TABLE "fixed_expenses" ADD COLUMN IF NOT EXISTS "sub_category" varchar(100);

-- `type` mirrors payment_category.category, so give it room.
ALTER TABLE "fixed_expenses" ALTER COLUMN "type" TYPE varchar(100);
