import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import { users } from "@/db/schemas";
import { paymentRequests } from "@/db/schemas/operations";
import { orderExtraCharges } from "@/db/schemas/operations/order-extra-charges.schema";
import { purchaseOrderProducts } from "@/db/schemas/operations/purchase-order-products.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";
import { CashFlowService } from "@/modules/operations/cash-flows/cash-flow.service";
import { poHasPurchaseInvoice, tryMaterializePoInventory } from "@/modules/operations/inventory/inventory.materialize";
import {
    OperationNotificationService,
    type SubmitTlApprovalDto,
} from "@/modules/operations/operation-notification.service";
import { round2 } from "@/utils/money.util";

@Injectable()
export class PoApprovalService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly notifications: OperationNotificationService,
        private readonly cashFlowService?: CashFlowService
    ) {}

    private getTotalProductValues(products: any[]) {
        let total = 0;
        let totalGst = 0;
        let totalWithGst = 0;
        for (const product of products) {
            const prodTotal = Number(product.qty) * Number(product.rate);
            const prodGstAmount = (prodTotal * Number(product.gstRate)) / 100;
            const prodTotalWithGst = prodTotal + prodGstAmount;
            total += prodTotal;
            totalGst += prodGstAmount;
            totalWithGst += prodTotalWithGst;
        }
        return { total, totalGst, totalWithGst };
    }

    private computeProductsGrandTotal(products: any[]): number {
        return this.getTotalProductValues(products).totalWithGst;
    }

    async setTdsPercentage(
        id: number,
        { approve, tdsPercentage, remark }: { approve: boolean; tdsPercentage?: number; remark?: string },
        userId?: number
    ) {
        const po = await this.db
            .select()
            .from(purchaseOrders)
            .where(eq(purchaseOrders.id, id))
            .then(rows => rows[0]);
        if (!po) throw new NotFoundException("Purchase Order not found");

        if (approve) {
            if (po.tlStatus !== 1) {
                throw new BadRequestException("Stage 1 TL approval is required before Accounts can approve");
            }
            if (tdsPercentage == null || tdsPercentage < 0) {
                throw new BadRequestException("TDS percentage is required when approving");
            }

            const products = await this.db
                .select()
                .from(purchaseOrderProducts)
                .where(eq(purchaseOrderProducts.purchaseOrderId, id));

            const { total: subtotal, totalWithGst: itemsGrandTotal } = this.getTotalProductValues(products);
            const charges = await this.db
                .select()
                .from(orderExtraCharges)
                .where(eq(orderExtraCharges.purchaseOrderId, id));
            const chargesTotal = charges.reduce((sum, c) => sum + Number(c.totalAmount ?? 0), 0);
            const grandTotal = itemsGrandTotal + chargesTotal;
            const tdsAmt = (subtotal * tdsPercentage) / 100;
            const amountAfterTds = grandTotal - tdsAmt;

            const updated = await this.db
                .update(purchaseOrders)
                .set({
                    tdsPercentage: tdsPercentage.toString(),
                    tdsAmount: round2(tdsAmt).toFixed(2),
                    amountAfterTds: round2(amountAfterTds).toFixed(2),
                    poApproved: true,
                    poApprovalRemark: remark || null,
                    updatedAt: new Date(),
                })
                .where(eq(purchaseOrders.id, id))
                .returning()
                .then(rows => rows[0]);

            if (await poHasPurchaseInvoice(this.db, id)) {
                await this.db.transaction(tx => tryMaterializePoInventory(tx, id, userId ?? po.poRaisedBy));
            }

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
                .where(and(eq(paymentRequests.purchaseOrderId, id), eq(paymentRequests.status, "po_approval_pending")));

            if (pendingPrs.length > 0) {
                await this.db
                    .update(paymentRequests)
                    .set({ status: "pending", tdsPercentage: tdsPercentage.toString(), updatedAt: new Date() })
                    .where(and(eq(paymentRequests.purchaseOrderId, id), eq(paymentRequests.status, "po_approval_pending")));

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

                this.logger.info(`Bulk updated ${pendingPrs.length} payment requests from po_approval_pending to pending for PO #${id}`);
            }

            this.notifications
                .notifyPoApproved({
                    purchaseOrderId: id,
                    poNumber: po.poNumber ?? `#${id}`,
                    sellerName: po.sellerName,
                    grandTotal: round2(grandTotal).toFixed(2),
                    tdsPercentage: tdsPercentage.toString(),
                    amountAfterTds: round2(amountAfterTds).toFixed(2),
                    approvedBy: userId ?? 0,
                })
                .catch(err => this.logger.warn(`WhatsApp PO approval notification failed: ${err}`));

            this.logger.info(`TDS approved for PO #${id}: ${tdsPercentage}%, TDS Amount: ${tdsAmt}, After TDS: ${amountAfterTds}`);

            if (po.projectId && this.cashFlowService) {
                await this.cashFlowService
                    .create({
                        projectId: po.projectId,
                        eventType: "po_approved",
                        amount: round2(amountAfterTds).toFixed(2),
                        direction: "outflow",
                        referenceType: "purchase_order",
                        referenceId: po.id,
                        referenceNo: po.poNumber ?? `PO #${po.id}`,
                        tdsPercentage: tdsPercentage.toString(),
                        tdsAmount: round2(tdsAmt).toFixed(2),
                        remark: `PO approved with TDS @ ${tdsPercentage}%`,
                        createdBy: userId ?? 0,
                    })
                    .catch(err => this.logger.warn(`Cash flow creation failed for PO approval #${po.id}: ${err}`));
            }

            return updated;
        } else {
            const [updated] = await this.db
                .update(purchaseOrders)
                .set({
                    poApproved: false,
                    poApprovalRemark: remark || null,
                    updatedAt: new Date(),
                })
                .where(eq(purchaseOrders.id, id))
                .returning();

            const rejectedCount = await this.db
                .update(paymentRequests)
                .set({ status: "rejected", rejectionReason: remark || "PO Rejected", updatedAt: new Date() })
                .where(and(eq(paymentRequests.purchaseOrderId, id), eq(paymentRequests.status, "po_approval_pending")))
                .returning({ id: paymentRequests.id });

            if (rejectedCount.length > 0) {
                this.logger.info(`Bulk rejected ${rejectedCount.length} payment requests for rejected PO #${id}`);
            }

            const rejectProducts = await this.db
                .select()
                .from(purchaseOrderProducts)
                .where(eq(purchaseOrderProducts.purchaseOrderId, id));
            const { totalWithGst: rejectGrandTotal } = this.getTotalProductValues(rejectProducts);

            this.notifications
                .notifyPoRejected({
                    purchaseOrderId: id,
                    poNumber: po.poNumber ?? `#${id}`,
                    sellerName: po.sellerName,
                    grandTotal: rejectGrandTotal.toString(),
                    remark: remark || null,
                    rejectedBy: userId ?? 0,
                })
                .catch(err => this.logger.warn(`WhatsApp PO rejection notification failed: ${err}`));

            this.logger.info(`TDS rejected for PO #${id}: ${remark || "no remark"}`);
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
                "Authentication is required to approve or reject a Purchase Order."
            );
        }

        const po = await this.db
            .select()
            .from(purchaseOrders)
            .where(eq(purchaseOrders.id, id))
            .then(rows => rows[0]);

        if (!po) {
            throw new NotFoundException("Purchase Order not found");
        }

        if (po.poApproved === true) {
            throw new BadRequestException(
                "Cannot change TL approval on an already finally approved Purchase Order."
            );
        }

        // Resolve creator's team
        let creatorTeamId: number | null = po.team != null ? Number(po.team) : null;
        if (po.poRaisedBy) {
            const [creator] = await this.db
                .select({
                    primaryTeamId: users.primaryTeamId,
                    team: users.team,
                })
                .from(users)
                .where(eq(users.id, po.poRaisedBy))
                .limit(1);

            creatorTeamId =
                creator?.primaryTeamId != null
                    ? Number(creator.primaryTeamId)
                    : creator?.team != null
                      ? Number(creator.team)
                      : creatorTeamId;
        }

        const roleName = (user.role ?? "").trim().toLowerCase();
        const isSuperOrAdmin =
            user.roleId === 1 ||
            user.roleId === 2 ||
            roleName === "super user" ||
            roleName === "admin";
        const isTeamLeader =
            user.roleId === 3 ||
            roleName === "team leader" ||
            roleName === "teamleader";
        const userTeamId = user.teamId != null ? Number(user.teamId) : null;
        const isSameTeamTl =
            isTeamLeader &&
            userTeamId != null &&
            creatorTeamId != null &&
            userTeamId === creatorTeamId;

        if (!isSuperOrAdmin && !isSameTeamTl) {
            throw new ForbiddenException(
                "Only the creator's Team Leader, an Admin, or a Super User can approve or reject this Purchase Order."
            );
        }

        const tlStatus = Number(body?.tlStatus);
        if (tlStatus !== 1 && tlStatus !== 2 && tlStatus !== 3) {
            throw new BadRequestException(
                "tlStatus must be 1 (Approved), 2 (Rejected), or 3 (Edit Requested)"
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
                "A rejection reason (tlComment or per-field rejection remarks) is required when rejecting a Purchase Order."
            );
        }
        if (tlStatus === 3 && !rawComment && editFields.length === 0) {
            throw new BadRequestException(
                "At least one requested field change (editFields) or edit remark is required when requesting an edit."
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

        // Compute grandTotal for notifications
        const products = await this.db
            .select()
            .from(purchaseOrderProducts)
            .where(eq(purchaseOrderProducts.purchaseOrderId, id));
        const itemsGrandTotal = this.computeProductsGrandTotal(products);
        const charges = await this.db
            .select()
            .from(orderExtraCharges)
            .where(eq(orderExtraCharges.purchaseOrderId, id));
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
                .update(purchaseOrders)
                .set({
                    tlStatus: 1,
                    tlComment: comment,
                    tlFeedback,
                    // If previously rejected by TL, clear poApproved=false so it moves to pending Accounts
                    ...(po.poApproved === false &&
                    (po.tlStatus === 2 || po.tlStatus === 3)
                        ? { poApproved: null, poApprovalRemark: null }
                        : {}),
                    updatedAt: now,
                })
                .where(eq(purchaseOrders.id, id))
                .returning();

            this.notifications
                .notifyPoTlDecision({
                    purchaseOrderId: id,
                    poNumber: po.poNumber ?? `#${id}`,
                    sellerName: po.sellerName,
                    grandTotal: round2(grandTotal).toFixed(2),
                    projectName: po.projectName,
                    tlStatus: 1,
                    tlComment: comment,
                    actedBy: user.id,
                    createdBy: po.poRaisedBy ?? null,
                    teamId: creatorTeamId,
                })
                .catch(err =>
                    this.logger.warn(
                        `WhatsApp TL approval notification failed: ${err}`
                    )
                );

            this.logger.info(`PO #${id} approved by TL/Admin user #${user.id}`);
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
                .update(purchaseOrders)
                .set({
                    tlStatus: 3,
                    tlComment: comment,
                    tlFeedback,
                    ...(po.poApproved === false && po.tlStatus === 2
                        ? { poApproved: null, poApprovalRemark: null }
                        : {}),
                    updatedAt: now,
                })
                .where(eq(purchaseOrders.id, id))
                .returning();

            this.notifications
                .notifyPoTlDecision({
                    purchaseOrderId: id,
                    poNumber: po.poNumber ?? `#${id}`,
                    sellerName: po.sellerName,
                    grandTotal: round2(grandTotal).toFixed(2),
                    projectName: po.projectName,
                    tlStatus: 3,
                    tlComment: comment,
                    editFields,
                    actedBy: user.id,
                    createdBy: po.poRaisedBy ?? null,
                    teamId: creatorTeamId,
                })
                .catch(err =>
                    this.logger.warn(
                        `WhatsApp TL edit-request notification failed: ${err}`
                    )
                );

            this.logger.info(
                `PO #${id} edit requested by TL/Admin user #${user.id}: ${comment}`
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
                .update(purchaseOrders)
                .set({
                    tlStatus: 2,
                    tlComment: comment,
                    tlFeedback,
                    poApproved: false,
                    poApprovalRemark: comment,
                    updatedAt: now,
                })
                .where(eq(purchaseOrders.id, id))
                .returning();

            // Reject any po_approval_pending payment requests
            await this.db
                .update(paymentRequests)
                .set({
                    status: "rejected",
                    rejectionReason: comment || "PO Rejected by Team Leader",
                    updatedAt: now,
                })
                .where(
                    and(
                        eq(paymentRequests.purchaseOrderId, id),
                        eq(paymentRequests.status, "po_approval_pending")
                    )
                );

            this.notifications
                .notifyPoTlDecision({
                    purchaseOrderId: id,
                    poNumber: po.poNumber ?? `#${id}`,
                    sellerName: po.sellerName,
                    grandTotal: round2(grandTotal).toFixed(2),
                    projectName: po.projectName,
                    tlStatus: 2,
                    tlComment: comment,
                    ...(rejectionFields.length > 0 ? { rejectionFields } : {}),
                    actedBy: user.id,
                    createdBy: po.poRaisedBy ?? null,
                    teamId: creatorTeamId,
                })
                .catch(err =>
                    this.logger.warn(
                        `WhatsApp TL rejection notification failed: ${err}`
                    )
                );

            this.logger.info(
                `PO #${id} rejected by TL/Admin user #${user.id}: ${comment}`
            );
            return updated;
        }
    }
}
