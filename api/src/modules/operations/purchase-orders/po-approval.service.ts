import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import {
    employeeProfiles,
    organizations,
    poApprovalAuditLogs,
    poApprovalSteps,
    poApprovalWorkflows,
    roles,
    teams,
    tenderInfos,
    users,
    type PoApprovalStep,
} from "@/db/schemas";
import { paymentRequests } from "@/db/schemas/operations";
import { orderExtraCharges } from "@/db/schemas/operations/order-extra-charges.schema";
import { purchaseOrderProducts } from "@/db/schemas/operations/purchase-order-products.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import {
    OperationNotificationService,
    PO_TDS_OPTIONS,
    type PoTdsOption,
} from "@/modules/operations/operation-notification.service";
import { WhatsappJidResolver } from "@/modules/notifications/helpers/whatsapp-jid.resolver";
import { OpenwaService } from "@/openwa/openwa.service";
import { openwaConfig } from "@/config/openwa.config";
import { CashFlowService } from "@/modules/operations/cash-flows/cash-flow.service";
import { poHasPurchaseInvoice, tryMaterializePoInventory } from "@/modules/operations/inventory/inventory.materialize";
import { round2 } from "@/utils/money.util";

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

export interface IncomingWhatsappWebhookData {
    messageId: string;
    chatId: string;
    sender: string;
    senderPn?: string;
    participant?: string;
    author?: string;
    body?: string;
    type?: string;
    timestamp?: number;
    fromMe?: boolean;
    quotedMessageId?: string;
    quotedMsgId?: string;
    quotedMsg?: { id?: string; stanzaId?: string };
    contextInfo?: { stanzaId?: string };
    replyTo?: { messageId?: string; id?: string };
    [key: string]: unknown;
}

interface SenderIdentity {
    rawSender: string;
    chatId: string;
    phoneLast10: Set<string>;
    jids: Set<string>;
    lids: Set<string>;
}

export type Stage1ParsedCommand =
    | { type: "approved"; remark: string | null; poToken: string | null }
    | { type: "rejected"; remark: string; poToken: string | null }
    | null;

export type Stage2ParsedCommand =
    | { type: "approved"; tdsOption: PoTdsOption; remark: string | null; poToken: string | null }
    | { type: "rejected"; remark: string; poToken: string | null }
    | { type: "missing_tds_option"; poToken: string | null }
    | null;

@Injectable()
export class PoApprovalService {
    private readonly logger = new Logger(PoApprovalService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly notifications: OperationNotificationService,
        private readonly jidResolver: WhatsappJidResolver,
        private readonly openwa: OpenwaService,
        @Inject(openwaConfig.KEY) private readonly config: ConfigType<typeof openwaConfig>,
        private readonly cashFlowService: CashFlowService
    ) {}

    /** Normalize phone string to last 10 digits for reliable matching across 91xxxxxxxxxx / 0xxxxxxxxxx / +91... */
    normalizePhoneLast10(phoneOrJid?: string | null): string | null {
        if (!phoneOrJid) return null;
        const beforeAt = phoneOrJid.includes("@") ? phoneOrJid.split("@")[0] : phoneOrJid;
        const withoutDevice = beforeAt.split(":")[0];
        const digits = withoutDevice.replace(/\D/g, "");
        if (digits.length < 10) return null;
        return digits.slice(-10);
    }

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
            .orderBy(asc(users.id))
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
     * Resolve the Accounts Manager (Stage 2 approver):
     * 1. `process.env.PO_APPROVER_ACCOUNTS_USER_ID` (active, non-deleted).
     * 2. Fallback: active, non-deleted Team Leader (`role_id = 3`) or Admin (`role_id = 2`)
     *    in the `'Accounts'` team (`teams.name ILIKE 'Accounts'`).
     */
    async resolveStage2Accounts(): Promise<ResolvedApprover | null> {
        const envUserId = Number(process.env.PO_APPROVER_ACCOUNTS_USER_ID);
        if (Number.isInteger(envUserId) && envUserId > 0) {
            const [overrideUser] = await this.db
                .select({
                    id: users.id,
                    name: users.name,
                    mobile: users.mobile,
                })
                .from(users)
                .where(and(eq(users.id, envUserId), eq(users.isActive, true), isNull(users.deletedAt)))
                .limit(1);

            if (overrideUser) {
                const jid = await this.jidResolver.toJid(overrideUser.id);
                return {
                    userId: overrideUser.id,
                    name: overrideUser.name,
                    mobile: overrideUser.mobile ?? null,
                    jid,
                };
            }
        }

        const [accountsTeam] = await this.db
            .select({ id: teams.id })
            .from(teams)
            .where(ilike(teams.name, "Accounts"))
            .limit(1);

        if (!accountsTeam) {
            return null;
        }

        const [accountsApprover] = await this.db
            .select({
                id: users.id,
                name: users.name,
                mobile: users.mobile,
                roleId: users.roleId,
            })
            .from(users)
            .leftJoin(roles, eq(users.roleId, roles.id))
            .where(
                and(
                    eq(users.isActive, true),
                    isNull(users.deletedAt),
                    or(eq(users.primaryTeamId, accountsTeam.id), eq(users.team, accountsTeam.id)),
                    or(
                        eq(users.roleId, 3),
                        eq(users.roleId, 2),
                        ilike(roles.name, "Team Leader"),
                        ilike(roles.name, "Admin")
                    )
                )
            )
            .orderBy(sql`CASE WHEN ${users.roleId} = 3 THEN 0 ELSE 1 END`, asc(users.id))
            .limit(1);

        if (!accountsApprover) {
            return null;
        }

        const jid = await this.jidResolver.toJid(accountsApprover.id);
        return {
            userId: accountsApprover.id,
            name: accountsApprover.name,
            mobile: accountsApprover.mobile ?? null,
            jid,
        };
    }

