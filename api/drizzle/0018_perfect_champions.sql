CREATE TABLE "tender_status_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tender_id" bigint NOT NULL,
	"prev_status" bigint,
	"new_status" bigint NOT NULL,
	"comment" text,
	"changed_by" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "physical_docs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tender_id" varchar(255) NOT NULL,
	"courier_no" integer,
	"submitted_docs" varchar(2000),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "physical_docs_persons" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"physical_doc_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tender_status_history" ADD CONSTRAINT "tender_status_history_tender_id_tender_infos_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tender_infos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_status_history" ADD CONSTRAINT "tender_status_history_prev_status_statuses_id_fk" FOREIGN KEY ("prev_status") REFERENCES "public"."statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_status_history" ADD CONSTRAINT "tender_status_history_new_status_statuses_id_fk" FOREIGN KEY ("new_status") REFERENCES "public"."statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_status_history" ADD CONSTRAINT "tender_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_docs_persons" ADD CONSTRAINT "physical_docs_persons_physical_doc_id_physical_docs_id_fk" FOREIGN KEY ("physical_doc_id") REFERENCES "public"."physical_docs"("id") ON DELETE no action ON UPDATE no action;