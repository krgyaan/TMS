ALTER TABLE "public"."company_documents" DROP CONSTRAINT IF EXISTS "company_documents_company_id_companies_id_fk";
DROP TABLE IF EXISTS "public"."company_documents";
DROP TABLE IF EXISTS "public"."companies";