import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { purchaseInvoices } from "@/db/schemas/operations/purchase-invoices.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { vendorWorkOrders } from "@/db/schemas/operations/vendor-work-orders.schema";
import { purchaseOrderProducts } from "@/db/schemas/operations/purchase-order-products.schema";
import { vendorWorkOrderItems } from "@/db/schemas/operations/vendor-work-order-items.schema";
import { orderExtraCharges } from "@/db/schemas/operations/order-extra-charges.schema";
import { gst2bReco } from "@/db/schemas/operations/gst2b-reco.schema";
import { tryMaterializePoInventory } from "@/modules/operations/inventory/inventory.materialize";
import { CashFlowService } from "@/modules/operations/cash-flows/cash-flow.service";
import { PurchaseOrderService } from "@/modules/operations/purchase-orders/purchase-order.service";
import { VendorWorkOrderService } from "@/modules/operations/vendor-work-orders/vendor-work-order.service";
import { round2 } from "@/utils/money.util";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class PurchaseInvoiceService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly cashFlowService: CashFlowService,
        private readonly purchaseOrderService: PurchaseOrderService,
        private readonly vendorWorkOrderService: VendorWorkOrderService
    ) {}

    async create(body: any, userId: number) {
        const invoiceNo = (body.invoiceNo ?? "").toString().trim();
        if (!invoiceNo) {
            throw new BadRequestException("Invoice number is required");
        }

        const projectId = Number(body.projectId);
        const isPoInvoice = !!body.purchaseOrderId && !body.vendorWorkOrderId;
        const isVwoInvoice = !!body.vendorWorkOrderId && !body.purchaseOrderId;
        if (!isPoInvoice && !isVwoInvoice) {
            throw new BadRequestException("Purchase invoice must be linked to exactly one Purchase Order or Vendor Work Order");
        }

        const duplicate = await this.db
            .select({ id: purchaseInvoices.id })
            .from(purchaseInvoices)
            .where(and(eq(purchaseInvoices.projectId, projectId), eq(purchaseInvoices.invoiceNo, invoiceNo)))
            .limit(1)
            .then(rows => rows[0]);
        if (duplicate) {
            throw new BadRequestException(`Invoice number "${invoiceNo}" already exists for this project`);
        }

        const pi = await this.db.transaction(async tx => {
            let partyName = (body.partyName ?? "").toString().trim();
            let category = (body.category ?? "").toString().trim();

            let itemsTaxable = 0;
            let itemsGst = 0;
            let itemsGrand = 0;

            if (isPoInvoice) {
                const poId = Number(body.purchaseOrderId);
                const po = await tx
                    .select()
                    .from(purchaseOrders)
                    .where(eq(purchaseOrders.id, poId))
                    .then(rows => rows[0]);
                if (!po) throw new NotFoundException("Purchase Order not found");

                if (!partyName) partyName = po.sellerName ?? "";
                if (!category) category = po.category ?? "";

                if (Array.isArray(body.items)) {
                    await tx.delete(purchaseOrderProducts).where(eq(purchaseOrderProducts.purchaseOrderId, poId));
                    for (const product of body.items) {
                        const qty = Number(product.qty);
                        const rate = Number(product.rate);
                        const gstRate = Number(product.gstRate ?? 0);
                        const taxableAmount = qty * rate;
                        const gstAmount = (taxableAmount * gstRate) / 100;
                        const totalAmount = taxableAmount + gstAmount;
                        await tx.insert(purchaseOrderProducts).values({
                            purchaseOrderId: poId,
                            description: product.description,
                            hsnSac: product.hsnSac,
                            qty: product.qty,
                            rate: product.rate.toString(),
                            taxableAmount: taxableAmount.toString(),
                            gstRate: gstRate.toString(),
                            gstAmount: gstAmount.toString(),
                            totalAmount: totalAmount.toString(),
                            unit: (product.unit || "").trim().toUpperCase() || "NOS",
                        });
                    }
                }

                if (Array.isArray(body.extraCharges)) {
                    await tx.delete(orderExtraCharges).where(eq(orderExtraCharges.purchaseOrderId, poId));
                    await this.insertExtraCharges(tx, { projectId, purchaseOrderId: poId }, body.extraCharges);
                }

                const items = await tx.select().from(purchaseOrderProducts).where(eq(purchaseOrderProducts.purchaseOrderId, poId));
                itemsTaxable = items.reduce((s, it) => s + Number(it.taxableAmount ?? 0), 0);
                itemsGst = items.reduce((s, it) => s + Number(it.gstAmount ?? 0), 0);
                itemsGrand = items.reduce((s, it) => s + Number(it.totalAmount ?? 0), 0);

                if (po.tdsPercentage != null) {
                    const charges = await tx.select().from(orderExtraCharges).where(eq(orderExtraCharges.purchaseOrderId, poId));
                    const chargesGrand = charges.reduce((s, c) => s + Number(c.totalAmount ?? 0), 0);
                    // TDS base stays the (possibly altered) item subtotal; extra
                    // charges land on top of it when computing amountAfterTds.
                    const tdsAmt = (itemsTaxable * Number(po.tdsPercentage)) / 100;
                    const amountAfterTds = itemsGrand + chargesGrand - tdsAmt;
                    await tx
                        .update(purchaseOrders)
                        .set({
                            tdsAmount: round2(tdsAmt).toFixed(2),
                            amountAfterTds: round2(amountAfterTds).toFixed(2),
                            updatedAt: new Date(),
                        })
                        .where(eq(purchaseOrders.id, poId));
                }
            } else {
                const woId = Number(body.vendorWorkOrderId);
                const wo = await tx
                    .select()
                    .from(vendorWorkOrders)
                    .where(eq(vendorWorkOrders.id, woId))
                    .then(rows => rows[0]);
                if (!wo) throw new NotFoundException("Vendor Work Order not found");

                if (!partyName) partyName = wo.sellerName ?? "";
                if (!category) category = wo.category ?? "";

                if (Array.isArray(body.items)) {
                    await tx.delete(vendorWorkOrderItems).where(eq(vendorWorkOrderItems.vendorWorkOrderId, woId));
                    for (const item of body.items) {
                        const qty = Number(item.qty);
                        const rate = Number(item.rate);
                        const gstRate = Number(item.gstRate ?? 0);
                        const taxableAmount = qty * rate;
                        const gstAmount = (taxableAmount * gstRate) / 100;
                        const totalAmount = taxableAmount + gstAmount;
                        await tx.insert(vendorWorkOrderItems).values({
                            vendorWorkOrderId: woId,
                            description: item.description,
                            hsnSac: item.hsnSac,
                            qty: item.qty,
                            rate: item.rate.toString(),
                            taxableAmount: taxableAmount.toString(),
                            gstRate: gstRate.toString(),
                            gstAmount: gstAmount.toString(),
                            totalAmount: totalAmount.toString(),
                        });
                    }
                }

                if (Array.isArray(body.extraCharges)) {
                    await tx.delete(orderExtraCharges).where(eq(orderExtraCharges.vendorWorkOrderId, woId));
                    await this.insertExtraCharges(tx, { projectId, vendorWorkOrderId: woId }, body.extraCharges);
                }

                const items = await tx.select().from(vendorWorkOrderItems).where(eq(vendorWorkOrderItems.vendorWorkOrderId, woId));
                itemsTaxable = items.reduce((s, it) => s + Number(it.taxableAmount ?? 0), 0);
                itemsGst = items.reduce((s, it) => s + Number(it.gstAmount ?? 0), 0);
                itemsGrand = items.reduce((s, it) => s + Number(it.totalAmount ?? 0), 0);

                if (wo.tdsPercentage != null) {
                    const charges = await tx.select().from(orderExtraCharges).where(eq(orderExtraCharges.vendorWorkOrderId, woId));
                    const chargesGrand = charges.reduce((s, c) => s + Number(c.totalAmount ?? 0), 0);
                    const tdsAmt = (itemsTaxable * Number(wo.tdsPercentage)) / 100;
                    const amountAfterTds = itemsGrand + chargesGrand - tdsAmt;
                    await tx
                        .update(vendorWorkOrders)
                        .set({
                            tdsAmount: round2(tdsAmt).toFixed(2),
                            amountAfterTds: round2(amountAfterTds).toFixed(2),
                            updatedAt: new Date(),
                        })
                        .where(eq(vendorWorkOrders.id, woId));
                }
            }

            const charges = await this.dbExtraCharges(tx, isPoInvoice, isPoInvoice ? Number(body.purchaseOrderId) : Number(body.vendorWorkOrderId));
            const chargesTaxable = charges.reduce((s, c) => s + Number(c.taxableAmount ?? 0), 0);
            const chargesGst = charges.reduce((s, c) => s + Number(c.gstAmount ?? 0), 0);

            const defaultValuePreGst = itemsTaxable + chargesTaxable;
            const defaultGstAmount = itemsGst + chargesGst;
            const valuePreGst = body.valuePreGst != null ? Number(body.valuePreGst) : defaultValuePreGst;
            const gstAmount = body.gstAmount != null ? Number(body.gstAmount) : defaultGstAmount;

            const [row] = await tx
                .insert(purchaseInvoices)
                .values({
                    projectId,
                    invoiceNo,
                    category: category || null,
                    partyName: partyName || null,
                    valuePreGst: round2(valuePreGst).toFixed(2),
                    gstAmount: round2(gstAmount).toFixed(2),
                    invoiceDate: body.invoiceDate,
                    uploadedBy: userId,
                    invoiceFile: body.invoiceFile,
                    purchaseOrderId: isPoInvoice ? Number(body.purchaseOrderId) : null,
                    vendorWorkOrderId: isVwoInvoice ? Number(body.vendorWorkOrderId) : null,
                })
                .returning();

            if (isPoInvoice) {
                await tryMaterializePoInventory(tx, Number(body.purchaseOrderId), userId);
            }

            // Create GST 2B reconciliation record for the invoice (PO or VWO)
            if (gstAmount > 0) {
                const existingGst2b = await tx
                    .select()
                    .from(gst2bReco)
                    .where(eq(gst2bReco.invoiceId, row.id))
                    .limit(1)
                    .then(rows => rows[0]);

                if (!existingGst2b) {
                    await tx
                        .insert(gst2bReco)
                        .values({
                            projectId: row.projectId,
                            poId: isPoInvoice ? Number(body.purchaseOrderId) : null,
                            vwoId: isVwoInvoice ? Number(body.vendorWorkOrderId) : null,
                            invoiceId: row.id,
                            invoiceDate: body.invoiceDate,
                            invoiceUploadedAt: new Date(),
gstAmount: gstAmount.toFixed(2),
                        })
                        .catch(err => this.logger.warn(`GST 2B reconciliation creation failed for invoice #${row.id}: ${err}`));
                }
            }

            return row;
        });

        this.logger.info(`Purchase Invoice created: ${invoiceNo}`);

        const changed = Array.isArray(body.items) || Array.isArray(body.extraCharges);
        if (changed) {
            if (isPoInvoice) {
                this.purchaseOrderService.regeneratePdf(Number(body.purchaseOrderId)).catch(err => {
                    this.logger.warn(`PO PDF regeneration failed after invoice #${pi.id}: ${err}`);
                });
            } else {
                this.vendorWorkOrderService.regeneratePdf(Number(body.vendorWorkOrderId)).catch(err => {
                    this.logger.warn(`VWO PDF regeneration failed after invoice #${pi.id}: ${err}`);
                });
            }
        }

        const valuePreGst = Number(pi.valuePreGst ?? 0);
        const gstAmount = Number(pi.gstAmount ?? 0);
        const totalAmount = valuePreGst + gstAmount;

        if (pi.projectId) {
            await this.cashFlowService
                .create({
                    projectId: pi.projectId,
                    eventType: "invoice_uploaded",
                    amount: totalAmount.toString(),
                    direction: "outflow",
                    referenceType: "purchase_invoice",
                    referenceId: pi.id,
                    referenceNo: invoiceNo,
                    gstAmount: gstAmount.toString(),
                    remark: `Purchase invoice uploaded: ${invoiceNo}`,
                    createdBy: userId,
                })
                .catch(err => this.logger.warn(`Cash flow creation failed for invoice #${pi.id}: ${err}`));

            if (gstAmount > 0) {
                await this.cashFlowService
                    .create({
                        projectId: pi.projectId,
                        eventType: "gst_booked",
                        amount: gstAmount.toString(),
                        direction: "adjustment",
                        referenceType: "purchase_invoice",
                        referenceId: pi.id,
                        referenceNo: invoiceNo,
                        gstAmount: gstAmount.toString(),
                        remark: `GST @ 18% booked on invoice ${invoiceNo}`,
                        createdBy: userId,
                    })
                    .catch(err => this.logger.warn(`Cash flow creation failed for GST booked invoice #${pi.id}: ${err}`));
            }
        }

        return pi;
    }

    async update(id: number, body: any) {
        const existing = await this.db
            .select()
            .from(purchaseInvoices)
            .where(eq(purchaseInvoices.id, id))
            .then(rows => rows[0]);
        if (!existing) throw new NotFoundException("Purchase Invoice not found");

        const invoiceNo = body.invoiceNo != null ? (body.invoiceNo ?? "").toString().trim() : (existing.invoiceNo ?? "");
        if (!invoiceNo) {
            throw new BadRequestException("Invoice number is required");
        }

        const duplicate = await this.db
            .select({ id: purchaseInvoices.id })
            .from(purchaseInvoices)
            .where(and(eq(purchaseInvoices.projectId, existing.projectId), eq(purchaseInvoices.invoiceNo, invoiceNo)))
            .limit(1)
            .then(rows => rows[0]);
        if (duplicate && duplicate.id !== id) {
            throw new BadRequestException(`Invoice number "${invoiceNo}" already exists for this project`);
        }

        const purchaseOrderId = body.purchaseOrderId ?? existing.purchaseOrderId ?? null;
        const vendorWorkOrderId = body.vendorWorkOrderId ?? existing.vendorWorkOrderId ?? null;

        const updated = (
            await this.db
                .update(purchaseInvoices)
                .set({
                    invoiceNo,
                    category: body.category ?? existing.category ?? null,
                    partyName: body.partyName ?? existing.partyName ?? null,
                    valuePreGst: body.valuePreGst != null ? body.valuePreGst.toString() : existing.valuePreGst,
                    gstAmount: body.gstAmount != null ? body.gstAmount.toString() : existing.gstAmount,
                    invoiceDate: body.invoiceDate ?? existing.invoiceDate,
                    invoiceFile: body.invoiceFile ?? existing.invoiceFile,
                    purchaseOrderId,
                    vendorWorkOrderId,
                    updatedAt: new Date(),
                })
                .where(eq(purchaseInvoices.id, id))
                .returning()
        )[0];

        return updated;
    }

    async getById(id: number) {
        const pi = await this.db
            .select()
            .from(purchaseInvoices)
            .where(eq(purchaseInvoices.id, id))
            .then(rows => rows[0]);
        if (!pi) throw new NotFoundException("Purchase Invoice not found");
        return pi;
    }

    async getAll() {
        return this.db
            .select({
                id: purchaseInvoices.id,
                projectId: purchaseInvoices.projectId,
                invoiceNo: purchaseInvoices.invoiceNo,
                category: purchaseInvoices.category,
                partyName: purchaseInvoices.partyName,
                valuePreGst: purchaseInvoices.valuePreGst,
                gstAmount: purchaseInvoices.gstAmount,
                invoiceDate: purchaseInvoices.invoiceDate,
                uploadedBy: purchaseInvoices.uploadedBy,
                invoiceFile: purchaseInvoices.invoiceFile,
                purchaseOrderId: purchaseInvoices.purchaseOrderId,
                poNumber: sql<string>`COALESCE((SELECT po_number FROM purchase_orders WHERE id = ${purchaseInvoices.purchaseOrderId}), '')`,
                vendorWorkOrderId: purchaseInvoices.vendorWorkOrderId,
                woNumber: sql<string>`COALESCE((SELECT wo_number FROM vendor_work_orders WHERE id = ${purchaseInvoices.vendorWorkOrderId}), '')`,
                createdAt: purchaseInvoices.createdAt,
                updatedAt: purchaseInvoices.updatedAt,
            })
            .from(purchaseInvoices)
            .orderBy(sql`${purchaseInvoices.id} DESC`);
    }

    async getByProject(projectId: number) {
        return this.db
            .select({
                id: purchaseInvoices.id,
                projectId: purchaseInvoices.projectId,
                invoiceNo: purchaseInvoices.invoiceNo,
                category: purchaseInvoices.category,
                partyName: purchaseInvoices.partyName,
                valuePreGst: purchaseInvoices.valuePreGst,
                gstAmount: purchaseInvoices.gstAmount,
                invoiceDate: purchaseInvoices.invoiceDate,
                uploadedBy: purchaseInvoices.uploadedBy,
                invoiceFile: purchaseInvoices.invoiceFile,
                purchaseOrderId: purchaseInvoices.purchaseOrderId,
                poNumber: sql<string>`COALESCE((SELECT po_number FROM purchase_orders WHERE id = ${purchaseInvoices.purchaseOrderId}), '')`,
                vendorWorkOrderId: purchaseInvoices.vendorWorkOrderId,
                woNumber: sql<string>`COALESCE((SELECT wo_number FROM vendor_work_orders WHERE id = ${purchaseInvoices.vendorWorkOrderId}), '')`,
                createdAt: purchaseInvoices.createdAt,
                updatedAt: purchaseInvoices.updatedAt,
            })
            .from(purchaseInvoices)
            .where(eq(purchaseInvoices.projectId, projectId))
            .orderBy(sql`${purchaseInvoices.id} DESC`);
    }

    private async dbExtraCharges(tx: DbInstance, isPo: boolean, docId: number) {
        if (isPo) {
            return tx.select().from(orderExtraCharges).where(eq(orderExtraCharges.purchaseOrderId, docId));
        }
        return tx.select().from(orderExtraCharges).where(eq(orderExtraCharges.vendorWorkOrderId, docId));
    }

    private async insertExtraCharges(tx: DbInstance, ref: { projectId: number; purchaseOrderId?: number; vendorWorkOrderId?: number }, charges: any[]) {
        for (const c of charges) {
            const taxableAmount = Number(c.amount ?? 0);
            const gstRate = Number(c.gstRate ?? 0);
            const gstAmount = (taxableAmount * gstRate) / 100;
            await tx.insert(orderExtraCharges).values({
                projectId: ref.projectId,
                purchaseOrderId: ref.purchaseOrderId ?? null,
                vendorWorkOrderId: ref.vendorWorkOrderId ?? null,
                label: (c.label ?? "").toString().trim() || "Extra Charge",
                gstRate: gstRate.toString(),
                taxableAmount: taxableAmount.toString(),
                gstAmount: round2(gstAmount).toFixed(2),
                totalAmount: round2(taxableAmount + gstAmount).toFixed(2),
            });
        }
    }
}
