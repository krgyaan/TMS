ALTER TABLE "payment_instruments" RENAME COLUMN "generated_pdfs" TO "extra_pdf_paths";--> statement-breakpoint
ALTER TABLE "payment_instruments" DROP CONSTRAINT "payment_instruments_docket_no_unique";--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ALTER COLUMN "prefilled_signed_bg" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "bg_needs" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "bg_purpose" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "bg_soft_copy" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "bg_po" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "bg_client_user" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "bg_client_cp" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "bg_client_fin" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "bg_bank_acc" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "bg_bank_ifsc" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "courier_no" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "approve_bg" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "bg_format_te" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "bg_format_tl" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "sfms_conf" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "fdr_amt" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "fdr_per" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "fdr_copy" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "fdr_no" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "fdr_validity" date;--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "fdr_roi" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "bg_charge_deducted" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "new_stamp_charge_deducted" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "stamp_covering_letter" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "cancel_remark" text;--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "cancell_confirm" text;--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "bg_fdr_cancel_date" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "bg_fdr_cancel_amount" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "bg_fdr_cancel_ref_no" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "bg2_remark" text;--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "reason_req" text;--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "linked_dd_id" integer;--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "linked_fdr_id" integer;--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "req_type" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "cheque_needs" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "cheque_reason" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "due_date" date;--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "transfer_date" date;--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "bt_transfer_date" date;--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "handover" varchar(200);--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "confirmation" varchar(200);--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "reference" varchar(200);--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "stop_reason_text" text;--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "amount" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "dd_needs" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "dd_purpose" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" ADD COLUMN "fdr_expiry_date" date;--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" ADD COLUMN "fdr_needs" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" ADD COLUMN "fdr_remark" text;--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "instrument_transfer_details" ADD COLUMN "utr_msg" text;--> statement-breakpoint
ALTER TABLE "instrument_transfer_details" ADD COLUMN "utr_num" varchar(200);--> statement-breakpoint
ALTER TABLE "instrument_transfer_details" ADD COLUMN "is_netbanking" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_transfer_details" ADD COLUMN "is_debit" varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_transfer_details" ADD COLUMN "return_transfer_date" date;--> statement-breakpoint
ALTER TABLE "instrument_transfer_details" ADD COLUMN "return_utr" varchar(200);--> statement-breakpoint
ALTER TABLE "instrument_transfer_details" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "instrument_transfer_details" ADD COLUMN "remarks" text;--> statement-breakpoint
ALTER TABLE "instrument_transfer_details" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "instrument_transfer_details" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD COLUMN "req_no" varchar(200);--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD COLUMN "req_receive" varchar(500);--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD COLUMN "reference_no" varchar(200);--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD COLUMN "transfer_date" date;--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD COLUMN "credit_date" date;--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD COLUMN "credit_amount" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD COLUMN "legacy_data" jsonb;