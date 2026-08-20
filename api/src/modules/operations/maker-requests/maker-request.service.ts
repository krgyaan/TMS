import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { and, eq, like, desc, sql } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { paymentRequests } from "@/db/schemas/operations/payment-requests.schema";
import { users } from "@/db/schemas/";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { vendorWorkOrders } from "@/db/schemas/operations/vendor-work-orders.schema";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { InsurancePolicyService } from "@/modules/insurance/insurance-policy.service";
import { insurancePayloadSchema, insurancePolicySchema, type InsurancePayload } from "@/modules/insurance/zod/insurance-policy.schema";

const INSURANCE_CATEGORY = "insurance";

@Injectable()
export class MakerRequestService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly insurancePolicyService: InsurancePolicyService
    ) {}

    async generateNumber(): Promise<string> {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const from = month >= 4 ? year.toString().slice(-2) : (year - 1).toString().slice(-2);
        const to = ((parseInt(from) + 1) % 100).toString().padStart(2, "0");
        const fy = `${from}${to}`;

        const last = await this.db
            .select({ id: paymentRequests.id, requestNo: paymentRequests.requestNo })
            .from(paymentRequests)
            .where(and(like(paymentRequests.requestNo, `MR/${fy}/%`), sql`${paymentRequests.projectId} IS NULL`))
            .orderBy(desc(paymentRequests.id));

        let next = 1;
        if (last[0]?.requestNo) {
            const match = last[0].requestNo.match(/(\d{4})$/);
            if (match) next = parseInt(match[1]) + 1;
        }

        return `MR/${fy}/${next.toString().padStart(4, "0")}`;
    }

    async create(body: any, userId: number) {
        const requestNo = await this.generateNumber();
        const insurance = this.parseInsurancePayload(body.insurance);

        const mr = await this.db.transaction(async tx => {
            const [created] = await tx
                .insert(paymentRequests)
                .values({
                    projectId: null,
                    requestNo,
                    partyName: body.partyName,
                    beneficiaryId: body.beneficiaryId || null,
                    accountNumber: body.accountNumber,
                    bankName: body.bankName,
                    ifsc: body.ifsc,
                    amount: body.amount?.toString(),
                    paymentAgainst: body.category,
                    paymentMode: body.paymentMode || "BANK_TRANSFER",
                    portalLink: body.portalLink || null,
                    billFiles: body.billFiles || [],
                    uploadInvoice: body.uploadInvoice || [],
                    uploadPI: body.uploadPI || [],
                    uploadInvoiceAfterPayment: body.uploadInvoiceAfterPayment || [],
                    requestedBy: userId,
                })
                .returning();

            if (body.category === INSURANCE_CATEGORY && insurance) {
                if (insurance.insurancePolicyId) {
                    await this.insurancePolicyService.addPaymentLink(tx, insurance.insurancePolicyId, created.id, "renewal", userId);
                } else {
                    await this.insurancePolicyService.createFromMakerRequest(tx, insurance, created.id, userId);
                }
            }

            return created;
        });

        this.logger.info(`Maker Request created: ${requestNo}`);
        return mr;
    }

    private parseInsurancePayload(raw?: unknown): InsurancePayload | null {
        if (!raw) {
            return null;
        }

        const parsed = typeof raw === "string" ? insurancePayloadSchema.safeParse(raw) : insurancePolicySchema.safeParse(raw);

        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        return parsed.data;
    }

    async updateStatus(id: number, body: { status: string; utrNumber?: string; rejectionReason?: string }) {
        const existing = await this.db
            .select()
            .from(paymentRequests)
            .where(and(eq(paymentRequests.id, id), sql`${paymentRequests.projectId} IS NULL`))
            .then(rows => rows[0]);
        if (!existing) throw new NotFoundException("Maker Request not found");

        const validTransitions: Record<string, string[]> = {
            pending: ["maker_done", "rejected"],
            maker_done: ["payment_done", "rejected"],
        };

        if (!validTransitions[existing.status]?.includes(body.status)) {
            throw new BadRequestException(`Cannot transition from "${existing.status}" to "${body.status}"`);
        }

        const updated = (
            await this.db
                .update(paymentRequests)
                .set({
                    status: body.status,
                    utrNumber: body.utrNumber || null,
                    rejectionReason: body.rejectionReason || null,
                    updatedAt: new Date(),
                })
                .where(and(eq(paymentRequests.id, id), sql`${paymentRequests.projectId} IS NULL`))
                .returning()
        )[0];

        this.logger.info(`Maker Request #${id} status updated to "${body.status}"`);
        return updated;
    }

    async uploadInvoiceAfterPayment(id: number, files: string[]) {
        const existing = await this.db
            .select({ id: paymentRequests.id })
            .from(paymentRequests)
            .where(and(eq(paymentRequests.id, id), sql`${paymentRequests.projectId} IS NULL`))
            .then(rows => rows[0]);
        if (!existing) throw new NotFoundException("Maker Request not found");

        const updated = (
            await this.db
                .update(paymentRequests)
                .set({
                    uploadInvoiceAfterPayment: files,
                    updatedAt: new Date(),
                })
                .where(and(eq(paymentRequests.id, id), sql`${paymentRequests.projectId} IS NULL`))
                .returning()
        )[0];

        this.logger.info(`Invoice after payment uploaded for Maker Request #${id}`);
        return updated;
    }

    private readonly mrFields = {
        id: paymentRequests.id,
        requestNo: paymentRequests.requestNo,
        partyName: paymentRequests.partyName,
        beneficiaryId: paymentRequests.beneficiaryId,
        accountNumber: paymentRequests.accountNumber,
        bankName: paymentRequests.bankName,
        ifsc: paymentRequests.ifsc,
        amount: paymentRequests.amount,
        category: paymentRequests.paymentAgainst,
        paymentMode: paymentRequests.paymentMode,
        portalLink: paymentRequests.portalLink,
        billFiles: paymentRequests.billFiles,
        uploadInvoice: paymentRequests.uploadInvoice,
        uploadPI: paymentRequests.uploadPI,
        uploadInvoiceAfterPayment: paymentRequests.uploadInvoiceAfterPayment,
        remark: paymentRequests.remark,
        status: paymentRequests.status,
        utrNumber: paymentRequests.utrNumber,
        rejectionReason: paymentRequests.rejectionReason,
        requestedBy: paymentRequests.requestedBy,
        createdAt: paymentRequests.createdAt,
        updatedAt: paymentRequests.updatedAt,
        purchaseOrderId: paymentRequests.purchaseOrderId,
        poFile: paymentRequests.poFile,
        vendorWorkOrderId: paymentRequests.vendorWorkOrderId,
    };

    async getById(id: number) {
        const rows = await this.db
            .select({
                ...this.mrFields,
                requestedByName: users.name,
                poNumber: purchaseOrders.poNumber,
                vwoNumber: vendorWorkOrders.woNumber,
                poGrandTotal: sql<number>`COALESCE((SELECT SUM(total_amount::numeric) FROM purchase_order_products WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                poTotalAmount: sql<number>`COALESCE((SELECT SUM(taxable_amount::numeric) FROM purchase_order_products WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                poTotalGstAmt: sql<number>`COALESCE((SELECT SUM(gst_amount::numeric) FROM purchase_order_products WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                poTdsPercentage: purchaseOrders.tdsPercentage,
                poTdsAmount: purchaseOrders.tdsAmount,
                poAmountAfterTds: purchaseOrders.amountAfterTds,
                poTotalPaymentRequested: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE purchase_order_id = ${purchaseOrders.id} AND status != 'rejected'), 0)`,
                poTotalMakerDone: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE purchase_order_id = ${purchaseOrders.id} AND status = 'maker_done'), 0)`,
                poTotalPaymentDone: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE purchase_order_id = ${purchaseOrders.id} AND status = 'payment_done'), 0)`,
                vwoGrandTotal: sql<number>`COALESCE((SELECT SUM(total_amount::numeric) FROM vendor_work_order_items WHERE vendor_work_order_id = ${vendorWorkOrders.id}), 0)`,
                vwoTotalAmount: sql<number>`COALESCE((SELECT SUM(taxable_amount::numeric) FROM vendor_work_order_items WHERE vendor_work_order_id = ${vendorWorkOrders.id}), 0)`,
                vwoTotalGstAmt: sql<number>`COALESCE((SELECT SUM(gst_amount::numeric) FROM vendor_work_order_items WHERE vendor_work_order_id = ${vendorWorkOrders.id}), 0)`,
                vwoTdsPercentage: vendorWorkOrders.tdsPercentage,
                vwoTdsAmount: vendorWorkOrders.tdsAmount,
                vwoAmountAfterTds: vendorWorkOrders.amountAfterTds,
                vwoTotalPaymentRequested: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE vendor_work_order_id = ${vendorWorkOrders.id} AND status != 'rejected'), 0)`,
                vwoTotalMakerDone: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE vendor_work_order_id = ${vendorWorkOrders.id} AND status = 'maker_done'), 0)`,
                vwoTotalPaymentDone: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE vendor_work_order_id = ${vendorWorkOrders.id} AND status = 'payment_done'), 0)`,
            })
            .from(paymentRequests)
            .leftJoin(users, eq(paymentRequests.requestedBy, users.id))
            .leftJoin(purchaseOrders, eq(paymentRequests.purchaseOrderId, purchaseOrders.id))
            .leftJoin(vendorWorkOrders, eq(paymentRequests.vendorWorkOrderId, vendorWorkOrders.id))
            .where(and(eq(paymentRequests.id, id), sql`${paymentRequests.projectId} IS NULL`));

        const mr = rows[0];
        if (!mr) throw new NotFoundException("Maker Request not found");
        return mr;
    }

    async getByUser(userId: number) {
        return this.db
            .select({
                ...this.mrFields,
                requestedByName: users.name,
                poNumber: purchaseOrders.poNumber,
                vwoNumber: vendorWorkOrders.woNumber,
            })
            .from(paymentRequests)
            .leftJoin(users, eq(paymentRequests.requestedBy, users.id))
            .leftJoin(purchaseOrders, eq(paymentRequests.purchaseOrderId, purchaseOrders.id))
            .leftJoin(vendorWorkOrders, eq(paymentRequests.vendorWorkOrderId, vendorWorkOrders.id))
            .where(and(eq(paymentRequests.requestedBy, userId), sql`${paymentRequests.projectId} IS NULL`))
            .orderBy(desc(paymentRequests.id));
    }

    async getAll() {
        return this.db
            .select({
                ...this.mrFields,
                requestedByName: users.name,
                poNumber: purchaseOrders.poNumber,
                vwoNumber: vendorWorkOrders.woNumber,
            })
            .from(paymentRequests)
            .leftJoin(users, eq(paymentRequests.requestedBy, users.id))
            .leftJoin(purchaseOrders, eq(paymentRequests.purchaseOrderId, purchaseOrders.id))
            .leftJoin(vendorWorkOrders, eq(paymentRequests.vendorWorkOrderId, vendorWorkOrders.id))
            .where(sql`${paymentRequests.projectId} IS NULL`)
            .orderBy(desc(paymentRequests.id));
    }
}
