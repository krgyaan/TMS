ALTER TABLE "vendors" DROP CONSTRAINT "vendors_organization_id_vendor_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "vendor_accs" DROP CONSTRAINT "vendor_accs_org_vendor_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "vendor_files" DROP CONSTRAINT "vendor_files_vendor_id_vendors_id_fk";
--> statement-breakpoint
ALTER TABLE "vendor_gsts" DROP CONSTRAINT "vendor_gsts_org_vendor_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "vendors" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "vendor_accs" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "vendor_accs" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "vendor_files" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "vendor_files" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "vendor_gsts" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "vendor_gsts" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_organization_id_vendor_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."vendor_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_accs" ADD CONSTRAINT "vendor_accs_org_vendor_organizations_id_fk" FOREIGN KEY ("org") REFERENCES "public"."vendor_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_files" ADD CONSTRAINT "vendor_files_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_gsts" ADD CONSTRAINT "vendor_gsts_org_vendor_organizations_id_fk" FOREIGN KEY ("org") REFERENCES "public"."vendor_organizations"("id") ON DELETE cascade ON UPDATE no action;
