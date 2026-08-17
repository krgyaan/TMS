CREATE TABLE "project_closure_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"category" varchar(64) NOT NULL,
	"document_name" varchar(64) NOT NULL,
	"files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"uploaded_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_closure_documents" 
ADD CONSTRAINT "project_closure_documents_project_id_projects_id_fk" 
FOREIGN KEY ("project_id") 
REFERENCES "public"."projects"("id") 
ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_closure_documents_project_doc_idx" ON "project_closure_documents" USING btree ("project_id","document_name");
