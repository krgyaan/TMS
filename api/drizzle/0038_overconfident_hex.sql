ALTER TABLE "instrument_status_history" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "instrument_status_history" CASCADE;--> statement-breakpoint
ALTER TABLE "instrument_bg_details" DROP CONSTRAINT "instrument_bg_details_instrument_id_payment_instruments_id_fk";
--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" DROP CONSTRAINT "instrument_cheque_details_instrument_id_payment_instruments_id_fk";
--> statement-breakpoint
ALTER TABLE "instrument_dd_details" DROP CONSTRAINT "instrument_dd_details_instrument_id_payment_instruments_id_fk";
--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" DROP CONSTRAINT "instrument_fdr_details_instrument_id_payment_instruments_id_fk";
--> statement-breakpoint
ALTER TABLE "instrument_transfer_details" DROP CONSTRAINT "instrument_transfer_details_instrument_id_payment_instruments_id_fk";
--> statement-breakpoint
ALTER TABLE "payment_instruments" DROP CONSTRAINT "fk_instrument_request";
--> statement-breakpoint
ALTER TABLE "payment_instruments" DROP CONSTRAINT "fk_instrument_superseded_by";
--> statement-breakpoint
DROP INDEX "instruments_type_idx";--> statement-breakpoint
DROP INDEX "instruments_status_idx";--> statement-breakpoint
DROP INDEX "instruments_utr_idx";--> statement-breakpoint
DROP INDEX "instruments_request_id_idx";--> statement-breakpoint
DROP INDEX "instruments_is_active_idx";--> statement-breakpoint
DROP INDEX "payment_requests_purpose_idx";--> statement-breakpoint
DROP INDEX "payment_requests_legacy_emd_id_idx";--> statement-breakpoint
DROP INDEX "payment_requests_tender_id_idx";--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ALTER COLUMN "bg_soft_copy" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ALTER COLUMN "bg_po" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ALTER COLUMN "approve_bg" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ALTER COLUMN "bg_format_te" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ALTER COLUMN "bg_format_tl" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ALTER COLUMN "sfms_conf" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ALTER COLUMN "fdr_copy" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ALTER COLUMN "stamp_covering_letter" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "payment_instruments" ALTER COLUMN "status" SET DEFAULT 'ACCOUNTS_FORM_PENDING';--> statement-breakpoint
ALTER TABLE "instrument_bg_details" ADD COLUMN "cancellation_letter_path" varchar(500);--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" ADD COLUMN "amount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "instrument_dd_details" ADD COLUMN "dd_remarks" text;--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD COLUMN "legacy_dd_id" integer;--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD COLUMN "legacy_fdr_id" integer;--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD COLUMN "legacy_bg_id" integer;--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD COLUMN "legacy_cheque_id" integer;--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD COLUMN "legacy_bt_id" integer;--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD COLUMN "legacy_portal_id" integer;--> statement-breakpoint
ALTER TABLE "instrument_bg_details" DROP COLUMN "extension_request_pdf";--> statement-breakpoint
ALTER TABLE "instrument_bg_details" DROP COLUMN "docket_no";--> statement-breakpoint
ALTER TABLE "instrument_bg_details" DROP COLUMN "docket_slip";--> statement-breakpoint
ALTER TABLE "instrument_bg_details" DROP COLUMN "courier_dispatch_date";--> statement-breakpoint
ALTER TABLE "instrument_bg_details" DROP COLUMN "courier_received_date";--> statement-breakpoint
ALTER TABLE "instrument_bg_details" DROP COLUMN "cancellation_request_pdf";--> statement-breakpoint
ALTER TABLE "instrument_bg_details" DROP COLUMN "bg_cancellation_date";--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" DROP COLUMN "stop_date";--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" DROP COLUMN "transfer_amount";--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" DROP COLUMN "transfer_utr";--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" DROP COLUMN "deposited_amount";--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" DROP COLUMN "cancellation_date";--> statement-breakpoint
ALTER TABLE "instrument_cheque_details" DROP COLUMN "cancellation_reason";--> statement-breakpoint
ALTER TABLE "instrument_dd_details" DROP COLUMN "courier_docket_no";--> statement-breakpoint
ALTER TABLE "instrument_dd_details" DROP COLUMN "courier_docket_slip";--> statement-breakpoint
ALTER TABLE "instrument_dd_details" DROP COLUMN "courier_dispatch_date";--> statement-breakpoint
ALTER TABLE "instrument_dd_details" DROP COLUMN "courier_received_date";--> statement-breakpoint
ALTER TABLE "instrument_dd_details" DROP COLUMN "return_transfer_date";--> statement-breakpoint
ALTER TABLE "instrument_dd_details" DROP COLUMN "return_utr";--> statement-breakpoint
ALTER TABLE "instrument_dd_details" DROP COLUMN "return_amount";--> statement-breakpoint
ALTER TABLE "instrument_dd_details" DROP COLUMN "settlement_date";--> statement-breakpoint
ALTER TABLE "instrument_dd_details" DROP COLUMN "settlement_reference";--> statement-breakpoint
ALTER TABLE "instrument_dd_details" DROP COLUMN "settlement_amount";--> statement-breakpoint
ALTER TABLE "instrument_dd_details" DROP COLUMN "cancellation_request_date";--> statement-breakpoint
ALTER TABLE "instrument_dd_details" DROP COLUMN "cancellation_request_pdf";--> statement-breakpoint
ALTER TABLE "instrument_dd_details" DROP COLUMN "cancellation_date";--> statement-breakpoint
ALTER TABLE "instrument_dd_details" DROP COLUMN "cancellation_reference_no";--> statement-breakpoint
ALTER TABLE "instrument_dd_details" DROP COLUMN "credited_amount";--> statement-breakpoint
ALTER TABLE "instrument_dd_details" DROP COLUMN "credited_date";--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" DROP COLUMN "courier_docket_no";--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" DROP COLUMN "courier_docket_slip";--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" DROP COLUMN "courier_dispatch_date";--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" DROP COLUMN "courier_received_date";--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" DROP COLUMN "return_transfer_date";--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" DROP COLUMN "return_utr";--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" DROP COLUMN "return_amount";--> statement-breakpoint
ALTER TABLE "instrument_fdr_details" DROP COLUMN "return_reference_no";--> statement-breakpoint
ALTER TABLE "instrument_transfer_details" DROP COLUMN "return_amount";--> statement-breakpoint
ALTER TABLE "instrument_transfer_details" DROP COLUMN "settlement_date";--> statement-breakpoint
ALTER TABLE "instrument_transfer_details" DROP COLUMN "settlement_reference";--> statement-breakpoint
ALTER TABLE "payment_instruments" DROP COLUMN "superseded_by_id";
