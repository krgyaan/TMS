import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, like, desc, sql } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { purchaseInvoices } from "@/db/schemas/operations/purchase-invoices.schema";
import { tryMaterializePoInventory } from "@/modules/operations/inventory/inventory.materialize";
import { CashFlowService } from "@/modules/operations/cash-flows/cash-flow.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class PurchaseInvoiceService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly cashFlowService: CashFlowService,
    ) {}

    async generateNumber(projectName?: string, series = "PI") {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const from = month >= 4 ? year.toString().slice(-2) : (year - 1).toString().slice(-2);
        const to = ((parseInt(from) + 1) % 100).toString().padStart(2, "0");
        const fy = `${from}${to}`;

        const sanitizedName = projectName ? this.sanitizeProjectName(projectName) : "PROJECT";
        const prefix = `VE/${sanitizedName}/${fy}`;

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

    async create(body: any, userId: number) {
        const series = body.vendorWorkOrderId ? "WOI" : "PI";
        const invoiceNo = await this.generateNumber(body.projectName, series);
        const isPoInvoice = !!body.purchaseOrderId && !body.vendorWorkOrderId;

        const pi = await this.db.transaction(async tx => {
            const [row] = await tx
                .insert(purchaseInvoices)
                .values({
                    projectId: body.projectId,
                    invoiceNo,
                    category: body.category,
                    partyName: body.partyName,
                    valuePreGst: body.valuePreGst?.toString(),
                    gstAmount: body.gstAmount?.toString(),
                    invoiceDate: body.invoiceDate,
                    uploadedBy: userId,
                    invoiceFile: body.invoiceFile,
                    purchaseOrderId: body.purchaseOrderId || null,
                    vendorWorkOrderId: body.vendorWorkOrderId || null,
                })
                .returning();

            if (isPoInvoice) {
                await tryMaterializePoInventory(tx, Number(body.purchaseOrderId), userId);
            }

            return row;
        });

        this.logger.info(`Purchase Invoice created: ${invoiceNo}`);

        const valuePreGst = Number(body.valuePreGst ?? 0);
        const gstAmount = Number(body.gstAmount ?? 0);
        const totalAmount = valuePreGst + gstAmount;

        if (pi.projectId) {
            await this.cashFlowService.create({
                projectId: pi.projectId,
                eventType: 'invoice_uploaded',
                amount: totalAmount.toString(),
                direction: 'outflow',
                referenceType: 'purchase_invoice',
                referenceId: pi.id,
                referenceNo: invoiceNo,
                gstAmount: gstAmount.toString(),
                remark: `Purchase invoice uploaded: ${invoiceNo}`,
                createdBy: userId,
            }).catch((err) => this.logger.warn(`Cash flow creation failed for invoice #${pi.id}: ${err}`));

            if (gstAmount > 0) {
                await this.cashFlowService.create({
                    projectId: pi.projectId,
                    eventType: 'gst_booked',
                    amount: gstAmount.toString(),
                    direction: 'adjustment',
                    referenceType: 'purchase_invoice',
                    referenceId: pi.id,
                    referenceNo: invoiceNo,
                    gstAmount: gstAmount.toString(),
                    remark: `GST @ 18% booked on invoice ${invoiceNo}`,
                    createdBy: userId,
                }).catch((err) => this.logger.warn(`Cash flow creation failed for GST booked invoice #${pi.id}: ${err}`));
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

        const updated = (
            await this.db
                .update(purchaseInvoices)
                .set({
                    category: body.category,
                    partyName: body.partyName,
                    valuePreGst: body.valuePreGst?.toString(),
                    gstAmount: body.gstAmount?.toString(),
                    invoiceDate: body.invoiceDate,
                    invoiceFile: body.invoiceFile,
                    purchaseOrderId: body.purchaseOrderId || null,
                    vendorWorkOrderId: body.vendorWorkOrderId || null,
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
            .orderBy(desc(purchaseInvoices.id));
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
            .orderBy(desc(purchaseInvoices.id));
    }

    private sanitizeProjectName(name: string): string {
        return name
            .replace(/[^a-zA-Z0-9\s-]/g, '')
            .trim()
            .replace(/[\s-]+/g, '_');
    }
}
