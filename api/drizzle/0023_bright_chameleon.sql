ALTER TABLE "rfqs" RENAME COLUMN "notes" TO "doc_list";--> statement-breakpoint
ALTER TABLE "rfq_documents" ADD CONSTRAINT "rfq_documents_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_items" ADD CONSTRAINT "rfq_items_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_responses" ADD CONSTRAINT "rfq_responses_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_tender_id_tender_infos_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tender_infos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_items" DROP COLUMN "line_number";--> statement-breakpoint
ALTER TABLE "rfqs" DROP COLUMN "requested_organization";--> statement-breakpoint
ALTER TABLE "rfqs" DROP COLUMN "requested_vendor";--> statement-breakpoint
ALTER TABLE "rfqs" DROP COLUMN "created_by";--> statement-breakpoint
ALTER TABLE "rfqs" DROP COLUMN "deleted_at";