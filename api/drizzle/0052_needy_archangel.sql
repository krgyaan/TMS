DROP TYPE "public"."tq_status";--> statement-breakpoint
CREATE TYPE "public"."tq_status" AS ENUM('TQ Received', 'TQ Replied', 'TQ Missed', 'TQ Qualified', 'No TQ, Qualified');