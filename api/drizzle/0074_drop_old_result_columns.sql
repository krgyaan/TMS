ALTER TABLE "tender_results" DROP COLUMN IF EXISTS "result";--> statement-breakpoint
ALTER TABLE "tender_results" DROP COLUMN IF EXISTS "l1_price";--> statement-breakpoint
ALTER TABLE "tender_results" DROP COLUMN IF EXISTS "l2_price";--> statement-breakpoint
ALTER TABLE "tender_results" DROP COLUMN IF EXISTS "our_price";--> statement-breakpoint
ALTER TABLE "tender_results" DROP COLUMN IF EXISTS "qualified_parties_screenshot";--> statement-breakpoint
ALTER TABLE "tender_results" DROP COLUMN IF EXISTS "final_result_screenshot";--> statement-breakpoint
ALTER TABLE "tender_results" DROP COLUMN IF EXISTS "result_uploaded_at";--> statement-breakpoint
ALTER TABLE "tender_results" DROP COLUMN IF EXISTS "result_reason";
