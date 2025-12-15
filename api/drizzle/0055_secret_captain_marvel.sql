CREATE TABLE "follow_up_persons" (
	"id" bigint PRIMARY KEY NOT NULL,
	"follow_up_id" bigint NOT NULL,
	"name" varchar(255),
	"email" varchar(255),
	"phone" varchar(20),
	"organization" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tender_information" RENAME COLUMN "wo1_required" TO "work_value_type";--> statement-breakpoint
ALTER TABLE "tender_information" RENAME COLUMN "wo1_custom" TO "custom_eligibility_criteria";--> statement-breakpoint
ALTER TABLE "tender_information" RENAME COLUMN "wo2_required" TO "client_organization";--> statement-breakpoint
ALTER TABLE "oauth_accounts" DROP CONSTRAINT "oauth_accounts_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_role_id_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permission_id_permissions_id_fk";
--> statement-breakpoint
ALTER TABLE "user_permissions" DROP CONSTRAINT "user_permissions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_permissions" DROP CONSTRAINT "user_permissions_permission_id_permissions_id_fk";
--> statement-breakpoint
ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_designation_id_designations_id_fk";
--> statement-breakpoint
ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_primary_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_role_id_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "company_documents" DROP CONSTRAINT "company_documents_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "item_headings" DROP CONSTRAINT "item_headings_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "items" DROP CONSTRAINT "items_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "items" DROP CONSTRAINT "items_heading_id_item_headings_id_fk";
--> statement-breakpoint
ALTER TABLE "organizations" DROP CONSTRAINT "organizations_industry_id_industries_id_fk";
--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_organisation_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_item_id_items_id_fk";
--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_location_id_locations_id_fk";
--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT "teams_parent_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "follow_ups" DROP CONSTRAINT "follow_ups_category_id_followup_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "follow_ups" DROP CONSTRAINT "follow_ups_assigned_to_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "follow_ups" DROP CONSTRAINT "follow_ups_created_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "bid_submissions" DROP CONSTRAINT "bid_submissions_tender_id_tender_infos_id_fk";
--> statement-breakpoint
ALTER TABLE "bid_submissions" DROP CONSTRAINT "bid_submissions_submitted_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "physical_docs_persons" DROP CONSTRAINT "physical_docs_persons_physical_doc_id_physical_docs_id_fk";
--> statement-breakpoint
ALTER TABLE "reverse_auctions" DROP CONSTRAINT "reverse_auctions_tender_id_tender_infos_id_fk";
--> statement-breakpoint
ALTER TABLE "rfq_items" DROP CONSTRAINT "rfq_items_rfq_id_rfqs_id_fk";
--> statement-breakpoint
ALTER TABLE "rfq_response_documents" DROP CONSTRAINT "rfq_response_documents_rfq_response_id_rfq_responses_id_fk";
--> statement-breakpoint
ALTER TABLE "rfq_response_items" DROP CONSTRAINT "rfq_response_items_rfq_response_id_rfq_responses_id_fk";
--> statement-breakpoint
ALTER TABLE "rfq_response_items" DROP CONSTRAINT "rfq_response_items_item_id_rfq_items_id_fk";
--> statement-breakpoint
ALTER TABLE "rfq_responses" DROP CONSTRAINT "rfq_responses_rfq_id_rfqs_id_fk";
--> statement-breakpoint
ALTER TABLE "rfq_responses" DROP CONSTRAINT "rfq_responses_vendor_id_vendors_id_fk";
--> statement-breakpoint
ALTER TABLE "rfqs" DROP CONSTRAINT "rfqs_tender_id_tender_infos_id_fk";
--> statement-breakpoint
ALTER TABLE "tender_document_checklists" DROP CONSTRAINT "tender_document_checklists_tender_id_tender_infos_id_fk";
--> statement-breakpoint
ALTER TABLE "tender_document_checklists" DROP CONSTRAINT "tender_document_checklists_submitted_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tender_queries" DROP CONSTRAINT "tender_queries_tender_id_tender_infos_id_fk";
--> statement-breakpoint
ALTER TABLE "tender_queries" DROP CONSTRAINT "tender_queries_received_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tender_queries" DROP CONSTRAINT "tender_queries_replied_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tender_query_items" DROP CONSTRAINT "tender_query_items_tender_query_id_tender_queries_id_fk";
--> statement-breakpoint
ALTER TABLE "tender_query_items" DROP CONSTRAINT "tender_query_items_tq_type_id_tq_types_id_fk";
--> statement-breakpoint
ALTER TABLE "tender_results" DROP CONSTRAINT "tender_results_tender_id_tender_infos_id_fk";
--> statement-breakpoint
ALTER TABLE "tender_results" DROP CONSTRAINT "tender_results_reverse_auction_id_reverse_auctions_id_fk";
--> statement-breakpoint
ALTER TABLE "tender_status_history" DROP CONSTRAINT "tender_status_history_tender_id_tender_infos_id_fk";
--> statement-breakpoint
ALTER TABLE "tender_status_history" DROP CONSTRAINT "tender_status_history_prev_status_statuses_id_fk";
--> statement-breakpoint
ALTER TABLE "tender_status_history" DROP CONSTRAINT "tender_status_history_new_status_statuses_id_fk";
--> statement-breakpoint
ALTER TABLE "tender_status_history" DROP CONSTRAINT "tender_status_history_changed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tender_infos" DROP CONSTRAINT "tender_infos_team_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "vendor_accs" DROP CONSTRAINT "vendor_accs_org_vendor_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "vendor_files" DROP CONSTRAINT "vendor_files_vendor_id_vendors_id_fk";
--> statement-breakpoint
ALTER TABLE "vendor_gsts" DROP CONSTRAINT "vendor_gsts_org_vendor_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "vendors" DROP CONSTRAINT "vendors_organization_id_vendor_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "wf_instances" DROP CONSTRAINT "wf_instances_workflow_template_id_wf_templates_id_fk";
--> statement-breakpoint
ALTER TABLE "wf_step_instances" DROP CONSTRAINT "wf_step_instances_workflow_instance_id_wf_instances_id_fk";
--> statement-breakpoint
ALTER TABLE "wf_step_instances" DROP CONSTRAINT "wf_step_instances_workflow_step_id_wf_steps_id_fk";
--> statement-breakpoint
ALTER TABLE "wf_step_instances" DROP CONSTRAINT "wf_step_instances_assigned_to_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "wf_steps" DROP CONSTRAINT "wf_steps_workflow_template_id_wf_templates_id_fk";
--> statement-breakpoint
ALTER TABLE "wf_templates" DROP CONSTRAINT "wf_templates_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "wf_templates" DROP CONSTRAINT "wf_templates_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "wf_timer_events" DROP CONSTRAINT "wf_timer_events_step_instance_id_wf_step_instances_id_fk";
--> statement-breakpoint
ALTER TABLE "wf_timer_events" DROP CONSTRAINT "wf_timer_events_performed_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "wf_working_hours_config" DROP CONSTRAINT "wf_working_hours_config_team_id_teams_id_fk";
--> statement-breakpoint
DROP INDEX "idx_followups_frequency";--> statement-breakpoint
DROP INDEX "idx_followups_stop_reason";--> statement-breakpoint
DROP INDEX "idx_followups_amount_calc";--> statement-breakpoint
DROP INDEX "idx_followups_category";--> statement-breakpoint
ALTER TABLE "couriers" ALTER COLUMN "id" SET DEFAULT nextval('couriers_id_seq');--> statement-breakpoint
ALTER TABLE "couriers" ALTER COLUMN "to_pin" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "couriers" ALTER COLUMN "to_mobile" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "couriers" ALTER COLUMN "courier_provider" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "couriers" ALTER COLUMN "docket_no" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "couriers" ALTER COLUMN "tracking_number" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "follow_ups" ALTER COLUMN "id" SET DEFAULT nextval('follow_ups_id_seq');--> statement-breakpoint
ALTER TABLE "follow_ups" ALTER COLUMN "assigned_to_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "follow_ups" ALTER COLUMN "created_by_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "follow_ups" ALTER COLUMN "assignment_status" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "follow_ups" ALTER COLUMN "assignment_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "follow_ups" ALTER COLUMN "assignment_status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "follow_ups" ALTER COLUMN "frequency" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "follow_ups" ALTER COLUMN "frequency" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "follow_ups" ALTER COLUMN "start_from" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "couriers" ADD COLUMN "docket_slip" varchar(255);--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "followup_for" varchar(255);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "tender_value_gst_inclusive" numeric(15, 2);--> statement-breakpoint
CREATE INDEX "idx_follow_up_persons_follow_up" ON "follow_up_persons" USING btree ("follow_up_id");--> statement-breakpoint
CREATE INDEX "idx_follow_up_persons_email" ON "follow_up_persons" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_follow_up_persons_phone" ON "follow_up_persons" USING btree ("phone");--> statement-breakpoint
ALTER TABLE "follow_ups" DROP COLUMN "category_id";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "wo2_custom";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "wo3_required";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "wo3_custom";
