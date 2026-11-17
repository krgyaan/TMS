-- `maker_id` was reserved for the future maker-checker flow. Repurpose it as
-- the link to the maker request created for this fixed expense, so no extra
-- column is needed on project_payment_requests.

-- Drop whatever FK currently ties maker_id to users.
DO $$
DECLARE c text;
BEGIN
    SELECT conname INTO c
    FROM pg_constraint
    WHERE conrelid = 'fixed_expenses'::regclass
      AND contype = 'f'
      AND conkey = ARRAY[(
          SELECT attnum FROM pg_attribute
          WHERE attrelid = 'fixed_expenses'::regclass
            AND attname = 'maker_id'
      )];

    IF c IS NOT NULL THEN
        EXECUTE format('ALTER TABLE "fixed_expenses" DROP CONSTRAINT %I', c);
    END IF;
END $$;

ALTER TABLE "fixed_expenses"
    ADD CONSTRAINT "fixed_expenses_maker_id_fkey"
    FOREIGN KEY ("maker_id") REFERENCES "project_payment_requests"("id");

CREATE INDEX IF NOT EXISTS "idx_fixed_expenses_maker_id"
    ON "fixed_expenses" ("maker_id");
