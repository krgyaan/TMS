ALTER TABLE "sale_invoices" ADD COLUMN "action_logs" jsonb DEFAULT '[]'::jsonb NOT NULL;
