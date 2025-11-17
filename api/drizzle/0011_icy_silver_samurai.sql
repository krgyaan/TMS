ALTER TABLE "tender_infos" ALTER COLUMN "organization" SET DATA TYPE bigint USING organization::bigint;--> statement-breakpoint
ALTER TABLE "tender_infos" ADD CONSTRAINT "tender_infos_organization_organizations_id_fk" FOREIGN KEY ("organization") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
