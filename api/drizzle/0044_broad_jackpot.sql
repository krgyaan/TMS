CREATE TYPE "public"."entity_type" AS ENUM('TENDER', 'COURIER', 'EMD', 'SERVICE_AMC', 'SERVICE_VISIT', 'CRM_LEAD', 'CRM_QUOTATION', 'OPERATION_KICKOFF', 'OPERATION_CONTRACT');--> statement-breakpoint
CREATE TYPE "public"."timer_status" AS ENUM('NOT_STARTED', 'RUNNING', 'PAUSED', 'COMPLETED', 'OVERDUE', 'SKIPPED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."timer_type" AS ENUM('FIXED_DURATION', 'DEADLINE_BASED', 'NEGATIVE_COUNTDOWN', 'DYNAMIC', 'NO_TIMER');--> statement-breakpoint
CREATE TYPE "public"."workflow_step_status" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'REJECTED', 'ON_HOLD');--> statement-breakpoint
CREATE TABLE "wf_business_calendar" (
	"id" bigint PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"is_holiday" boolean DEFAULT false NOT NULL,
	"is_weekend" boolean DEFAULT false NOT NULL,
	"holiday_name" varchar(255),
	"holiday_type" varchar(50),
	"location_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wf_instances" (
	"id" bigint PRIMARY KEY NOT NULL,
	"workflow_template_id" bigint NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"entity_id" bigint NOT NULL,
	"status" "workflow_step_status" DEFAULT 'PENDING' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"total_steps" integer DEFAULT 0 NOT NULL,
	"completed_steps" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wf_step_instances" (
	"id" bigint PRIMARY KEY NOT NULL,
	"workflow_instance_id" bigint NOT NULL,
	"workflow_step_id" bigint NOT NULL,
	"status" "workflow_step_status" DEFAULT 'PENDING' NOT NULL,
	"timer_status" timer_status DEFAULT 'NOT_STARTED' NOT NULL,
	"assigned_to_user_id" bigint,
	"scheduled_start_at" timestamp,
	"actual_start_at" timestamp,
	"scheduled_end_at" timestamp,
	"actual_end_at" timestamp,
	"custom_duration_hours" integer,
	"custom_deadline" timestamp,
	"total_paused_duration_ms" integer DEFAULT 0 NOT NULL,
	"extension_duration_ms" integer DEFAULT 0 NOT NULL,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"rejection_count" integer DEFAULT 0 NOT NULL,
	"should_reset_on_rejection" boolean DEFAULT false NOT NULL,
	"allocated_time_ms" integer,
	"actual_time_ms" integer,
	"remaining_time_ms" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wf_steps" (
	"id" bigint PRIMARY KEY NOT NULL,
	"workflow_template_id" bigint NOT NULL,
	"step_key" varchar(100) NOT NULL,
	"step_name" varchar(255) NOT NULL,
	"step_order" integer NOT NULL,
	"description" text,
	"assigned_role" varchar(50) NOT NULL,
	"timer_type" timer_type NOT NULL,
	"default_duration_hours" integer,
	"is_business_days_only" boolean DEFAULT true NOT NULL,
	"warning_threshold" integer DEFAULT 80 NOT NULL,
	"critical_threshold" integer DEFAULT 100 NOT NULL,
	"hours_before_deadline" integer,
	"depends_on_steps" jsonb,
	"can_run_in_parallel" boolean DEFAULT false NOT NULL,
	"start_trigger" jsonb,
	"end_trigger" jsonb,
	"is_optional" boolean DEFAULT false NOT NULL,
	"allow_skip" boolean DEFAULT false NOT NULL,
	"conditional_logic" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wf_templates" (
	"id" bigint PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"team_id" bigint,
	"entity_type" "entity_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" bigint,
	CONSTRAINT "wf_templates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "wf_timer_events" (
	"id" bigint PRIMARY KEY NOT NULL,
	"step_instance_id" bigint NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"performed_by_user_id" bigint,
	"previous_status" timer_status,
	"new_status" timer_status,
	"duration_change_ms" integer,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wf_working_hours_config" (
	"id" bigint PRIMARY KEY NOT NULL,
	"team_id" bigint,
	"day_of_week" integer NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"is_working_day" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wf_instances" ADD CONSTRAINT "wf_instances_workflow_template_id_wf_templates_id_fk" FOREIGN KEY ("workflow_template_id") REFERENCES "public"."wf_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wf_step_instances" ADD CONSTRAINT "wf_step_instances_workflow_instance_id_wf_instances_id_fk" FOREIGN KEY ("workflow_instance_id") REFERENCES "public"."wf_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wf_step_instances" ADD CONSTRAINT "wf_step_instances_workflow_step_id_wf_steps_id_fk" FOREIGN KEY ("workflow_step_id") REFERENCES "public"."wf_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wf_step_instances" ADD CONSTRAINT "wf_step_instances_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wf_steps" ADD CONSTRAINT "wf_steps_workflow_template_id_wf_templates_id_fk" FOREIGN KEY ("workflow_template_id") REFERENCES "public"."wf_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wf_templates" ADD CONSTRAINT "wf_templates_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wf_templates" ADD CONSTRAINT "wf_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wf_timer_events" ADD CONSTRAINT "wf_timer_events_step_instance_id_wf_step_instances_id_fk" FOREIGN KEY ("step_instance_id") REFERENCES "public"."wf_step_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wf_timer_events" ADD CONSTRAINT "wf_timer_events_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wf_working_hours_config" ADD CONSTRAINT "wf_working_hours_config_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;