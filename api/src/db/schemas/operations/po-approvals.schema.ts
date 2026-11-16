import {
    pgTable,
    bigserial,
    bigint,
    integer,
    varchar,
    text,
    numeric,
    timestamp,
    jsonb,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { users } from "@/db/schemas/auth/users.schema";

export type PoApprovalWorkflowStatus =
    | "in_progress"
    | "approved"
    | "rejected"
    | "superseded"
    | "completed_in_app";

export type PoApprovalStageRole = "tl" | "accounts";

export type PoApprovalStepStatus =
    | "pending"
    | "active"
    | "approved"
    | "rejected"
    | "skipped"
    | "superseded"
    | "blocked";

export type PoApprovalAuditEventType =
    | "workflow_started"
    | "dm_sent"
    | "group_broadcast_sent"
    | "reply_received"
    | "reply_ignored"
    | "stage_approved"
    | "stage_rejected"
    | "workflow_finalized"
    | "superseded"
    | "in_app_override"
    | "link_resent";

export const poApprovalWorkflows = pgTable(
    "po_approval_workflows",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        purchaseOrderId: bigint("purchase_order_id", { mode: "number" })
            .notNull()
            .references(() => purchaseOrders.id, { onDelete: "cascade" }),
        version: integer("version").notNull().default(1),
        status: varchar("status", { length: 30 })
            .$type<PoApprovalWorkflowStatus>()
            .notNull()
            .default("in_progress"),
        currentStage: integer("current_stage"),
        initiatedBy: bigint("initiated_by", { mode: "number" }).references(() => users.id, {
            onDelete: "set null",
        }),
        finalizedAt: timestamp("finalized_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("idx_po_approval_workflows_po_id").on(table.purchaseOrderId),
        index("idx_po_approval_workflows_status").on(table.status),
        uniqueIndex("uq_po_approval_workflows_po_version").on(
            table.purchaseOrderId,
            table.version
        ),
    ]
);

export const poApprovalSteps = pgTable(
    "po_approval_steps",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        workflowId: bigint("workflow_id", { mode: "number" })
            .notNull()
            .references(() => poApprovalWorkflows.id, { onDelete: "cascade" }),
        purchaseOrderId: bigint("purchase_order_id", { mode: "number" })
            .notNull()
            .references(() => purchaseOrders.id, { onDelete: "cascade" }),
        stageOrder: integer("stage_order").notNull(),
        stageRole: varchar("stage_role", { length: 20 })
            .$type<PoApprovalStageRole>()
            .notNull(),
        approverUserId: bigint("approver_user_id", { mode: "number" }).references(() => users.id, {
            onDelete: "set null",
        }),
        approverNameSnapshot: varchar("approver_name_snapshot", { length: 255 }),
        approverMobileSnapshot: varchar("approver_mobile_snapshot", { length: 20 }),
        approverJid: varchar("approver_jid", { length: 64 }),
        approverLid: varchar("approver_lid", { length: 64 }),
        status: varchar("status", { length: 30 })
            .$type<PoApprovalStepStatus>()
            .notNull()
            .default("pending"),
        skipReason: varchar("skip_reason", { length: 100 }),
        waMessageId: varchar("wa_message_id", { length: 255 }),
        waChatId: varchar("wa_chat_id", { length: 64 }),
        replyMessageId: varchar("reply_message_id", { length: 255 }),
        tdsSection: varchar("tds_section", { length: 30 }),
        tdsPercentage: numeric("tds_percentage", { precision: 5, scale: 2 }),
        decisionRemark: text("decision_remark"),
        sentAt: timestamp("sent_at", { withTimezone: true }),
        actedAt: timestamp("acted_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("idx_po_approval_steps_workflow_id").on(table.workflowId),
        index("idx_po_approval_steps_po_id").on(table.purchaseOrderId),
        index("idx_po_approval_steps_wa_message_id").on(table.waMessageId),
        index("idx_po_approval_steps_status_approver").on(
            table.status,
            table.approverUserId
        ),
        index("idx_po_approval_steps_status_jid").on(table.status, table.approverJid),
        index("idx_po_approval_steps_status_lid").on(table.status, table.approverLid),
        uniqueIndex("uq_po_approval_steps_workflow_stage").on(
            table.workflowId,
            table.stageOrder
        ),
    ]
);

export const poApprovalAuditLogs = pgTable(
    "po_approval_audit_logs",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        purchaseOrderId: bigint("purchase_order_id", { mode: "number" })
            .notNull()
            .references(() => purchaseOrders.id, { onDelete: "cascade" }),
        workflowId: bigint("workflow_id", { mode: "number" }).references(
            () => poApprovalWorkflows.id,
            { onDelete: "cascade" }
        ),
        stepId: bigint("step_id", { mode: "number" }).references(
            () => poApprovalSteps.id,
            { onDelete: "set null" }
        ),
        eventType: varchar("event_type", { length: 50 })
            .$type<PoApprovalAuditEventType>()
            .notNull(),
        actorUserId: bigint("actor_user_id", { mode: "number" }).references(
            () => users.id,
            { onDelete: "set null" }
        ),
        senderJid: varchar("sender_jid", { length: 64 }),
        waMessageId: varchar("wa_message_id", { length: 255 }),
        metadata: jsonb("metadata").notNull().default({}),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("idx_po_approval_audit_logs_po_id").on(table.purchaseOrderId),
        index("idx_po_approval_audit_logs_workflow_id").on(table.workflowId),
    ]
);

export type PoApprovalWorkflow = typeof poApprovalWorkflows.$inferSelect;
export type NewPoApprovalWorkflow = typeof poApprovalWorkflows.$inferInsert;

export type PoApprovalStep = typeof poApprovalSteps.$inferSelect;
export type NewPoApprovalStep = typeof poApprovalSteps.$inferInsert;

export type PoApprovalAuditLog = typeof poApprovalAuditLogs.$inferSelect;
export type NewPoApprovalAuditLog = typeof poApprovalAuditLogs.$inferInsert;