    /**
     * Start the 2-stage WhatsApp PO approval workflow when a PO is created or re-submitted.
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

        // Supersede any existing in_progress workflows and their active/pending steps
        const existingActive = await this.db
            .select({ id: poApprovalWorkflows.id })
            .from(poApprovalWorkflows)
            .where(and(eq(poApprovalWorkflows.purchaseOrderId, input.purchaseOrderId), eq(poApprovalWorkflows.status, "in_progress")));

        if (existingActive.length > 0) {
            const wfIds = existingActive.map(w => w.id);
            await this.db
                .update(poApprovalWorkflows)
                .set({ status: "superseded", currentStage: null, updatedAt: new Date() })
                .where(inArray(poApprovalWorkflows.id, wfIds));

            await this.db
                .update(poApprovalSteps)
                .set({ status: "superseded", updatedAt: new Date() })
                .where(and(inArray(poApprovalSteps.workflowId, wfIds), inArray(poApprovalSteps.status, ["active", "pending", "blocked"])));
        }

        // Reset tlStatus and tlRemark for new workflow run
        await this.db
            .update(purchaseOrders)
            .set({ tlStatus: null, tlRemark: null, updatedAt: new Date() })
            .where(eq(purchaseOrders.id, input.purchaseOrderId));

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

        const [tl, accounts] = await Promise.all([
            this.resolveStage1Tl(input.createdBy, effectiveTeamId),
            this.resolveStage2Accounts(),
        ]);

        // Pre-insert Stage 2 step as pending so the full 2-stage pipeline is visible in TMS immediately
        await this.db.insert(poApprovalSteps).values({
            workflowId: workflow.id,
            purchaseOrderId: input.purchaseOrderId,
            stageOrder: 2,
            stageRole: "accounts",
            approverUserId: accounts?.userId ?? null,
            approverNameSnapshot: accounts?.name ?? null,
            approverMobileSnapshot: accounts?.mobile ?? null,
            approverJid: accounts?.jid ?? null,
            status: "pending",
        });

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

        const isSelfApprover = tl.userId === input.createdBy;
        const isDuplicateAccountsApprover = accounts != null && tl.userId === accounts.userId;

        if (isSelfApprover || isDuplicateAccountsApprover) {
            const skipReason = isSelfApprover ? "self_approver" : "duplicate_accounts_approver";
            const autoRemark = isSelfApprover
                ? "Auto-approved (PO raised by Team Leader)"
                : "Auto-approved (TL is also Accounts approver)";

            this.logger.log(`PO #${input.purchaseOrderId} Stage 1 skipped (${skipReason}); advancing directly to Stage 2.`);

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
                skipReason,
                decisionRemark: autoRemark,
                actedAt: new Date(),
            });

            await this.db
                .update(purchaseOrders)
                .set({
                    tlStatus: true,
                    tlRemark: autoRemark,
                    updatedAt: new Date(),
                })
                .where(eq(purchaseOrders.id, input.purchaseOrderId));

            await this.activateStage2(workflow.id, input.purchaseOrderId, {
                poNumber: input.poNumber,
                tenderId: input.tenderId,
                projectName: input.projectName,
                sellerName: input.sellerName,
                grandTotal: input.grandTotal,
                teamId: effectiveTeamId,
                createdByName,
                itemsSummary: input.itemsSummary,
                createdBy: input.createdBy,
            });

            return { workflowId: workflow.id, status: "in_progress" };
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

        const [step1] = await this.db
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

        await this.dispatchStageNotification(workflow.id, step1, {
            poNumber: input.poNumber,
            tenderId: input.tenderId,
            projectName: input.projectName,
            sellerName: input.sellerName,
            grandTotal: input.grandTotal,
            teamId: effectiveTeamId,
            createdByName,
            itemsSummary: input.itemsSummary,
            createdBy: input.createdBy,
        });

        return { workflowId: workflow.id, status: workflow.status };
    }

    /** Activate Stage 2 (Accounts Manager) and send Stage 2 DM + Accounts Group broadcast */
    async activateStage2(
        workflowId: number,
        purchaseOrderId: number,
        contextOverride?: {
            poNumber: string;
            tenderId?: number | null;
            projectName?: string | null;
            sellerName?: string | null;
            grandTotal: string | number;
            teamId?: number | null;
            createdByName: string;
            itemsSummary?: string | null;
            createdBy: number;
        }
    ): Promise<void> {
        await this.db
            .update(poApprovalWorkflows)
            .set({ currentStage: 2, updatedAt: new Date() })
            .where(eq(poApprovalWorkflows.id, workflowId));

        let [step2] = await this.db
            .select()
            .from(poApprovalSteps)
            .where(and(eq(poApprovalSteps.workflowId, workflowId), eq(poApprovalSteps.stageOrder, 2)))
            .limit(1);

        const freshAccounts = await this.resolveStage2Accounts();

        if (!step2) {
            [step2] = await this.db
                .insert(poApprovalSteps)
                .values({
                    workflowId,
                    purchaseOrderId,
                    stageOrder: 2,
                    stageRole: "accounts",
                    approverUserId: freshAccounts?.userId ?? null,
                    approverNameSnapshot: freshAccounts?.name ?? null,
                    approverMobileSnapshot: freshAccounts?.mobile ?? null,
                    approverJid: freshAccounts?.jid ?? null,
                    status: "pending",
                })
                .returning();
        } else if (freshAccounts) {
            [step2] = await this.db
                .update(poApprovalSteps)
                .set({
                    approverUserId: freshAccounts.userId,
                    approverNameSnapshot: freshAccounts.name,
                    approverMobileSnapshot: freshAccounts.mobile,
                    approverJid: freshAccounts.jid,
                    updatedAt: new Date(),
                })
                .where(eq(poApprovalSteps.id, step2.id))
                .returning();
        }

        if (!step2.approverUserId || !step2.approverJid) {
            const skipReason = !step2.approverUserId ? "missing_accounts_approver" : "missing_mobile";
            this.logger.warn(`Stage 2 Accounts approver unavailable (${skipReason}) for PO #${purchaseOrderId}; marking Stage 2 blocked.`);
            await this.db
                .update(poApprovalSteps)
                .set({ status: "blocked", skipReason, updatedAt: new Date() })
                .where(eq(poApprovalSteps.id, step2.id));
            return;
        }

        const [activeStep2] = await this.db
            .update(poApprovalSteps)
            .set({ status: "active", skipReason: null, updatedAt: new Date() })
            .where(eq(poApprovalSteps.id, step2.id))
            .returning();

        const context = contextOverride ?? (await this.loadPoNotificationContext(purchaseOrderId));
        if (!context) {
            return;
        }

        await this.dispatchStageNotification(workflowId, activeStep2, context);
    }

    private async loadPoNotificationContext(purchaseOrderId: number): Promise<{
        poNumber: string;
        tenderId: number | null;
        projectName: string | null;
        sellerName: string | null;
        grandTotal: string;
        teamId: number | null;
        createdByName: string;
        itemsSummary: string | null;
        createdBy: number;
    } | null> {
        const [po] = await this.db
            .select()
            .from(purchaseOrders)
            .where(eq(purchaseOrders.id, purchaseOrderId))
            .limit(1);

        if (!po) return null;

        const products = await this.db
            .select()
            .from(purchaseOrderProducts)
            .where(eq(purchaseOrderProducts.purchaseOrderId, purchaseOrderId));

        const charges = await this.db
            .select()
            .from(orderExtraCharges)
            .where(eq(orderExtraCharges.purchaseOrderId, purchaseOrderId));

        const itemsTotal = products.reduce((sum, p) => {
            const taxable = Number(p.qty) * Number(p.rate);
            const gst = (taxable * Number(p.gstRate)) / 100;
            return sum + taxable + gst;
        }, 0);
        const chargesTotal = charges.reduce((sum, c) => sum + Number(c.totalAmount ?? 0), 0);
        const grandTotal = round2(itemsTotal + chargesTotal).toFixed(2);

        const itemsSummary =
            products
                .slice(0, 3)
                .map(p => p.description)
                .filter(Boolean)
                .join(", ") || null;

        let createdByName = "Unknown";
        let creatorTeam: number | null = null;
        if (po.poRaisedBy) {
            const [creator] = await this.db
                .select({ name: users.name, primaryTeamId: users.primaryTeamId, team: users.team })
                .from(users)
                .where(eq(users.id, po.poRaisedBy))
                .limit(1);
            if (creator) {
                createdByName = creator.name;
                creatorTeam = creator.primaryTeamId ?? creator.team ?? null;
            }
        }

        return {
            poNumber: po.poNumber ?? `PO #${po.id}`,
            tenderId: po.tenderId,
            projectName: po.projectName,
            sellerName: po.sellerName,
            grandTotal,
            teamId: po.team ?? creatorTeam,
            createdByName,
            itemsSummary,
            createdBy: po.poRaisedBy ?? 0,
        };
    }

