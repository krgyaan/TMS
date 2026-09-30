DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_documents') THEN
        ALTER TABLE "public"."company_documents" ADD COLUMN IF NOT EXISTS "path" varchar(512);
    END IF;
END $$;