import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import {
    employeeProfiles,
    organizations,
    poApprovalAuditLogs,
    poApprovalSteps,
    poApprovalWorkflows,
    roles,
    tenderInfos,
    users,
} from "@/db/schemas";
import { OperationNotificationService } from "@/modules/operations/operation-notification.service";
import { WhatsappJidResolver } from "@/modules/notifications/helpers/whatsapp-jid.resolver";

export interface ResolvedApprover {
    userId: number;
    name: string;
    mobile: string | null;
    jid: string | null;
}

export interface StartPoApprovalWorkflowInput {
    purchaseOrderId: number;
    poNumber: string;
    tenderId?: number | null;
    projectName?: string | null;
    sellerName?: string | null;
    grandTotal: string | number;
    teamId?: number | null;
    createdBy: number;
    itemsSummary?: string | null;
}

@Injectable()
export class PoApprovalService {
    private readonly logger = new Logger(PoApprovalService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly notifications: OperationNotificationService,
        private readonly jidResolver: WhatsappJidResolver
    ) {}

    /**
     * Resolve the Team Leader (Stage 1 approver) for the PO creator:
     * 1. `hrms_employee_profiles.reporting_tl` for `creatorUserId` (active, non-deleted).
     * 2. Fallback: active, non-deleted Team Leader (`role_id = 3` or `roles.name ILIKE 'Team Leader'`)
     *    in the creator's `COALESCE(users.primary_team_id, users.team)` or `poTeamId`.
     */
    async resolveStage1Tl(creatorUserId: number, poTeamId?: number | null): Promise<ResolvedApprover | null> {
        const [profile] = await this.db
            .select({ reportingTl: employeeProfiles.reportingTl })
            .from(employeeProfiles)
            .where(eq(employeeProfiles.userId, creatorUserId))
            .limit(1);

        if (profile?.reportingTl) {
            const [tlUser] = await this.db
                .select({
                    id: users.id,
                    name: users.name,
                    mobile: users.mobile,
                })
                .from(users)
                .where(and(eq(users.id, profile.reportingTl), eq(users.isActive, true), isNull(users.deletedAt)))
                .limit(1);

            if (tlUser) {
                const jid = await this.jidResolver.toJid(tlUser.id);
                return {
                    userId: tlUser.id,
                    name: tlUser.name,
                    mobile: tlUser.mobile ?? null,
                    jid,
                };
            }
        }

        const [creator] = await this.db
            .select({
                primaryTeamId: users.primaryTeamId,
                team: users.team,
            })
            .from(users)
            .where(eq(users.id, creatorUserId))
            .limit(1);

        const resolvedTeamId = creator?.primaryTeamId ?? creator?.team ?? poTeamId ?? null;
        if (resolvedTeamId == null) {
            return null;
        }

        const [teamTl] = await this.db
            .select({
                id: users.id,
                name: users.name,
                mobile: users.mobile,
            })
            .from(users)
            .leftJoin(roles, eq(users.roleId, roles.id))
            .where(
                and(
                    eq(users.isActive, true),
                    isNull(users.deletedAt),
                    or(eq(users.primaryTeamId, resolvedTeamId), eq(users.team, resolvedTeamId)),
                    or(eq(users.roleId, 3), ilike(roles.name, "Team Leader"))
                )
            )
            .orderBy(users.id)
            .limit(1);

        if (!teamTl) {
            return null;
        }

        const jid = await this.jidResolver.toJid(teamTl.id);
        return {
            userId: teamTl.id,
            name: teamTl.name,
            mobile: teamTl.mobile ?? null,
            jid,
        };
    }

