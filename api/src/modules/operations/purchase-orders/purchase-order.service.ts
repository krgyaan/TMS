import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray, isNull, like, ne, sql } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { readFile, rename } from "node:fs/promises";
import { join } from "node:path";
import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import { PdfGeneratorService } from "@/modules/pdf/pdf-generator.service";
import { ClientDirectorySyncService } from "@/modules/shared/client-directory/client-directory-sync.service";
import { InsurancePolicyService } from "@/modules/insurance/insurance-policy.service";
import { users } from "@/db/schemas";
import { paymentRequests, purchaseInvoices, saleInvoiceItems, saleInvoices } from "@/db/schemas/operations";
import { projectParties } from "@/db/schemas/operations/project-parties.schema";
import { purchaseOrderProducts } from "@/db/schemas/operations/purchase-order-products.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { woBasicDetails } from "@/db/schemas/operations/work-order.schema";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class PurchaseOrderService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,

        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,

        private readonly pdfGenerator: PdfGeneratorService,
        private readonly clientDirectorySyncService: ClientDirectorySyncService,
        private readonly insuranceService: InsurancePolicyService,
    ) {}

    async getPurchaseOrders(projectId: number) {
        const purchaseOrdersData = await this.db
                .select({
                    id: purchaseOrders.id,
                    projectId: purchaseOrders.projectId,
                    poNumber: purchaseOrders.poNumber,
                    sellerName: purchaseOrders.sellerName,
                    sellerEmail: purchaseOrders.sellerEmail,
                    sellerAddress: purchaseOrders.sellerAddress,
                    sellerGstNo: purchaseOrders.sellerGstNo,
                    sellerPanNo: purchaseOrders.sellerPanNo,
                    sellerMsmeNo: purchaseOrders.sellerMsmeNo,
                    sellerCinNo: purchaseOrders.sellerCinNo,
                    shipToName: purchaseOrders.shipToName,
                    shippingAddress: purchaseOrders.shippingAddress,
                    shipToGst: purchaseOrders.shipToGst,
                    shipToPan: purchaseOrders.shipToPan,
                    poDate: purchaseOrders.poDate,
                    poRaisedBy: users.name,
                    createdAt: purchaseOrders.createdAt,
                    poPdfVersions: purchaseOrders.generatedPdfVersions,
                    tdsPercentage: purchaseOrders.tdsPercentage,
                    tdsAmount: purchaseOrders.tdsAmount,
                    amountAfterTds: purchaseOrders.amountAfterTds,
                    totalAmount: sql<number>`COALESCE((SELECT SUM(taxable_amount::numeric) FROM purchase_order_products WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                    totalGstAmt: sql<number>`COALESCE((SELECT SUM(gst_amount::numeric) FROM purchase_order_products WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                    grandTotal: sql<number>`COALESCE((SELECT SUM(total_amount::numeric) FROM purchase_order_products WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                    totalPaymentRequested: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE purchase_order_id = ${purchaseOrders.id} AND status != 'rejected'), 0)`,
                    totalMakerDone: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE purchase_order_id = ${purchaseOrders.id} AND status = 'maker_done'), 0)`,
                    totalPaymentDone: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE purchase_order_id = ${purchaseOrders.id} AND status = 'payment_done'), 0)`,
                    totalPiAmount: sql<number>`COALESCE((SELECT SUM(value_pre_gst::numeric + gst_amount::numeric) FROM project_purchase_invoices WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                    totalPiCount: sql<number>`COALESCE((SELECT COUNT(*) FROM project_purchase_invoices WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                    poApproved: purchaseOrders.poApproved,
                    poApprovalRemark: purchaseOrders.poApprovalRemark,
                })
                .from(purchaseOrders)
                .leftJoin(users, eq(users.id, purchaseOrders.poRaisedBy))
                .where(eq(purchaseOrders.projectId, projectId));

        return { purchaseOrders: purchaseOrdersData };
    }

    async getProjectInventory(projectId: number) {
        const items = await this.db
            .select({
                id: purchaseOrderProducts.id,
                poId: purchaseOrders.id,
                poNumber: purchaseOrders.poNumber,
                description: purchaseOrderProducts.description,
                hsnSac: purchaseOrderProducts.hsnSac,
                unit: purchaseOrderProducts.unit,
                qty: purchaseOrderProducts.qty,
                rate: purchaseOrderProducts.rate,
                gstRate: purchaseOrderProducts.gstRate,
                invoicedQty: sql<number>`
                    COALESCE((
                        SELECT SUM(sii.quantity::numeric) FROM sale_invoice_items sii
                        JOIN sale_invoices si ON si.id = sii.sale_invoice_id
                        WHERE sii.purchase_order_product_id = ${purchaseOrderProducts.id}
                          AND si.status IN ('oe_request', 'draft', 'changes_requested', 'approved', 'invoiced', 'payment_received', 'completed')
                    ), 0)
                    -
                    COALESCE((
                        SELECT SUM(sii.quantity::numeric) FROM sale_invoice_items sii
                        JOIN sale_invoices si ON si.id = sii.sale_invoice_id
                        WHERE sii.purchase_order_product_id = ${purchaseOrderProducts.id}
                          AND si.status = 'credit_note'
                    ), 0)`,
            })
            .from(purchaseOrderProducts)
            .innerJoin(purchaseOrders, eq(purchaseOrders.id, purchaseOrderProducts.purchaseOrderId))
            .where(and(
                eq(purchaseOrders.projectId, projectId),
                eq(purchaseOrders.poApproved, true),
            ))
            .orderBy(desc(purchaseOrders.createdAt), purchaseOrderProducts.id);

        const inventory = items.map((item) => {
            const qty = Number(item.qty);
            const invoicedQty = Number(item.invoicedQty || 0);
            const remainingQty = Math.min(qty, Math.max(0, qty - invoicedQty));
            return {
                ...item,
                qty,
                rate: Number(item.rate),
                gstRate: Number(item.gstRate),
                invoicedQty,
                remainingQty,
            };
        });

        return { items: inventory };
    }

    async getAllPurchaseOrders(status?: string, section?: string, user?: any) {
        const conditions: any[] = [];
        if (section === "operations" && user && user.dataScope !== "all") {
            if (user.teamId) {
                conditions.push(eq(purchaseOrders.team, user.teamId));
            }
        }

        const effectiveAmount = sql`COALESCE(${purchaseOrders.amountAfterTds}::numeric, (SELECT SUM(total_amount::numeric) FROM purchase_order_products WHERE purchase_order_id = ${purchaseOrders.id}))`;
        const paymentDoneTotal = sql`(SELECT COALESCE(SUM(amount::numeric), 0) FROM project_payment_requests WHERE purchase_order_id = ${purchaseOrders.id} AND status = 'payment_done')`;
        const piTotal = sql`(SELECT COALESCE(SUM(value_pre_gst::numeric + gst_amount::numeric), 0) FROM project_purchase_invoices WHERE purchase_order_id = ${purchaseOrders.id})`;

        if (status === "pending") {
            conditions.push(isNull(purchaseOrders.poApproved));
        } else if (status === "approved") {
            conditions.push(sql`${purchaseOrders.poApproved} = true AND ${paymentDoneTotal} < ${effectiveAmount}`);
        } else if (status === "rejected") {
            conditions.push(eq(purchaseOrders.poApproved, false));
        } else if (status === "new") {
            conditions.push(sql`${purchaseOrders.poApproved} IS NOT FALSE`);
        } else if (status === "closed") {
            conditions.push(sql`${purchaseOrders.poApproved} = true AND ${paymentDoneTotal} >= ${effectiveAmount} AND ${piTotal} >= ${effectiveAmount}`);
        } else if (status === "invoice-pending") {
            conditions.push(sql`${purchaseOrders.poApproved} = true AND ${paymentDoneTotal} >= ${effectiveAmount} AND ${piTotal} < ${effectiveAmount}`);
        }

        const purchaseOrdersData = await this.db
                .select({
                    id: purchaseOrders.id,
                    projectId: purchaseOrders.projectId,
                    poNumber: purchaseOrders.poNumber,
                    sellerName: purchaseOrders.sellerName,
                    sellerEmail: purchaseOrders.sellerEmail,
                    sellerAddress: purchaseOrders.sellerAddress,
                    sellerGstNo: purchaseOrders.sellerGstNo,
                    sellerPanNo: purchaseOrders.sellerPanNo,
                    sellerMsmeNo: purchaseOrders.sellerMsmeNo,
                    sellerCinNo: purchaseOrders.sellerCinNo,
                    shipToName: purchaseOrders.shipToName,
                    shippingAddress: purchaseOrders.shippingAddress,
                    shipToGst: purchaseOrders.shipToGst,
                    shipToPan: purchaseOrders.shipToPan,
                    poDate: purchaseOrders.poDate,
                    poRaisedBy: users.name,
                    createdAt: purchaseOrders.createdAt,
                    poPdfVersions: purchaseOrders.generatedPdfVersions,
                    tdsPercentage: purchaseOrders.tdsPercentage,
                    tdsAmount: purchaseOrders.tdsAmount,
                    amountAfterTds: purchaseOrders.amountAfterTds,
                    poApproved: purchaseOrders.poApproved,
                    poApprovalRemark: purchaseOrders.poApprovalRemark,
                    totalAmount: sql<number>`COALESCE((SELECT SUM(taxable_amount::numeric) FROM purchase_order_products WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                    totalGstAmt: sql<number>`COALESCE((SELECT SUM(gst_amount::numeric) FROM purchase_order_products WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                    grandTotal: sql<number>`COALESCE((SELECT SUM(total_amount::numeric) FROM purchase_order_products WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                    totalPaymentRequested: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE purchase_order_id = ${purchaseOrders.id} AND status != 'rejected'), 0)`,
                    totalMakerDone: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE purchase_order_id = ${purchaseOrders.id} AND status = 'maker_done'), 0)`,
                    totalPaymentDone: sql<number>`COALESCE((SELECT SUM(amount::numeric) FROM project_payment_requests WHERE purchase_order_id = ${purchaseOrders.id} AND status = 'payment_done'), 0)`,
                    totalPiAmount: sql<number>`COALESCE((SELECT SUM(value_pre_gst::numeric + gst_amount::numeric) FROM project_purchase_invoices WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                    totalPiCount: sql<number>`COALESCE((SELECT COUNT(*) FROM project_purchase_invoices WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                })
                .from(purchaseOrders)
                .leftJoin(users, eq(users.id, purchaseOrders.poRaisedBy))
                .where(conditions.length > 0 ? and(...conditions) : undefined)
                .orderBy(desc(purchaseOrders.createdAt));

        return { purchaseOrders: purchaseOrdersData };
    }

    async getApprovalCounts(section?: string, user?: any) {
        const teamCondition = section === "operations" && user && user.dataScope !== "all" && user.teamId
            ? eq(purchaseOrders.team, user.teamId)
            : undefined;

        const baseQuery = () => this.db
            .select({ id: purchaseOrders.id })
            .from(purchaseOrders)
            .leftJoin(users, eq(users.id, purchaseOrders.poRaisedBy));

        const buildCount = async (condition: any) => {
            const q = baseQuery().where(
                teamCondition ? and(teamCondition, condition) : condition
            );
            const rows = await q;
            return rows.length;
        };

        const effectiveAmount = sql`COALESCE(${purchaseOrders.amountAfterTds}::numeric, (SELECT SUM(total_amount::numeric) FROM purchase_order_products WHERE purchase_order_id = ${purchaseOrders.id}))`;
        const paymentDoneTotal = sql`(SELECT COALESCE(SUM(amount::numeric), 0) FROM project_payment_requests WHERE purchase_order_id = ${purchaseOrders.id} AND status = 'payment_done')`;
        const piTotal = sql`(SELECT COALESCE(SUM(value_pre_gst::numeric + gst_amount::numeric), 0) FROM project_purchase_invoices WHERE purchase_order_id = ${purchaseOrders.id})`;

        const [pending, approved, newCount, rejected, closedCount, invoicePendingCount] = await Promise.all([
            buildCount(isNull(purchaseOrders.poApproved)),
            buildCount(sql`${purchaseOrders.poApproved} = true AND ${paymentDoneTotal} < ${effectiveAmount}`),
            buildCount(sql`${purchaseOrders.poApproved} IS NOT FALSE`),
            buildCount(eq(purchaseOrders.poApproved, false)),
            buildCount(sql`${purchaseOrders.poApproved} = true AND ${paymentDoneTotal} >= ${effectiveAmount} AND ${piTotal} >= ${effectiveAmount}`),
            buildCount(sql`${purchaseOrders.poApproved} = true AND ${paymentDoneTotal} >= ${effectiveAmount} AND ${piTotal} < ${effectiveAmount}`),
        ]);

        return { pending, approved, rejected, new: newCount, closed: closedCount, invoicePending: invoicePendingCount };
    }

    private sanitizeProjectName(name: string): string {
        return name
            .replace(/[^a-zA-Z0-9\s-]/g, '')
            .trim()
            .replace(/[\s-]+/g, '_');
    }

    async generatePONumber(projectName?: string) {
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
                id: purchaseOrders.id,
                poNumber: purchaseOrders.poNumber
            })
            .from(purchaseOrders)
            .where(like(purchaseOrders.poNumber, `VE/%/${fy}/PO%`))
            .orderBy(desc(purchaseOrders.id));

        let next = 1;
        if (last[0]?.poNumber) {
            const match = last[0].poNumber.match(/PO(\d{4})$/);
            if (match) next = parseInt(match[1]) + 1;
        }

        return `${prefix}/PO${next.toString().padStart(4, "0")}`;
    }

    async createPurchaseOrder(body: any, userId: number) {
        if (body.projectId) {
            const hasWC = await this.insuranceService.hasActiveWCInsurance(body.projectId);
            if (!hasWC) {
                throw new BadRequestException(
                    "Cannot create Purchase Order: project does not have an active WC (Workers Compensation) insurance policy. Please add a WC policy first."
                );
            }
        }

        const poNumber = await this.generatePONumber(body.projectName);

        const [woBasic] = await this.db
            .select({ team: woBasicDetails.team })
            .from(woBasicDetails)
            .where(eq(woBasicDetails.tenderId, body.tenderId))
            .limit(1);
        this.logger.debug(`Work Order Basic Details: ${JSON.stringify(woBasic)}`);
        this.logger.info(`Creating Purchase Order: ${poNumber} for project: ${body.projectName}, tenderId: ${body.tenderId}, team: ${woBasic?.team}`);

        const po = (
            await this.db
            .insert(purchaseOrders)
            .values({
                tenderId: body.tenderId,
                poNumber,
                poDate: body.poDate,
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

                poType: body.poType || 'new',
                piAttachments: body.piAttachments,
                category: body.category,
                quotationNo: body.quotationNo,
                quotationDate: body.quotationDate,
                termsAndConditions: body.termsAndConditions ? (typeof body.termsAndConditions === 'string' ? JSON.parse(body.termsAndConditions) : body.termsAndConditions) : [],
                technicalSpecsAttachments: body.technicalSpecsAttachments,
                accessoriesPackagingListAttachments: body.accessoriesPackagingListAttachments,
                remarks: body.remarks,
                certRecipient: body.certRecipient,
                certRecipients: body.certRecipients ?? [],
                poRaisedBy: userId,
                team: woBasic?.team,
                projectId: body.projectId,
            })
            .returning()
        )[0];

        await this.syncPartyFromPO(body);

        if (body.products && body.products.length > 0) {
            for (const product of body.products) {
            const qty = Number(product.qty);
            const rate = Number(product.rate);
            const gstRate = Number(product.gstRate);
            const taxableAmount = qty * rate;
            const gstAmount = (taxableAmount * gstRate) / 100;
            const totalAmount = taxableAmount + gstAmount;

            await this.db.insert(purchaseOrderProducts).values({
                purchaseOrderId: po.id,
                description: product.description,
                qty: product.qty,
                unit: (product.unit || "").trim().toUpperCase() || "NOS",
                rate: product.rate.toString(),
                taxableAmount: taxableAmount.toString(),
                gstRate: product.gstRate.toString(),
                gstAmount: gstAmount.toString(),
                totalAmount: totalAmount.toString(),
            });
            }
        }

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

        this.logger.info(`Purchase Order created: ${poNumber}`);

        this.generatePdfForPO(po, body.products).catch((err) => {
            this.logger.error(`Failed to generate PO PDF: ${err.message}`);
        });

        return this.getPurchaseOrder(po.id);
    }

    private computePOHash(po: any, products: any[]): string {
        const fields = {
            poDate: po.poDate,
            poNumber: po.poNumber,
            projectName: po.projectName,
            sellerName: po.sellerName,
            sellerAddress: po.sellerAddress,
            sellerGstNo: po.sellerGstNo,
            sellerPanNo: po.sellerPanNo,
            sellerMsmeNo: po.sellerMsmeNo,
            sellerCinNo: po.sellerCinNo,
            shipToName: po.shipToName,
            shippingAddress: po.shippingAddress,
            shipToGst: po.shipToGst,
            shipToPan: po.shipToPan,
            contactPersonName: po.contactPersonName,
            contactPersonPhone: po.contactPersonPhone,
            contactPersonEmail: po.contactPersonEmail,
            quotationNo: po.quotationNo,
            quotationDate: po.quotationDate,
            termsAndConditions: po.termsAndConditions,
            team: po.team,
            certRecipient: po.certRecipient,
            certRecipients: po.certRecipients,
            remarks: po.remarks,
            products: (products || []).map((p: any) => ({
                description: p.description,
                qty: p.qty,
                unit: p.unit,
                rate: p.rate,
                gstRate: p.gstRate,
            })),
        };
        return createHash("sha256").update(JSON.stringify(fields)).digest("hex");
    }

    private async generatePdfForPO(po: any, products: any[]) {
        const contentHash = this.computePOHash(po, products);

        const versions = (po.generatedPdfVersions ?? {}) as Record<string, { path: string; hash: string }>;
        const existingVersion = Object.values(versions).find((v) => v.hash === contentHash);
        if (existingVersion) {
            this.logger.info(`PO ${po.id}: no changes detected, reusing existing PDF`);
            return;
        }

        const items = (products || []).map((p: any, i: number) => {
            const qty = Number(p.qty);
            const unit = (p.unit || "").trim().toUpperCase() || "NOS";
            const rate = Number(p.rate);
            const gstRate = Number(p.gstRate);
            const amount = qty * rate;
            const gstAmount = (amount * gstRate) / 100;
            const total = amount + gstAmount;
            return {
                description: p.description || "",
                quantity: qty,
                unit,
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

        const [creatorUser] = await this.db.select({ team: users.team }).from(users).where(eq(users.id, po.poRaisedBy)).limit(1);
        const team = creatorUser?.team;
        const isProd = process.env.NODE_ENV === 'production';
        const rootDir = isProd ? 'dist' : 'src';
        const assetsPath = join(process.cwd(), rootDir, 'modules', 'pdf', 'assets');
        const signFile = team === 1 ? 'arju-boi.png' : 'sign-po.jpg';
        const signBuffer = await readFile(join(assetsPath, signFile));
        const img_sign_po_base64 = signBuffer.toString('base64');
        this.logger.info(`PO ${po.id}: generating PDF with signature for team ${team}, signature file: ${join(assetsPath, signFile)}`);

        const data = {
            img_sign_po_base64,
            po_date: po.poDate || "",
            po_number: po.poNumber || "",
            project_name: po.projectName || "",
            oe_name: po.contactPersonName || "",
            oe_number: po.contactPersonPhone || "",
            oe_email: po.contactPersonEmail || "",
            seller_name: po.sellerName || "",
            seller_address: po.sellerAddress || "",
            seller_pan: po.sellerPanNo || "",
            seller_gst: po.sellerGstNo || "",
            seller_msme: po.sellerMsmeNo || "",
            shipping_to_name: po.shipToName || "",
            shipping_to_address: po.shippingAddress || "",
            shipping_to_pan: po.shipToPan || "",
            shipping_to_gst: po.shipToGst || "",
            items,
            total_amount: totalAmount,
            total_gst_amt: totalGstAmt,
            grand_total: grandTotal,
            grand_total_in_words: this.pdfGenerator.grandTotalInWords(grandTotal),
            terms_and_conditions: Array.isArray(po.termsAndConditions) ? po.termsAndConditions : [],
            test_certificate_email: await this.resolveCertRecipientEmails(po),
        };

        try {
            const pdfPaths = await this.pdfGenerator.generatePdfs('po', data, po.id, 'PO');
            if (pdfPaths.length > 0) {
                const poSeq = po.poNumber?.split('/').pop() || `PO${po.id}`;
                const rand = randomUUID().split('-')[0];
                const newFileName = `${poSeq}-${rand}.pdf`;
                const storageDir = 'operations/po';

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
                    .update(purchaseOrders)
                    .set({
                        generatedPdfVersions: updatedVersions,
                    })
                    .where(eq(purchaseOrders.id, po.id));
            }
        } catch (error) {
            this.logger.error(`PDF generation failed for PO ${po.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async setTdsPercentage(id: number, { approve, tdsPercentage, remark }: { approve: boolean; tdsPercentage?: number; remark?: string }) {
        const po = await this.db
            .select()
            .from(purchaseOrders)
            .where(eq(purchaseOrders.id, id))
            .then(rows => rows[0]);
        if (!po) throw new NotFoundException("Purchase Order not found");

        if (approve) {
            if (tdsPercentage == null || tdsPercentage < 0) {
                throw new BadRequestException("TDS percentage is required when approving");
            }

            const products = await this.db
                .select()
                .from(purchaseOrderProducts)
                .where(eq(purchaseOrderProducts.purchaseOrderId, id));

            const { total: subtotal, totalWithGst: grandTotal } = this.getTotalProductValues(products);
            const tdsAmt = (subtotal * tdsPercentage) / 100;
            const amountAfterTds = grandTotal - tdsAmt;

            const [updated] = await this.db
                .update(purchaseOrders)
                .set({
                    tdsPercentage: tdsPercentage.toString(),
                    tdsAmount: tdsAmt.toString(),
                    amountAfterTds: amountAfterTds.toString(),
                    poApproved: true,
                    poApprovalRemark: remark || null,
                    updatedAt: new Date(),
                })
                .where(eq(purchaseOrders.id, id))
                .returning();

            this.logger.info(`TDS approved for PO #${id}: ${tdsPercentage}%, TDS Amount: ${tdsAmt}, After TDS: ${amountAfterTds}`);
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

            this.logger.info(`TDS rejected for PO #${id}: ${remark || 'no remark'}`);
            return updated;
        }
    }

    async getPurchaseOrder(id: number) {
        this.logger.debug("PO details called");
        const po = (await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)))[0];
        if (!po) throw new NotFoundException("Purchase Order not found");
        const poProducts = await this.db.select().from(purchaseOrderProducts).where(eq(purchaseOrderProducts.purchaseOrderId, id));
        const total = this.getTotalProductValues(poProducts);

        const enrichedProducts = poProducts.map((product)=>{
            const itemTotal = Number(product.rate) * Number(product.qty);
            const itemTotalGst = itemTotal * Number(product.gstRate)/(100);
            const itemTotalWithGst = itemTotal + itemTotalGst;

            return {
                ...product,
                itemTotal,
                itemTotalGst,
                itemTotalWithGst,
            }
        })

        let raisedByName: string | null = null;
        if (po.poRaisedBy) {
            const [raisedByUser] = await this.db
                .select({ name: users.name })
                .from(users)
                .where(eq(users.id, po.poRaisedBy));
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
            .where(eq(paymentRequests.purchaseOrderId, id))
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
            .where(eq(purchaseInvoices.purchaseOrderId, id))
            .orderBy(desc(purchaseInvoices.createdAt));

        return {
            ...po,
            products: enrichedProducts,
            total,
            raisedByName,
            paymentRequests: paymentRequestsData,
            purchaseInvoices: purchaseInvoicesData,
        };
    }

    async getPurchaseOrderPdf(id: number, version?: string): Promise<{ path: string; filename: string }> {
        try {
            const po = (await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)))[0];
            if (!po) throw new NotFoundException("Purchase Order not found");

            const versions = (po.generatedPdfVersions ?? {}) as Record<string, { path: string; hash: string }>;

            if (version) {
                const entry = versions[version];
                if (!entry) throw new NotFoundException(`PDF version "${version}" not found`);
                return {
                    path: entry.path,
                    filename: `PO_${po.poNumber?.replace(/\//g, "_") || id}_${version}.pdf`,
                };
            }

            const sorted = Object.entries(versions).sort((a, b) =>
                this.parseLabelDate(b[0]).getTime() - this.parseLabelDate(a[0]).getTime()
            );
            if (sorted.length === 0) throw new NotFoundException("No PDF versions found for this Purchase Order");
            const [latestLabel, latestEntry] = sorted[0];
            return {
                path: latestEntry.path,
                filename: `PO_${po.poNumber?.replace(/\//g, "_") || id}_${latestLabel}.pdf`,
            };
        } catch (error) {
            this.logger.error(`Failed to get PO PDF: ${error instanceof Error ? error.message : String(error)}`);
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

    async getPurchaseOrderPdfVersions(id: number): Promise<Record<string, { path: string; hash: string }>> {
        const po = (await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)))[0];
        if (!po) throw new NotFoundException("Purchase Order not found");
        return (po.generatedPdfVersions ?? {}) as Record<string, { path: string; hash: string }>;
    }

    async deletePdfVersion(id: number, version: string): Promise<void> {
        try {
            const po = (await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)))[0];
            if (!po) throw new NotFoundException("Purchase Order not found");

            const versions = (po.generatedPdfVersions ?? {}) as Record<string, { path: string; hash: string }>;
            if (!versions[version]) throw new NotFoundException(`PDF version "${version}" not found`);

            delete versions[version];

            await this.db
                .update(purchaseOrders)
                .set({ generatedPdfVersions: versions })
                .where(eq(purchaseOrders.id, id));
        } catch (error) {
            this.logger.error(`Failed to delete PDF version: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    private getTotalProductValues(products: any[]) {

        let total = 0;
        let totalGst = 0;
        let totalWithGst = 0;

        for(let product of products){
            const prodTotal = product.qty * product.rate;
            const prodGstAmount = (prodTotal * product.gstRate) / 100;
            const prodTotalWithGst = prodTotal + prodGstAmount;

            total += prodTotal;
            totalGst += prodGstAmount;
            totalWithGst += prodTotalWithGst;
        }

        return { total, totalGst, totalWithGst };
    }

    async createParty(body: any) {
        const party = (
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

        if (party.name) {
            await this.clientDirectorySyncService.syncToClientDirectory([{
                name: party.name,
                email: party.email,
                phone: party.mobileNumber || null,
                org: null,
            }]);
        }

        this.logger.info(`Party created: ${party.name} (ID: ${party.id}, type: ${party.type})`);
        return party;
    }

    async updatePurchaseOrder(id: number, body: any, userId?: number) {
        const existingPO = (
            await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id))
        )[0];

        if (!existingPO) {
            throw new NotFoundException("Purchase Order not found");
        }

        // if (existingPO.poApproved === true) {
        //     throw new BadRequestException("Cannot edit an approved Purchase Order. Only rejected or pending POs can be updated.");
        // }

        const wasRejected = existingPO.poApproved === false;
        const [woBasic] = await this.db
            .select({ team: woBasicDetails.team })
            .from(woBasicDetails)
            .where(eq(woBasicDetails.tenderId, existingPO.tenderId))
            .limit(1);
        this.logger.info(`Updating Purchase Order: ${body.poNumber} for project: ${body.projectName}, tenderId: ${body.tenderId}, team: ${woBasic?.team}`);

        const updatedPO = (
            await this.db
                .update(purchaseOrders)
                .set({
                    poDate: body.poDate,

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

                    poType: body.poType || existingPO.poType || 'new',
                    piAttachments: body.piAttachments,
                    category: body.category,
                    quotationNo: body.quotationNo,
                    quotationDate: body.quotationDate,
                    termsAndConditions: body.termsAndConditions ? (typeof body.termsAndConditions === 'string' ? JSON.parse(body.termsAndConditions) : body.termsAndConditions) : [],
                    technicalSpecsAttachments: body.technicalSpecsAttachments,
                    accessoriesPackagingListAttachments: body.accessoriesPackagingListAttachments,
                    remarks: body.remarks,
                    certRecipient: body.certRecipient,
                    certRecipients: body.certRecipients ?? [],
                    poRaisedBy: userId ?? body.poRaisedBy,

                    team: woBasic?.team ?? existingPO.team,

                    ...(wasRejected && {
                        poApproved: null,
                        tdsPercentage: null,
                        tdsAmount: null,
                        amountAfterTds: null,
                        poApprovalRemark: null,
                    }),

                    updatedAt: new Date(),
                })
                .where(eq(purchaseOrders.id, id))
                .returning()
        )[0];

        await this.syncPartyFromPO(body);

        await this.db
            .delete(purchaseOrderProducts)
            .where(eq(purchaseOrderProducts.purchaseOrderId, id));

        if (body.products && body.products.length > 0) {
            for (const product of body.products) {
                const qty = Number(product.qty);
                const rate = Number(product.rate);
                const gstRate = Number(product.gstRate);
                const taxableAmount = qty * rate;
                const gstAmount = (taxableAmount * gstRate) / 100;
                const totalAmount = taxableAmount + gstAmount;

                await this.db.insert(purchaseOrderProducts).values({
                    purchaseOrderId: id,
                    description: product.description,
                    hsnSac: product.hsnSac,
                    qty: product.qty,
                    rate: product.rate.toString(),
                    taxableAmount: taxableAmount.toString(),
                    gstRate: product.gstRate.toString(),
                    gstAmount: gstAmount.toString(),
                    totalAmount: totalAmount.toString(),
                    unit: (product.unit || "").trim().toUpperCase() || "NOS",
                });
            }
        }

        this.generatePdfForPO(updatedPO, body.products).catch((err) => {
            this.logger.error(`Failed to generate PO PDF after update: ${err.message}`);
        });

        await this.clientDirectorySyncService.syncToClientDirectory([{
            name: body.contactPersonName,
            email: body.contactPersonEmail,
            phone: body.contactPersonPhone,
            org: body.sellerName,
        }].filter((c) => c.name));

        this.logger.info(`Purchase Order updated: ${updatedPO.poNumber}`);
        return updatedPO;
    }

    private async syncPartyFromPO(body: any) {
        if (body.sellerId) {
            await this.db
                .update(projectParties)
                .set({
                    name: body.sellerName,
                    email: body.sellerEmail || null,
                    address: body.sellerAddress || null,
                    gstNo: body.sellerGstNo || null,
                    pan: body.sellerPanNo || null,
                    msme: body.sellerMsmeNo || null,
                })
                .where(eq(projectParties.id, body.sellerId));
        }
        if (body.shipToPartyId) {
            await this.db
                .update(projectParties)
                .set({
                    name: body.shipToName,
                    email: null,
                    address: body.shippingAddress || null,
                    gstNo: body.shipToGst || null,
                    pan: body.shipToPan || null,
                })
                .where(eq(projectParties.id, body.shipToPartyId));
        }
    }

    private async resolveCertRecipientEmails(po: any): Promise<string> {
        const ids: number[] = Array.isArray(po.certRecipients) && po.certRecipients.length > 0
            ? po.certRecipients
            : po.certRecipient ? [po.certRecipient] : [];
        if (ids.length === 0) return "";
        const users_data = await this.db
            .select({ email: users.email })
            .from(users)
            .where(inArray(users.id, ids));
        return users_data.map(u => u.email).filter(Boolean).join(", ");
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
                eq(paymentRequests.purchaseOrderId, id),
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
            .where(eq(purchaseInvoices.purchaseOrderId, id))
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

    async getPurchaseOrderClosure(id: number) {
        const po = (await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)))[0];
        if (!po) throw new NotFoundException("Purchase Order not found");

        const poProducts = await this.db
            .select({ rate: purchaseOrderProducts.rate, qty: purchaseOrderProducts.qty, gstRate: purchaseOrderProducts.gstRate })
            .from(purchaseOrderProducts)
            .where(eq(purchaseOrderProducts.purchaseOrderId, id));

        const { total: grandTotal, totalGst } = this.getTotalProductValues(poProducts);

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
            .where(eq(paymentRequests.purchaseOrderId, id))
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
            .where(eq(purchaseInvoices.purchaseOrderId, id))
            .orderBy(desc(purchaseInvoices.createdAt));

        const totalPaymentDone = paymentRequestsData
            .filter((pr) => pr.status === "payment_done")
            .reduce((sum, pr) => sum + Number(pr.amount || 0), 0);

        const totalPiAmount = purchaseInvoicesData.reduce(
            (sum, inv) => sum + Number(inv.valuePreGst || 0) + Number(inv.gstAmount || 0),
            0,
        );

        return {
            id: po.id,
            projectId: po.projectId,
            poNumber: po.poNumber,
            sellerName: po.sellerName,
            projectName: po.projectName,
            poDate: po.poDate,
            poApproved: po.poApproved,
            amountAfterTds: po.amountAfterTds,
            grandTotal,
            totalGst,
            totalPaymentDone,
            totalPiAmount,
            paymentRequests: paymentRequestsData,
            purchaseInvoices: purchaseInvoicesData,
        };
    }

    async bulkCreatePaymentRequests(id: number, items: any[], userId: number) {
        const po = (await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)))[0];
        if (!po) throw new NotFoundException("Purchase Order not found");

        const created: any[] = [];
        for (const item of items) {
            const requestNo = await this.generatePaymentRequestNumber(po.projectName ?? undefined);
            const pr = (
                await this.db
                    .insert(paymentRequests)
                    .values({
                        projectId: po.projectId,
                        purchaseOrderId: id,
                        requestNo,
                        partyName: item.accountName ?? po.sellerName ?? null,
                        accountNumber: item.accountNumber,
                        ifsc: item.ifsc,
                        amount: item.amount?.toString(),
                        paymentAgainst: "po",
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

        this.logger.info(`Bulk created ${created.length} payment requests against PO #${id}`);
        return created;
    }

    async bulkCreatePurchaseInvoices(id: number, items: any[], userId: number) {
        const po = (await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)))[0];
        if (!po) throw new NotFoundException("Purchase Order not found");

        const created: any[] = [];
        for (const item of items) {
            const invoiceNo = await this.generatePurchaseInvoiceNumber(po.projectName ?? undefined);
            const pi = (
                await this.db
                    .insert(purchaseInvoices)
                    .values({
                        projectId: po.projectId,
                        purchaseOrderId: id,
                        invoiceNo,
                        category: item.category,
                        partyName: item.partyName ?? po.sellerName ?? null,
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

        this.logger.info(`Bulk created ${created.length} purchase invoices for PO #${id}`);
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
        const series = "PI";

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
        let query = this.db.select().from(projectParties);
        if (type) {
            query = query.where(eq(projectParties.type, type)) as any;
        }
        const res = await query.orderBy(desc(projectParties.createdAt));
        return res;
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

        if (rows[0].name) {
            await this.clientDirectorySyncService.syncToClientDirectory([{
                name: rows[0].name,
                email: rows[0].email,
                phone: rows[0].mobileNumber || null,
                org: null,
            }]);
        }

        return rows[0];
    }
}
