ALTER TABLE "couriers" ADD COLUMN "courier_provider" varchar(100);--> statement-breakpoint
ALTER TABLE "couriers" ADD COLUMN "pickup_date" timestamp;--> statement-breakpoint
ALTER TABLE "couriers" ADD COLUMN "docket_no" varchar(100);--> statement-breakpoint
ALTER TABLE "couriers" ADD COLUMN "delivery_date" timestamp;--> statement-breakpoint
ALTER TABLE "couriers" ADD COLUMN "delivery_pod" varchar(255);--> statement-breakpoint
ALTER TABLE "couriers" ADD COLUMN "within_time" boolean;