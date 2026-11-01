-- Fixed Expenses module: recurring fixed expenses (rent, electricity, salary,
-- communication, software, admin) with payee, amount, bank account details and
-- payment schedule. `maker_id` is reserved for the future maker-checker flow.

CREATE TABLE IF NOT EXISTS "fixed_expenses" (
    "id" bigserial NOT NULL PRIMARY KEY,
    "party_name" varchar(255) NOT NULL,
    "amount_type" varchar(20) NOT NULL DEFAULT 'fixed',
    "amount" numeric(15, 2) NOT NULL,
    "payment_mode" varchar(30) NOT NULL DEFAULT 'auto_debit',
    "account_name" varchar(255),
    "account_number" varchar(100),
    "ifsc_code" varchar(50),
    "type" varchar(50) NOT NULL,
    "due_date" date NOT NULL,
    "payment_frequency" varchar(20) NOT NULL DEFAULT 'monthly',
    "delete_status" boolean NOT NULL DEFAULT false,
    "maker_id" bigint REFERENCES "users"("id"),
    "created_by" bigint NOT NULL REFERENCES "users"("id"),
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_fixed_expenses_type" ON "fixed_expenses" ("type");
CREATE INDEX IF NOT EXISTS "idx_fixed_expenses_due_date" ON "fixed_expenses" ("due_date");
