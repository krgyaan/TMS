CREATE TABLE "client_directory" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"organization" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_client_email" UNIQUE("email"),
	CONSTRAINT "unique_client_phone" UNIQUE("phone")
);
--> statement-breakpoint
CREATE INDEX "idx_client_directory_name" ON "client_directory" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_client_directory_org" ON "client_directory" USING btree ("organization");--> statement-breakpoint
CREATE INDEX "idx_client_directory_email" ON "client_directory" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_client_directory_phone" ON "client_directory" USING btree ("phone");