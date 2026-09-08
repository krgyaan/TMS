import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, like, desc, sql, inArray, isNull, ne } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { rename, readFile } from "node:fs/promises";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { PdfGeneratorService } from "@/modules/pdf/pdf-generator.service";
import { ClientDirectorySyncService } from "@/modules/shared/client-directory/client-directory-sync.service";
import { InsurancePolicyService } from "@/modules/insurance/insurance-policy.service";

import { vendorWorkOrders } from "@/db/schemas/operations/vendor-work-orders.schema";
import { vendorWorkOrderItems } from "@/db/schemas/operations/vendor-work-order-items.schema";
import { purchaseInvoices } from "@/db/schemas/operations/purchase-invoices.schema";
import { paymentRequests } from "@/db/schemas/operations";
import { projectParties } from "@/db/schemas/operations/project-parties.schema";
import { woBasicDetails } from "@/db/schemas/operations/work-order.schema";
import { users } from "@/db/schemas";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class VendorWorkOrderService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly pdfGenerator: PdfGeneratorService,
        private readonly clientDirectorySyncService: ClientDirectorySyncService,
        private readonly insuranceService: InsurancePolicyService,
    ) {}

    async generateWONumber(projectName?: string) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const from = month >= 4 ? year.toString().slice(-2) : (year - 1).toString().slice(-2);
        const to = ((parseInt(from) + 1) % 100).toString().padStart(2, "0");
        const fy = `${from}${to}`;

        const sanitizedName = projectName ? this.sanitizeProjectName(projectName) : "PROJECT";
        const prefix = `VE/${sanitizedName}/${fy}`;

        const last = await this.db
            .select({
                id: vendorWorkOrders.id,
                woNumber: vendorWorkOrders.woNumber
            })
            .from(vendorWorkOrders)
            .where(like(vendorWorkOrders.woNumber, `VE/%/${fy}/WO%`))
            .orderBy(desc(vendorWorkOrders.id));

        let next = 1;
        if (last[0]?.woNumber) {
            const match = last[0].woNumber.match(/WO(\d{4})$/);
            if (match) next = parseInt(match[1]) + 1;
        }

        return `${prefix}/WO${next.toString().padStart(4, "0")}`;
    }

    async create(body: any, userId: number) {
        if (body.projectId) {
            const hasWC = await this.insuranceService.hasActiveWCInsurance(body.projectId);
            if (!hasWC) {
                throw new BadRequestException(
                    "Cannot create Vendor Work Order: project does not have an active WC (Workers Compensation) insurance policy. Please add a WC policy first."
                );
            }
        }

        const woNumber = await this.generateWONumber(body.projectName);

        const [woBasic] = await this.db
            .select({ team: woBasicDetails.team })
            .from(woBasicDetails)
            .where(eq(woBasicDetails.tenderId, body.tenderId))
            .limit(1);

        const wo = (
            await this.db
                .insert(vendorWorkOrders)
                .values({
                    tenderId: body.tenderId,
                    woNumber,
                    woDate: body.woDate,
                    projectName: body.projectName,

                    sellerName: body.sellerName,
                    sellerAddress: body.sellerAddress,
                    sellerEmail: body.sellerEmail,
                    sellerGstNo: body.sellerGstNo,
                    sellerPanNo: body.sellerPanNo,
                    sellerMsmeNo: body.sellerMsmeNo,
                    sellerCinNo: body.sellerCinNo,
                    contactPersonName: body.contactPersonName,
                    contactPersonPhone: body.contactPersonPhone,
                    contactPersonEmail: body.contactPersonEmail,

                    shipToName: body.shipToName,
                    shippingAddress: body.shippingAddress,
                    shipToGst: body.shipToGst,
                    shipToPan: body.shipToPan,
                    category: body.category,

                    termsAndConditions: body.termsAndConditions
                        ? (typeof body.termsAndConditions === 'string' ? JSON.parse(body.termsAndConditions) : body.termsAndConditions)
                        : [],
                    scopeOfWork: body.scopeOfWork,
                    accessoriesPackagingListAttachments: body.accessoriesPackagingListAttachments,
                    remarks: body.remarks,
                    certRecipient: body.certRecipient,
                    certRecipients: body.certRecipients ?? [],
                    woRaisedBy: userId,
                    team: woBasic?.team,
                    projectId: body.projectId,
                })
                .returning()
        )[0];

        await this.syncParty(body);

        if (body.products && body.products.length > 0) {
            for (const product of body.products) {
                const qty = Number(product.qty);
                const rate = Number(product.rate);
                const gstRate = Number(product.gstRate);
                const taxableAmount = Number((qty * rate).toFixed(2));
                const gstAmount = Number(((taxableAmount * gstRate) / 100).toFixed(2));
                const totalAmount = Number((taxableAmount + gstAmount).toFixed(2));

                await this.db.insert(vendorWorkOrderItems).values({
                    vendorWorkOrderId: wo.id,
                    description: product.description,
                    qty: qty.toFixed(2),
                    rate: rate.toFixed(2),
                    taxableAmount: taxableAmount.toFixed(2),
                    gstRate: gstRate.toFixed(2),
                    gstAmount: gstAmount.toFixed(2),
                    totalAmount: totalAmount.toFixed(2),
                });
            }
        }

        this.logger.info(`Vendor Work Order created: ${woNumber}`);

        this.generatePdfForWO(wo, body.products).catch((err) => {
            this.logger.error(`Failed to generate VWO PDF: ${err.message}`);
        });

        return this.getById(wo.id);
    }

    async update(id: number, body: any, userId: number) {
        const existing = await this.db
            .select()
            .from(vendorWorkOrders)
            .where(eq(vendorWorkOrders.id, id))
            .then(rows => rows[0]);
        if (!existing) throw new NotFoundException("Vendor Work Order not found");

        // if (existing.woApproved === true) {
        //     throw new BadRequestException("Cannot edit an approved Vendor Work Order. Only rejected or pending VWOs can be updated.");
        // }

        const wasRejected = existing.woApproved === false;

        const updated = (
            await this.db
                .update(vendorWorkOrders)
                .set({
                    woDate: body.woDate,
                    sellerName: body.sellerName,
                    sellerAddress: body.sellerAddress,
                    sellerEmail: body.sellerEmail,
                    sellerGstNo: body.sellerGstNo,
                    sellerPanNo: body.sellerPanNo,
                    sellerMsmeNo: body.sellerMsmeNo,
                    sellerCinNo: body.sellerCinNo,
                    contactPersonName: body.contactPersonName,
                    contactPersonPhone: body.contactPersonPhone,
                    contactPersonEmail: body.contactPersonEmail,
                    shipToName: body.shipToName,
                    shippingAddress: body.shippingAddress,
                    shipToGst: body.shipToGst,
                    shipToPan: body.shipToPan,
                    category: body.category,
                    termsAndConditions: body.termsAndConditions
                        ? (typeof body.termsAndConditions === 'string' ? JSON.parse(body.termsAndConditions) : body.termsAndConditions)
                        : [],
                    scopeOfWork: body.scopeOfWork,
                    accessoriesPackagingListAttachments: body.accessoriesPackagingListAttachments,
                    remarks: body.remarks,
                    certRecipient: body.certRecipient,
                    certRecipients: body.certRecipients ?? [],
                    ...(wasRejected && {
                        woApproved: null,
                        tdsPercentage: null,
                        tdsAmount: null,
                        amountAfterTds: null,
                        woApprovalRemark: null,
                    }),
                    updatedAt: sql`now()`,
                })
                .where(eq(vendorWorkOrders.id, id))
                .returning()
        )[0];

        await this.clientDirectorySyncService.syncToClientDirectory([{
            name: body.contactPersonName,
            email: body.contactPersonEmail,
            phone: body.contactPersonPhone,
            org: body.sellerName,
        }, {
            name: body.sellerName,
            email: body.sellerEmail,
            phone: null,
            org: null,
        }].filter((c) => c.name));

        await this.syncParty(body);

        await this.db
            .delete(vendorWorkOrderItems)
            .where(eq(vendorWorkOrderItems.vendorWorkOrderId, id));

        if (body.products && body.products.length > 0) {
            for (const product of body.products) {
                const qty = Number(product.qty);
                const rate = Number(product.rate);
                const gstRate = Number(product.gstRate);
                const taxableAmount = Number((qty * rate).toFixed(2));
                const gstAmount = Number(((taxableAmount * gstRate) / 100).toFixed(2));
                const totalAmount = Number((taxableAmount + gstAmount).toFixed(2));

                await this.db.insert(vendorWorkOrderItems).values({
                    vendorWorkOrderId: id,
                    description: product.description,
                    qty: qty.toFixed(2),
                    rate: rate.toFixed(2),
                    taxableAmount: taxableAmount.toFixed(2),
                    gstRate: gstRate.toFixed(2),
                    gstAmount: gstAmount.toFixed(2),
                    totalAmount: totalAmount.toFixed(2),
                });
            }
        }

        this.logger.info(`Vendor Work Order updated: ${existing.woNumber}`);

        this.generatePdfForWO(updated, body.products).catch((err) => {
            this.logger.error(`Failed to regenerate VWO PDF: ${err.message}`);
        });

        return this.getById(id);
    }

    async getById(id: number) {
        const wo = await this.db
            .select()
            .from(vendorWorkOrders)
            .where(eq(vendorWorkOrders.id, id))
            .then(rows => rows[0]);
        if (!wo) throw new NotFoundException("Vendor Work Order not found");

        const items = await this.db
            .select()
            .from(vendorWorkOrderItems)
            .where(eq(vendorWorkOrderItems.vendorWorkOrderId, id));

        const rawTotal = items.reduce(
            (acc, item) => ({
                totalAmount: acc.totalAmount + Number(item.taxableAmount),
                totalGstAmt: acc.totalGstAmt + Number(item.gstAmount),
                grandTotal: acc.grandTotal + Number(item.totalAmount),
            }),
            { totalAmount: 0, totalGstAmt: 0, grandTotal: 0 }
        );

        const total = {
            total: rawTotal.totalAmount,
            totalGst: rawTotal.totalGstAmt,
            totalWithGst: rawTotal.grandTotal,
        };

        const enrichedProducts = items.map((product) => {
            const itemTotal = Number(product.rate) * Number(product.qty);
            const itemTotalGst = (itemTotal * Number(product.gstRate)) / 100;
            const itemTotalWithGst = itemTotal + itemTotalGst;
            return {
                ...product,
                itemTotal,
                itemTotalGst,
                itemTotalWithGst,
            };
        });

        let raisedByName: string | null = null;
        if (wo.woRaisedBy) {
            const [raisedByUser] = await this.db
                .select({ name: users.name })
                .from(users)
                .where(eq(users.id, wo.woRaisedBy));
            raisedByName = raisedByUser?.name ?? null;
        }

        const paymentRequestsData = await this.db
            .select({
                id: paymentRequests.id,
                requestNo: paymentRequests.requestNo,
                partyName: paymentRequests.partyName,
                amount: paymentRequests.amount,
                status: paymentRequests.status,
                requestedByName: users.name,
                createdAt: paymentRequests.createdAt,
            })
            .from(paymentRequests)
            .leftJoin(users, eq(paymentRequests.requestedBy, users.id))
            .where(eq(paymentRequests.vendorWorkOrderId, id))
            .orderBy(desc(paymentRequests.createdAt));

        const purchaseInvoicesData = await this.db
            .select({
                id: purchaseInvoices.id,
                invoiceNo: purchaseInvoices.invoiceNo,
                valuePreGst: purchaseInvoices.valuePreGst,
                gstAmount: purchaseInvoices.gstAmount,
                invoiceDate: purchaseInvoices.invoiceDate,
                invoiceFile: purchaseInvoices.invoiceFile,
                uploadedByName: users.name,
            })
            .from(purchaseInvoices)
            .leftJoin(users, eq(purchaseInvoices.uploadedBy, users.id))
            .where(eq(purchaseInvoices.vendorWorkOrderId, id))
            .orderBy(desc(purchaseInvoices.createdAt));

        return {
            ...wo,
            products: enrichedProducts,
            total,
            raisedByName,
            paymentRequests: paymentRequestsData,
            purchaseInvoices: purchaseInvoicesData,
        };
    }

    async getAll(status?: string, section?: string, user?: any) {
        const conditions: any[] = [];
        if (section === "operations" && user && user.dataScope !== "all") {
            if (user.teamId) {
                conditions.push(eq(vendorWorkOrders.team, user.teamId));
            }
        }

        const effectiveAmount = sql`COALESCE(${vendorWorkOrders.amountAfterTds}::numeric, (SELECT SUM(total_amount::numeric) FROM vendor_work_order_items WHERE vendor_work_order_id = ${vendorWorkOrders.id}))`;
        const paymentDoneTotal = sql`(SELECT COALESCE(SUM(amount::numeric), 0) FROM project_payment_requests WHERE vendor_work_order_id = ${vendorWorkOrders.id} AND status = 'payment_done')`;
        const piTotal = sql`(SELECT COALESCE(SUM(value_pre_gst::numeric + gst_amount::numeric), 0) FROM project_purchase_invoices WHERE vendor_work_order_id = ${vendorWorkOrders.id})`;

        if (status === "pending") {
            conditions.push(isNull(vendorWorkOrders.woApproved));
        } else if (status === "approved") {
            conditions.push(sql`${vendorWorkOrders.woApproved} = true AND ${paymentDoneTotal} < ${effectiveAmount}`);
        } else if (status === "rejected") {
            conditions.push(eq(vendorWorkOrders.woApproved, false));
        } else if (status === "new") {
            conditions.push(sql`${vendorWorkOrders.woApproved} IS NOT FALSE`);
        } else if (status === "closed") {
            conditions.push(sql`${vendorWorkOrders.woApproved} = true AND ${paymentDoneTotal} >= ${effectiveAmount} AND ${piTotal} >= ${effectiveAmount}`);
        } else if (status === "invoice-pending") {
            conditions.push(sql`${vendorWorkOrders.woApproved} = true AND ${paymentDoneTotal} >= ${effectiveAmount} AND ${piTotal} < ${effectiveAmount}`);
        }

        const rows = await this.db
            .select({
                id: vendorWorkOrders.id,
                projectId: vendorWorkOrders.projectId,
                woNumber: vendorWorkOrders.woNumber,
                sellerName: vendorWorkOrders.sellerName,
                sellerEmail: vendorWorkOrders.sellerEmail,
                sellerAddress: vendorWorkOrders.sellerAddress,
                sellerGstNo: vendorWorkOrders.sellerGstNo,
                sellerPanNo: vendorWorkOrders.sellerPanNo,
                sellerMsmeNo: vendorWorkOrders.sellerMsmeNo,
                sellerCinNo: vendorWorkOrders.sellerCinNo,
                shipToName: vendorWorkOrders.shipToName,
                shippingAddress: vendorWorkOrders.shippingAddress,
                shipToGst: vendorWorkOrders.shipToGst,
                shipToPan: vendorWorkOrders.shipToPan,
                woDate: vendorWorkOrders.woDate,
                woRaisedBy: users.name,
                createdAt: vendorWorkOrders.createdAt,
                tdsPercentage: vendorWorkOrders.tdsPercentage,
                tdsAmount: vendorWorkOrders.tdsAmount,
                amountAfterTds: vendorWorkOrders.amountAfterTds,
                woApproved: vendorWorkOrders.woApproved,
                woApprovalRemark: vendorWorkOrders.woApprovalRemark,
                totalAmount: sql<number>`COALESCE((SELECT SUM(CAST(taxable_amount AS numeric)) FROM vendor_work_order_items WHERE vendor_work_order_id = ${vendorWorkOrders.id}), 0)`,
                totalGstAmt: sql<number>`COALESCE((SELECT SUM(CAST(gst_amount AS numeric)) FROM vendor_work_order_items WHERE vendor_work_order_id = ${vendorWorkOrders.id}), 0)`,
                grandTotal: sql<number>`COALESCE((SELECT SUM(CAST(total_amount AS numeric)) FROM vendor_work_order_items WHERE vendor_work_order_id = ${vendorWorkOrders.id}), 0)`,
                totalVwiAmount: sql<number>`COALESCE((SELECT SUM(value_pre_gst::numeric + gst_amount::numeric) FROM project_purchase_invoices WHERE vendor_work_order_id = ${vendorWorkOrders.id}), 0)`,
                totalVwiCount: sql<number>`COALESCE((SELECT COUNT(*) FROM project_purchase_invoices WHERE vendor_work_order_id = ${vendorWorkOrders.id}), 0)`,
                totalPaymentRequested: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE vendor_work_order_id = ${vendorWorkOrders.id} AND status != 'rejected'), 0)`,
                totalPaymentDone: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE vendor_work_order_id = ${vendorWorkOrders.id} AND status = 'payment_done'), 0)`,
                generatedPdfVersions: vendorWorkOrders.generatedPdfVersions,
            })
            .from(vendorWorkOrders)
            .leftJoin(users, eq(vendorWorkOrders.woRaisedBy, users.id))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(vendorWorkOrders.id));

        return rows;
    }

    async getApprovalCounts(section?: string, user?: any) {
        const teamCondition = section === "operations" && user && user.dataScope !== "all" && user.teamId
            ? eq(vendorWorkOrders.team, user.teamId)
            : undefined;

        const baseQuery = () => this.db
            .select({ id: vendorWorkOrders.id })
            .from(vendorWorkOrders)
            .leftJoin(users, eq(users.id, vendorWorkOrders.woRaisedBy));

        const buildCount = async (condition: any) => {
            const q = baseQuery().where(
                teamCondition ? and(teamCondition, condition) : condition
            );
            const rows = await q;
            return rows.length;
        };

        const effectiveAmount = sql`COALESCE(${vendorWorkOrders.amountAfterTds}::numeric, (SELECT SUM(total_amount::numeric) FROM vendor_work_order_items WHERE vendor_work_order_id = ${vendorWorkOrders.id}))`;
        const paymentDoneTotal = sql`(SELECT COALESCE(SUM(amount::numeric), 0) FROM project_payment_requests WHERE vendor_work_order_id = ${vendorWorkOrders.id} AND status = 'payment_done')`;
        const piTotal = sql`(SELECT COALESCE(SUM(value_pre_gst::numeric + gst_amount::numeric), 0) FROM project_purchase_invoices WHERE vendor_work_order_id = ${vendorWorkOrders.id})`;

        const [pending, approved, newCount, rejected, closedCount, invoicePendingCount] = await Promise.all([
            buildCount(isNull(vendorWorkOrders.woApproved)),
            buildCount(sql`${vendorWorkOrders.woApproved} = true AND ${paymentDoneTotal} < ${effectiveAmount}`),
            buildCount(sql`${vendorWorkOrders.woApproved} IS NOT FALSE`),
            buildCount(eq(vendorWorkOrders.woApproved, false)),
            buildCount(sql`${vendorWorkOrders.woApproved} = true AND ${paymentDoneTotal} >= ${effectiveAmount} AND ${piTotal} >= ${effectiveAmount}`),
            buildCount(sql`${vendorWorkOrders.woApproved} = true AND ${paymentDoneTotal} >= ${effectiveAmount} AND ${piTotal} < ${effectiveAmount}`),
        ]);

        return { pending, approved, rejected, new: newCount, closed: closedCount, invoicePending: invoicePendingCount };
    }

    async setVwoApproval(id: number, { approve, tdsPercentage, remark }: { approve: boolean; tdsPercentage?: number; remark?: string }) {
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
            const grandTotal = items.reduce((acc, item) => acc + Number(item.totalAmount), 0);
            const tdsAmt = (subtotal * tdsPercentage) / 100;
            const amountAfterTds = grandTotal - tdsAmt;

            const [updated] = await this.db
                .update(vendorWorkOrders)
                .set({
                    tdsPercentage: tdsPercentage.toString(),
                    tdsAmount: tdsAmt.toString(),
                    amountAfterTds: amountAfterTds.toString(),
                    woApproved: true,
                    woApprovalRemark: remark || null,
                    updatedAt: sql`now()`,
                })
                .where(eq(vendorWorkOrders.id, id))
                .returning();

            this.logger.info(`VWO approved #${id}: ${tdsPercentage}%, TDS Amount: ${tdsAmt}, After TDS: ${amountAfterTds}`);
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

            this.logger.info(`VWO rejected #${id}: ${remark || 'no remark'}`);
            return updated;
        }
    }

    async getByProject(projectId: number) {
        const rows = await this.db
            .select({
                id: vendorWorkOrders.id,
                projectId: vendorWorkOrders.projectId,
                woNumber: vendorWorkOrders.woNumber,
                woDate: vendorWorkOrders.woDate,
                sellerName: vendorWorkOrders.sellerName,
                sellerEmail: vendorWorkOrders.sellerEmail,
                sellerAddress: vendorWorkOrders.sellerAddress,
                sellerGstNo: vendorWorkOrders.sellerGstNo,
                sellerPanNo: vendorWorkOrders.sellerPanNo,
                sellerMsmeNo: vendorWorkOrders.sellerMsmeNo,
                sellerCinNo: vendorWorkOrders.sellerCinNo,
                shipToName: vendorWorkOrders.shipToName,
                shippingAddress: vendorWorkOrders.shippingAddress,
                shipToGst: vendorWorkOrders.shipToGst,
                shipToPan: vendorWorkOrders.shipToPan,
                woRaisedBy: vendorWorkOrders.woRaisedBy,
                tdsPercentage: vendorWorkOrders.tdsPercentage,
                tdsAmount: vendorWorkOrders.tdsAmount,
                amountAfterTds: vendorWorkOrders.amountAfterTds,
                woApproved: vendorWorkOrders.woApproved,
                woApprovalRemark: vendorWorkOrders.woApprovalRemark,
                generatedPdfVersions: vendorWorkOrders.generatedPdfVersions,
            })
            .from(vendorWorkOrders)
            .where(eq(vendorWorkOrders.projectId, projectId))
            .orderBy(desc(vendorWorkOrders.id));

        const enriched = await Promise.all(
            rows.map(async (wo) => {
                const items = await this.db
                    .select()
                    .from(vendorWorkOrderItems)
                    .where(eq(vendorWorkOrderItems.vendorWorkOrderId, wo.id));

                const totals = items.reduce(
                    (acc, item) => ({
                        totalAmount: acc.totalAmount + Number(item.taxableAmount),
                        totalGstAmt: acc.totalGstAmt + Number(item.gstAmount),
                        grandTotal: acc.grandTotal + Number(item.totalAmount),
                    }),
                    { totalAmount: 0, totalGstAmt: 0, grandTotal: 0 }
                );

                const [invoiceTotals] = await this.db
                    .select({
                        totalVwiAmount: sql<number>`COALESCE(SUM(value_pre_gst::numeric + gst_amount::numeric), 0)`,
                        totalVwiCount: sql<number>`COUNT(*)`,
                    })
                    .from(purchaseInvoices)
                    .where(eq(purchaseInvoices.vendorWorkOrderId, wo.id));

                const [paymentTotals] = await this.db
                    .select({
                        totalPaymentRequested: sql<number>`COALESCE(SUM(amount::numeric), 0)`,
                        totalPaymentDone: sql<number>`COALESCE(SUM(CASE WHEN status = 'payment_done' THEN amount::numeric END), 0)`,
                    })
                    .from(paymentRequests)
                    .where(and(eq(paymentRequests.vendorWorkOrderId, wo.id), ne(paymentRequests.status, "rejected")));

                const [raisedByUser] = wo.woRaisedBy
                    ? await this.db
                        .select({ name: users.name })
                        .from(users)
                        .where(eq(users.id, wo.woRaisedBy))
                    : [];

                return {
                    ...wo,
                    products: items,
                    ...totals,
                    totalVwiAmount: invoiceTotals?.totalVwiAmount || 0,
                    totalVwiCount: invoiceTotals?.totalVwiCount || 0,
                    totalPaymentRequested: paymentTotals?.totalPaymentRequested || 0,
                    totalPaymentDone: paymentTotals?.totalPaymentDone || 0,
                    woRaisedBy: raisedByUser?.name || "—",
                };
            })
        );

        return enriched;
    }

    async checkClosure(id: number) {
        const paymentRequestsData = await this.db
            .select({
                id: paymentRequests.id,
                requestNo: paymentRequests.requestNo,
                amount: paymentRequests.amount,
                status: paymentRequests.status,
                paymentAgainst: paymentRequests.paymentAgainst,
            })
            .from(paymentRequests)
            .where(and(
                eq(paymentRequests.vendorWorkOrderId, id),
                ne(paymentRequests.status, "payment_done"),
            ))
            .orderBy(desc(paymentRequests.createdAt));

        const purchaseInvoicesData = await this.db
            .select({
                id: purchaseInvoices.id,
                invoiceNo: purchaseInvoices.invoiceNo,
                valuePreGst: purchaseInvoices.valuePreGst,
                gstAmount: purchaseInvoices.gstAmount,
                invoiceDate: purchaseInvoices.invoiceDate,
            })
            .from(purchaseInvoices)
            .where(eq(purchaseInvoices.vendorWorkOrderId, id))
            .orderBy(desc(purchaseInvoices.createdAt));

        const advancePaid = paymentRequestsData.some(
            (pr) => pr.paymentAgainst?.toLowerCase().includes("advance"),
        );

        const canClose = paymentRequestsData.length === 0 && purchaseInvoicesData.length === 0;

        return {
            canClose,
            remainingPayments: paymentRequestsData,
            remainingInvoices: purchaseInvoicesData,
            advancePaid,
        };
    }

    async closeVendorWorkOrder(id: number) {
        const wo = await this.db
            .select()
            .from(vendorWorkOrders)
            .where(eq(vendorWorkOrders.id, id))
            .then(rows => rows[0]);

        if (!wo) throw new NotFoundException("Vendor Work Order not found");
        if (wo.woApproved !== true) {
            throw new BadRequestException("Only approved Vendor Work Orders can be closed");
        }

        const closureStatus = await this.checkClosure(id);
        if (!closureStatus.canClose) {
            throw new BadRequestException(
                "Vendor Work Order cannot be closed until all payment requests and purchase invoices are cleared.",
            );
        }

        const [updated] = await this.db
            .update(vendorWorkOrders)
            .set({
                updatedAt: sql`now()`,
            })
            .where(eq(vendorWorkOrders.id, id))
            .returning();

        this.logger.info(`Vendor Work Order closed #${id}`);
        return updated ?? wo;
    }

    async getVendorWorkOrderClosure(id: number) {
        const wo = await this.db
            .select()
            .from(vendorWorkOrders)
            .where(eq(vendorWorkOrders.id, id))
            .then(rows => rows[0]);
        if (!wo) throw new NotFoundException("Vendor Work Order not found");

        const items = await this.db
            .select({
                taxableAmount: vendorWorkOrderItems.taxableAmount,
                gstAmount: vendorWorkOrderItems.gstAmount,
                totalAmount: vendorWorkOrderItems.totalAmount,
            })
            .from(vendorWorkOrderItems)
            .where(eq(vendorWorkOrderItems.vendorWorkOrderId, id));

        const grandTotal = items.reduce((sum, item) => sum + Number(item.totalAmount), 0);
        const totalGst = items.reduce((sum, item) => sum + Number(item.gstAmount), 0);

        const paymentRequestsData = await this.db
            .select({
                id: paymentRequests.id,
                requestNo: paymentRequests.requestNo,
                partyName: paymentRequests.partyName,
                amount: paymentRequests.amount,
                status: paymentRequests.status,
                paymentMode: paymentRequests.paymentMode,
                paymentAgainst: paymentRequests.paymentAgainst,
                utrNumber: paymentRequests.utrNumber,
                createdAt: paymentRequests.createdAt,
            })
            .from(paymentRequests)
            .where(eq(paymentRequests.vendorWorkOrderId, id))
            .orderBy(desc(paymentRequests.createdAt));

        const purchaseInvoicesData = await this.db
            .select({
                id: purchaseInvoices.id,
                invoiceNo: purchaseInvoices.invoiceNo,
                category: purchaseInvoices.category,
                partyName: purchaseInvoices.partyName,
                valuePreGst: purchaseInvoices.valuePreGst,
                gstAmount: purchaseInvoices.gstAmount,
                invoiceDate: purchaseInvoices.invoiceDate,
                invoiceFile: purchaseInvoices.invoiceFile,
            })
            .from(purchaseInvoices)
            .where(eq(purchaseInvoices.vendorWorkOrderId, id))
            .orderBy(desc(purchaseInvoices.createdAt));

        const totalPaymentDone = paymentRequestsData
            .filter((pr) => pr.status === "payment_done")
            .reduce((sum, pr) => sum + Number(pr.amount || 0), 0);

        const totalPiAmount = purchaseInvoicesData.reduce(
            (sum, inv) => sum + Number(inv.valuePreGst || 0) + Number(inv.gstAmount || 0),
            0,
        );

        return {
            id: wo.id,
            projectId: wo.projectId,
            woNumber: wo.woNumber,
            sellerName: wo.sellerName,
            projectName: wo.projectName,
            woDate: wo.woDate,
            woApproved: wo.woApproved,
            amountAfterTds: wo.amountAfterTds,
            grandTotal,
            totalGst,
            totalPaymentDone,
            totalPiAmount,
            paymentRequests: paymentRequestsData,
            purchaseInvoices: purchaseInvoicesData,
        };
    }

    async bulkCreatePaymentRequests(id: number, items: any[], userId: number) {
        const wo = await this.db
            .select()
            .from(vendorWorkOrders)
            .where(eq(vendorWorkOrders.id, id))
            .then(rows => rows[0]);
        if (!wo) throw new NotFoundException("Vendor Work Order not found");

        const created: any[] = [];
        for (const item of items) {
            const requestNo = await this.generatePaymentRequestNumber(wo.projectName ?? undefined);
            const pr = (
                await this.db
                    .insert(paymentRequests)
                    .values({
                        projectId: wo.projectId,
                        vendorWorkOrderId: id,
                        requestNo,
                        partyName: item.accountName ?? wo.sellerName ?? null,
                        accountNumber: item.accountNumber,
                        ifsc: item.ifsc,
                        amount: item.amount?.toString(),
                        paymentAgainst: "vwo",
                        paymentMode: "BANK_TRANSFER",
                        utrNumber: item.utr,
                        billFiles: [],
                        uploadInvoice: [],
                        uploadPI: [],
                        status: "payment_done",
                        requestedBy: userId,
                        createdAt: item.paymentDate ? new Date(item.paymentDate) : undefined,
                    })
                    .returning()
            )[0];
            created.push(pr);
        }

        this.logger.info(`Bulk created ${created.length} payment requests against VWO #${id}`);
        return created;
    }

    async bulkCreatePurchaseInvoices(id: number, items: any[], userId: number) {
        const wo = await this.db
            .select()
            .from(vendorWorkOrders)
            .where(eq(vendorWorkOrders.id, id))
            .then(rows => rows[0]);
        if (!wo) throw new NotFoundException("Vendor Work Order not found");

        const created: any[] = [];
        for (const item of items) {
            const invoiceNo = await this.generatePurchaseInvoiceNumber(wo.projectName ?? undefined);
            const pi = (
                await this.db
                    .insert(purchaseInvoices)
                    .values({
                        projectId: wo.projectId,
                        vendorWorkOrderId: id,
                        invoiceNo,
                        category: item.category,
                        partyName: item.partyName ?? wo.sellerName ?? null,
                        valuePreGst: item.valuePreGst?.toString(),
                        gstAmount: item.gstAmount?.toString(),
                        invoiceDate: item.invoiceDate,
                        invoiceFile: Array.isArray(item.invoiceFile) ? item.invoiceFile[0] : item.invoiceFile,
                        uploadedBy: userId,
                    })
                    .returning()
            )[0];
            created.push(pi);
        }

        this.logger.info(`Bulk created ${created.length} purchase invoices for VWO #${id}`);
        return created;
    }

    private async generatePaymentRequestNumber(projectName?: string) {
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
            const match = /PR(\d{4})$/.exec(last[0].requestNo);
            if (match) next = parseInt(match[1]) + 1;
        }

        return `${prefix}/PR${next.toString().padStart(4, "0")}`;
    }

    private async generatePurchaseInvoiceNumber(projectName?: string) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const from = month >= 4 ? year.toString().slice(-2) : (year - 1).toString().slice(-2);
        const to = ((Number.parseInt(from) + 1) % 100).toString().padStart(2, "0");
        const fy = `${from}${to}`;

        const sanitizedName = projectName ? this.sanitizeProjectName(projectName) : "PROJECT";
        const prefix = `VE/${sanitizedName}/${fy}`;
        const series = "WOI";

        const last = await this.db
            .select({ id: purchaseInvoices.id, invoiceNo: purchaseInvoices.invoiceNo })
            .from(purchaseInvoices)
            .where(like(purchaseInvoices.invoiceNo, `VE/%/${fy}/${series}%`))
            .orderBy(desc(purchaseInvoices.id));

        let next = 1;
        if (last[0]?.invoiceNo) {
            const match = last[0].invoiceNo.match(new RegExp(`${series}(\\d{4})$`));
            if (match) next = parseInt(match[1]) + 1;
        }

        return `${prefix}/${series}${next.toString().padStart(4, "0")}`;
    }

    async listParties(type?: string) {
        const query = this.db
            .select()
            .from(projectParties)
            .orderBy(desc(projectParties.id));

        if (type) {
            query.where(eq(projectParties.type, type));
        }

        return query;
    }

    async createParty(body: any) {
        return (
            await this.db
                .insert(projectParties)
                .values({
                    name: body.name,
                    alias: body.alias || null,
                    email: body.email || null,
                    address: body.address || null,
                    gstNo: body.gstNo || null,
                    pan: body.pan || null,
                    msme: body.msme || null,
                    type: body.type || "seller",
                    contactPerson: body.contact_person || null,
                    mobileNumber: body.mobile_number || null,
                })
                .returning()
        )[0];
    }

    async activateParty(id: number) {
        const rows = await this.db
            .update(projectParties)
            .set({ isActive: true, updatedAt: new Date() })
            .where(eq(projectParties.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Party with ID ${id} not found`);
        }
        return rows[0];
    }

    async deactivateParty(id: number) {
        const rows = await this.db
            .update(projectParties)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(projectParties.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Party with ID ${id} not found`);
        }
        return rows[0];
    }

    async updateParty(id: number, body: any) {
        const rows = await this.db
            .update(projectParties)
            .set({
                name: body.name ?? undefined,
                alias: body.alias ?? undefined,
                email: body.email ?? undefined,
                address: body.address ?? undefined,
                gstNo: body.gstNo ?? undefined,
                pan: body.pan ?? undefined,
                msme: body.msme ?? undefined,
                type: body.type ?? undefined,
                contactPerson: body.contact_person ?? undefined,
                mobileNumber: body.mobile_number ?? undefined,
                updatedAt: new Date(),
            })
            .where(eq(projectParties.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Party with ID ${id} not found`);
        }
        return rows[0];
    }

    async getPdf(id: number, version?: string) {
        try {
            const wo = await this.db
                .select({
                    generatedPdfVersions: vendorWorkOrders.generatedPdfVersions,
                    woNumber: vendorWorkOrders.woNumber,
                })
                .from(vendorWorkOrders)
                .where(eq(vendorWorkOrders.id, id))
                .then(rows => rows[0]);
            if (!wo) throw new NotFoundException("Vendor Work Order not found");

            const versions = (wo.generatedPdfVersions ?? {}) as Record<string, { path: string; hash: string }>;

            if (version) {
                const v = versions[version];
                if (!v) throw new NotFoundException(`PDF version ${version} not found`);
                return { path: v.path, filename: `${wo.woNumber}_${version}.pdf` };
            }

            // No version specified → return latest
            const sorted = Object.entries(versions).sort((a, b) =>
                this.parseLabelDate(b[0]).getTime() - this.parseLabelDate(a[0]).getTime()
            );
            if (sorted.length === 0) throw new NotFoundException("No PDF versions found for this Vendor Work Order");
            const [latestLabel, latestEntry] = sorted[0];
            return {
                path: latestEntry.path,
                filename: `${wo.woNumber}_${latestLabel}.pdf`,
            };
        } catch (error) {
            this.logger.error(`Failed to get VWO PDF: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    private parseLabelDate(label: string): Date {
        if (label === "v-original") return new Date(0);
        const match = label.match(/^v-(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/);
        if (match) {
            const [, y, m, d, h, min, s] = match.map(Number);
            return new Date(y, m - 1, d, h, min, s);
        }
        return new Date(0);
    }

    async getPdfVersions(id: number) {
        const wo = await this.db
            .select({ generatedPdfVersions: vendorWorkOrders.generatedPdfVersions })
            .from(vendorWorkOrders)
            .where(eq(vendorWorkOrders.id, id))
            .then(rows => rows[0]);
        return (wo?.generatedPdfVersions ?? {}) as Record<string, { path: string; hash: string }>;
    }

    async deletePdfVersion(id: number, version: string) {
        try {
            const wo = await this.db
                .select({ generatedPdfVersions: vendorWorkOrders.generatedPdfVersions })
                .from(vendorWorkOrders)
                .where(eq(vendorWorkOrders.id, id))
                .then(rows => rows[0]);
            if (!wo) throw new NotFoundException("Vendor Work Order not found");

            const versions = { ...(wo.generatedPdfVersions as Record<string, { path: string; hash: string }>) };
            if (!versions[version]) throw new NotFoundException(`PDF version "${version}" not found`);
            delete versions[version];

            await this.db
                .update(vendorWorkOrders)
                .set({ generatedPdfVersions: versions })
                .where(eq(vendorWorkOrders.id, id));
        } catch (error) {
            this.logger.error(`Failed to delete VWO PDF version: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    private async syncParty(body: any) {
        if (!body.sellerName) return;

        const existing = await this.db
            .select()
            .from(projectParties)
            .where(eq(projectParties.name, body.sellerName))
            .then(rows => rows[0]);

        if (existing) {
            await this.db
                .update(projectParties)
                .set({
                    email: body.sellerEmail || existing.email,
                    address: body.sellerAddress || existing.address,
                    gstNo: body.sellerGstNo || existing.gstNo,
                    pan: body.sellerPan || existing.pan,
                    msme: body.sellerMsme || existing.msme,
                })
                .where(eq(projectParties.id, existing.id));
        } else {
            await this.db.insert(projectParties).values({
                name: body.sellerName,
                email: body.sellerEmail,
                address: body.sellerAddress,
                gstNo: body.sellerGstNo,
                pan: body.sellerPanNo,
                msme: body.sellerMsmeNo,
                type: "seller",
            });
        }

        if (body.shipToName) {
            const shipExisting = await this.db
                .select()
                .from(projectParties)
                .where(eq(projectParties.name, body.shipToName))
                .then(rows => rows[0]);

            if (shipExisting) {
                await this.db
                    .update(projectParties)
                    .set({
                        address: body.shippingAddress || shipExisting.address,
                        gstNo: body.shipToGst || shipExisting.gstNo,
                        pan: body.shipToPan || shipExisting.pan,
                    })
                    .where(eq(projectParties.id, shipExisting.id));
            } else {
                await this.db.insert(projectParties).values({
                    name: body.shipToName,
                    address: body.shippingAddress,
                    gstNo: body.shipToGst,
                    pan: body.shipToPan,
                    type: "ship_to",
                });
            }
        }
    }

    private computeWOHash(wo: any, products: any[]): string {
        const fields = {
            woDate: wo.woDate,
            woNumber: wo.woNumber,
            projectName: wo.projectName,
            sellerName: wo.sellerName,
            sellerAddress: wo.sellerAddress,
            sellerGstNo: wo.sellerGstNo,
            sellerPanNo: wo.sellerPanNo,
            sellerMsmeNo: wo.sellerMsmeNo,
            sellerCinNo: wo.sellerCinNo,
            shipToName: wo.shipToName,
            shippingAddress: wo.shippingAddress,
            shipToGst: wo.shipToGst,
            shipToPan: wo.shipToPan,
            contactPersonName: wo.contactPersonName,
            contactPersonPhone: wo.contactPersonPhone,
            contactPersonEmail: wo.contactPersonEmail,
            termsAndConditions: wo.termsAndConditions,
            team: wo.team,
            certRecipient: wo.certRecipient,
            certRecipients: wo.certRecipients,
            remarks: wo.remarks,
            products: (products || []).map((p: any) => ({
                description: p.description,
                qty: p.qty,
                rate: p.rate,
                gstRate: p.gstRate,
            })),
        };
        return createHash("sha256").update(JSON.stringify(fields)).digest("hex");
    }

    private async generatePdfForWO(wo: any, products: any[]) {
        const contentHash = this.computeWOHash(wo, products);

        const versions = (wo.generatedPdfVersions ?? {}) as Record<string, { path: string; hash: string }>;
        const existingVersion = Object.values(versions).find((v) => v.hash === contentHash);
        if (existingVersion) {
            this.logger.info(`VWO ${wo.id}: no changes detected, reusing existing PDF`);
            return;
        }

        const items = (products || []).map((p: any, i: number) => {
            const qty = Number(p.qty);
            const rate = Number(p.rate);
            const gstRate = Number(p.gstRate);
            const amount = qty * rate;
            const gstAmount = (amount * gstRate) / 100;
            const total = amount + gstAmount;
            return {
                description: p.description || "",
                quantity: qty,
                rate,
                amount,
                gst_rate: gstRate,
                gst_amount: gstAmount,
                total,
            };
        });

        const totalAmount = items.reduce((s: number, i: any) => s + i.amount, 0);
        const totalGstAmt = items.reduce((s: number, i: any) => s + i.gst_amount, 0);
        const grandTotal = totalAmount + totalGstAmt;

        // Determine signature image based on creator's team
        const [creatorUser] = await this.db
            .select({ team: users.team })
            .from(users)
            .where(eq(users.id, wo.woRaisedBy))
            .limit(1);
        const team = creatorUser?.team;
        const isProd = process.env.NODE_ENV === 'production';
        const rootDir = isProd ? 'dist' : 'src';
        const assetsPath = join(process.cwd(), rootDir, 'modules', 'pdf', 'assets');
        const signFile = team === 1 ? 'arju-boi.png' : 'sign-po.jpg';
        const signBuffer = await readFile(join(assetsPath, signFile));
        const img_sign_po_base64 = signBuffer.toString('base64');

        const data = {
            img_sign_po_base64,
            wo_date: wo.woDate || "",
            wo_number: wo.woNumber || "",
            project_name: wo.projectName || "",
            oe_name: wo.contactPersonName || "",
            oe_number: wo.contactPersonPhone || "",
            oe_email: wo.contactPersonEmail || "",
            seller_name: wo.sellerName || "",
            seller_address: wo.sellerAddress || "",
            seller_pan: wo.sellerPanNo || "",
            seller_gst: wo.sellerGstNo || "",
            seller_msme: wo.sellerMsmeNo || "",
            shipping_to_name: wo.shipToName || "",
            shipping_to_address: wo.shippingAddress || "",
            shipping_to_pan: wo.shipToPan || "",
            shipping_to_gst: wo.shipToGst || "",
            items,
            total_amount: totalAmount,
            total_gst_amt: totalGstAmt,
            grand_total: grandTotal,
            grand_total_in_words: this.pdfGenerator.grandTotalInWords(grandTotal),
            terms_and_conditions: Array.isArray(wo.termsAndConditions) ? wo.termsAndConditions : [],
            test_certificate_email: await this.resolveCertRecipientEmails(wo),
        };

        try {
            const pdfPaths = await this.pdfGenerator.generatePdfs('vwo', data, wo.id, 'VWO');
            if (pdfPaths.length > 0) {
                // Rename PDF to use WO sequence number instead of timestamp (avoids Date.now() race)
                const woSeq = wo.woNumber?.split('/').pop() || `WO${wo.id}`;
                const rand = randomUUID().split('-')[0];
                const newFileName = `${woSeq}-${rand}.pdf`;
                const storageDir = 'operations/vwo';

                const oldPath = join(process.cwd(), 'uploads', pdfPaths[0]);
                const newPath = join(process.cwd(), 'uploads', storageDir, newFileName);

                for (let attempt = 0; attempt < 3; attempt++) {
                    try { await rename(oldPath, newPath); break; }
                    catch (e) {
                        if ((e as NodeJS.ErrnoException).code !== 'ENOENT' || attempt === 2) throw e;
                        await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
                    }
                }

                const finalPath = `${storageDir}/${newFileName}`;

                const now = new Date();
                const label = `v-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;

                const updatedVersions = { ...versions, [label]: { path: finalPath, hash: contentHash } };

                await this.db
                    .update(vendorWorkOrders)
                    .set({
                        generatedPdfVersions: updatedVersions,
                    })
                    .where(eq(vendorWorkOrders.id, wo.id));
            }
        } catch (error) {
            this.logger.error(`PDF generation failed for VWO ${wo.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private numberToWords(num: number): string {
        if (num === 0) return "Zero Only";
        const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
        const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

        const convert = (n: number): string => {
            if (n === 0) return "";
            if (n < 20) return ones[n];
            if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
            return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
        };

        const wholePart = Math.floor(num);
        const decimalPart = Math.round((num - wholePart) * 100);

        const crore = Math.floor(wholePart / 10000000);
        const lakh = Math.floor((wholePart % 10000000) / 100000);
        const thousand = Math.floor((wholePart % 100000) / 1000);
        const remainder = wholePart % 1000;

        let result = "";
        if (crore) result += convert(crore) + " Crore ";
        if (lakh) result += convert(lakh) + " Lakh ";
        if (thousand) result += convert(thousand) + " Thousand ";
        if (remainder) result += convert(remainder);

        if (decimalPart > 0) {
            result += " and " + convert(decimalPart) + " Paise";
        }

        return result.trim() + " Only";
    }

    private async resolveCertRecipientEmails(wo: any): Promise<string> {
        const ids: number[] = Array.isArray(wo.certRecipients) && wo.certRecipients.length > 0
            ? wo.certRecipients
            : wo.certRecipient ? [wo.certRecipient] : [];
        if (ids.length === 0) return "goyal@volksenergie.in";
        const users_data = await this.db
            .select({ email: users.email })
            .from(users)
            .where(inArray(users.id, ids));
        return users_data.map(u => u.email).filter(Boolean).join(", ");
    }

    private sanitizeProjectName(name: string): string {
        return name
            .replace(/[^a-zA-Z0-9\s-]/g, '')
            .trim()
            .replace(/[\s-]+/g, '_');
    }
}
