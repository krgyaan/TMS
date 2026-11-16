-- 2-Stage In-Chat WhatsApp PO Approval Workflow (Stage 1: TL -> Stage 2: Accounts Manager)

CREATE TABLE IF NOT EXISTS "po_approval_workflows" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "purchase_order_id" bigint NOT NULL REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE,
    "version" integer NOT NULL DEFAULT 1,
    "status" varchar(30) NOT NULL DEFAULT 'in_progress',
    "current_stage" integer,
    "initiated_by" bigint REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "finalized_at" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_po_approval_workflows_po_id" ON "po_approval_workflows" ("purchase_order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_po_approval_workflows_status" ON "po_approval_workflows" ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_po_approval_workflows_po_version" ON "po_approval_workflows" ("purchase_order_id", "version");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "po_approval_steps" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "workflow_id" bigint NOT NULL REFERENCES "public"."po_approval_workflows"("id") ON DELETE CASCADE,
    "purchase_order_id" bigint NOT NULL REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE,
    "stage_order" integer NOT NULL,
    "stage_role" varchar(20) NOT NULL,
    "approver_user_id" bigint REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "approver_name_snapshot" varchar(255),
    "approver_mobile_snapshot" varchar(20),
    "approver_jid" varchar(64),
    "approver_lid" varchar(64),
    "status" varchar(30) NOT NULL DEFAULT 'pending',
    "skip_reason" varchar(100),
    "wa_message_id" varchar(255),
    "wa_chat_id" varchar(64),
    "reply_message_id" varchar(255),
    "tds_section" varchar(30),
    "tds_percentage" numeric(5, 2),
    "decision_remark" text,
    "sent_at" timestamptz,
    "acted_at" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_po_approval_steps_workflow_id" ON "po_approval_steps" ("workflow_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_po_approval_steps_po_id" ON "po_approval_steps" ("purchase_order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_po_approval_steps_wa_message_id" ON "po_approval_steps" ("wa_message_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_po_approval_steps_status_approver" ON "po_approval_steps" ("status", "approver_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_po_approval_steps_status_jid" ON "po_approval_steps" ("status", "approver_jid");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_po_approval_steps_status_lid" ON "po_approval_steps" ("status", "approver_lid");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_po_approval_steps_workflow_stage" ON "po_approval_steps" ("workflow_id", "stage_order");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "po_approval_audit_logs" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "purchase_order_id" bigint NOT NULL REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE,
    "workflow_id" bigint REFERENCES "public"."po_approval_workflows"("id") ON DELETE CASCADE,
    "step_id" bigint REFERENCES "public"."po_approval_steps"("id") ON DELETE SET NULL,
    "event_type" varchar(50) NOT NULL,
    "actor_user_id" bigint REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "sender_jid" varchar(64),
    "wa_message_id" varchar(255),
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_po_approval_audit_logs_po_id" ON "po_approval_audit_logs" ("purchase_order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_po_approval_audit_logs_workflow_id" ON "po_approval_audit_logs" ("workflow_id");
