CREATE TABLE "instrument_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"from_status" varchar(100),
	"to_status" varchar(100) NOT NULL,
	"from_action" integer,
	"to_action" integer,
	"from_stage" integer,
	"to_stage" integer,
	"form_data" jsonb,
	"remarks" text,
	"rejection_reason" text,
	"is_resubmission" boolean DEFAULT false,
	"previous_instrument_id" integer,
	"changed_by" integer,
	"changed_by_name" varchar(255),
	"changed_by_role" varchar(100),
	"changed_at" timestamp DEFAULT now(),
	"ip_address" varchar(50),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ALTER COLUMN "bg_soft_copy" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ALTER COLUMN "bg_po" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ALTER COLUMN "approve_bg" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ALTER COLUMN "bg_format_te" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ALTER COLUMN "bg_format_tl" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ALTER COLUMN "sfms_conf" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ALTER COLUMN "fdr_copy" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ALTER COLUMN "stamp_covering_letter" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "payment_instruments" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "payment_instruments" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_instruments" ALTER COLUMN "action" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "extension_request_pdf" varchar(500);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "docket_no" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "docket_slip" varchar(500);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "courier_dispatch_date" date;--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "courier_received_date" date;--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "cancellation_request_pdf" varchar(500);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "bg_cancellation_date" date;--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "stop_date" date;--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "transfer_amount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "transfer_utr" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "deposited_amount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "cancellation_date" date;--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "courier_docket_no" varchar(200);--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "courier_docket_slip" varchar(500);--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "courier_dispatch_date" date;--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "courier_received_date" date;--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "return_transfer_date" date;--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "return_utr" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "return_amount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "settlement_date" date;--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "settlement_reference" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "settlement_amount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "cancellation_request_date" date;--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "cancellation_request_pdf" varchar(500);--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "cancellation_date" date;--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "cancellation_reference_no" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "credited_amount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "credited_date" date;--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" ADD COLUMN "courier_docket_no" varchar(200);--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" ADD COLUMN "courier_docket_slip" varchar(500);--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" ADD COLUMN "courier_dispatch_date" date;--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" ADD COLUMN "courier_received_date" date;--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" ADD COLUMN "return_transfer_date" date;--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" ADD COLUMN "return_utr" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" ADD COLUMN "return_amount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" ADD COLUMN "return_reference_no" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_transfer_details" ADD COLUMN "return_amount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "instrument_transfer_details" ADD COLUMN "settlement_date" date;--> statement-breakpoint
ALTER TABLE "instrument_transfer_details" ADD COLUMN "settlement_reference" varchar(255);--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD COLUMN "current_stage" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD COLUMN "superseded_by_id" integer;--> statement-breakpoint
ALTER TABLE "instrument_status_history" ADD CONSTRAINT "fk_status_history_instrument" FOREIGN KEY ("instrument_id") REFERENCES "public"."payment_instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_status_history" ADD CONSTRAINT "fk_status_history_user" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_status_history" ADD CONSTRAINT "fk_status_history_previous_instrument" FOREIGN KEY ("previous_instrument_id") REFERENCES "public"."payment_instruments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "status_history_instrument_id_idx" ON "instrument_status_history" USING btree ("instrument_id");--> statement-breakpoint
CREATE INDEX "status_history_changed_at_idx" ON "instrument_status_history" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "status_history_to_status_idx" ON "instrument_status_history" USING btree ("to_status");--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD CONSTRAINT "instrument_bg_details_instrument_id_payment_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."payment_instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD CONSTRAINT "instrument_cheque_details_instrument_id_payment_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."payment_instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD CONSTRAINT "instrument_dd_details_instrument_id_payment_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."payment_instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" ADD CONSTRAINT "instrument_fdr_details_instrument_id_payment_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."payment_instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_transfer_details" ADD CONSTRAINT "instrument_transfer_details_instrument_id_payment_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."payment_instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD CONSTRAINT "fk_instrument_request" FOREIGN KEY ("request_id") REFERENCES "public"."payment_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD CONSTRAINT "fk_instrument_superseded_by" FOREIGN KEY ("superseded_by_id") REFERENCES "public"."payment_instruments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "instruments_type_idx" ON "payment_instruments" USING btree ("instrument_type");--> statement-breakpoint
CREATE INDEX "instruments_status_idx" ON "payment_instruments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "instruments_utr_idx" ON "payment_instruments" USING btree ("utr");--> statement-breakpoint
CREATE INDEX "instruments_request_id_idx" ON "payment_instruments" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "instruments_is_active_idx" ON "payment_instruments" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "payment_requests_purpose_idx" ON "payment_requests" USING btree ("purpose");--> statement-breakpoint
CREATE INDEX "payment_requests_legacy_emd_id_idx" ON "payment_requests" USING btree ("legacy_emd_id");--> statement-breakpoint
CREATE INDEX "payment_requests_tender_id_idx" ON "payment_requests" USING btree ("tender_id");--> statement-breakpoint
ALTER TABLE "instrument_bg_details" DROP COLUMN "cancellation_letter_path";--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" DROP COLUMN "amount";
