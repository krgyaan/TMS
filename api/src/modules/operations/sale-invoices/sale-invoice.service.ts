import { Inject, Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from "@nestjs/common";
import { and, eq, desc, inArray, ne, sql } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { access, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { projects } from "@/db/schemas/master/projects.schema";
import { transporters } from "@/db/schemas/master/transporters.schema";
import { users } from "@/db/schemas/auth/users.schema";
import { woBasicDetails, woDetails, woBillingBoq, woBuybackBoq, woBillingAddresses, woShippingAddresses } from "@/db/schemas/operations/work-order.schema";
import { saleInvoices, saleInvoiceItems } from "@/db/schemas/operations/sale-invoices.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { purchaseOrderProducts } from "@/db/schemas/operations/purchase-order-products.schema";
import { PdfGeneratorService } from "@/modules/pdf/pdf-generator.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import type { CreateSaleInvoiceDto } from "./dto/create-sale-invoice.dto";

export const GST_STATE_NAMES: Record<string, string> = {
    "01": "Jammu and Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "25": "Daman and Diu",
    "26": "Dadra and Nagar Haveli and Daman and Diu",
    "27": "Maharashtra",
    "28": "Andhra Pradesh",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman and Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh",
    "97": "Other Territory",
};

export const getGstStateCode = (gstin: string | null | undefined): string | null => {
    const normalized = gstin?.trim().toUpperCase() ?? "";
    const match = /^(0[1-9]|[12][0-9]|3[0-8]|97)[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.exec(normalized);
    if (!match) return null;

    const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let factor = 2;
    let sum = 0;
    for (let index = normalized.length - 2; index >= 0; index--) {
        const product = factor * characters.indexOf(normalized[index]);
        sum += Math.floor(product / 36) + product % 36;
        factor = factor === 2 ? 1 : 2;
    }
    const checksum = characters[(36 - (sum % 36)) % 36];
    return checksum === normalized.at(-1) ? match[1] : null;
};

export const isValidGstin = (gstin: string): boolean => getGstStateCode(gstin) !== null;

export const buildSaleInvoicePdfItems = (
    items: Array<{
        srNo: number | null;
        itemDescription: string | null;
        quantity: string | number | null;
        rate: string | number | null;
        gstRate: string | number | null;
        amount: string | number | null;
        gstAmount: string | number | null;
        totalAmount: string | number | null;
        unit: string | null;
        hsnSac: string | null;
    }>,
    isInterstate: boolean,
) => items.map((item, index) => {
    const quantity = Number(item.quantity ?? 0);
    const rate = Number(item.rate ?? 0);
    const gstRate = Number(item.gstRate ?? 0);
    const taxableValue = Number(item.amount ?? quantity * rate);
    const taxAmount = Number(item.gstAmount ?? (taxableValue * gstRate) / 100);
    const igstAmount = isInterstate ? taxAmount : 0;
    const cgstAmount = isInterstate ? 0 : Math.round((taxAmount / 2) * 100) / 100;
    const sgstAmount = isInterstate ? 0 : taxAmount - cgstAmount;

    return {
        sr_no: item.srNo ?? index + 1,
        description: item.itemDescription || "",
        hsn_sac: item.hsnSac || "",
        quantity,
        rate,
        unit: item.unit || "",
        discount_percent: 0,
        taxable_value: taxableValue,
        gst_rate: gstRate,
        igst_rate: isInterstate ? gstRate : 0,
        igst_amount: igstAmount,
        cgst_rate: isInterstate ? 0 : gstRate / 2,
        cgst_amount: cgstAmount,
        sgst_rate: isInterstate ? 0 : gstRate / 2,
        sgst_amount: sgstAmount,
        tax_amount: taxAmount,
        total: Number(item.totalAmount ?? taxableValue + taxAmount),
    };
});

export const buildSaleInvoiceTaxSummary = (
    items: ReturnType<typeof buildSaleInvoicePdfItems>,
): Array<{ rate: number; taxable_value: number; igst_amount: number; cgst_amount: number; sgst_amount: number; tax_amount: number }> => {
    const groups = new Map<number, { rate: number; taxable_value: number; igst_amount: number; cgst_amount: number; sgst_amount: number; tax_amount: number }>();
    for (const item of items) {
        const group = groups.get(item.gst_rate) ?? {
            rate: item.gst_rate,
            taxable_value: 0,
            igst_amount: 0,
            cgst_amount: 0,
            sgst_amount: 0,
            tax_amount: 0,
        };
        group.taxable_value += item.taxable_value;
        group.igst_amount += item.igst_amount;
        group.cgst_amount += item.cgst_amount;
        group.sgst_amount += item.sgst_amount;
        group.tax_amount += item.tax_amount;
        groups.set(item.gst_rate, group);
    }
    return [...groups.values()].sort((a, b) => a.rate - b.rate);
};

export const computeSaleInvoicePdfHash = (data: Record<string, unknown>): string =>
    createHash("sha256").update(JSON.stringify({ templateRevision: 2, data })).digest("hex");

@Injectable()
export class SaleInvoiceService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly pdfGenerator: PdfGeneratorService,
    ) {}

    async getWoBillingData(projectId: number) {
        const [project] = await this.db
            .select({ tenderId: projects.tenderId })
            .from(projects)
            .where(eq(projects.id, projectId));
        if (!project) throw new NotFoundException("Project not found");

        const [basicDetail] = project.tenderId
            ? await this.db
                .select({ id: woBasicDetails.id })
                .from(woBasicDetails)
                .where(eq(woBasicDetails.tenderId, project.tenderId))
            : [];

        if (!basicDetail) {
            return { billingBoq: [], buybackBoq: [], billingAddresses: [], shippingAddresses: [] };
        }

        const [woDetail] = await this.db
            .select({ id: woDetails.id, buybackBoqApplicable: woDetails.buybackBoqApplicable })
            .from(woDetails)
            .where(eq(woDetails.woBasicDetailId, basicDetail.id));

        if (!woDetail) {
            return { billingBoq: [], buybackBoq: [], billingAddresses: [], shippingAddresses: [] };
        }

        const [billingBoq, buybackBoq, billingAddresses, shippingAddresses] = await Promise.all([
            this.db.select().from(woBillingBoq).where(eq(woBillingBoq.woDetailId, woDetail.id)).orderBy(woBillingBoq.srNo),
            this.db.select().from(woBuybackBoq).where(eq(woBuybackBoq.woDetailId, woDetail.id)).orderBy(woBuybackBoq.srNo),
            this.db.select().from(woBillingAddresses).where(eq(woBillingAddresses.woDetailId, woDetail.id)),
            this.db.select().from(woShippingAddresses).where(eq(woShippingAddresses.woDetailId, woDetail.id)),
        ]);

        return {
            woDetailId: woDetail.id,
            buybackBoqApplicable: woDetail.buybackBoqApplicable,
            billingBoq,
            buybackBoq,
            billingAddresses,
            shippingAddresses,
        };
    }

    async generateInvoiceNumber(projectName?: string): Promise<string> {
        const sanitizedName = (projectName || "PROJ")
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9_]/g, "")
            .toUpperCase();

        const now = new Date();
        const year = now.getFullYear();
        const fy = year % 100;
        const nextFy = (year + 1) % 100;
        const fyString = `${String(fy).padStart(2, "0")}${String(nextFy).padStart(2, "0")}`;

        const [last] = await this.db
            .select({ num: saleInvoices.invoiceNumber })
            .from(saleInvoices)
            .where(
                sql`${saleInvoices.invoiceNumber} LIKE ${`VE/${sanitizedName}/${fyString}/%`}`
            )
            .orderBy(desc(saleInvoices.id))
            .limit(1);

        let seq = 1;
        if (last?.num) {
            const parts = last.num.split("/");
            const lastSeq = Number.parseInt(parts.at(-1)?.replace("SI", "") || "0", 10);
            seq = lastSeq + 1;
        }

        return `SI/${sanitizedName}/${fyString}/SI${String(seq).padStart(4, "0")}`;
    }

    async create(body: CreateSaleInvoiceDto, userId: number) {
        const projectId = body.projectId;

        const [project] = await this.db
            .select({ projectName: projects.projectName, tenderId: projects.tenderId })
            .from(projects)
            .where(eq(projects.id, projectId));
        if (!project) throw new NotFoundException("Project not found");

        const tenderId = project.tenderId;
        let teamId: number | null = null;
        if (tenderId) {
            const [woBasic] = await this.db
                .select({ team: woBasicDetails.team })
                .from(woBasicDetails)
                .where(eq(woBasicDetails.tenderId, tenderId))
                .limit(1);
            teamId = woBasic?.team ?? null;
        }

        const invoiceNumber = await this.generateInvoiceNumber(project.projectName || undefined);

        // Validate BOQ line-item sr nos against this project's WO billing BOQ
        if (body.woDetailId) {
            const boqRows = await this.db
                .select({ srNo: woBillingBoq.srNo })
                .from(woBillingBoq)
                .where(eq(woBillingBoq.woDetailId, body.woDetailId));
            const validSrNos = new Set(boqRows.map((b) => b.srNo));
            // An empty billing BOQ means there is nothing to map against (free-form
            // line items, srNo 0 from the no-BOQ fallback in the create form) — skip.
            if (validSrNos.size > 0) {
                for (const item of body.items) {
                    if (!validSrNos.has(item.lineItemSrNo)) {
                        throw new BadRequestException(
                            `Line item ${item.lineItemSrNo} does not exist in the WO Billing BOQ for this project`,
                        );
                    }
                }
            }
        }

        const linkedIds = body.items.map((i) => Number(i.purchaseOrderProductId));
        const seenProductIds = new Set<number>();
        for (const id of linkedIds) {
            if (seenProductIds.has(id)) {
                throw new BadRequestException(
                    "The same PO item is mapped more than once - combine quantities into a single row",
                );
            }
            seenProductIds.add(id);
        }

        const poProductMap = new Map<number, any>();
        if (linkedIds.length > 0) {
            const poProducts = await this.db
                .select({
                    id: purchaseOrderProducts.id,
                    poId: purchaseOrders.id,
                    poNumber: purchaseOrders.poNumber,
                    projectId: purchaseOrders.projectId,
                    poApproved: purchaseOrders.poApproved,
                    description: purchaseOrderProducts.description,
                    hsnSac: purchaseOrderProducts.hsnSac,
                    unit: purchaseOrderProducts.unit,
                    rate: purchaseOrderProducts.rate,
                    gstRate: purchaseOrderProducts.gstRate,
                })
                .from(purchaseOrderProducts)
                .innerJoin(purchaseOrders, eq(purchaseOrders.id, purchaseOrderProducts.purchaseOrderId))
                .where(inArray(purchaseOrderProducts.id, linkedIds));

            poProducts.forEach((p) => poProductMap.set(p.id, p));

            for (const item of body.items) {
                const prod = poProductMap.get(Number(item.purchaseOrderProductId));
                if (!prod || prod.projectId !== projectId || prod.poApproved !== true) {
                    throw new BadRequestException(
                        `Item "${item.itemDescription || "unknown"}" is not linked to an approved PO of this project`,
                    );
                }
            }
        }

        // Validate transporter (snapshot details so later master edits don't alter history)
        let transporterSnapshot: { name?: string; phone?: string; gstNo?: string; address?: string } | null = null;
        if (body.transporterId) {
            const [transporter] = await this.db
                .select()
                .from(transporters)
                .where(and(eq(transporters.id, body.transporterId), eq(transporters.status, true)));
            if (!transporter) {
                throw new BadRequestException("Selected transporter was not found or is inactive");
            }
            transporterSnapshot = {
                name: transporter.name ?? undefined,
                phone: transporter.phone ?? undefined,
                gstNo: transporter.gstNo ?? undefined,
                address: transporter.address ?? undefined,
            };
        }

        let totalPreGst = 0;
        let totalGst = 0;
        for (const item of body.items) {
            const amount = Number(item.qty) * Number(item.rate);
            totalPreGst += amount;
            totalGst += (amount * Number(item.gstRate)) / 100;
        }
        const freight = Number(body.freight || 0);
        const otherCharges = Number(body.otherCharges || 0);
        const roundOff = Number(body.roundOff || 0);
        const grandTotal = totalPreGst + totalGst + freight + otherCharges + roundOff;

        const si = (
            await this.db
                .insert(saleInvoices)
                .values({
                    projectId,
                    tenderId: project.tenderId,
                    woDetailId: body.woDetailId,
                    invoiceNumber,
                    invoiceDate: body.invoiceDate,
                    billingCustomerName: body.billingCustomerName,
                    billingAddress: body.billingAddress,
                    billingGst: body.billingGst || null,
                    billingEmail: body.billingEmail || null,
                    billingPanNo: body.billingPanNo || null,
                    billingMsmeNo: body.billingMsmeNo || null,
                    billingCinNo: body.billingCinNo || null,
                    billingAddressId: body.billingAddressId ?? null,
                    shippingCustomerName: body.shippingCustomerName,
                    shippingAddress: body.shippingAddress,
                    shippingGst: body.shippingGst || null,
                    shippingPanNo: body.shippingPanNo || null,
                    shippingAddressId: body.shippingAddressId ?? null,
                    transporterId: body.transporterId ?? null,
                    transporterDetails: transporterSnapshot,
                    dispatchFromName: body.dispatchFromName || null,
                    dispatchFromAddress: body.dispatchFromAddress || null,
                    dispatchFromGst: body.dispatchFromGst || null,
                    dispatchVehicleNo: body.dispatchVehicleNo || null,
                    dispatchLrNo: body.dispatchLrNo || null,
                    dispatchToName: body.dispatchToName || null,
                    dispatchToAddress: body.dispatchToAddress || null,
                    dispatchToGst: body.dispatchToGst || null,
                    freight: freight.toString(),
                    otherCharges: otherCharges.toString(),
                    roundOff: roundOff.toString(),
                    status: "oe_request",
                    raisedBy: userId,
                    team: teamId,
                    remarks: body.remarks || null,
                })
                .returning()
        )[0];

        if (body.items.length > 0) {
            for (const item of body.items) {
                const qty = Number(item.qty);
                const rate = Number(item.rate);
                const gstRate = Number(item.gstRate);
                const amount = qty * rate;
                const gstAmount = (amount * gstRate) / 100;
                const totalAmount = amount + gstAmount;

                const prod = poProductMap.get(Number(item.purchaseOrderProductId));

                await this.db.insert(saleInvoiceItems).values({
                    saleInvoiceId: si.id,
                    purchaseOrderProductId: Number(item.purchaseOrderProductId),
                    lineItemSrNo: item.lineItemSrNo,
                    unit: item.unit || prod?.unit || null,
                    hsnSac: item.hsnSac || prod?.hsnSac || null,
                    srNo: item.srNo || item.lineItemSrNo || null,
                    itemDescription: item.itemDescription,
                    quantity: item.qty.toString(),
                    rate: item.rate.toString(),
                    amount: amount.toString(),
                    gstRate: item.gstRate.toString(),
                    gstAmount: gstAmount.toString(),
                    totalAmount: totalAmount.toString(),
                });
            }
        }

        await this.db
            .update(saleInvoices)
            .set({
                totalPreGst: totalPreGst.toString(),
                totalGst: totalGst.toString(),
                grandTotal: grandTotal.toString(),
            })
            .where(eq(saleInvoices.id, si.id));

        this.logger.info(`Sale Invoice created: ${invoiceNumber}`);

        const created = await this.getById(si.id);
        try {
            const result = await this.generateSiPdf(created, created.items);
            return { ...created, pdfGeneration: { status: result.generated ? "generated" : "unchanged", version: result.version } };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`PDF generation failed for SI ${si.id}: ${message}`);
            return { ...created, pdfGeneration: { status: "failed", message } };
        }
    }

    async addWoAddress(
        type: string,
        body: { woDetailId: number; customerName: string; address: string; gst?: string },
        userId: number,
    ) {
        if (type !== "billing" && type !== "shipping") {
            throw new BadRequestException(`Address type must be "billing" or "shipping"`);
        }
        const woDetailId = Number(body.woDetailId);
        const customerName = (body.customerName || "").trim();
        const address = (body.address || "").trim();
        if (!woDetailId) throw new BadRequestException("woDetailId is required");
        if (!customerName) throw new BadRequestException("Customer name is required");
        if (!address) throw new BadRequestException("Address is required");

        const [woDetail] = await this.db
            .select({ id: woDetails.id })
            .from(woDetails)
            .where(eq(woDetails.id, woDetailId));
        if (!woDetail) throw new NotFoundException("Work order detail not found");

        const table = type === "billing" ? woBillingAddresses : woShippingAddresses;
        const [row] = await this.db
            .insert(table)
            .values({
                woDetailId,
                srNos: [],
                customerName,
                address,
                gst: (body.gst || "").trim() || null,
            })
            .returning();

        this.logger.info(`WO ${type} address #${row.id} added for woDetail ${woDetailId} by user ${userId}`);
        return row;
    }

    async createDraft(id: number, userId: number) {
        const [si] = await this.db.select().from(saleInvoices).where(eq(saleInvoices.id, id));
        if (!si) throw new NotFoundException("Sale invoice not found");

        if (si.status !== "oe_request" && si.status !== "changes_requested") {
            throw new BadRequestException(`Cannot create draft from "${si.status}" status`);
        }

        const actionEntry = {
            action: "status_changed_to_draft",
            data: { draftCreatedBy: userId },
            updatedBy: userId,
            updatedAt: new Date().toISOString(),
        };

        const [updated] = await this.db
            .update(saleInvoices)
            .set({
                status: "draft",
                changesRemark: null,
                updatedAt: new Date(),
                actionLogs: [...(si.actionLogs ?? []), actionEntry],
            })
            .where(eq(saleInvoices.id, id))
            .returning();

        this.logger.info(`Draft created for Sale Invoice #${id} by user ${userId}`);
        return this.getById(id);
    }

    async approve(id: number, userId: number) {
        const [si] = await this.db.select().from(saleInvoices).where(eq(saleInvoices.id, id));
        if (!si) throw new NotFoundException("Sale invoice not found");

        if (si.status !== "draft") {
            throw new BadRequestException(`Cannot approve invoice in "${si.status}" status. Only drafts can be approved.`);
        }

        const actionEntry = {
            action: "status_changed_to_approved",
            data: { approvedBy: userId },
            updatedBy: userId,
            updatedAt: new Date().toISOString(),
        };

        const [updated] = await this.db
            .update(saleInvoices)
            .set({
                status: "approved",
                approvedBy: userId,
                approvedAt: new Date(),
                updatedAt: new Date(),
                actionLogs: [...(si.actionLogs ?? []), actionEntry],
            })
            .where(eq(saleInvoices.id, id))
            .returning();

        this.logger.info(`Sale Invoice #${id} approved by user ${userId}`);
        return this.getById(id);
    }

    async requestChanges(id: number, remark: string, userId: number) {
        const [si] = await this.db.select().from(saleInvoices).where(eq(saleInvoices.id, id));
        if (!si) throw new NotFoundException("Sale invoice not found");

        if (si.status !== "draft") {
            throw new BadRequestException(`Cannot request changes on invoice in "${si.status}" status. Only drafts can be sent back.`);
        }
        if (!remark || !remark.trim()) {
            throw new BadRequestException("A change request remark is required");
        }

        const actionEntry = {
            action: "status_changed_to_changes_requested",
            data: { requestedBy: userId, remark: remark.trim() },
            updatedBy: userId,
            updatedAt: new Date().toISOString(),
        };

        const [updated] = await this.db
            .update(saleInvoices)
            .set({
                status: "changes_requested",
                changesRemark: remark.trim(),
                updatedAt: new Date(),
                actionLogs: [...(si.actionLogs ?? []), actionEntry],
            })
            .where(eq(saleInvoices.id, id))
            .returning();

        this.logger.info(`Changes requested for Sale Invoice #${id} by user ${userId}`);
        return updated;
    }

    async reject(id: number, remark: string, userId: number) {
        const [si] = await this.db.select().from(saleInvoices).where(eq(saleInvoices.id, id));
        if (!si) throw new NotFoundException("Sale invoice not found");

        if (si.status !== "oe_request") {
            throw new BadRequestException(`Cannot reject invoice in "${si.status}" status. Only raised requests can be rejected.`);
        }
        if (!remark || !remark.trim()) {
            throw new BadRequestException("A rejection remark is required");
        }

        const actionEntry = {
            action: "status_changed_to_rejected",
            data: { rejectedBy: userId, remark: remark.trim() },
            updatedBy: userId,
            updatedAt: new Date().toISOString(),
        };

        const [updated] = await this.db
            .update(saleInvoices)
            .set({
                status: "rejected",
                changesRemark: remark.trim(),
                updatedAt: new Date(),
                actionLogs: [...(si.actionLogs ?? []), actionEntry],
            })
            .where(eq(saleInvoices.id, id))
            .returning();

        this.logger.info(`Sale Invoice #${id} rejected by user ${userId}`);
        return updated;
    }

    async finalize(id: number, userId: number) {
        const [si] = await this.db.select().from(saleInvoices).where(eq(saleInvoices.id, id));
        if (!si) throw new NotFoundException("Sale invoice not found");

        if (si.status !== "approved") {
            throw new BadRequestException(`Cannot finalize invoice in "${si.status}" status. Only approved drafts can be finalized.`);
        }

        const items = await this.db
            .select()
            .from(saleInvoiceItems)
            .where(eq(saleInvoiceItems.saleInvoiceId, id));

        // One PO item can be split across several BOQ line-item rows — validate the
        // summed quantity per purchase order product, not per row.
        const qtyByProduct = new Map<number, { qty: number; label: string }>();
        for (const item of items) {
            if (item.purchaseOrderProductId == null) continue;
            const key = Number(item.purchaseOrderProductId);
            const existing = qtyByProduct.get(key);
            if (existing) {
                existing.qty += Number(item.quantity);
            } else {
                qtyByProduct.set(key, { qty: Number(item.quantity), label: item.itemDescription || "" });
            }
        }

        for (const [productId, { qty: requestedQty, label }] of qtyByProduct) {
            const [prod] = await this.db
                .select({ qty: purchaseOrderProducts.qty })
                .from(purchaseOrderProducts)
                .where(eq(purchaseOrderProducts.id, productId));
            if (!prod) continue;

            const invoicedQty = await this.getInvoicedQtyForProduct(productId, id);
            const remaining = Number(prod.qty) - invoicedQty;
            if (requestedQty > remaining) {
                throw new BadRequestException(
                    `Cannot finalize invoice: "${label}" quantity ${requestedQty} exceeds remaining PO quantity ${Math.max(0, remaining)}`
                );
            }
        }

        const actionEntry = {
            action: "status_changed_to_invoiced",
            data: { finalizedBy: userId },
            updatedBy: userId,
            updatedAt: new Date().toISOString(),
        };

        const [updated] = await this.db
            .update(saleInvoices)
            .set({
                status: "invoiced",
                updatedAt: new Date(),
                actionLogs: [...(si.actionLogs ?? []), actionEntry],
            })
            .where(eq(saleInvoices.id, id))
            .returning();

        this.logger.info(`Sale Invoice #${id} finalized as invoiced by user ${userId}`);
        return updated;
    }

    private async getInvoicedQtyForProduct(productId: number, excludeInvoiceId?: number): Promise<number> {
        const [row] = await this.db
            .select({
                qty: sql<string>`
                    COALESCE(SUM(
                        CASE
                            WHEN ${saleInvoices.status} IN ('oe_request', 'draft', 'changes_requested', 'approved', 'invoiced', 'payment_received', 'completed') THEN ${saleInvoiceItems.quantity}::numeric
                            WHEN ${saleInvoices.status} = 'credit_note' THEN -${saleInvoiceItems.quantity}::numeric
                            ELSE 0
                        END
                    ), 0)`,
            })
            .from(saleInvoiceItems)
            .innerJoin(saleInvoices, eq(saleInvoices.id, saleInvoiceItems.saleInvoiceId))
            .where(and(
                eq(saleInvoiceItems.purchaseOrderProductId, productId),
                excludeInvoiceId != null ? ne(saleInvoiceItems.saleInvoiceId, excludeInvoiceId) : undefined,
            ));
        return Number(row?.qty || 0);
    }

    private async buildSiPdfData(si: any, items: any[]) {
        const buyerStateCode = getGstStateCode(si.billingGst);
        const buyerState = buyerStateCode ? GST_STATE_NAMES[buyerStateCode] : undefined;
        if (!buyerStateCode || !buyerState) {
            throw new BadRequestException("A valid billing GSTIN is required to generate the invoice PDF");
        }

        const [project] = await this.db
            .select({
                projectName: projects.projectName,
                projectCode: projects.projectCode,
                poNo: projects.poNo,
                poDate: projects.poDate,
            })
            .from(projects)
            .where(eq(projects.id, si.projectId));
        const [creator] = si.raisedBy
            ? await this.db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, si.raisedBy))
            : [];
        const billingBoqRows = si.woDetailId
            ? await this.db
                .select({ srNo: woBillingBoq.srNo, itemDescription: woBillingBoq.itemDescription })
                .from(woBillingBoq)
                .where(eq(woBillingBoq.woDetailId, si.woDetailId))
            : [];
        const boqDescriptionBySrNo = new Map(billingBoqRows.map((row) => [row.srNo, row.itemDescription]));
        const linkedProductIds = items
            .map((item) => item.purchaseOrderProductId)
            .filter((id): id is number => id != null);
        const poProducts = linkedProductIds.length > 0
            ? await this.db
                .select({ id: purchaseOrderProducts.id, description: purchaseOrderProducts.description })
                .from(purchaseOrderProducts)
                .where(inArray(purchaseOrderProducts.id, linkedProductIds))
            : [];
        const poDescriptionById = new Map(poProducts.map((row) => [row.id, row.description]));
        const isInterstate = buyerStateCode !== "07";
        const rows = buildSaleInvoicePdfItems(items, isInterstate).map((row, index) => {
            const item = items[index];
            return {
                ...row,
                boq_item_name: boqDescriptionBySrNo.get(item.lineItemSrNo) || "",
                po_item_description: poDescriptionById.get(item.purchaseOrderProductId) || item.itemDescription || "",
            };
        });

        const totalQuantity = rows.reduce((sum, item) => sum + item.quantity, 0);
        const lineItemSubtotal = rows.reduce((sum, item) => sum + item.total, 0);
        const totalTaxableValue = rows.reduce((sum, item) => sum + item.taxable_value, 0);
        const totalIgst = rows.reduce((sum, item) => sum + item.igst_amount, 0);
        const totalCgst = rows.reduce((sum, item) => sum + item.cgst_amount, 0);
        const totalSgst = rows.reduce((sum, item) => sum + item.sgst_amount, 0);
        const totalTax = totalIgst + totalCgst + totalSgst;
        const freight = Number(si.freight ?? 0);
        const otherCharges = Number(si.otherCharges ?? 0);
        const roundOff = Number(si.roundOff ?? 0);
        const grandTotal = Number(si.grandTotal ?? totalTaxableValue + totalTax + freight + otherCharges + roundOff);
        const transporter = (si.transporterDetails ?? {}) as { name?: string; gstNo?: string; phone?: string };
        const dispatchStateCode = getGstStateCode(si.dispatchFromGst);
        const data = {
            invoice_number: si.invoiceNumber || "",
            invoice_date: si.invoiceDate || "",
            irn: "",
            ack_number: "",
            ack_date: "",
            qr_code_base64: "",
            seller_name: "Volks Energie Pvt. Ltd.",
            seller_address_line1: "",
            seller_address_line2: "",
            seller_city_state_pin: "",
            seller_udyam: "",
            seller_gst: "",
            seller_state: "Delhi",
            seller_state_code: "07",
            seller_cin: "",
            buyer_order_number: project?.poNo || "",
            buyer_order_date: project?.poDate || "",
            project_code: project?.projectCode || "",
            project_name: project?.projectName || "",
            project_manager: "",
            project_manager_phone: "",
            project_manager_email: "",
            transporter_name: transporter.name || "",
            transporter_gst: transporter.gstNo || "",
            transporter_phone: transporter.phone || "",
            bill_of_lading_number: si.dispatchLrNo || "",
            vehicle_number: si.dispatchVehicleNo || "",
            buyer_name: si.billingCustomerName || "",
            buyer_address: si.billingAddress || "",
            buyer_pin: "",
            buyer_gst: si.billingGst || "",
            buyer_pan: si.billingPanNo || "",
            buyer_state: buyerState,
            buyer_contact_person: "",
            buyer_phone: "",
            consignee_name: si.shippingCustomerName || "",
            consignee_address: si.shippingAddress || "",
            consignee_pin: "",
            consignee_gst: si.shippingGst || "",
            consignee_pan: si.shippingPanNo || "",
            consignee_state: GST_STATE_NAMES[getGstStateCode(si.shippingGst) || ""] || "",
            dispatch_from_name: si.dispatchFromName || "",
            dispatch_address: si.dispatchFromAddress || "",
            dispatch_pin: "",
            dispatch_gst: si.dispatchFromGst || "",
            dispatch_pan: "",
            dispatch_state: GST_STATE_NAMES[dispatchStateCode || ""] || "",
            dispatch_contact_person: "",
            dispatch_phone: "",
            is_interstate: isInterstate,
            items: rows,
            tax_breakdown: buildSaleInvoiceTaxSummary(rows),
            quantity: totalQuantity,
            line_item_subtotal: lineItemSubtotal,
            taxable_value: totalTaxableValue,
            igst_rate: isInterstate && totalTaxableValue > 0 ? (totalIgst / totalTaxableValue) * 100 : 0,
            igst_amount: totalIgst,
            cgst_rate: !isInterstate && totalTaxableValue > 0 ? (totalCgst / totalTaxableValue) * 100 : 0,
            cgst_amount: totalCgst,
            sgst_rate: !isInterstate && totalTaxableValue > 0 ? (totalSgst / totalTaxableValue) * 100 : 0,
            sgst_amount: totalSgst,
            total_tax_amount: totalTax,
            freight,
            other_charges: otherCharges,
            round_off: roundOff,
            grand_total: grandTotal,
            amount_in_words: this.pdfGenerator.grandTotalInWords(grandTotal),
            tax_amount_in_words: this.pdfGenerator.grandTotalInWords(totalTax),
            company_pan: "",
            bank_name: "",
            bank_account_number: "",
            bank_branch_ifsc: "",
            prepared_by_name: creator?.name || "",
            prepared_by_email: creator?.email || "",
            prepared_by_phone: "",
            approved_by_name: "",
            approved_by_email: "",
            approved_by_phone: "",
            remarks: si.remarks || "",
        };

        return data;
    }

    private computeSIHash(data: Record<string, unknown>): string {
        return computeSaleInvoicePdfHash(data);
    }

    private async generateSiPdf(si: any, items: any[]): Promise<{ generated: boolean; version?: string }> {
        const data = await this.buildSiPdfData(si, items);
        const contentHash = this.computeSIHash(data);
        const versions = (si.generatedPdfVersions ?? {}) as Record<string, { path: string; hash: string }>;
        const existingVersion = Object.entries(versions).find(([, version]) => version.hash === contentHash);
        if (existingVersion) {
            try {
                await access(join(process.cwd(), "uploads", existingVersion[1].path));
                this.logger.info(`SI ${si.id}: no changes detected, reusing existing PDF`);
                return { generated: false };
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
                await this.db
                    .update(saleInvoices)
                    .set({ generatedPdfVersions: sql`COALESCE(${saleInvoices.generatedPdfVersions}, '{}'::jsonb) - ${existingVersion[0]}` })
                    .where(eq(saleInvoices.id, si.id));
            }
        }

        const pdfPaths = await this.pdfGenerator.generatePdfs("si", data, si.id, "SI");
        const siSequence = si.invoiceNumber?.split("/").pop() || `SI${si.id}`;
        const fileName = `${siSequence}-${randomUUID().slice(0, 8)}.pdf`;
        const storageDir = "operations/si";
        const oldPath = join(process.cwd(), "uploads", pdfPaths[0]);
        const newPath = join(process.cwd(), "uploads", storageDir, fileName);

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                await rename(oldPath, newPath);
                break;
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== "ENOENT" || attempt === 2) throw error;
                await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
            }
        }

        const now = new Date();
        const label = `v-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}-${String(now.getMilliseconds()).padStart(3, "0")}-${randomUUID().slice(0, 8)}`;
        const version = { path: `${storageDir}/${fileName}`, hash: contentHash };

        let stored: { id: number } | undefined;
        try {
            [stored] = await this.db
                .update(saleInvoices)
                .set({
                    generatedPdfVersions: sql`COALESCE(${saleInvoices.generatedPdfVersions}, '{}'::jsonb) || ${JSON.stringify({ [label]: version })}::jsonb`,
                })
                .where(and(
                    eq(saleInvoices.id, si.id),
                    sql`NOT EXISTS (
                        SELECT 1 FROM jsonb_each(${saleInvoices.generatedPdfVersions}) AS entry
                        WHERE entry.value->>'hash' = ${contentHash}
                    )`,
                ))
                .returning({ id: saleInvoices.id });
        } catch (error) {
            await unlink(newPath).catch(() => undefined);
            throw error;
        }

        if (!stored) {
            await unlink(newPath).catch(() => undefined);
            this.logger.info(`SI ${si.id}: concurrent generation stored identical content`);
            return { generated: false };
        }

        return { generated: true, version: label };
    }

    async getSaleInvoicePdf(id: number, version?: string): Promise<{ path: string; filename: string }> {
        const [si] = await this.db.select().from(saleInvoices).where(eq(saleInvoices.id, id));
        if (!si) throw new NotFoundException("Sale invoice not found");

        const versions = (si.generatedPdfVersions ?? {}) as Record<string, { path: string; hash: string }>;

        if (version) {
            const entry = versions[version];
            if (!entry) throw new NotFoundException(`PDF version "${version}" not found`);
            return {
                path: entry.path,
                filename: `SI_${si.invoiceNumber?.replace(/\//g, "_") || id}_${version}.pdf`,
            };
        }

        const sorted = Object.entries(versions).sort(([a], [b]) => b.localeCompare(a));
        if (sorted.length === 0) throw new NotFoundException("No PDF versions found for this Sale Invoice");
        const [latestLabel, latestEntry] = sorted[0];
        return {
            path: latestEntry.path,
            filename: `SI_${si.invoiceNumber?.replace(/\//g, "_") || id}_${latestLabel}.pdf`,
        };
    }

    async getSaleInvoicePdfVersions(id: number): Promise<Record<string, { path: string; hash: string }>> {
        const [si] = await this.db.select().from(saleInvoices).where(eq(saleInvoices.id, id));
        if (!si) throw new NotFoundException("Sale invoice not found");
        return (si.generatedPdfVersions ?? {}) as Record<string, { path: string; hash: string }>;
    }

    async deletePdfVersion(id: number, version: string): Promise<void> {
        const [si] = await this.db.select().from(saleInvoices).where(eq(saleInvoices.id, id));
        if (!si) throw new NotFoundException("Sale invoice not found");

        const versions = (si.generatedPdfVersions ?? {}) as Record<string, { path: string; hash: string }>;
        if (!versions[version]) throw new NotFoundException(`PDF version "${version}" not found`);
        if (version === Object.keys(versions).sort().at(-1)) {
            throw new BadRequestException("The latest PDF version cannot be deleted");
        }

        const [updated] = await this.db
            .update(saleInvoices)
            .set({ generatedPdfVersions: sql`${saleInvoices.generatedPdfVersions} - ${version}` })
            .where(and(
                eq(saleInvoices.id, id),
                sql`jsonb_exists(COALESCE(${saleInvoices.generatedPdfVersions}, '{}'::jsonb), ${version})`,
                sql`NOT EXISTS (
                    SELECT 1 FROM jsonb_object_keys(COALESCE(${saleInvoices.generatedPdfVersions}, '{}'::jsonb)) AS keys(key)
                    WHERE keys.key > ${version}
                )`,
            ))
            .returning({ id: saleInvoices.id });
        if (!updated) throw new BadRequestException("The latest PDF version cannot be deleted");

        await unlink(join(process.cwd(), "uploads", versions[version].path)).catch((error) => {
            this.logger.warn(`Failed to remove SI ${id} PDF version file: ${error instanceof Error ? error.message : String(error)}`);
        });
    }

    async getAll() {
        const rows = await this.db
            .select({
                id: saleInvoices.id,
                projectId: saleInvoices.projectId,
                invoiceNumber: saleInvoices.invoiceNumber,
                invoiceDate: saleInvoices.invoiceDate,
                billingCustomerName: saleInvoices.billingCustomerName,
                totalPreGst: saleInvoices.totalPreGst,
                totalGst: saleInvoices.totalGst,
                grandTotal: saleInvoices.grandTotal,
                status: saleInvoices.status,
                invoiceDocPaths: saleInvoices.invoiceDocPaths,
                projectName: projects.projectName,
                raisedByName: users.name,
                createdAt: saleInvoices.createdAt,
            })
            .from(saleInvoices)
            .leftJoin(projects, eq(saleInvoices.projectId, projects.id))
            .leftJoin(users, eq(saleInvoices.raisedBy, users.id))
            .orderBy(desc(saleInvoices.createdAt));
        return { saleInvoices: rows };
    }

    async updateStatus(id: number, body: { status: string; invoiceDocPaths?: string[] }) {
        const [existing] = await this.db
            .select()
            .from(saleInvoices)
            .where(eq(saleInvoices.id, id));
        if (!existing) throw new NotFoundException("Sale invoice not found");

        const validTransitions: Record<string, string[]> = {
            invoiced: ["credit_note", "payment_received"],
            credit_note: ["payment_received"],
            payment_received: ["completed"],
        };

        const currentStatus = existing.status ?? "oe_request";
        if (body.status !== currentStatus) {
            if (!validTransitions[currentStatus]?.includes(body.status)) {
                throw new BadRequestException(
                    `Cannot transition from "${currentStatus}" to "${body.status}"`
                );
            }
        }

        const updateData: Record<string, any> = {
            status: body.status,
            updatedAt: new Date(),
        };

        if (body.invoiceDocPaths !== undefined) {
            updateData.invoiceDocPaths = body.invoiceDocPaths;
        }

        const [updated] = await this.db
            .update(saleInvoices)
            .set(updateData)
            .where(eq(saleInvoices.id, id))
            .returning();

        this.logger.info(`Sale Invoice #${id} status updated to "${body.status}"`);
        return updated;
    }

    async update(id: number, body: Record<string, any>, userId: number) {
        const [existing] = await this.db
            .select()
            .from(saleInvoices)
            .where(eq(saleInvoices.id, id));
        if (!existing) throw new NotFoundException("Sale invoice not found");

        const currentStatus = existing.status ?? "oe_request";
        let newStatus = currentStatus;

        if (body.status && body.status !== currentStatus) {
            const validTransitions: Record<string, string[]> = {
                invoiced: ["credit_note", "payment_received"],
                credit_note: ["payment_received"],
                payment_received: ["completed"],
            };
            if (!validTransitions[currentStatus]?.includes(body.status)) {
                throw new BadRequestException(
                    `Cannot transition from "${currentStatus}" to "${body.status}"`
                );
            }
            newStatus = body.status;
        }

        const updateData: Record<string, any> = {
            updatedAt: new Date(),
        };

        if (body.status) updateData.status = body.status;

        if (body.invoiceTaxableAmount !== undefined) updateData.invoiceTaxableAmount = body.invoiceTaxableAmount.toString();
        if (body.invoiceIgst !== undefined) updateData.invoiceIgst = body.invoiceIgst.toString();
        if (body.invoiceCgst !== undefined) updateData.invoiceCgst = body.invoiceCgst.toString();
        if (body.invoiceSgst !== undefined) updateData.invoiceSgst = body.invoiceSgst.toString();
        if (body.invoiceDocPaths !== undefined) updateData.invoiceDocPaths = body.invoiceDocPaths;

        if (body.invoiceTaxableAmount !== undefined || body.invoiceIgst !== undefined || body.invoiceCgst !== undefined || body.invoiceSgst !== undefined) {
            updateData.invoiceTotal = (
                Number(body.invoiceTaxableAmount ?? existing.invoiceTaxableAmount ?? 0) +
                Number(body.invoiceIgst ?? existing.invoiceIgst ?? 0) +
                Number(body.invoiceCgst ?? existing.invoiceCgst ?? 0) +
                Number(body.invoiceSgst ?? existing.invoiceSgst ?? 0)
            ).toFixed(2);
        }

        if (body.cnTaxable !== undefined) updateData.cnTaxable = body.cnTaxable.toString();
        if (body.cnIgst !== undefined) updateData.cnIgst = body.cnIgst.toString();
        if (body.cnCgst !== undefined) updateData.cnCgst = body.cnCgst.toString();
        if (body.cnSgst !== undefined) updateData.cnSgst = body.cnSgst.toString();
        if (body.creditNoteDocPaths !== undefined) updateData.creditNoteDocPaths = body.creditNoteDocPaths;

        if (body.cnTaxable !== undefined || body.cnIgst !== undefined || body.cnCgst !== undefined || body.cnSgst !== undefined) {
            updateData.cnTotal = (
                Number(body.cnTaxable ?? existing.cnTaxable ?? 0) +
                Number(body.cnIgst ?? existing.cnIgst ?? 0) +
                Number(body.cnCgst ?? existing.cnCgst ?? 0) +
                Number(body.cnSgst ?? existing.cnSgst ?? 0)
            ).toFixed(2);
        }

        if (body.paymentAdviceDocPaths !== undefined) updateData.paymentAdviceDocPaths = body.paymentAdviceDocPaths;
        if (body.buybackInvoiceDocPaths !== undefined) updateData.buybackInvoiceDocPaths = body.buybackInvoiceDocPaths;
        if (body.gstTds !== undefined) updateData.gstTds = body.gstTds.toString();
        if (body.itTds !== undefined) updateData.itTds = body.itTds.toString();
        if (body.ldDeduction !== undefined) updateData.ldDeduction = body.ldDeduction.toString();
        if (body.otherDeduction !== undefined) updateData.otherDeduction = body.otherDeduction.toString();

        if (body.holdGstIgst !== undefined) updateData.holdGstIgst = body.holdGstIgst.toString();
        if (body.holdGstCgst !== undefined) updateData.holdGstCgst = body.holdGstCgst.toString();
        if (body.holdGstSgst !== undefined) updateData.holdGstSgst = body.holdGstSgst.toString();
        if (body.holdItc !== undefined) updateData.holdItc = body.holdItc.toString();
        if (body.holdRetention !== undefined) updateData.holdRetention = body.holdRetention.toString();
        if (body.holdBuyback !== undefined) updateData.holdBuyback = body.holdBuyback.toString();
        if (body.holdOther !== undefined) updateData.holdOther = body.holdOther.toString();

        if (body.holdGstIgst !== undefined || body.holdGstCgst !== undefined || body.holdGstSgst !== undefined ||
            body.holdItc !== undefined || body.holdRetention !== undefined || body.holdBuyback !== undefined || body.holdOther !== undefined) {
            updateData.totalHoldAmount = (
                Number(body.holdGstIgst ?? existing.holdGstIgst ?? 0) +
                Number(body.holdGstCgst ?? existing.holdGstCgst ?? 0) +
                Number(body.holdGstSgst ?? existing.holdGstSgst ?? 0) +
                Number(body.holdItc ?? existing.holdItc ?? 0) +
                Number(body.holdRetention ?? existing.holdRetention ?? 0) +
                Number(body.holdBuyback ?? existing.holdBuyback ?? 0) +
                Number(body.holdOther ?? existing.holdOther ?? 0)
            ).toFixed(2);
        }

        if (body.holdReleasedAmount !== undefined) {
            const existingReleased = Number(existing.holdReleasedAmount ?? 0);
            updateData.holdReleasedAmount = (existingReleased + Number(body.holdReleasedAmount)).toFixed(2);
        }
        if (body.holdReleasedAt !== undefined) {
            updateData.holdReleasedAt = body.holdReleasedAt;
        }

        const actionLog = existing.actionLogs ?? [];
        const actionEntry = {
            action: newStatus !== currentStatus ? `status_changed_to_${newStatus}` : `${Object.keys(body).filter(k => k !== 'status').join('_')}_updated`,
            data: body,
            updatedBy: userId,
            updatedAt: new Date().toISOString(),
        };
        updateData.actionLogs = [...actionLog, actionEntry];

        const [updated] = await this.db
            .update(saleInvoices)
            .set(updateData)
            .where(eq(saleInvoices.id, id))
            .returning();

        this.logger.info(`Sale Invoice #${id} updated`);
        return updated;
    }

    async updateBillingDetails(
        id: number,
        body: { billingCustomerName: string; billingAddress: string; billingGst: string },
        userId: number,
    ) {
        const [existing] = await this.db.select().from(saleInvoices).where(eq(saleInvoices.id, id));
        if (!existing) throw new NotFoundException("Sale invoice not found");
        if (!["oe_request", "draft", "changes_requested"].includes(existing.status ?? "oe_request")) {
            throw new BadRequestException("Billing details can only be corrected before invoice approval");
        }

        const actionEntry = {
            action: "billing_details_corrected",
            data: body,
            updatedBy: userId,
            updatedAt: new Date().toISOString(),
        };
        const [updated] = await this.db
            .update(saleInvoices)
            .set({
                billingCustomerName: body.billingCustomerName,
                billingAddress: body.billingAddress,
                billingGst: body.billingGst,
                updatedAt: new Date(),
                actionLogs: [...(existing.actionLogs ?? []), actionEntry],
            })
            .where(eq(saleInvoices.id, id))
            .returning();

        const items = await this.db.select().from(saleInvoiceItems).where(eq(saleInvoiceItems.saleInvoiceId, id));
        try {
            const result = await this.generateSiPdf(updated, items);
            return { ...updated, pdfGeneration: { status: result.generated ? "generated" : "unchanged", version: result.version } };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`PDF generation failed after correcting SI ${id}: ${message}`);
            return { ...updated, pdfGeneration: { status: "failed", message } };
        }
    }

    async retryPdfGeneration(id: number) {
        const [si] = await this.db.select().from(saleInvoices).where(eq(saleInvoices.id, id));
        if (!si) throw new NotFoundException("Sale invoice not found");
        const items = await this.db.select().from(saleInvoiceItems).where(eq(saleInvoiceItems.saleInvoiceId, id));

        try {
            const result = await this.generateSiPdf(si, items);
            return { status: result.generated ? "generated" : "unchanged", version: result.version };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`PDF generation retry failed for SI ${id}: ${message}`);
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException("Invoice PDF generation failed. Please retry.");
        }
    }

    async getByProject(projectId: number) {
        const rows = await this.db
            .select()
            .from(saleInvoices)
            .where(eq(saleInvoices.projectId, projectId))
            .orderBy(desc(saleInvoices.createdAt));
        return { saleInvoices: rows };
    }

    async getById(id: number) {
        const [row] = await this.db
            .select({
                id: saleInvoices.id,
                projectId: saleInvoices.projectId,
                tenderId: saleInvoices.tenderId,
                woDetailId: saleInvoices.woDetailId,
                invoiceNumber: saleInvoices.invoiceNumber,
                invoiceDate: saleInvoices.invoiceDate,
                billingCustomerName: saleInvoices.billingCustomerName,
                billingAddress: saleInvoices.billingAddress,
                billingGst: saleInvoices.billingGst,
                billingEmail: saleInvoices.billingEmail,
                billingPanNo: saleInvoices.billingPanNo,
                billingMsmeNo: saleInvoices.billingMsmeNo,
                billingCinNo: saleInvoices.billingCinNo,
                billingAddressId: saleInvoices.billingAddressId,
                shippingCustomerName: saleInvoices.shippingCustomerName,
                shippingAddress: saleInvoices.shippingAddress,
                shippingGst: saleInvoices.shippingGst,
                shippingPanNo: saleInvoices.shippingPanNo,
                shippingAddressId: saleInvoices.shippingAddressId,
                transporterId: saleInvoices.transporterId,
                transporterDetails: saleInvoices.transporterDetails,
                dispatchFromName: saleInvoices.dispatchFromName,
                dispatchFromAddress: saleInvoices.dispatchFromAddress,
                dispatchFromGst: saleInvoices.dispatchFromGst,
                dispatchVehicleNo: saleInvoices.dispatchVehicleNo,
                dispatchLrNo: saleInvoices.dispatchLrNo,
                dispatchToName: saleInvoices.dispatchToName,
                dispatchToAddress: saleInvoices.dispatchToAddress,
                dispatchToGst: saleInvoices.dispatchToGst,
                totalPreGst: saleInvoices.totalPreGst,
                totalGst: saleInvoices.totalGst,
                freight: saleInvoices.freight,
                otherCharges: saleInvoices.otherCharges,
                roundOff: saleInvoices.roundOff,
                grandTotal: saleInvoices.grandTotal,
                invoiceTaxableAmount: saleInvoices.invoiceTaxableAmount,
                invoiceIgst: saleInvoices.invoiceIgst,
                invoiceCgst: saleInvoices.invoiceCgst,
                invoiceSgst: saleInvoices.invoiceSgst,
                invoiceTotal: saleInvoices.invoiceTotal,
                invoiceDocPaths: saleInvoices.invoiceDocPaths,
                cnTaxable: saleInvoices.cnTaxable,
                cnIgst: saleInvoices.cnIgst,
                cnCgst: saleInvoices.cnCgst,
                cnSgst: saleInvoices.cnSgst,
                cnTotal: saleInvoices.cnTotal,
                creditNoteDocPaths: saleInvoices.creditNoteDocPaths,
                paymentAdviceDocPaths: saleInvoices.paymentAdviceDocPaths,
                paymentAdviceRequestedAt: saleInvoices.paymentAdviceRequestedAt,
                paymentAdviceReceivedAt: saleInvoices.paymentAdviceReceivedAt,
                buybackInvoiceDocPaths: saleInvoices.buybackInvoiceDocPaths,
                gstTds: saleInvoices.gstTds,
                itTds: saleInvoices.itTds,
                ldDeduction: saleInvoices.ldDeduction,
                otherDeduction: saleInvoices.otherDeduction,
                netReceived: saleInvoices.netReceived,
                holdGstIgst: saleInvoices.holdGstIgst,
                holdGstCgst: saleInvoices.holdGstCgst,
                holdGstSgst: saleInvoices.holdGstSgst,
                holdItc: saleInvoices.holdItc,
                holdRetention: saleInvoices.holdRetention,
                holdBuyback: saleInvoices.holdBuyback,
                holdOther: saleInvoices.holdOther,
                totalHoldAmount: saleInvoices.totalHoldAmount,
                holdReleasedAmount: saleInvoices.holdReleasedAmount,
                holdReleasedAt: saleInvoices.holdReleasedAt,
                status: saleInvoices.status,
                raisedBy: saleInvoices.raisedBy,
                raisedByName: users.name,
                team: saleInvoices.team,
                remarks: saleInvoices.remarks,
                approvedBy: saleInvoices.approvedBy,
                approvedAt: saleInvoices.approvedAt,
                changesRemark: saleInvoices.changesRemark,
                generatedPdfVersions: saleInvoices.generatedPdfVersions,
                actionLogs: saleInvoices.actionLogs,
                createdAt: saleInvoices.createdAt,
                updatedAt: saleInvoices.updatedAt,
            })
            .from(saleInvoices)
            .leftJoin(users, eq(saleInvoices.raisedBy, users.id))
            .where(eq(saleInvoices.id, id));
        if (!row) throw new NotFoundException("Sale invoice not found");

        const [approvedByNameRow] = row.approvedBy
            ? await this.db.select({ name: users.name }).from(users).where(eq(users.id, row.approvedBy))
            : [];

        const items = await this.db
            .select({
                id: saleInvoiceItems.id,
                saleInvoiceId: saleInvoiceItems.saleInvoiceId,
                purchaseOrderProductId: saleInvoiceItems.purchaseOrderProductId,
                lineItemSrNo: saleInvoiceItems.lineItemSrNo,
                unit: saleInvoiceItems.unit,
                hsnSac: saleInvoiceItems.hsnSac,
                srNo: saleInvoiceItems.srNo,
                itemDescription: saleInvoiceItems.itemDescription,
                quantity: saleInvoiceItems.quantity,
                rate: saleInvoiceItems.rate,
                amount: saleInvoiceItems.amount,
                gstRate: saleInvoiceItems.gstRate,
                gstAmount: saleInvoiceItems.gstAmount,
                totalAmount: saleInvoiceItems.totalAmount,
                createdAt: saleInvoiceItems.createdAt,
                updatedAt: saleInvoiceItems.updatedAt,
                poNumber: purchaseOrders.poNumber,
            })
            .from(saleInvoiceItems)
            .leftJoin(purchaseOrderProducts, eq(purchaseOrderProducts.id, saleInvoiceItems.purchaseOrderProductId))
            .leftJoin(purchaseOrders, eq(purchaseOrders.id, purchaseOrderProducts.purchaseOrderId))
            .where(eq(saleInvoiceItems.saleInvoiceId, id))
            .orderBy(saleInvoiceItems.srNo);

        return { ...row, approvedByName: approvedByNameRow?.name ?? null, items };
    }
}
