ALTER TABLE "rfq_response_documents" ADD COLUMN "rfq_response_id" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "rfq_response_items" ADD COLUMN "rfq_response_id" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "rfq_response_items" ADD COLUMN "requirement" text NOT NULL;--> statement-breakpoint
ALTER TABLE "rfq_responses" ADD COLUMN "rfq_id" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "rfq_response_documents" ADD CONSTRAINT "rfq_response_documents_rfq_response_id_rfq_responses_id_fk" FOREIGN KEY ("rfq_response_id") REFERENCES "public"."rfq_responses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_response_items" ADD CONSTRAINT "rfq_response_items_rfq_response_id_rfq_responses_id_fk" FOREIGN KEY ("rfq_response_id") REFERENCES "public"."rfq_responses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_responses" ADD CONSTRAINT "rfq_responses_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_response_items" DROP COLUMN "rfq_item_id";--> statement-breakpoint
ALTER TABLE "rfq_response_items" DROP COLUMN "description";