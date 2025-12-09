CREATE TABLE "reverse_auctions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tender_id" bigint NOT NULL,
	"tender_no" varchar(255) NOT NULL,
	"bid_submission_date" timestamp,
	"status" varchar(50) DEFAULT 'Under Evaluation' NOT NULL,
	"technically_qualified" varchar(50),
	"disqualification_reason" text,
	"qualified_parties_count" varchar(50),
	"qualified_parties_names" jsonb,
	"ra_start_time" timestamp with time zone,
	"ra_end_time" timestamp with time zone,
	"scheduled_at" timestamp with time zone,
	"ra_result" varchar(50),
	"ve_l1_at_start" varchar(50),
	"ra_start_price" numeric(15, 2),
	"ra_close_price" numeric(15, 2),
	"ra_close_time" timestamp with time zone,
	"screenshot_qualified_parties" text,
	"screenshot_decrements" text,
	"final_result_screenshot" text,
	"result_uploaded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tender_results" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tender_id" bigint NOT NULL,
	"status" varchar(50) DEFAULT 'Under Evaluation' NOT NULL,
	"reverse_auction_id" bigint,
	"technically_qualified" varchar(50),
	"disqualification_reason" text,
	"qualified_parties_count" varchar(50),
	"qualified_parties_names" jsonb,
	"result" varchar(50),
	"l1_price" numeric(15, 2),
	"l2_price" numeric(15, 2),
	"our_price" numeric(15, 2),
	"qualified_parties_screenshot" text,
	"final_result_screenshot" text,
	"result_uploaded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "reverse_auctions" ADD CONSTRAINT "reverse_auctions_tender_id_tender_infos_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tender_infos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_results" ADD CONSTRAINT "tender_results_tender_id_tender_infos_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tender_infos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_results" ADD CONSTRAINT "tender_results_reverse_auction_id_reverse_auctions_id_fk" FOREIGN KEY ("reverse_auction_id") REFERENCES "public"."reverse_auctions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reverse_auctions_tender_id_idx" ON "reverse_auctions" USING btree ("tender_id");--> statement-breakpoint
CREATE INDEX "reverse_auctions_status_idx" ON "reverse_auctions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reverse_auctions_tender_no_idx" ON "reverse_auctions" USING btree ("tender_no");--> statement-breakpoint
CREATE INDEX "tender_results_tender_id_idx" ON "tender_results" USING btree ("tender_id");--> statement-breakpoint
CREATE INDEX "tender_results_status_idx" ON "tender_results" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tender_results_reverse_auction_id_idx" ON "tender_results" USING btree ("reverse_auction_id");