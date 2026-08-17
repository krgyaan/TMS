import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { and, eq, desc, inArray, sql } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { rename } from "node:fs/promises";
import { join } from "node:path";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";

import { projects } from "@/db/schemas/operations/projects.schema";
import { users } from "@/db/schemas/auth/users.schema";
import { woBasicDetails, woDetails, woBillingBoq, woBuybackBoq, woBillingAddresses, woShippingAddresses } from "@/db/schemas/operations/work-order.schema";
import { saleInvoices, saleInvoiceItems } from "@/db/schemas/operations/sale-invoices.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { purchaseOrderProducts } from "@/db/schemas/operations/purchase-order-products.schema";
import { PdfGeneratorService } from "@/modules/pdf/pdf-generator.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

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
                sql`${saleInvoices.invoiceNumber} LIKE ${`SI/${sanitizedName}/${fyString}/%`}`
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

    async create(body: any, userId: number) {
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

        const linkedIds = (body.items || [])
            .filter((i: any) => i.purchaseOrderProductId)
            .map((i: any) => Number(i.purchaseOrderProductId));
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
                if (!item.purchaseOrderProductId) continue;
                const prod = poProductMap.get(Number(item.purchaseOrderProductId));
                if (!prod || prod.projectId !== projectId || prod.poApproved !== true) {
                    throw new BadRequestException(
                        `Item "${item.itemDescription || "unknown"}" is not linked to an approved PO of this project`,
                    );
                }
            }
        }

        let totalPreGst = 0;
        let totalGst = 0;
        let grandTotal = 0;

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
                    shippingCustomerName: body.shippingCustomerName,
                    shippingAddress: body.shippingAddress,
                    shippingGst: body.shippingGst || null,
                    dispatchFromName: body.dispatchFromName || null,
                    dispatchFromAddress: body.dispatchFromAddress || null,
                    dispatchFromGst: body.dispatchFromGst || null,
                    dispatchVehicleNo: body.dispatchVehicleNo || null,
                    dispatchLrNo: body.dispatchLrNo || null,
                    dispatchToName: body.dispatchToName || null,
                    dispatchToAddress: body.dispatchToAddress || null,
                    dispatchToGst: body.dispatchToGst || null,
                    status: "oe_request",
                    raisedBy: userId,
                    team: teamId,
                    remarks: body.remarks || null,
                })
                .returning()
        )[0];

        if (body.items && body.items.length > 0) {
            for (const item of body.items) {
                const qty = Number(item.qty);
                const rate = Number(item.rate);
                const gstRate = Number(item.gstRate);
                const amount = qty * rate;
                const gstAmount = (amount * gstRate) / 100;
                const totalAmount = amount + gstAmount;

                totalPreGst += amount;
                totalGst += gstAmount;
                grandTotal += totalAmount;

                const prod = item.purchaseOrderProductId ? poProductMap.get(Number(item.purchaseOrderProductId)) : null;

                await this.db.insert(saleInvoiceItems).values({
                    saleInvoiceId: si.id,
                    purchaseOrderProductId: item.purchaseOrderProductId ? Number(item.purchaseOrderProductId) : null,
                    unit: item.unit || prod?.unit || null,
                    hsnSac: item.hsnSac || prod?.hsnSac || null,
                    srNo: item.srNo || null,
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

        return this.getById(si.id);
    }

    async createDraft(id: number, userId: number) {
        const [si] = await this.db.select().from(saleInvoices).where(eq(saleInvoices.id, id));
        if (!si) throw new NotFoundException("Sale invoice not found");

        if (si.status !== "oe_request" && si.status !== "changes_requested") {
            throw new BadRequestException(`Cannot create draft from "${si.status}" status`);
        }

        const items = await this.db
            .select()
            .from(saleInvoiceItems)
            .where(eq(saleInvoiceItems.saleInvoiceId, id));

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

        this.generateSiPdf(updated, items).catch((err) => {
            this.logger.error(`Failed to generate SI draft PDF for #${id}: ${err instanceof Error ? err.message : String(err)}`);
        });

        this.logger.info(`Draft created for Sale Invoice #${id} by user ${userId}`);
        return this.getById(id);
    }

    async approve(id: number, userId: number) {
        const [si] = await this.db.select().from(saleInvoices).where(eq(saleInvoices.id, id));
        if (!si) throw new NotFoundException("Sale invoice not found");

        if (si.status !== "draft") {
            throw new BadRequestException(`Cannot approve invoice in "${si.status}" status. Only drafts can be approved.`);
        }

        const items = await this.db
            .select()
            .from(saleInvoiceItems)
            .where(eq(saleInvoiceItems.saleInvoiceId, id));

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

        this.generateSiPdf(updated, items).catch((err) => {
            this.logger.error(`Failed to generate SI final PDF for #${id}: ${err instanceof Error ? err.message : String(err)}`);
        });

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

        const linkedItems = items.filter((it) => it.purchaseOrderProductId != null);
        for (const item of linkedItems) {
            const [prod] = await this.db
                .select({ qty: purchaseOrderProducts.qty })
                .from(purchaseOrderProducts)
                .where(eq(purchaseOrderProducts.id, item.purchaseOrderProductId!));
            if (!prod) continue;

            const invoicedQty = await this.getInvoicedQtyForProduct(item.purchaseOrderProductId!);
            const remaining = Number(prod.qty) - invoicedQty;
            if (Number(item.quantity) > remaining) {
                throw new BadRequestException(
                    `Cannot finalize invoice: "${item.itemDescription}" quantity ${item.quantity} exceeds remaining PO quantity ${Math.max(0, remaining)}`
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

    private async getInvoicedQtyForProduct(productId: number): Promise<number> {
        const [row] = await this.db
            .select({
                qty: sql<string>`
                    COALESCE(SUM(
                        CASE
                            WHEN ${saleInvoices.status} IN ('invoiced', 'payment_received', 'completed') THEN ${saleInvoiceItems.quantity}::numeric
                            WHEN ${saleInvoices.status} = 'credit_note' THEN -${saleInvoiceItems.quantity}::numeric
                            ELSE 0
                        END
                    ), 0)`,
            })
            .from(saleInvoiceItems)
            .innerJoin(saleInvoices, eq(saleInvoices.id, saleInvoiceItems.saleInvoiceId))
            .where(eq(saleInvoiceItems.purchaseOrderProductId, productId));
        return Number(row?.qty || 0);
    }

    private computeSIHash(si: any, items: any[]): string {
        const fields = {
            invoiceNumber: si.invoiceNumber,
            invoiceDate: si.invoiceDate,
            billingCustomerName: si.billingCustomerName,
            billingAddress: si.billingAddress,
            billingGst: si.billingGst,
            shippingCustomerName: si.shippingCustomerName,
            shippingAddress: si.shippingAddress,
            shippingGst: si.shippingGst,
            dispatchFromName: si.dispatchFromName,
            dispatchFromAddress: si.dispatchFromAddress,
            dispatchFromGst: si.dispatchFromGst,
            dispatchVehicleNo: si.dispatchVehicleNo,
            dispatchLrNo: si.dispatchLrNo,
            dispatchToName: si.dispatchToName,
            dispatchToAddress: si.dispatchToAddress,
            dispatchToGst: si.dispatchToGst,
            remarks: si.remarks,
            items: (items || []).map((it: any) => ({
                srNo: it.srNo,
                itemDescription: it.itemDescription,
                quantity: it.quantity,
                rate: it.rate,
                gstRate: it.gstRate,
                unit: it.unit,
                hsnSac: it.hsnSac,
            })),
        };
        return createHash("sha256").update(JSON.stringify(fields)).digest("hex");
    }

    private async generateSiPdf(si: any, items: any[]) {
        const contentHash = this.computeSIHash(si, items);

        const versions = (si.generatedPdfVersions ?? {}) as Record<string, { path: string; hash: string }>;
        const existingVersion = Object.values(versions).find((v) => v.hash === contentHash);
        if (existingVersion) {
            this.logger.info(`SI ${si.id}: no changes detected, reusing existing PDF`);
            return;
        }

        const linkedProductIds = (items || [])
            .filter((it: any) => it.purchaseOrderProductId != null)
            .map((it: any) => Number(it.purchaseOrderProductId));

        let poNumbers: string[] = [];
        if (linkedProductIds.length > 0) {
            const poRows = await this.db
                .select({ poNumber: purchaseOrders.poNumber })
                .from(purchaseOrderProducts)
                .innerJoin(purchaseOrders, eq(purchaseOrders.id, purchaseOrderProducts.purchaseOrderId))
                .where(inArray(purchaseOrderProducts.id, linkedProductIds));
            poNumbers = [...new Set(poRows.map((r) => r.poNumber).filter((n): n is string => Boolean(n)))];
        }

        const [project] = await this.db
            .select({ projectName: projects.projectName })
            .from(projects)
            .where(eq(projects.id, si.projectId));

        const rows = (items || []).map((it: any, i: number) => {
            const qty = Number(it.quantity);
            const rate = Number(it.rate);
            const gstRate = Number(it.gstRate);
            const amount = qty * rate;
            const gstAmount = (amount * gstRate) / 100;
            const total = amount + gstAmount;
            return {
                sr_no: it.srNo ?? i + 1,
                description: it.itemDescription || "",
                unit: it.unit || "",
                quantity: qty,
                rate,
                amount,
                gst_rate: gstRate,
                gst_amount: gstAmount,
                total,
                hsn_sac: it.hsnSac || "",
            };
        });

        const totalAmount = rows.reduce((s: number, i: any) => s + i.amount, 0);
        const totalGstAmt = rows.reduce((s: number, i: any) => s + i.gst_amount, 0);
        const grandTotal = totalAmount + totalGstAmt;

        const data = {
            invoice_number: si.invoiceNumber || "",
            invoice_date: si.invoiceDate || "",
            project_name: project?.projectName || "",
            po_number: poNumbers.join(", "),
            billing_name: si.billingCustomerName || "",
            billing_address: si.billingAddress || "",
            billing_gst: si.billingGst || "",
            shipping_name: si.shippingCustomerName || "",
            shipping_address: si.shippingAddress || "",
            shipping_gst: si.shippingGst || "",
            dispatch_from_name: si.dispatchFromName || "",
            dispatch_from_address: si.dispatchFromAddress || "",
            dispatch_from_gst: si.dispatchFromGst || "",
            dispatch_vehicle_no: si.dispatchVehicleNo || "",
            dispatch_lr_no: si.dispatchLrNo || "",
            dispatch_to_name: si.dispatchToName || "",
            dispatch_to_address: si.dispatchToAddress || "",
            dispatch_to_gst: si.dispatchToGst || "",
            items: rows,
            total_amount: totalAmount,
            total_gst_amt: totalGstAmt,
            grand_total: grandTotal,
            grand_total_in_words: this.pdfGenerator.grandTotalInWords(grandTotal),
            is_draft: si.status !== "approved" && si.status !== "invoiced",
            revision: Object.keys(versions).length + 1,
            remarks: si.remarks || "",
        };

        try {
            const pdfPaths = await this.pdfGenerator.generatePdfs('si', data, si.id, 'SI');
            if (pdfPaths.length > 0) {
                const siSeq = si.invoiceNumber?.split('/').pop() || `SI${si.id}`;
                const rand = randomUUID().split('-')[0];
                const newFileName = `${siSeq}-${rand}.pdf`;
                const storageDir = 'operations/si';

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
                    .update(saleInvoices)
                    .set({ generatedPdfVersions: updatedVersions })
                    .where(eq(saleInvoices.id, si.id));
            }
        } catch (error) {
            this.logger.error(`PDF generation failed for SI ${si.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
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

        const sorted = Object.entries(versions).sort((a, b) =>
            this.parseLabelDate(b[0]).getTime() - this.parseLabelDate(a[0]).getTime()
        );
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

        delete versions[version];

        await this.db
            .update(saleInvoices)
            .set({ generatedPdfVersions: versions })
            .where(eq(saleInvoices.id, id));
    }

    private parseLabelDate(label: string): Date {
        const match = label.match(/^v-(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/);
        if (match) {
            const [, y, m, d, h, min, s] = match.map(Number);
            return new Date(y, m - 1, d, h, min, s);
        }
        return new Date(0);
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
                shippingCustomerName: saleInvoices.shippingCustomerName,
                shippingAddress: saleInvoices.shippingAddress,
                shippingGst: saleInvoices.shippingGst,
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
