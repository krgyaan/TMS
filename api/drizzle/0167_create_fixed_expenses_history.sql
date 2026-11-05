-- Workflow/history row per fixed expense. Mirrors the expense data and keeps the
-- workflow status (Awaited Maker -> Maker Created -> Maker Done -> Payment Done,
-- or Maker Rejected) plus who last changed it.
--
-- No backfill: only expenses created after this migration get a history row.

CREATE TABLE IF NOT EXISTS "fixed_expenses_history" (
    "id" bigserial NOT NULL PRIMARY KEY,
    "expense_id" bigint NOT NULL UNIQUE REFERENCES "fixed_expenses"("id") ON DELETE CASCADE,

    -- Snapshot of the fixed expense (category_id identifies the chosen
    -- payment_category row, i.e. the type or sub type)
    "party_name" varchar(255) NOT NULL,
    "amount_type" varchar(20) NOT NULL DEFAULT 'fixed',
    "amount" numeric(15, 2) NOT NULL,
    "payment_mode" varchar(30) NOT NULL DEFAULT 'auto_debit',
    "account_name" varchar(255),
    "account_number" varchar(100),
    "ifsc_code" varchar(50),
    "category_id" bigint,
    "due_date" date NOT NULL,
    "payment_frequency" varchar(20) NOT NULL DEFAULT 'monthly',
    "maker_id" bigint,

    -- Workflow
    "status" varchar(30) NOT NULL DEFAULT 'Awaited Maker',
    "updated_by" bigint REFERENCES "users"("id"),

    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_fixed_expenses_history_status" ON "fixed_expenses_history" ("status");
