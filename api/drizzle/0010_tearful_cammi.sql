ALTER TABLE "tender_infos" ALTER COLUMN "team" SET DATA TYPE bigint USING team::bigint;--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "item" SET DATA TYPE bigint USING item::bigint;--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "team_member" SET DATA TYPE bigint USING team_member::bigint;--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "status" SET DATA TYPE bigint USING status::bigint;--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "status" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "location" SET DATA TYPE bigint USING location::bigint;--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "website" SET DATA TYPE bigint USING website::bigint;--> statement-breakpoint
ALTER TABLE "tender_infos" ADD CONSTRAINT "tender_infos_team_teams_id_fk" FOREIGN KEY ("team") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_infos" ADD CONSTRAINT "tender_infos_item_items_id_fk" FOREIGN KEY ("item") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_infos" ADD CONSTRAINT "tender_infos_team_member_users_id_fk" FOREIGN KEY ("team_member") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_infos" ADD CONSTRAINT "tender_infos_status_statuses_id_fk" FOREIGN KEY ("status") REFERENCES "public"."statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_infos" ADD CONSTRAINT "tender_infos_location_locations_id_fk" FOREIGN KEY ("location") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_infos" ADD CONSTRAINT "tender_infos_website_websites_id_fk" FOREIGN KEY ("website") REFERENCES "public"."websites"("id") ON DELETE no action ON UPDATE no action;
