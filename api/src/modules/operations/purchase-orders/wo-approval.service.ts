import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import { users } from "@/db/schemas";
import { paymentRequests } from "@/db/schemas/operations";
import { orderExtraCharges } from "@/db/schemas/operations/order-extra-charges.schema";
import { vendorWorkOrderItems } from "@/db/schemas/operations/vendor-work-order-items.schema";
import { vendorWorkOrders } from "@/db/schemas/operations/vendor-work-orders.schema";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";
import { CashFlowService } from "@/modules/operations/cash-flows/cash-flow.service";
import {
    OperationNotificationService,
    type SubmitTlApprovalDto,
} from "@/modules/operations/operation-notification.service";
import { round2 } from "@/utils/money.util";

@Injectable()
export class WoApprovalService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly notifications: OperationNotificationService,
        private readonly cashFlowService?: CashFlowService
    ) {}

    async setVwoApproval(
        id: number,
        { approve, tdsPercentage, remark }: { approve: boolean; tdsPercentage?: number; remark?: string },
        userId?: number
    ) {
        const wo = await this.db
            .select()
            .from(vendorWorkOrders)
            .where(eq(vendorWorkOrders.id, id))
            .then(rows => rows[0]);
        if (!wo) throw new NotFoundException("Vendor Work Order not found");

        if (approve) {
            if (tdsPercentage == null || tdsPercentage < 0) {
                throw new BadRequestException("TDS percentage is required when approving");
            }

            const items = await this.db
                .select()
                .from(vendorWorkOrderItems)
                .where(eq(vendorWorkOrderItems.vendorWorkOrderId, id));

            const subtotal = items.reduce((acc, item) => acc + Number(item.taxableAmount), 0);
            const charges = await this.db
                .select()
                .from(orderExtraCharges)
                .where(eq(orderExtraCharges.vendorWorkOrderId, id));
            const chargesTotal = charges.reduce((sum, c) => sum + Number(c.totalAmount ?? 0), 0);
            const grandTotal = items.reduce((acc, item) => acc + Number(item.totalAmount), 0) + chargesTotal;
            const tdsAmt = (subtotal * tdsPercentage) / 100;
            const amountAfterTds = grandTotal - tdsAmt;

            const [updated] = await this.db
                .update(vendorWorkOrders)
                .set({
                    tdsPercentage: tdsPercentage.toString(),
                    tdsAmount: round2(tdsAmt).toFixed(2),
                    amountAfterTds: round2(amountAfterTds).toFixed(2),
                    woApproved: true,
                    woApprovalRemark: remark || null,
                    ...(wo.tlStatus !== 1
                        ? {
                              tlStatus: 1,
                              tlComment: wo.tlComment || "Auto-approved with Stage 2 Accounts approval",
                          }
                        : {}),
                    updatedAt: sql`now()`,
                })
                .where(eq(vendorWorkOrders.id, id))
                .returning();

            this.logger.info(`VWO approved #${id}: ${tdsPercentage}%, TDS Amount: ${tdsAmt}, After TDS: ${amountAfterTds}`);

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
                .where(and(eq(paymentRequests.vendorWorkOrderId, id), eq(paymentRequests.status, "po_approval_pending")));

            if (pendingPrs.length > 0) {
                await this.db
                    .update(paymentRequests)
                    .set({ status: "pending", tdsPercentage: tdsPercentage.toString(), updatedAt: new Date() })
                    .where(and(eq(paymentRequests.vendorWorkOrderId, id), eq(paymentRequests.status, "po_approval_pending")));

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

                this.logger.info(`Bulk updated ${pendingPrs.length} payment requests from po_approval_pending to pending for VWO #${id}`);
            }

            this.notifications
                .notifyVwoApproved({
                    vendorWorkOrderId: id,
                    woNumber: wo.woNumber ?? `#${id}`,
                    sellerName: wo.sellerName,
                    grandTotal: round2(grandTotal).toFixed(2),
                    tdsPercentage: tdsPercentage.toString(),
                    amountAfterTds: round2(amountAfterTds).toFixed(2),
                    approvedBy: userId ?? 0,
                })
                .catch(err => this.logger.warn(`WhatsApp VWO approval notification failed: ${err}`));

            if (wo.projectId && this.cashFlowService) {
                await this.cashFlowService
                    .create({
                        projectId: wo.projectId,
                        eventType: "vwo_approved",
                        amount: round2(amountAfterTds).toFixed(2),
                        direction: "outflow",
                        referenceType: "vendor_work_order",
                        referenceId: wo.id,
                        referenceNo: wo.woNumber ?? `VWO #${wo.id}`,
                        tdsPercentage: tdsPercentage.toString(),
                        tdsAmount: round2(tdsAmt).toFixed(2),
                        remark: `VWO approved with TDS @ ${tdsPercentage}%`,
                        createdBy: userId ?? 0,
                    })
                    .catch(err => this.logger.warn(`Cash flow creation failed for VWO approval #${wo.id}: ${err}`));
            }

            return updated;
        } else {
            const [updated] = await this.db
                .update(vendorWorkOrders)
                .set({
                    woApproved: false,
                    woApprovalRemark: remark || null,
                    updatedAt: sql`now()`,
                })
                .where(eq(vendorWorkOrders.id, id))
                .returning();

            const rejectedCount = await this.db
                .update(paymentRequests)
                .set({ status: "rejected", rejectionReason: remark || "VWO Rejected", updatedAt: new Date() })
                .where(and(eq(paymentRequests.vendorWorkOrderId, id), eq(paymentRequests.status, "po_approval_pending")))
                .returning({ id: paymentRequests.id });

            if (rejectedCount.length > 0) {
                this.logger.info(`Bulk rejected ${rejectedCount.length} payment requests for rejected VWO #${id}`);
            }

            const rejectItems = await this.db
                .select()
                .from(vendorWorkOrderItems)
                .where(eq(vendorWorkOrderItems.vendorWorkOrderId, id));
            const rejectGrandTotal = rejectItems.reduce((acc, item) => acc + Number(item.totalAmount), 0);

            this.notifications
                .notifyVwoRejected({
                    vendorWorkOrderId: id,
                    woNumber: wo.woNumber ?? `#${id}`,
                    sellerName: wo.sellerName,
                    grandTotal: rejectGrandTotal.toString(),
                    remark: remark || null,
                    rejectedBy: userId ?? 0,
                })
                .catch(err => this.logger.warn(`WhatsApp VWO rejection notification failed: ${err}`));

            this.logger.info(`VWO rejected #${id}: ${remark || "no remark"}`);
            return updated;
        }
    }

    async submitTlApproval(
        id: number,
        body: SubmitTlApprovalDto,
        user?: ValidatedUser
    ) {
        if (!user) {
            throw new ForbiddenException(
                "Authentication is required for TL approval"
            );
        }

        const tlStatus = Number(body?.tlStatus);
        if (tlStatus !== 1 && tlStatus !== 2 && tlStatus !== 3) {
            throw new BadRequestException(
                "tlStatus must be 1 (Approve), 2 (Reject), or 3 (Edit Requested)"
            );
        }

        const rawComment =
            typeof body?.tlComment === "string" ? body.tlComment.trim() || null : null;
        const rejectionFields = Array.isArray(body?.rejectionFields)
            ? body.rejectionFields
                  .map(f => ({
                      field: String(f?.field ?? "").trim(),
                      label: String(f?.label ?? f?.field ?? "").trim(),
                      remark: String(f?.remark ?? "").trim(),
                  }))
                  .filter(f => f.field && f.remark)
            : [];
        const editFields = Array.isArray(body?.editFields)
            ? body.editFields
                  .map(f => ({
                      field: String(f?.field ?? "").trim(),
                      label: String(f?.label ?? f?.field ?? "").trim(),
                      oldValue: String(f?.oldValue ?? "").trim(),
                      newValue: String(f?.newValue ?? "").trim(),
                      ...(typeof f?.remark === "string" && f.remark.trim()
                          ? { remark: f.remark.trim() }
                          : {}),
                  }))
                  .filter(f => f.field && f.newValue)
            : [];

        if (tlStatus === 2 && !rawComment && rejectionFields.length === 0) {
            throw new BadRequestException(
                "Rejection reason (tlComment or per-field rejection remarks) is required when rejecting a Work Order"
            );
        }
        if (tlStatus === 3 && !rawComment && editFields.length === 0) {
            throw new BadRequestException(
                "At least one requested field change (editFields) or edit remark is required when requesting an edit on a Work Order"
            );
        }

        const comment =
            tlStatus === 2 && rejectionFields.length > 0
                ? [
                      ...rejectionFields.map(f => `${f.label || f.field}: ${f.remark}`),
                      ...(rawComment ? [`Note: ${rawComment}`] : []),
                  ].join(" | ")
                : tlStatus === 3 && editFields.length > 0
                  ? [
                        ...editFields.map(
                            f =>
                                `${f.label || f.field}: "${f.oldValue || "—"}" → "${f.newValue}"${f.remark ? ` (${f.remark})` : ""}`
                        ),
                        ...(rawComment ? [`Note: ${rawComment}`] : []),
                    ].join(" | ")
                  : rawComment;

        const wo = await this.db
            .select()
            .from(vendorWorkOrders)
            .where(eq(vendorWorkOrders.id, id))
            .then(rows => rows[0]);

        if (!wo) {
            throw new NotFoundException("Vendor Work Order not found");
        }

        if (wo.woApproved === true) {
            throw new BadRequestException(
                "Cannot change TL approval after Accounts has already approved the Work Order"
            );
        }

        // Resolve creatorTeamId: COALESCE(creator.primary_team_id, creator.team, wo.team)
        let creatorTeamId: number | null = wo.team != null ? Number(wo.team) : null;
        if (wo.woRaisedBy) {
            const [creator] = await this.db
                .select({
                    primaryTeamId: users.primaryTeamId,
                    team: users.team,
                })
                .from(users)
                .where(eq(users.id, wo.woRaisedBy))
                .limit(1);

            creatorTeamId =
                creator?.primaryTeamId != null
                    ? Number(creator.primaryTeamId)
                    : creator?.team != null
                      ? Number(creator.team)
                      : creatorTeamId;
        }

        const roleId = Number(user.roleId);
        const isSuperOrAdmin = roleId === 1 || roleId === 2;
        const isSameTeamTl =
            roleId === 3 &&
            user.teamId != null &&
            creatorTeamId != null &&
            Number(user.teamId) === Number(creatorTeamId);

        if (!isSuperOrAdmin && !isSameTeamTl) {
            throw new ForbiddenException(
                "Only Super User, Admin, or the creator's Team Leader can perform Stage 1 TL approval on this Work Order"
            );
        }

        const items = await this.db
            .select()
            .from(vendorWorkOrderItems)
            .where(eq(vendorWorkOrderItems.vendorWorkOrderId, id));
        const itemsGrandTotal = items.reduce(
            (acc, item) => acc + Number(item.totalAmount),
            0
        );
        const charges = await this.db
            .select()
            .from(orderExtraCharges)
            .where(eq(orderExtraCharges.vendorWorkOrderId, id));
        const chargesTotal = charges.reduce(
            (sum, c) => sum + Number(c.totalAmount ?? 0),
            0
        );
        const grandTotal = itemsGrandTotal + chargesTotal;

        const now = new Date();

        if (tlStatus === 1) {
            const tlFeedback = rawComment
                ? {
                      action: "approve" as const,
                      generalRemark: rawComment,
                      actedBy: user.id,
                      actedAt: now.toISOString(),
                  }
                : null;
            const [updated] = await this.db
                .update(vendorWorkOrders)
                .set({
                    tlStatus: 1,
                    tlComment: comment,
                    tlFeedback,
                    ...(wo.woApproved === false &&
                    (wo.tlStatus === 2 || wo.tlStatus === 3)
                        ? { woApproved: null, woApprovalRemark: null }
                        : {}),
                    updatedAt: now,
                })
                .where(eq(vendorWorkOrders.id, id))
                .returning();

            this.notifications
                .notifyVwoTlDecision({
                    vendorWorkOrderId: id,
                    woNumber: wo.woNumber ?? `#${id}`,
                    sellerName: wo.sellerName,
                    grandTotal: round2(grandTotal).toFixed(2),
                    projectName: wo.projectName,
                    tlStatus: 1,
                    tlComment: comment,
                    actedBy: user.id,
                    createdBy: wo.woRaisedBy ?? null,
                    teamId: creatorTeamId,
                })
                .catch(err =>
                    this.logger.warn(
                        `WhatsApp VWO TL approval notification failed: ${err}`
                    )
                );

            this.logger.info(`VWO #${id} approved by TL/Admin user #${user.id}`);
            return updated;
        } else if (tlStatus === 3) {
            const tlFeedback = {
                action: "edit" as const,
                generalRemark: rawComment,
                editFields,
                actedBy: user.id,
                actedAt: now.toISOString(),
            };
            const [updated] = await this.db
                .update(vendorWorkOrders)
                .set({
                    tlStatus: 3,
                    tlComment: comment,
                    tlFeedback,
                    ...(wo.woApproved === false && wo.tlStatus === 2
                        ? { woApproved: null, woApprovalRemark: null }
                        : {}),
                    updatedAt: now,
                })
                .where(eq(vendorWorkOrders.id, id))
                .returning();

            this.notifications
                .notifyVwoTlDecision({
                    vendorWorkOrderId: id,
                    woNumber: wo.woNumber ?? `#${id}`,
                    sellerName: wo.sellerName,
                    grandTotal: round2(grandTotal).toFixed(2),
                    projectName: wo.projectName,
                    tlStatus: 3,
                    tlComment: comment,
                    editFields,
                    actedBy: user.id,
                    createdBy: wo.woRaisedBy ?? null,
                    teamId: creatorTeamId,
                })
                .catch(err =>
                    this.logger.warn(
                        `WhatsApp VWO TL edit-request notification failed: ${err}`
                    )
                );

            this.logger.info(
                `VWO #${id} edit requested by TL/Admin user #${user.id}: ${comment}`
            );
            return updated;
        } else {
            const tlFeedback = {
                action: "reject" as const,
                generalRemark: rawComment,
                rejectionFields,
                actedBy: user.id,
                actedAt: now.toISOString(),
            };
            const [updated] = await this.db
                .update(vendorWorkOrders)
                .set({
                    tlStatus: 2,
                    tlComment: comment,
                    tlFeedback,
                    woApproved: false,
                    woApprovalRemark: comment,
                    updatedAt: now,
                })
                .where(eq(vendorWorkOrders.id, id))
                .returning();

            await this.db
                .update(paymentRequests)
                .set({
                    status: "rejected",
                    rejectionReason: comment || "VWO Rejected by Team Leader",
                    updatedAt: now,
                })
                .where(
                    and(
                        eq(paymentRequests.vendorWorkOrderId, id),
                        eq(paymentRequests.status, "po_approval_pending")
                    )
                );

            this.notifications
                .notifyVwoTlDecision({
                    vendorWorkOrderId: id,
                    woNumber: wo.woNumber ?? `#${id}`,
                    sellerName: wo.sellerName,
                    grandTotal: round2(grandTotal).toFixed(2),
                    projectName: wo.projectName,
                    tlStatus: 2,
                    tlComment: comment,
                    ...(rejectionFields.length > 0 ? { rejectionFields } : {}),
                    actedBy: user.id,
                    createdBy: wo.woRaisedBy ?? null,
                    teamId: creatorTeamId,
                })
                .catch(err =>
                    this.logger.warn(
                        `WhatsApp VWO TL rejection notification failed: ${err}`
                    )
                );

            this.logger.info(
                `VWO #${id} rejected by TL/Admin user #${user.id}: ${comment}`
            );
            return updated;
        }
    }
}
