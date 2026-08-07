import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import { users } from "@/db/schemas/";
import { projects } from "@/db/schemas/master/projects.schema";
import { beneficiaries } from "@/db/schemas/operations/beneficiaries.schema";
import { paymentRequests, type PaymentRequest as OperationPaymentRequest } from "@/db/schemas/operations/payment-requests.schema";
import { employeeImprestTransactions } from "@/db/schemas/shared/employee-imprest-transaction.schema";
import { purchaseInvoices } from "@/db/schemas/operations/purchase-invoices.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { vendorWorkOrders } from "@/db/schemas/operations/vendor-work-orders.schema";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, like, ne, sql } from "drizzle-orm";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class PaymentRequestService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async generateNumber(projectName?: string) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const from = month >= 4 ? year.toString().slice(-2) : (year - 1).toString().slice(-2);
        const to = ((Number.parseInt(from) + 1) % 100).toString().padStart(2, "0");
        const fy = `${from}${to}`;

        const sanitizedName = projectName ? this.sanitizeProjectName(projectName) : "PROJECT";
        const prefix = `VE/${sanitizedName}/${fy}`;

        const last = await this.db
            .select({ id: paymentRequests.id, requestNo: paymentRequests.requestNo })
            .from(paymentRequests)
            .where(like(paymentRequests.requestNo, `VE/%/${fy}/PR%`))
            .orderBy(desc(paymentRequests.id));

        let next = 1;
        if (last[0]?.requestNo) {
            const match = RegExp(/PR(\d{4})$/).exec(last[0].requestNo);
            if (match) next = parseInt(match[1]) + 1;
        }

        return `${prefix}/PR${next.toString().padStart(4, "0")}`;
    }

    async create(body: any, userId: number) {
        const requestNo = body.requestNo || await this.generateNumber(body.projectName);

        // Validate against PO TDS cap
        if (body.purchaseOrderId) {
            const po = await this.db
                .select()
                .from(purchaseOrders)
                .where(eq(purchaseOrders.id, body.purchaseOrderId))
                .then(rows => rows[0]);

            if (!po) {
                throw new NotFoundException("Purchase Order not found");
            }

            if (po.poApproved !== true) {
                throw new BadRequestException("Cannot create payment request against an unapproved PO. Only approved POs are eligible.");
            }

            if (po?.amountAfterTds) {
                const amountAfterTds = Number(po.amountAfterTds);
                const existingSumResult = await this.db
                    .select({
                        total: sql<number>`COALESCE(SUM(amount::numeric), 0)`,
                    })
                    .from(paymentRequests)
                    .where(
                        and(
                            eq(paymentRequests.purchaseOrderId, body.purchaseOrderId),
                            ne(paymentRequests.status, 'rejected'),
                        )
                    );
                const existingSum = Number(existingSumResult[0]?.total ?? 0);
                const requestedAmount = Number(body.amount ?? 0);

                if (existingSum + requestedAmount > amountAfterTds) {
                    throw new BadRequestException(
                        `Payment request amount (${requestedAmount}) exceeds remaining PO limit. ` +
                        `Available: ${amountAfterTds - existingSum}, Already used: ${existingSum}`
                    );
                }
            }
        }

        if (body.vendorWorkOrderId) {
            const wo = await this.db
                .select()
                .from(vendorWorkOrders)
                .where(eq(vendorWorkOrders.id, body.vendorWorkOrderId))
                .then(rows => rows[0]);

            if (!wo) {
                throw new NotFoundException("Vendor Work Order not found");
            }

            if (wo.woApproved !== true) {
                throw new BadRequestException("Cannot create payment request against an unapproved WO. Only approved WOs are eligible.");
            }

            if (wo?.amountAfterTds) {
                const amountAfterTds = Number(wo.amountAfterTds);
                const existingSumResult = await this.db
                    .select({
                        total: sql<number>`COALESCE(SUM(amount::numeric), 0)`,
                    })
                    .from(paymentRequests)
                    .where(and(eq(paymentRequests.vendorWorkOrderId, body.vendorWorkOrderId), ne(paymentRequests.status, "rejected")));
                const existingSum = Number(existingSumResult[0]?.total ?? 0);
                const requestedAmount = Number(body.amount ?? 0);

                if (existingSum + requestedAmount > amountAfterTds) {
                    throw new BadRequestException(
                        `Payment request amount (${requestedAmount}) exceeds remaining WO limit. ` +
                        `Available: ${amountAfterTds - existingSum}, Already used: ${existingSum}`,
                    );
                }
            }
        }

        const pr = (
            await this.db
                .insert(paymentRequests)
                .values({
                    projectId: body.projectId || null,
                    beneficiaryId: body.beneficiaryId || null,
                    requestNo,
                    partyName: body.partyName,
                    accountNumber: body.accountNumber,
                    bankName: body.bankName,
                    ifsc: body.ifsc,
                    amount: body.amount?.toString(),
                    paymentAgainst: body.paymentAgainst,
                    purchaseInvoiceId: body.purchaseInvoiceId,
                    purchaseOrderId: body.purchaseOrderId,
                    vendorWorkOrderId: body.vendorWorkOrderId,
                    uploadedInvoiceFile: body.uploadedInvoiceFile,
                    poFile: body.poFile,
                    paymentMode: body.paymentMode || 'BANK_TRANSFER',
                    portalLink: body.portalLink || null,
                    billFiles: body.billFiles || [],
                    remark: body.remark,
                    requestedBy: userId,
                })
                .returning()
        )[0];

        this.logger.info(`Payment Request created: ${requestNo}`);
        return pr;
    }

    async update(id: number, body: any) {
        const existing = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.id, id))
            .then(rows => rows[0]);
        if (!existing) throw new NotFoundException("Payment Request not found");

        const updated = (
            await this.db
                .update(paymentRequests)
                .set({
                    beneficiaryId: body.beneficiaryId || null,
                    partyName: body.partyName,
                    accountNumber: body.accountNumber,
                    bankName: body.bankName,
                    ifsc: body.ifsc,
                    amount: body.amount?.toString(),
                    paymentAgainst: body.paymentAgainst,
                    purchaseInvoiceId: body.purchaseInvoiceId,
                    purchaseOrderId: body.purchaseOrderId,
                    vendorWorkOrderId: body.vendorWorkOrderId,
                    uploadedInvoiceFile: body.uploadedInvoiceFile,
                    poFile: body.poFile,
                    paymentMode: body.paymentMode,
                    portalLink: body.portalLink || null,
                    billFiles: body.billFiles,
                    remark: body.remark,
                    updatedAt: new Date(),
                })
                .where(eq(paymentRequests.id, id))
                .returning()
        )[0];

        return updated;
    }

    async updateStatus(id: number, body: { status: string; utrNumber?: string; rejectionReason?: string }) {
        const existing = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.id, id))
            .then(rows => rows[0]);
        if (!existing) throw new NotFoundException("Payment Request not found");

        const validTransitions: Record<string, string[]> = {
            pending: ["maker_done", "rejected"],
            maker_done: ["payment_done", "rejected"],
        };

        if (!validTransitions[existing.status]?.includes(body.status)) {
            throw new BadRequestException(
                `Cannot transition from "${existing.status}" to "${body.status}"`
            );
        }

        return await this.db.transaction(async tx => {
            const updated = (
                await tx
                    .update(paymentRequests)
                    .set({
                        status: body.status,
                        utrNumber: body.utrNumber || null,
                        rejectionReason: body.rejectionReason || null,
                        updatedAt: new Date(),
                    })
                    .where(eq(paymentRequests.id, id))
                    .returning()
            )[0];

            if (existing.paymentAgainst != null && body.status === "payment_done" && ["imprest", "others"].includes(existing.paymentAgainst)) {
                await this.creditImprestForPaymentRequest(tx, existing);
            }

            this.logger.info(`Payment Request #${id} status updated to "${body.status}"`);
            return updated;
        });
    }

    /**
     * Credits the beneficiary's imprest (employee_imprest_transactions) when an
     * imprest-category payment request is marked payment_done.
     *
     * Requires an explicit user link via the beneficiary record (beneficiary.user_id).
     * No name matching — name differences between the beneficiary and the user table
     * are intentionally left unresolved; if there is no link, the credit is skipped.
     */
    private async creditImprestForPaymentRequest(tx: DbInstance, existing: OperationPaymentRequest) {
        const userId = await this.resolveImprestUserId(tx, existing);

        if (userId == null) {
            this.logger.warn(
                `Imprest credit skipped for payment request #${existing.id} (${existing.requestNo}): no linked user for beneficiary`
            );
            return;
        }

        const [user] = await tx
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user) {
            this.logger.warn(
                `Imprest credit skipped for payment request #${existing.id}: linked user #${userId} not found`
            );
            return;
        }

        await tx.insert(employeeImprestTransactions).values({
            userId: user.id,
            txnDate: new Date().toISOString().split("T")[0],
            teamMemberName: user.name,
            amount: Math.round(Number(existing.amount) || 0),
            projectName: `${existing.requestNo ?? `PR #${existing.id}`} (${existing.paymentAgainst} Maker)`,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        this.logger.info(
            `Imprest credited ${existing.amount} to user #${user.id} (${user.name}) for payment request #${existing.id} (${existing.requestNo})`
        );
    }

    private async resolveImprestUserId(tx: DbInstance, existing: OperationPaymentRequest): Promise<number | null> {
        if (existing.beneficiaryId == null) return null;

        const [ben] = await tx
            .select({ userId: beneficiaries.userId })
            .from(beneficiaries)
            .where(eq(beneficiaries.id, existing.beneficiaryId))
            .limit(1);

        if (ben?.userId == null) {
            this.logger.warn(`Imprest credit: beneficiary #${existing.beneficiaryId} has no linked user`);
            return null;
        }

        return ben.userId;
    }

    async uploadInvoiceAfterPayment(id: number, files: string[]) {
        const existing = await this.db
            .select({ id: paymentRequests.id })
            .from(paymentRequests)
            .where(eq(paymentRequests.id, id))
            .then(rows => rows[0]);
        if (!existing) throw new NotFoundException("Payment Request not found");

        const updated = (
            await this.db
                .update(paymentRequests)
                .set({
                    uploadInvoiceAfterPayment: files,
                    updatedAt: new Date(),
                })
                .where(eq(paymentRequests.id, id))
                .returning()
        )[0];

        this.logger.info(`Invoice after payment uploaded for Request #${id}`);
        return updated;
    }

    private readonly prFields = {
        id: paymentRequests.id,
        projectId: paymentRequests.projectId,
        beneficiaryId: paymentRequests.beneficiaryId,
        requestNo: paymentRequests.requestNo,
        partyName: paymentRequests.partyName,
        accountNumber: paymentRequests.accountNumber,
        bankName: paymentRequests.bankName,
        ifsc: paymentRequests.ifsc,
        amount: paymentRequests.amount,
        paymentAgainst: paymentRequests.paymentAgainst,
        purchaseInvoiceId: paymentRequests.purchaseInvoiceId,
        purchaseOrderId: paymentRequests.purchaseOrderId,
        vendorWorkOrderId: paymentRequests.vendorWorkOrderId,
        uploadedInvoiceFile: paymentRequests.uploadedInvoiceFile,
        poFile: paymentRequests.poFile,
        paymentMode: paymentRequests.paymentMode,
        portalLink: paymentRequests.portalLink,
        billFiles: paymentRequests.billFiles,
        remark: paymentRequests.remark,
        utrNumber: paymentRequests.utrNumber,
        rejectionReason: paymentRequests.rejectionReason,
        status: paymentRequests.status,
        requestedBy: paymentRequests.requestedBy,
        createdAt: paymentRequests.createdAt,
        updatedAt: paymentRequests.updatedAt,
        piCategory: purchaseInvoices.category,
        piPartyName: purchaseInvoices.partyName,
        piValuePreGst: purchaseInvoices.valuePreGst,
        piGstAmount: purchaseInvoices.gstAmount,
        piInvoiceDate: purchaseInvoices.invoiceDate,
        piInvoiceFile: purchaseInvoices.invoiceFile,
    };

    async getById(id: number) {
        const rows = await this.db
            .select({
                ...this.prFields,
                requestedByName: users.name,
                projectName: projects.projectName,
                poNumber: purchaseOrders.poNumber,
                vwoNumber: vendorWorkOrders.woNumber,
                poTotalAmount: sql<number>`COALESCE((SELECT SUM(taxable_amount::numeric) FROM purchase_order_products WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                poTotalGstAmt: sql<number>`COALESCE((SELECT SUM(gst_amount::numeric) FROM purchase_order_products WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                poGrandTotal: sql<number>`COALESCE((SELECT SUM(total_amount::numeric) FROM purchase_order_products WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                poTdsPercentage: purchaseOrders.tdsPercentage,
                poTdsAmount: purchaseOrders.tdsAmount,
                poAmountAfterTds: purchaseOrders.amountAfterTds,
                poTotalPaymentRequested: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE purchase_order_id = ${purchaseOrders.id} AND status != 'rejected'), 0)`,
                poTotalMakerDone: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE purchase_order_id = ${purchaseOrders.id} AND status = 'maker_done'), 0)`,
                poTotalPaymentDone: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE purchase_order_id = ${purchaseOrders.id} AND status = 'payment_done'), 0)`,
                vwoTotalAmount: sql<number>`COALESCE((SELECT SUM(taxable_amount::numeric) FROM vendor_work_order_items WHERE vendor_work_order_id = ${vendorWorkOrders.id}), 0)`,
                vwoTotalGstAmt: sql<number>`COALESCE((SELECT SUM(gst_amount::numeric) FROM vendor_work_order_items WHERE vendor_work_order_id = ${vendorWorkOrders.id}), 0)`,
                vwoGrandTotal: sql<number>`COALESCE((SELECT SUM(total_amount::numeric) FROM vendor_work_order_items WHERE vendor_work_order_id = ${vendorWorkOrders.id}), 0)`,
                vwoTdsPercentage: vendorWorkOrders.tdsPercentage,
                vwoTdsAmount: vendorWorkOrders.tdsAmount,
                vwoAmountAfterTds: vendorWorkOrders.amountAfterTds,
                vwoTotalPaymentRequested: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE vendor_work_order_id = ${vendorWorkOrders.id} AND status != 'rejected'), 0)`,
                vwoTotalMakerDone: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE vendor_work_order_id = ${vendorWorkOrders.id} AND status = 'maker_done'), 0)`,
                vwoTotalPaymentDone: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE vendor_work_order_id = ${vendorWorkOrders.id} AND status = 'payment_done'), 0)`,
            })
            .from(paymentRequests)
            .leftJoin(users, eq(paymentRequests.requestedBy, users.id))
            .leftJoin(projects, eq(paymentRequests.projectId, projects.id))
            .leftJoin(purchaseOrders, eq(paymentRequests.purchaseOrderId, purchaseOrders.id))
            .leftJoin(vendorWorkOrders, eq(paymentRequests.vendorWorkOrderId, vendorWorkOrders.id))
            .leftJoin(purchaseInvoices, eq(paymentRequests.purchaseInvoiceId, purchaseInvoices.id))
            .where(eq(paymentRequests.id, id));

        const pr = rows[0];
        if (!pr) throw new NotFoundException("Payment Request not found");
        return pr;
    }

    async getAll(teamId?: number, type?: 'project' | 'maker') {
        const conditions: ReturnType<typeof eq>[] = [];
        if (teamId !== undefined) {
            conditions.push(eq(users.team, teamId));
        }
        if (type === 'project') {
            conditions.push(sql`${paymentRequests.projectId} IS NOT NULL`);
        } else if (type === 'maker') {
            conditions.push(sql`${paymentRequests.projectId} IS NULL`);
        }

        return this.db
            .select({
                ...this.prFields,
                requestedByName: users.name,
                projectName: projects.projectName,
                poNumber: purchaseOrders.poNumber,
                vwoNumber: vendorWorkOrders.woNumber,
            })
            .from(paymentRequests)
            .leftJoin(users, eq(paymentRequests.requestedBy, users.id))
            .leftJoin(projects, eq(paymentRequests.projectId, projects.id))
            .leftJoin(purchaseOrders, eq(paymentRequests.purchaseOrderId, purchaseOrders.id))
            .leftJoin(vendorWorkOrders, eq(paymentRequests.vendorWorkOrderId, vendorWorkOrders.id))
            .leftJoin(purchaseInvoices, eq(paymentRequests.purchaseInvoiceId, purchaseInvoices.id))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(paymentRequests.id));
    }

    async getByProject(projectId: number) {
        return this.db
            .select({
                ...this.prFields,
                requestedByName: users.name,
                projectName: projects.projectName,
                poNumber: purchaseOrders.poNumber,
                vwoNumber: vendorWorkOrders.woNumber,
            })
            .from(paymentRequests)
            .leftJoin(users, eq(paymentRequests.requestedBy, users.id))
            .leftJoin(projects, eq(paymentRequests.projectId, projects.id))
            .leftJoin(purchaseOrders, eq(paymentRequests.purchaseOrderId, purchaseOrders.id))
            .leftJoin(vendorWorkOrders, eq(paymentRequests.vendorWorkOrderId, vendorWorkOrders.id))
            .leftJoin(purchaseInvoices, eq(paymentRequests.purchaseInvoiceId, purchaseInvoices.id))
            .where(eq(paymentRequests.projectId, projectId))
            .orderBy(desc(paymentRequests.id));
    }

    // ── Beneficiary CRUD ──

    async createBeneficiary(body: any) {
        const ben = (
            await this.db
                .insert(beneficiaries)
                .values({
                    name: body.name,
                    accountNumber: body.accountNumber,
                    ifsc: body.ifsc,
                    bankName: body.bankName,
                })
                .returning()
        )[0];
        return ben;
    }

    async listBeneficiaries() {
        return this.db
            .select()
            .from(beneficiaries)
            .orderBy(desc(beneficiaries.createdAt));
    }

    async getBeneficiary(id: number) {
        const ben = await this.db
            .select()
            .from(beneficiaries)
            .where(eq(beneficiaries.id, id))
            .then(rows => rows[0]);
        if (!ben) throw new NotFoundException("Beneficiary not found");
        return ben;
    }

    async updateBeneficiary(id: number, body: any) {
        const existing = await this.db
            .select()
            .from(beneficiaries)
            .where(eq(beneficiaries.id, id))
            .then(rows => rows[0]);
        if (!existing) throw new NotFoundException("Beneficiary not found");

        const updated = (
            await this.db
                .update(beneficiaries)
                .set({
                    name: body.name,
                    userId: body.userId === undefined ? existing.userId : body.userId || null,
                    accountNumber: body.accountNumber,
                    ifsc: body.ifsc,
                    bankName: body.bankName,
                    updatedAt: new Date(),
                })
                .where(eq(beneficiaries.id, id))
                .returning()
        )[0];
        return updated;
    }

    private sanitizeProjectName(name: string): string {
        return name
            .replace(/[^a-zA-Z0-9\s-]/g, '')
            .trim()
            .replace(/[\s-]+/g, '_');
    }
}