    /**
     * Start Stage 1 (Team Leader) of the WhatsApp PO approval workflow when a PO is created.
     * Never throws on missing approver/mobile or WhatsApp delivery failure.
     */
    async startWorkflowForPo(input: StartPoApprovalWorkflowInput): Promise<{ workflowId: number; status: string }> {
        const [creator] = await this.db
            .select({
                name: users.name,
                primaryTeamId: users.primaryTeamId,
                team: users.team,
            })
            .from(users)
            .where(eq(users.id, input.createdBy))
            .limit(1);

        const createdByName = creator?.name ?? "Unknown";
        const effectiveTeamId = input.teamId ?? creator?.primaryTeamId ?? creator?.team ?? null;

        // Supersede any existing in_progress workflows for this PO
        await this.db
            .update(poApprovalWorkflows)
            .set({ status: "superseded", updatedAt: new Date() })
            .where(and(eq(poApprovalWorkflows.purchaseOrderId, input.purchaseOrderId), eq(poApprovalWorkflows.status, "in_progress")));

        const [latestWorkflow] = await this.db
            .select({ version: poApprovalWorkflows.version })
            .from(poApprovalWorkflows)
            .where(eq(poApprovalWorkflows.purchaseOrderId, input.purchaseOrderId))
            .orderBy(desc(poApprovalWorkflows.version))
            .limit(1);

        const nextVersion = (latestWorkflow?.version ?? 0) + 1;

        const [workflow] = await this.db
            .insert(poApprovalWorkflows)
            .values({
                purchaseOrderId: input.purchaseOrderId,
                version: nextVersion,
                status: "in_progress",
                currentStage: 1,
                initiatedBy: input.createdBy,
            })
            .returning();

        await this.db.insert(poApprovalAuditLogs).values({
            purchaseOrderId: input.purchaseOrderId,
            workflowId: workflow.id,
            eventType: "workflow_started",
            actorUserId: input.createdBy,
            metadata: { version: nextVersion, teamId: effectiveTeamId },
        });

        const tl = await this.resolveStage1Tl(input.createdBy, effectiveTeamId);

        if (!tl) {
            this.logger.warn(`No Team Leader found for PO #${input.purchaseOrderId} (creator ${input.createdBy}); marking Stage 1 blocked.`);
            await this.db.insert(poApprovalSteps).values({
                workflowId: workflow.id,
                purchaseOrderId: input.purchaseOrderId,
                stageOrder: 1,
                stageRole: "tl",
                status: "blocked",
                skipReason: "missing_tl",
            });
            return { workflowId: workflow.id, status: workflow.status };
        }

        if (tl.userId === input.createdBy) {
            this.logger.log(`PO #${input.purchaseOrderId} creator ${input.createdBy} is their own TL; skipping Stage 1.`);
            await this.db.insert(poApprovalSteps).values({
                workflowId: workflow.id,
                purchaseOrderId: input.purchaseOrderId,
                stageOrder: 1,
                stageRole: "tl",
                approverUserId: tl.userId,
                approverNameSnapshot: tl.name,
                approverMobileSnapshot: tl.mobile,
                approverJid: tl.jid,
                status: "skipped",
                skipReason: "self_approver",
                actedAt: new Date(),
            });
            return { workflowId: workflow.id, status: workflow.status };
        }

        if (!tl.jid) {
            this.logger.warn(`TL ${tl.name} (user ${tl.userId}) has no mobile number for PO #${input.purchaseOrderId}; marking Stage 1 blocked.`);
            await this.db.insert(poApprovalSteps).values({
                workflowId: workflow.id,
                purchaseOrderId: input.purchaseOrderId,
                stageOrder: 1,
                stageRole: "tl",
                approverUserId: tl.userId,
                approverNameSnapshot: tl.name,
                approverMobileSnapshot: tl.mobile,
                status: "blocked",
                skipReason: "missing_mobile",
            });
            return { workflowId: workflow.id, status: workflow.status };
        }

        const [step] = await this.db
            .insert(poApprovalSteps)
            .values({
                workflowId: workflow.id,
                purchaseOrderId: input.purchaseOrderId,
                stageOrder: 1,
                stageRole: "tl",
                approverUserId: tl.userId,
                approverNameSnapshot: tl.name,
                approverMobileSnapshot: tl.mobile,
                approverJid: tl.jid,
                status: "active",
            })
            .returning();

        let tenderNo: string | null = null;
        let tenderName: string | null = null;
        let organizationName: string | null = null;
        if (input.tenderId) {
            const [tender] = await this.db
                .select({
                    tenderNo: tenderInfos.tenderNo,
                    tenderName: tenderInfos.tenderName,
                    organizationName: organizations.name,
                })
                .from(tenderInfos)
                .leftJoin(organizations, eq(tenderInfos.organization, organizations.id))
                .where(eq(tenderInfos.id, input.tenderId))
                .limit(1);

            if (tender) {
                tenderNo = tender.tenderNo;
                tenderName = tender.tenderName;
                organizationName = tender.organizationName;
            }
        }

        const { dmMessageId, dmChatId } = await this.notifications.sendPoApprovalStageMessages({
            purchaseOrderId: input.purchaseOrderId,
            poNumber: input.poNumber,
            stageOrder: 1,
            stageRole: "tl",
            approverJid: tl.jid,
            approverName: tl.name,
            teamId: effectiveTeamId,
            tenderNo,
            tenderName,
            organizationName,
            projectName: input.projectName,
            sellerName: input.sellerName,
            itemsSummary: input.itemsSummary,
            grandTotal: input.grandTotal,
            createdByName,
        });

        await this.db
            .update(poApprovalSteps)
            .set({
                waMessageId: dmMessageId,
                waChatId: dmChatId,
                sentAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(poApprovalSteps.id, step.id));

        await this.db.insert(poApprovalAuditLogs).values([
            {
                purchaseOrderId: input.purchaseOrderId,
                workflowId: workflow.id,
                stepId: step.id,
                eventType: "dm_sent",
                actorUserId: tl.userId,
                senderJid: dmChatId,
                waMessageId: dmMessageId,
                metadata: { stageOrder: 1, stageRole: "tl" },
            },
            {
                purchaseOrderId: input.purchaseOrderId,
                workflowId: workflow.id,
                stepId: step.id,
                eventType: "group_broadcast_sent",
                actorUserId: input.createdBy,
                metadata: { stageOrder: 1, stageRole: "tl", teamId: effectiveTeamId },
            },
        ]);

        return { workflowId: workflow.id, status: workflow.status };
    }
}