    private async dispatchStageNotification(
        workflowId: number,
        step: PoApprovalStep,
        context: {
            poNumber: string;
            tenderId?: number | null;
            projectName?: string | null;
            sellerName?: string | null;
            grandTotal: string | number;
            teamId?: number | null;
            createdByName: string;
            itemsSummary?: string | null;
            createdBy: number;
        }
    ): Promise<void> {
        if (!step.approverJid) return;

        let tenderNo: string | null = null;
        let tenderName: string | null = null;
        let organizationName: string | null = null;

        if (context.tenderId) {
            const [tender] = await this.db
                .select({
                    tenderNo: tenderInfos.tenderNo,
                    tenderName: tenderInfos.tenderName,
                    organizationName: organizations.name,
                })
                .from(tenderInfos)
                .leftJoin(organizations, eq(tenderInfos.organization, organizations.id))
                .where(eq(tenderInfos.id, context.tenderId))
                .limit(1);

            if (tender) {
                tenderNo = tender.tenderNo;
                tenderName = tender.tenderName;
                organizationName = tender.organizationName;
            }
        }

        const stageOrder = (step.stageOrder === 2 ? 2 : 1) as 1 | 2;
        const { dmMessageId, dmChatId } = await this.notifications.sendPoApprovalStageMessages({
            purchaseOrderId: step.purchaseOrderId,
            poNumber: context.poNumber,
            stageOrder,
            stageRole: step.stageRole,
            approverJid: step.approverJid,
            approverName: step.approverNameSnapshot ?? "Approver",
            teamId: context.teamId,
            tenderNo,
            tenderName,
            organizationName,
            projectName: context.projectName,
            sellerName: context.sellerName,
            itemsSummary: context.itemsSummary,
            grandTotal: context.grandTotal,
            createdByName: context.createdByName,
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
                purchaseOrderId: step.purchaseOrderId,
                workflowId,
                stepId: step.id,
                eventType: "dm_sent",
                actorUserId: step.approverUserId,
                senderJid: dmChatId,
                waMessageId: dmMessageId,
                metadata: { stageOrder, stageRole: step.stageRole },
            },
            {
                purchaseOrderId: step.purchaseOrderId,
                workflowId,
                stepId: step.id,
                eventType: "group_broadcast_sent",
                actorUserId: context.createdBy || null,
                metadata: { stageOrder, stageRole: step.stageRole, teamId: context.teamId },
            },
        ]);
    }

    /** Extract quoted message ID from various OpenWA / Baileys / whatsapp-web.js payload shapes */
    extractQuotedMessageId(data: IncomingWhatsappWebhookData): string | null {
        const candidates = [
            data.quotedMessageId,
            data.quotedMsgId,
            data.quotedMsg?.id,
            data.quotedMsg?.stanzaId,
            data.contextInfo?.stanzaId,
            data.replyTo?.messageId,
            data.replyTo?.id,
        ];
        for (const c of candidates) {
            if (typeof c === "string" && c.trim().length > 0) {
                return c.trim();
            }
        }
        return null;
    }

    /** Build normalized sender identity from webhook payload and resolve @lid via OpenWA if needed */
    private async resolveSenderIdentity(
        data: IncomingWhatsappWebhookData,
        activeSteps: PoApprovalStep[]
    ): Promise<SenderIdentity> {
        const identity: SenderIdentity = {
            rawSender: data.sender || data.chatId || "",
            chatId: data.chatId || data.sender || "",
            phoneLast10: new Set<string>(),
            jids: new Set<string>(),
            lids: new Set<string>(),
        };

        const rawCandidates = [data.sender, data.chatId, data.senderPn, data.participant, data.author];
        for (const raw of rawCandidates) {
            if (typeof raw !== "string" || !raw.trim()) continue;
            const trimmed = raw.trim();
            if (trimmed.endsWith("@g.us")) continue;

            if (trimmed.endsWith("@lid")) {
                identity.lids.add(trimmed);
                continue;
            }

            if (trimmed.endsWith("@c.us") || trimmed.endsWith("@s.whatsapp.net")) {
                const last10 = this.normalizePhoneLast10(trimmed);
                if (last10) {
                    identity.phoneLast10.add(last10);
                    identity.jids.add(`91${last10}@c.us`);
                }
                identity.jids.add(trimmed.replace("@s.whatsapp.net", "@c.us"));
                continue;
            }

            const last10 = this.normalizePhoneLast10(trimmed);
            if (last10) {
                identity.phoneLast10.add(last10);
                identity.jids.add(`91${last10}@c.us`);
            }
        }

        // If sender is @lid and we don't have phone digits yet, try resolving via OpenWA contact/LID endpoints
        if (identity.lids.size > 0 && identity.phoneLast10.size === 0 && !this.config.OPENWA_DRY_RUN) {
            for (const lid of identity.lids) {
                await this.resolveLidAgainstActiveSteps(lid, activeSteps, identity);
            }
        }

        return identity;
    }

    private async resolveLidAgainstActiveSteps(
        lid: string,
        activeSteps: PoApprovalStep[],
        identity: SenderIdentity
    ): Promise<void> {
        // 1. Check if any active step already cached this approverLid
        for (const step of activeSteps) {
            if (step.approverLid === lid || step.waChatId === lid) {
                const last10 = this.normalizePhoneLast10(step.approverMobileSnapshot || step.approverJid);
                if (last10) {
                    identity.phoneLast10.add(last10);
                }
                if (step.approverJid) {
                    identity.jids.add(step.approverJid);
                }
                return;
            }
        }

        // 2. Query OpenWA contact endpoint for the @lid or check each unique active step's phone -> lid
        const baseUrl = this.config.OPENWA_BASE_URL.replace(/\/+$/, "");
        const sessionId = this.config.OPENWA_SESSION_ID;
        const headers = { "x-api-key": this.config.OPENWA_API_KEY };

        try {
            const resp = await fetch(`${baseUrl}/api/sessions/${sessionId}/contacts/${encodeURIComponent(lid)}`, {
                method: "GET",
                headers,
            });
            if (resp.ok) {
                const contactData = (await resp.json()) as Record<string, any>;
                const phoneCandidate =
                    contactData?.number ||
                    contactData?.phone ||
                    contactData?.phoneNumber ||
                    contactData?.jid ||
                    contactData?.id;
                const last10 = this.normalizePhoneLast10(typeof phoneCandidate === "string" ? phoneCandidate : null);
                if (last10) {
                    identity.phoneLast10.add(last10);
                    identity.jids.add(`91${last10}@c.us`);
                    return;
                }
            }
        } catch (err) {
            this.logger.debug(`OpenWA contact lookup for LID ${lid} failed: ${err}`);
        }

        const checkedPhones = new Set<string>();
        for (const step of activeSteps) {
            const last10 = this.normalizePhoneLast10(step.approverMobileSnapshot || step.approverJid);
            if (!last10) continue;
            const fullPhone = `91${last10}`;
            if (checkedPhones.has(fullPhone)) continue;
            checkedPhones.add(fullPhone);

            try {
                const resp = await fetch(
                    `${baseUrl}/api/sessions/${sessionId}/contacts/${encodeURIComponent(fullPhone)}/lid`,
                    { method: "GET", headers }
                );
                if (resp.ok) {
                    const lidData = (await resp.json()) as Record<string, any>;
                    const resolvedLid = lidData?.lid || lidData?.id || lidData?.data?.lid;
                    if (typeof resolvedLid === "string" && resolvedLid === lid) {
                        identity.phoneLast10.add(last10);
                        identity.jids.add(`91${last10}@c.us`);
                        await this.db
                            .update(poApprovalSteps)
                            .set({ approverLid: lid, updatedAt: new Date() })
                            .where(eq(poApprovalSteps.id, step.id));
                        return;
                    }
                }
            } catch (err) {
                this.logger.debug(`OpenWA phone->LID lookup for ${fullPhone} failed: ${err}`);
            }
        }
    }

    private matchesStepApprover(step: PoApprovalStep, identity: SenderIdentity): boolean {
        if (step.approverLid && identity.lids.has(step.approverLid)) {
            return true;
        }
        if (step.waChatId && (identity.jids.has(step.waChatId) || identity.lids.has(step.waChatId))) {
            return true;
        }
        if (step.approverJid && identity.jids.has(step.approverJid)) {
            return true;
        }
        const stepLast10 = this.normalizePhoneLast10(step.approverMobileSnapshot || step.approverJid);
        if (stepLast10 && identity.phoneLast10.has(stepLast10)) {
            return true;
        }
        return false;
    }

    /** Parse Stage 1 (Team Leader) reply text */
    parseStage1Command(rawBody: string): Stage1ParsedCommand {
        const text = rawBody.trim();
        if (!text) return null;

        // Match APPROVE [PO_TOKEN] [remark] or YES [remark] or 1 [remark]
        const approveMatch = /^(?:APPROVE|APPROVED|YES|1)(?:\s+(VE\/[\w/-]+\/PO\d+|PO\d+|#\d+))?(?:\s+([\s\S]+))?$/i.exec(text);
        if (approveMatch) {
            return {
                type: "approved",
                poToken: approveMatch[1] ? approveMatch[1].trim() : null,
                remark: approveMatch[2] ? approveMatch[2].trim() : null,
            };
        }

        // Match REJECT [PO_TOKEN] [reason] or NO [reason] or 2 [reason]
        const rejectMatch = /^(?:REJECT|REJECTED|NO|2)(?:\s+(VE\/[\w/-]+\/PO\d+|PO\d+|#\d+))?(?:\s+([\s\S]+))?$/i.exec(text);
        if (rejectMatch) {
            return {
                type: "rejected",
                poToken: rejectMatch[1] ? rejectMatch[1].trim() : null,
                remark: rejectMatch[2]?.trim() || "Rejected by Team Leader via WhatsApp",
            };
        }

        return null;
    }

    /**
     * Parse Stage 2 (Accounts Manager) reply text.
     * Requires explicit TDS option index 1..11 (e.g., `APPROVE 1`..`APPROVE 11`, or `APPROVE PO0042 3`).
     * Bare `APPROVE` without a valid 1..11 option returns `{ type: "missing_tds_option" }`.
     */
    parseStage2Command(rawBody: string, hasQuotedMessage = false): Stage2ParsedCommand {
        const text = rawBody.trim();
        if (!text) return null;

        // Check REJECT first
        const rejectMatch = /^(?:REJECT|REJECTED)(?:\s+(VE\/[\w/-]+\/PO\d+|PO\d+|#\d+))?(?:\s+([\s\S]+))?$/i.exec(text);
        if (rejectMatch) {
            return {
                type: "rejected",
                poToken: rejectMatch[1] ? rejectMatch[1].trim() : null,
                remark: rejectMatch[2]?.trim() || "Rejected by Accounts via WhatsApp",
            };
        }

        // Check APPROVE with explicit TDS option:
        // Supports:
        //   APPROVE 3 [remark]
        //   APPROVE PO0042 3 [remark]
        //   APPROVE 3 PO0042 [remark]
        if (/^(?:APPROVE|APPROVED)\b/i.test(text)) {
            const rest = text.replace(/^(?:APPROVE|APPROVED)\s*/i, "").trim();
            if (!rest) {
                return { type: "missing_tds_option", poToken: null };
            }

            let poToken: string | null = null;
            let remaining = rest;

            const leadingPo = /^(VE\/[\w/-]+\/PO\d+|PO\d+|#\d+)(?:\s+([\s\S]*))?$/i.exec(remaining);
            if (leadingPo) {
                poToken = leadingPo[1].trim();
                remaining = (leadingPo[2] ?? "").trim();
            }

            const optionMatch = /^(\d{1,2})(?:\s+(VE\/[\w/-]+\/PO\d+|PO\d+|#\d+))?(?:\s+([\s\S]+))?$/i.exec(remaining);
            if (!optionMatch) {
                return { type: "missing_tds_option", poToken };
            }

            const optionIdx = Number.parseInt(optionMatch[1], 10);
            if (!poToken && optionMatch[2]) {
                poToken = optionMatch[2].trim();
            }
            const remark = optionMatch[3]?.trim() || null;

            const tdsOption = PO_TDS_OPTIONS.find(o => o.index === optionIdx);
            if (!tdsOption) {
                return { type: "missing_tds_option", poToken };
            }

            return {
                type: "approved",
                tdsOption,
                remark,
                poToken,
            };
        }

        // If quoting the Stage 2 prompt directly, allow bare number 1..11
        if (hasQuotedMessage) {
            const bareNum = /^(\d{1,2})(?:\s+([\s\S]+))?$/.exec(text);
            if (bareNum) {
                const optionIdx = Number.parseInt(bareNum[1], 10);
                const tdsOption = PO_TDS_OPTIONS.find(o => o.index === optionIdx);
                if (tdsOption) {
                    return {
                        type: "approved",
                        tdsOption,
                        remark: bareNum[2]?.trim() || null,
                        poToken: null,
                    };
                }
            }
        }

        return null;
    }

    private looksLikeApprovalReply(rawBody: string): boolean {
        return /^(?:APPROVE|APPROVED|REJECT|REJECTED|YES|NO|\d{1,2})\b/i.test(rawBody.trim());
    }

    private extractPoTokenFromText(rawBody: string): string | null {
        const match = /\b(VE\/[\w/-]+\/PO\d+|PO\d+)\b|#(\d+)\b/i.exec(rawBody);
        if (!match) return null;
        return (match[1] || `#${match[2]}`).toUpperCase();
    }

    /**
     * Handle incoming OpenWA `message.received` webhook payload.
     */
    async handleIncomingWhatsappMessage(
        data: IncomingWhatsappWebhookData
    ): Promise<{ handled: boolean; action?: string; reason?: string; purchaseOrderId?: number }> {
        if (data.fromMe) {
            return { handled: false, reason: "from_me" };
        }

        const rawBody = typeof data.body === "string" ? data.body.trim() : "";
        if (!rawBody) {
            return { handled: false, reason: "empty_body" };
        }

        const quotedMessageId = this.extractQuotedMessageId(data);
        if (!quotedMessageId && !this.looksLikeApprovalReply(rawBody)) {
            return { handled: false, reason: "not_approval_command" };
        }

        // Load all currently active steps
        const activeSteps = await this.db
            .select()
            .from(poApprovalSteps)
            .where(eq(poApprovalSteps.status, "active"));

        // If quotedMessageId is present, check if it matches an already-completed step first
        if (quotedMessageId && !activeSteps.some(s => s.waMessageId === quotedMessageId)) {
            const [historicalStep] = await this.db
                .select()
                .from(poApprovalSteps)
                .where(eq(poApprovalSteps.waMessageId, quotedMessageId))
                .limit(1);

            if (historicalStep && historicalStep.status !== "active") {
                await this.db.insert(poApprovalAuditLogs).values({
                    purchaseOrderId: historicalStep.purchaseOrderId,
                    workflowId: historicalStep.workflowId,
                    stepId: historicalStep.id,
                    eventType: "reply_ignored",
                    senderJid: data.sender || data.chatId,
                    waMessageId: data.messageId,
                    metadata: { reason: "step_already_processed", stepStatus: historicalStep.status, rawBody },
                });
                return {
                    handled: false,
                    reason: "step_already_processed",
                    purchaseOrderId: historicalStep.purchaseOrderId,
                };
            }
        }

        if (activeSteps.length === 0) {
            return { handled: false, reason: "no_active_steps" };
        }

        const senderIdentity = await this.resolveSenderIdentity(data, activeSteps);
        const replyChatId = data.chatId && !data.chatId.endsWith("@g.us") ? data.chatId : data.sender;

        // 1. Try correlating by quotedMessageId
        let matchedStep: PoApprovalStep | null = null;
        if (quotedMessageId) {
            const quotedStep = activeSteps.find(s => s.waMessageId === quotedMessageId);
            if (quotedStep) {
                if (!this.matchesStepApprover(quotedStep, senderIdentity)) {
                    this.logger.warn(
                        `Unauthorized WhatsApp reply from ${senderIdentity.rawSender} quoting step #${quotedStep.id} (PO #${quotedStep.purchaseOrderId})`
                    );
                    await this.db.insert(poApprovalAuditLogs).values({
                        purchaseOrderId: quotedStep.purchaseOrderId,
                        workflowId: quotedStep.workflowId,
                        stepId: quotedStep.id,
                        eventType: "reply_ignored",
                        senderJid: senderIdentity.rawSender,
                        waMessageId: data.messageId,
                        metadata: { reason: "unauthorized_sender", quotedMessageId, rawBody },
                    });
                    return { handled: false, reason: "unauthorized_sender", purchaseOrderId: quotedStep.purchaseOrderId };
                }
                matchedStep = quotedStep;
            }
        }

        // Filter active steps belonging to this sender
        const senderActiveSteps = activeSteps.filter(s => this.matchesStepApprover(s, senderIdentity));

        // 2. Try correlating by PO token in text
        if (!matchedStep && senderActiveSteps.length > 0) {
            const poToken = this.extractPoTokenFromText(rawBody);
            if (poToken) {
                const poIds = senderActiveSteps.map(s => s.purchaseOrderId);
                const pos = await this.db
                    .select({ id: purchaseOrders.id, poNumber: purchaseOrders.poNumber })
                    .from(purchaseOrders)
                    .where(inArray(purchaseOrders.id, poIds));

                const matchedPo = pos.find(p => {
                    if (poToken.startsWith("#")) {
                        return p.id === Number(poToken.slice(1));
                    }
                    const upperPoNo = (p.poNumber ?? "").toUpperCase();
                    return upperPoNo === poToken || upperPoNo.endsWith(`/${poToken}`) || upperPoNo.endsWith(poToken);
                });

                if (matchedPo) {
                    matchedStep = senderActiveSteps.find(s => s.purchaseOrderId === matchedPo.id) ?? null;
                }
            }
        }

        // 3. Try correlating by single active step for sender
        if (!matchedStep) {
            if (senderActiveSteps.length === 1) {
                matchedStep = senderActiveSteps[0];
            } else if (senderActiveSteps.length > 1) {
                const poIds = senderActiveSteps.map(s => s.purchaseOrderId);
                const pos = await this.db
                    .select({ id: purchaseOrders.id, poNumber: purchaseOrders.poNumber })
                    .from(purchaseOrders)
                    .where(inArray(purchaseOrders.id, poIds));
                const poList = pos.map(p => p.poNumber ?? `#${p.id}`).join(", ");

                const promptText = `You have multiple POs awaiting approval (${poList}). Please reply quoting the specific PO message, or include the PO code (e.g., *APPROVE PO0001*).`;
                await this.sendDirectReplySafe(replyChatId, promptText);

                await this.db.insert(poApprovalAuditLogs).values({
                    purchaseOrderId: senderActiveSteps[0].purchaseOrderId,
                    workflowId: senderActiveSteps[0].workflowId,
                    stepId: senderActiveSteps[0].id,
                    eventType: "reply_ignored",
                    actorUserId: senderActiveSteps[0].approverUserId,
                    senderJid: senderIdentity.rawSender,
                    waMessageId: data.messageId,
                    metadata: { reason: "ambiguous_multiple_pos", candidatePoIds: poIds, rawBody },
                });

                return { handled: true, action: "prompted_disambiguation", reason: "ambiguous_multiple_pos" };
            }
        }

        if (!matchedStep) {
            return { handled: false, reason: "no_matching_step_for_sender" };
        }

        // Cache @lid on the matched step if the sender came via @lid
        if (senderIdentity.lids.size > 0 && !matchedStep.approverLid) {
            const firstLid = [...senderIdentity.lids][0];
            await this.db
                .update(poApprovalSteps)
                .set({ approverLid: firstLid, updatedAt: new Date() })
                .where(eq(poApprovalSteps.id, matchedStep.id));
        }

        await this.db.insert(poApprovalAuditLogs).values({
            purchaseOrderId: matchedStep.purchaseOrderId,
            workflowId: matchedStep.workflowId,
            stepId: matchedStep.id,
            eventType: "reply_received",
            actorUserId: matchedStep.approverUserId,
            senderJid: senderIdentity.rawSender,
            waMessageId: data.messageId,
            metadata: { rawBody, quotedMessageId },
        });

        if (matchedStep.stageRole === "tl") {
            const parsed = this.parseStage1Command(rawBody);
            if (!parsed) {
                await this.db.insert(poApprovalAuditLogs).values({
                    purchaseOrderId: matchedStep.purchaseOrderId,
                    workflowId: matchedStep.workflowId,
                    stepId: matchedStep.id,
                    eventType: "reply_ignored",
                    actorUserId: matchedStep.approverUserId,
                    senderJid: senderIdentity.rawSender,
                    waMessageId: data.messageId,
                    metadata: { reason: "unrecognized_stage1_command", rawBody },
                });
                return { handled: false, reason: "unrecognized_stage1_command", purchaseOrderId: matchedStep.purchaseOrderId };
            }

            if (parsed.type === "approved") {
                return this.executeStage1Approval(matchedStep, parsed.remark, data.messageId, replyChatId);
            } else {
                return this.executeStage1Rejection(matchedStep, parsed.remark, data.messageId, replyChatId);
            }
        } else {
            const parsed = this.parseStage2Command(rawBody, Boolean(quotedMessageId));
            if (!parsed) {
                await this.db.insert(poApprovalAuditLogs).values({
                    purchaseOrderId: matchedStep.purchaseOrderId,
                    workflowId: matchedStep.workflowId,
                    stepId: matchedStep.id,
                    eventType: "reply_ignored",
                    actorUserId: matchedStep.approverUserId,
                    senderJid: senderIdentity.rawSender,
                    waMessageId: data.messageId,
                    metadata: { reason: "unrecognized_stage2_command", rawBody },
                });
                return { handled: false, reason: "unrecognized_stage2_command", purchaseOrderId: matchedStep.purchaseOrderId };
            }

            if (parsed.type === "missing_tds_option") {
                const [po] = await this.db
                    .select({ poNumber: purchaseOrders.poNumber })
                    .from(purchaseOrders)
                    .where(eq(purchaseOrders.id, matchedStep.purchaseOrderId))
                    .limit(1);
                const poLabel = po?.poNumber ?? `PO #${matchedStep.purchaseOrderId}`;

                await this.sendDirectReplySafe(
                    replyChatId,
                    `Please specify a TDS option number (1-11) to approve ${poLabel}, e.g. *APPROVE 1* (No TDS 0%) or *APPROVE 3* (194C @2%).`
                );

                await this.db.insert(poApprovalAuditLogs).values({
                    purchaseOrderId: matchedStep.purchaseOrderId,
                    workflowId: matchedStep.workflowId,
                    stepId: matchedStep.id,
                    eventType: "reply_ignored",
                    actorUserId: matchedStep.approverUserId,
                    senderJid: senderIdentity.rawSender,
                    waMessageId: data.messageId,
                    metadata: { reason: "missing_or_invalid_tds_option", rawBody },
                });

                return {
                    handled: true,
                    action: "prompted_tds_option",
                    reason: "missing_or_invalid_tds_option",
                    purchaseOrderId: matchedStep.purchaseOrderId,
                };
            }

            if (parsed.type === "approved") {
                return this.executeStage2Approval(matchedStep, parsed.tdsOption, parsed.remark, data.messageId, replyChatId);
            } else {
                return this.executeStage2Rejection(matchedStep, parsed.remark, data.messageId, replyChatId);
            }
        }
    }

    private async executeStage1Approval(
        step: PoApprovalStep,
        remark: string | null,
        replyMessageId: string,
        replyChatId: string
    ): Promise<{ handled: boolean; action: string; purchaseOrderId: number }> {
        const now = new Date();
        const [updatedStep] = await this.db
            .update(poApprovalSteps)
            .set({
                status: "approved",
                decisionRemark: remark,
                replyMessageId,
                actedAt: now,
                updatedAt: now,
            })
            .where(and(eq(poApprovalSteps.id, step.id), eq(poApprovalSteps.status, "active")))
            .returning();

        if (!updatedStep) {
            return { handled: false, action: "concurrent_noop", purchaseOrderId: step.purchaseOrderId };
        }

        // Update purchase_orders.tl_status = true and tl_remark
        await this.db
            .update(purchaseOrders)
            .set({
                tlStatus: true,
                tlRemark: remark,
                updatedAt: now,
            })
            .where(eq(purchaseOrders.id, step.purchaseOrderId));

        await this.db.insert(poApprovalAuditLogs).values({
            purchaseOrderId: step.purchaseOrderId,
            workflowId: step.workflowId,
            stepId: step.id,
            eventType: "stage_approved",
            actorUserId: step.approverUserId,
            senderJid: replyChatId,
            waMessageId: replyMessageId,
            metadata: { stageOrder: 1, stageRole: "tl", remark },
        });

        const context = await this.loadPoNotificationContext(step.purchaseOrderId);
        if (context) {
            await this.notifications.sendPoApprovalStageResult({
                purchaseOrderId: step.purchaseOrderId,
                poNumber: context.poNumber,
                stageOrder: 1,
                stageRole: "tl",
                decision: "approved",
                actorName: step.approverNameSnapshot ?? "Team Leader",
                creatorUserId: context.createdBy || null,
                teamId: context.teamId,
                sellerName: context.sellerName,
                grandTotal: context.grandTotal,
                remark,
                replyToChatId: replyChatId,
                isFinalApproval: false,
            });
        }

        await this.activateStage2(step.workflowId, step.purchaseOrderId, context ?? undefined);

        return { handled: true, action: "stage1_approved", purchaseOrderId: step.purchaseOrderId };
    }

    private async executeStage1Rejection(
        step: PoApprovalStep,
        remark: string,
        replyMessageId: string,
        replyChatId: string
    ): Promise<{ handled: boolean; action: string; purchaseOrderId: number }> {
        const now = new Date();
        const [updatedStep] = await this.db
            .update(poApprovalSteps)
            .set({
                status: "rejected",
                decisionRemark: remark,
                replyMessageId,
                actedAt: now,
                updatedAt: now,
            })
            .where(and(eq(poApprovalSteps.id, step.id), eq(poApprovalSteps.status, "active")))
            .returning();

        if (!updatedStep) {
            return { handled: false, action: "concurrent_noop", purchaseOrderId: step.purchaseOrderId };
        }

        await this.db
            .update(poApprovalWorkflows)
            .set({
                status: "rejected",
                currentStage: null,
                finalizedAt: now,
                updatedAt: now,
            })
            .where(eq(poApprovalWorkflows.id, step.workflowId));

        await this.db
            .update(poApprovalSteps)
            .set({ status: "superseded", updatedAt: now })
            .where(and(eq(poApprovalSteps.workflowId, step.workflowId), eq(poApprovalSteps.status, "pending")));

        // Update purchase_orders: tlStatus = false, tlRemark, poApproved = false, poApprovalRemark
        await this.db
            .update(purchaseOrders)
            .set({
                tlStatus: false,
                tlRemark: remark,
                poApproved: false,
                poApprovalRemark: remark,
                updatedAt: now,
            })
            .where(eq(purchaseOrders.id, step.purchaseOrderId));

        // Reject any po_approval_pending payment requests
        await this.db
            .update(paymentRequests)
            .set({ status: "rejected", rejectionReason: remark || "PO Rejected by Team Leader", updatedAt: now })
            .where(and(eq(paymentRequests.purchaseOrderId, step.purchaseOrderId), eq(paymentRequests.status, "po_approval_pending")));

        await this.db.insert(poApprovalAuditLogs).values({
            purchaseOrderId: step.purchaseOrderId,
            workflowId: step.workflowId,
            stepId: step.id,
            eventType: "stage_rejected",
            actorUserId: step.approverUserId,
            senderJid: replyChatId,
            waMessageId: replyMessageId,
            metadata: { stageOrder: 1, stageRole: "tl", remark },
        });

        const context = await this.loadPoNotificationContext(step.purchaseOrderId);
        if (context) {
            await this.notifications.sendPoApprovalStageResult({
                purchaseOrderId: step.purchaseOrderId,
                poNumber: context.poNumber,
                stageOrder: 1,
                stageRole: "tl",
                decision: "rejected",
                actorName: step.approverNameSnapshot ?? "Team Leader",
                creatorUserId: context.createdBy || null,
                teamId: context.teamId,
                sellerName: context.sellerName,
                grandTotal: context.grandTotal,
                remark,
                replyToChatId: replyChatId,
                isFinalApproval: false,
            });
        }

        return { handled: true, action: "stage1_rejected", purchaseOrderId: step.purchaseOrderId };
    }

    private async executeStage2Approval(
        step: PoApprovalStep,
        tdsOption: PoTdsOption,
        remark: string | null,
        replyMessageId: string,
        replyChatId: string
    ): Promise<{ handled: boolean; action: string; purchaseOrderId: number }> {
        const now = new Date();
        const effectiveRemark = remark || tdsOption.label;

        const [updatedStep] = await this.db
            .update(poApprovalSteps)
            .set({
                status: "approved",
                tdsSection: tdsOption.section,
                tdsPercentage: tdsOption.percentage,
                decisionRemark: effectiveRemark,
                replyMessageId,
                actedAt: now,
                updatedAt: now,
            })
            .where(and(eq(poApprovalSteps.id, step.id), eq(poApprovalSteps.status, "active")))
            .returning();

        if (!updatedStep) {
            return { handled: false, action: "concurrent_noop", purchaseOrderId: step.purchaseOrderId };
        }

        await this.db
            .update(poApprovalWorkflows)
            .set({
                status: "approved",
                currentStage: null,
                finalizedAt: now,
                updatedAt: now,
            })
            .where(eq(poApprovalWorkflows.id, step.workflowId));

        const [po] = await this.db
            .select()
            .from(purchaseOrders)
            .where(eq(purchaseOrders.id, step.purchaseOrderId))
            .limit(1);

        const products = await this.db
            .select()
            .from(purchaseOrderProducts)
            .where(eq(purchaseOrderProducts.purchaseOrderId, step.purchaseOrderId));

        const charges = await this.db
            .select()
            .from(orderExtraCharges)
            .where(eq(orderExtraCharges.purchaseOrderId, step.purchaseOrderId));

        let subtotal = 0;
        let itemsGrandTotal = 0;
        for (const product of products) {
            const prodTotal = Number(product.qty) * Number(product.rate);
            const prodGstAmount = (prodTotal * Number(product.gstRate)) / 100;
            subtotal += prodTotal;
            itemsGrandTotal += prodTotal + prodGstAmount;
        }

        const chargesTotal = charges.reduce((sum, c) => sum + Number(c.totalAmount ?? 0), 0);
        const grandTotal = itemsGrandTotal + chargesTotal;
        const tdsPct = Number(tdsOption.percentage);
        const tdsAmt = (subtotal * tdsPct) / 100;
        const amountAfterTds = grandTotal - tdsAmt;

        await this.db
            .update(purchaseOrders)
            .set({
                tdsPercentage: tdsOption.percentage,
                tdsAmount: round2(tdsAmt).toFixed(2),
                amountAfterTds: round2(amountAfterTds).toFixed(2),
                poApproved: true,
                poApprovalRemark: effectiveRemark,
                updatedAt: now,
            })
            .where(eq(purchaseOrders.id, step.purchaseOrderId));

        if (await poHasPurchaseInvoice(this.db, step.purchaseOrderId)) {
            await this.db.transaction(tx =>
                tryMaterializePoInventory(tx, step.purchaseOrderId, step.approverUserId ?? po?.poRaisedBy ?? undefined)
            );
        }

        // Transition po_approval_pending payment requests to pending
        const pendingPrs = await this.db
            .select({
                id: paymentRequests.id,
                requestNo: paymentRequests.requestNo,
                amount: paymentRequests.amount,
                partyName: paymentRequests.partyName,
                portalLink: paymentRequests.portalLink,
                paymentAgainst: paymentRequests.paymentAgainst,
                requestedBy: paymentRequests.requestedBy,
            })
            .from(paymentRequests)
            .where(and(eq(paymentRequests.purchaseOrderId, step.purchaseOrderId), eq(paymentRequests.status, "po_approval_pending")));

        if (pendingPrs.length > 0) {
            await this.db
                .update(paymentRequests)
                .set({ status: "pending", tdsPercentage: tdsOption.percentage, updatedAt: now })
                .where(and(eq(paymentRequests.purchaseOrderId, step.purchaseOrderId), eq(paymentRequests.status, "po_approval_pending")));

            for (const pr of pendingPrs) {
                this.notifications
                    .notifyNewPaymentRequest({
                        requestNo: pr.requestNo ?? "",
                        amount: pr.amount ?? 0,
                        partyName: pr.partyName ?? null,
                        portalLink: pr.portalLink ?? null,
                        requestedBy: pr.requestedBy ?? 0,
                        category: pr.paymentAgainst ?? "",
                    })
                    .catch(err => this.logger.warn(`WhatsApp notification failed for PR #${pr.id}: ${err}`));
            }
        }

        if (po?.projectId) {
            await this.cashFlowService
                .create({
                    projectId: po.projectId,
                    eventType: "po_approved",
                    amount: round2(amountAfterTds).toFixed(2),
                    direction: "outflow",
                    referenceType: "purchase_order",
                    referenceId: step.purchaseOrderId,
                    referenceNo: po.poNumber ?? `PO #${step.purchaseOrderId}`,
                    tdsPercentage: tdsOption.percentage,
                    tdsAmount: round2(tdsAmt).toFixed(2),
                    remark: `PO approved via WhatsApp with TDS @ ${tdsOption.percentage}%`,
                    createdBy: step.approverUserId ?? po.poRaisedBy ?? 0,
                })
                .catch(err => this.logger.warn(`Cash flow creation failed for PO approval #${step.purchaseOrderId}: ${err}`));
        }

        await this.db.insert(poApprovalAuditLogs).values([
            {
                purchaseOrderId: step.purchaseOrderId,
                workflowId: step.workflowId,
                stepId: step.id,
                eventType: "stage_approved",
                actorUserId: step.approverUserId,
                senderJid: replyChatId,
                waMessageId: replyMessageId,
                metadata: {
                    stageOrder: 2,
                    stageRole: "accounts",
                    tdsIndex: tdsOption.index,
                    tdsSection: tdsOption.section,
                    tdsPercentage: tdsOption.percentage,
                    remark: effectiveRemark,
                },
            },
            {
                purchaseOrderId: step.purchaseOrderId,
                workflowId: step.workflowId,
                stepId: step.id,
                eventType: "workflow_finalized",
                actorUserId: step.approverUserId,
                senderJid: replyChatId,
                waMessageId: replyMessageId,
                metadata: {
                    tdsPercentage: tdsOption.percentage,
                    tdsAmount: round2(tdsAmt).toFixed(2),
                    amountAfterTds: round2(amountAfterTds).toFixed(2),
                },
            },
        ]);

        const context = await this.loadPoNotificationContext(step.purchaseOrderId);
        await this.notifications.sendPoApprovalStageResult({
            purchaseOrderId: step.purchaseOrderId,
            poNumber: context?.poNumber ?? po?.poNumber ?? `PO #${step.purchaseOrderId}`,
            stageOrder: 2,
            stageRole: "accounts",
            decision: "approved",
            actorName: step.approverNameSnapshot ?? "Accounts Manager",
            creatorUserId: context?.createdBy ?? po?.poRaisedBy ?? null,
            teamId: context?.teamId ?? po?.team ?? null,
            sellerName: context?.sellerName ?? po?.sellerName ?? null,
            grandTotal: round2(grandTotal).toFixed(2),
            tdsPercentage: tdsOption.percentage,
            tdsSection: tdsOption.section,
            amountAfterTds: round2(amountAfterTds).toFixed(2),
            remark: effectiveRemark,
            replyToChatId: replyChatId,
            isFinalApproval: true,
        });

        return { handled: true, action: "stage2_approved", purchaseOrderId: step.purchaseOrderId };
    }

    private async executeStage2Rejection(
        step: PoApprovalStep,
        remark: string,
        replyMessageId: string,
        replyChatId: string
    ): Promise<{ handled: boolean; action: string; purchaseOrderId: number }> {
        const now = new Date();
        const [updatedStep] = await this.db
            .update(poApprovalSteps)
            .set({
                status: "rejected",
                decisionRemark: remark,
                replyMessageId,
                actedAt: now,
                updatedAt: now,
            })
            .where(and(eq(poApprovalSteps.id, step.id), eq(poApprovalSteps.status, "active")))
            .returning();

        if (!updatedStep) {
            return { handled: false, action: "concurrent_noop", purchaseOrderId: step.purchaseOrderId };
        }

        await this.db
            .update(poApprovalWorkflows)
            .set({
                status: "rejected",
                currentStage: null,
                finalizedAt: now,
                updatedAt: now,
            })
            .where(eq(poApprovalWorkflows.id, step.workflowId));

        await this.db
            .update(purchaseOrders)
            .set({
                poApproved: false,
                poApprovalRemark: remark,
                updatedAt: now,
            })
            .where(eq(purchaseOrders.id, step.purchaseOrderId));

        await this.db
            .update(paymentRequests)
            .set({ status: "rejected", rejectionReason: remark || "PO Rejected by Accounts", updatedAt: now })
            .where(and(eq(paymentRequests.purchaseOrderId, step.purchaseOrderId), eq(paymentRequests.status, "po_approval_pending")));

        await this.db.insert(poApprovalAuditLogs).values({
            purchaseOrderId: step.purchaseOrderId,
            workflowId: step.workflowId,
            stepId: step.id,
            eventType: "stage_rejected",
            actorUserId: step.approverUserId,
            senderJid: replyChatId,
            waMessageId: replyMessageId,
            metadata: { stageOrder: 2, stageRole: "accounts", remark },
        });

        const context = await this.loadPoNotificationContext(step.purchaseOrderId);
        if (context) {
            await this.notifications.sendPoApprovalStageResult({
                purchaseOrderId: step.purchaseOrderId,
                poNumber: context.poNumber,
                stageOrder: 2,
                stageRole: "accounts",
                decision: "rejected",
                actorName: step.approverNameSnapshot ?? "Accounts Manager",
                creatorUserId: context.createdBy || null,
                teamId: context.teamId,
                sellerName: context.sellerName,
                grandTotal: context.grandTotal,
                remark,
                replyToChatId: replyChatId,
                isFinalApproval: false,
            });
        }

        return { handled: true, action: "stage2_rejected", purchaseOrderId: step.purchaseOrderId };
    }

    private async sendDirectReplySafe(chatId: string | undefined, text: string): Promise<void> {
        if (!chatId) return;
        if (this.config.OPENWA_DRY_RUN) {
            this.logger.log(`[DRY_RUN] Direct reply to ${chatId}:\n${text}`);
            return;
        }
        try {
            await this.openwa.sendText(chatId, text);
        } catch (err) {
            this.logger.warn(`Failed to send WhatsApp reply to ${chatId}: ${err}`);
        }
    }

    /**
     * Cancel any in_progress WhatsApp workflow when a PO is approved/rejected directly in the TMS web app.
     */
    async cancelWorkflowOnInAppDecision(
        purchaseOrderId: number,
        actorUserId?: number,
        decision: "approved" | "rejected" = "approved"
    ): Promise<void> {
        const activeWorkflows = await this.db
            .select({ id: poApprovalWorkflows.id })
            .from(poApprovalWorkflows)
            .where(and(eq(poApprovalWorkflows.purchaseOrderId, purchaseOrderId), eq(poApprovalWorkflows.status, "in_progress")));

        if (activeWorkflows.length === 0) return;

        const now = new Date();
        const wfIds = activeWorkflows.map(w => w.id);

        await this.db
            .update(poApprovalWorkflows)
            .set({
                status: "completed_in_app",
                currentStage: null,
                finalizedAt: now,
                updatedAt: now,
            })
            .where(inArray(poApprovalWorkflows.id, wfIds));

        await this.db
            .update(poApprovalSteps)
            .set({ status: "superseded", updatedAt: now })
            .where(and(inArray(poApprovalSteps.workflowId, wfIds), inArray(poApprovalSteps.status, ["active", "pending", "blocked"])));

        await this.db.insert(poApprovalAuditLogs).values(
            wfIds.map(workflowId => ({
                purchaseOrderId,
                workflowId,
                eventType: "in_app_override" as const,
                actorUserId: actorUserId ?? null,
                metadata: { decision },
            }))
        );
    }

    /**
     * Return the latest workflow, its steps, and recent audit logs for a Purchase Order.
     */
    async getWorkflowForPo(purchaseOrderId: number) {
        const [workflow] = await this.db
            .select()
            .from(poApprovalWorkflows)
            .where(eq(poApprovalWorkflows.purchaseOrderId, purchaseOrderId))
            .orderBy(desc(poApprovalWorkflows.version))
            .limit(1);

        if (!workflow) {
            return null;
        }

        const [steps, auditLogs] = await Promise.all([
            this.db
                .select()
                .from(poApprovalSteps)
                .where(eq(poApprovalSteps.workflowId, workflow.id))
                .orderBy(asc(poApprovalSteps.stageOrder)),
            this.db
                .select()
                .from(poApprovalAuditLogs)
                .where(eq(poApprovalAuditLogs.workflowId, workflow.id))
                .orderBy(desc(poApprovalAuditLogs.createdAt))
                .limit(30),
        ]);

        return {
            ...workflow,
            steps,
            auditLogs,
        };
    }

    /**
     * Resend the active (or blocked) stage WhatsApp approval prompt for a pending PO.
     * Re-resolves the approver in case mobile number or TL/Accounts assignment was updated.
     */
    async resendActiveStagePrompt(purchaseOrderId: number, actorUserId?: number) {
        const context = await this.loadPoNotificationContext(purchaseOrderId);
        if (!context) {
            throw new NotFoundException("Purchase Order not found");
        }

        const [workflow] = await this.db
            .select()
            .from(poApprovalWorkflows)
            .where(eq(poApprovalWorkflows.purchaseOrderId, purchaseOrderId))
            .orderBy(desc(poApprovalWorkflows.version))
            .limit(1);

        // If no workflow exists yet or the previous workflow is not in_progress, start a fresh workflow
        if (!workflow || workflow.status !== "in_progress") {
            return this.startWorkflowForPo({
                purchaseOrderId,
                poNumber: context.poNumber,
                tenderId: context.tenderId,
                projectName: context.projectName,
                sellerName: context.sellerName,
                grandTotal: context.grandTotal,
                teamId: context.teamId,
                createdBy: context.createdBy || actorUserId || 0,
                itemsSummary: context.itemsSummary,
            });
        }

        const targetStage = workflow.currentStage ?? 1;
        const [step] = await this.db
            .select()
            .from(poApprovalSteps)
            .where(and(eq(poApprovalSteps.workflowId, workflow.id), eq(poApprovalSteps.stageOrder, targetStage)))
            .limit(1);

        if (!step) {
            throw new BadRequestException(`Stage ${targetStage} step not found for PO #${purchaseOrderId}`);
        }

        const resolved =
            step.stageRole === "tl"
                ? await this.resolveStage1Tl(context.createdBy, context.teamId)
                : await this.resolveStage2Accounts();

        if (!resolved || !resolved.jid) {
            throw new BadRequestException(
                !resolved
                    ? `No ${step.stageRole === "tl" ? "Team Leader" : "Accounts Manager"} found for this Purchase Order.`
                    : `${resolved.name} does not have a mobile number configured in TMS.`
            );
        }

        const [updatedStep] = await this.db
            .update(poApprovalSteps)
            .set({
                approverUserId: resolved.userId,
                approverNameSnapshot: resolved.name,
                approverMobileSnapshot: resolved.mobile,
                approverJid: resolved.jid,
                status: "active",
                skipReason: null,
                updatedAt: new Date(),
            })
            .where(eq(poApprovalSteps.id, step.id))
            .returning();

        await this.dispatchStageNotification(workflow.id, updatedStep, context);

        await this.db.insert(poApprovalAuditLogs).values({
            purchaseOrderId,
            workflowId: workflow.id,
            stepId: updatedStep.id,
            eventType: "link_resent",
            actorUserId: actorUserId ?? null,
            senderJid: resolved.jid,
            metadata: { stageOrder: updatedStep.stageOrder, stageRole: updatedStep.stageRole },
        });

        return this.getWorkflowForPo(purchaseOrderId);
    }
}
