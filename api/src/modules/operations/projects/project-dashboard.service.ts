import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, like, desc, sql } from "drizzle-orm";
import { createHash } from "node:crypto";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { PdfGeneratorService } from "@/modules/pdf/pdf-generator.service";

import { projects } from "@/db/schemas/operations/projects.schema";
import { tenderInfos } from "@/db/schemas/tendering/tenders.schema";
import { woBasicDetails, woDetails } from "@/db/schemas/operations/work-order.schema";
import { employeeImprests } from "@/db/schemas/shared/employee-imprest.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { purchaseOrderProducts } from "@/db/schemas/operations/purchase-order-products.schema";
import { projectParties } from "@/db/schemas/operations/project-parties.schema";

import { imprestCategories, users, tenderInformation } from "@/db/schemas";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class ProjectDashboardService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,

        private readonly pdfGenerator: PdfGeneratorService,
    ) {}

    async getOverview(projectId: number) {
        const [project] = await this.db
            .select({
                projectName: projects.projectName,
                tenderId: projects.tenderId,
            })
            .from(projects)
            .where(eq(projects.id, projectId));
        if (!project) throw new NotFoundException("Project not found");

        const [tender] = project.tenderId
            ? await this.db
                .select({ id: tenderInfos.id, tenderNumber: tenderInfos.tenderNo })
                .from(tenderInfos)
                .where(eq(tenderInfos.id, project.tenderId))
            : [];

        const [basicDetail] = tender
            ? await this.db
                .select({
                    id: woBasicDetails.id,
                    woValuePreGst: woBasicDetails.woValuePreGst,
                    woValueGstAmt: woBasicDetails.woValueGstAmt,
                    budget: woBasicDetails.budgetPreGst,
                    budgetSupply: woBasicDetails.budgetSupply,
                    budgetService: woBasicDetails.budgetService,
                    budgetFreight: woBasicDetails.budgetFreight,
                    budgetAdmin: woBasicDetails.budgetAdmin,
                    budgetBuybackSale: woBasicDetails.budgetBuybackSale,
                    budgetGemCharges: woBasicDetails.budgetGemCharges,
                })
                .from(woBasicDetails)
                .where(eq(woBasicDetails.tenderId, tender.id))
            : [];

        const [woDetail] = basicDetail
            ? await this.db
                .select({
                    ldApplicable: woDetails.ldApplicable,
                    maxLd: woDetails.maxLd,
                    ldStartDate: woDetails.ldStartDate,
                    maxLdDate: woDetails.maxLdDate,
                })
                .from(woDetails)
                .where(eq(woDetails.woBasicDetailId, basicDetail.id))
            : [];

        const [tenderInfo] = tender
            ? await this.db
                .select({
                    ldRequired: tenderInformation.ldRequired,
                    ldPercentagePerWeek: tenderInformation.ldPercentagePerWeek,
                    maxLdPercentage: tenderInformation.maxLdPercentage,
                })
                .from(tenderInformation)
                .where(eq(tenderInformation.tenderId, tender.id))
            : [];

        return {
            project: { projectName: project.projectName },
            tender: tender ?? undefined,
            woBasicDetail: basicDetail ?? {},
            woDetail: woDetail ?? undefined,
            tenderInfoSheet: tenderInfo ?? undefined,
        };
    }

    async getWorkOrders(projectId: number) {
        const workOrders = await this.db
                .select({
                    id: purchaseOrders.id,
                    poNumber: purchaseOrders.poNumber,
                    createdAt: purchaseOrders.createdAt,
                    sellerName: purchaseOrders.sellerName,
                })
                .from(purchaseOrders)
                .where(eq(purchaseOrders.projectId, projectId));

        return { woBasicDetail: workOrders };
    }

    async getPurchaseOrders(projectId: number) {
        const purchaseOrdersData = await this.db
                .select({
                    id: purchaseOrders.id,
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
                    poPdf: purchaseOrders.generatedPdf,
                    poPdfVersions: purchaseOrders.generatedPdfVersions,
                    totalAmount: sql<number>`COALESCE((SELECT SUM(taxable_amount::numeric) FROM purchase_order_products WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                    totalGstAmt: sql<number>`COALESCE((SELECT SUM(gst_amount::numeric) FROM purchase_order_products WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                    grandTotal: sql<number>`COALESCE((SELECT SUM(total_amount::numeric) FROM purchase_order_products WHERE purchase_order_id = ${purchaseOrders.id}), 0)`,
                })
                .from(purchaseOrders)
                .innerJoin(users, eq(users.id, purchaseOrders.poRaisedBy))
                .where(eq(purchaseOrders.projectId, projectId));

        return { purchaseOrders: purchaseOrdersData };
    }

    async getImprests(projectId: number) {
        const [project] = await this.db
            .select({ projectName: projects.projectName })
            .from(projects)
            .where(eq(projects.id, projectId));
        if (!project) throw new NotFoundException("Project not found");

        const imprests = project.projectName
            ? await this.db.select({
                userName: users.name,
                partyName: employeeImprests.partyName,
                amount: employeeImprests.amount,
                category: imprestCategories.name,
                remark: employeeImprests.remark,
                approvalStatus: employeeImprests.approvalStatus,
                approvalDate: employeeImprests.approvedDate,
                proof: employeeImprests.invoiceProof,
            })
            .from(employeeImprests)
            .innerJoin(users, eq(users.id, employeeImprests.userId))
            .innerJoin(imprestCategories, eq(imprestCategories.id, employeeImprests.categoryId))
            .where(eq(employeeImprests.projectName, project.projectName))
            : [];
        const imprestSum = imprests.reduce((sum: number, item) => {
            return sum + Number(item.amount ?? 0);
        }, 0);
        return { imprests, imprestSum };
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
    const poNumber = await this.generatePONumber(body.projectName);

    // Insert the purchase order
    const po = (
        await this.db
        .insert(purchaseOrders)
        .values({
            tenderId: body.tenderId,
            poNumber,
            poDate: body.poDate,
            projectName: body.projectName,
            
            // Seller Info
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
            
            // Ship To Info
            shipToName: body.shipToName,
            shippingAddress: body.shippingAddress,
            shipToGst: body.shipToGst,
            shipToPan: body.shipToPan,
            
            // Optional fields
            quotationNo: body.quotationNo,
            quotationDate: body.quotationDate,
            termsAndConditions: body.termsAndConditions ? (typeof body.termsAndConditions === 'string' ? JSON.parse(body.termsAndConditions) : body.termsAndConditions) : [],
            technicalSpecsAttachments: body.technicalSpecsAttachments,
            accessoriesPackagingListAttachments: body.accessoriesPackagingListAttachments,
            remarks: body.remarks,
            certRecipient: body.certRecipient,
            poRaisedBy: userId,
            projectId: body.projectId,
        })
        .returning()
    )[0];

    // Insert products
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
            hsnSac: product.hsnSac,
            qty: product.qty,
            rate: product.rate.toString(),
            taxableAmount: taxableAmount.toString(),
            gstRate: product.gstRate.toString(),
            gstAmount: gstAmount.toString(),
            totalAmount: totalAmount.toString(),
        });
        }
    }

        this.logger.info(`Purchase Order created: ${poNumber}`);

        // Generate PDF asynchronously (don't block response)
        this.generatePdfForPO(po, body.products).catch((err) => {
            this.logger.error(`Failed to generate PO PDF: ${err.message}`);
        });

        // Return enriched PO data
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
            certRecipient: po.certRecipient,
            remarks: po.remarks,
            products: (products || []).map((p: any) => ({
                description: p.description,
                hsnSac: p.hsnSac,
                qty: p.qty,
                rate: p.rate,
                gstRate: p.gstRate,
            })),
        };
        return createHash("sha256").update(JSON.stringify(fields)).digest("hex");
    }

    private async generatePdfForPO(po: any, products: any[]) {
        const contentHash = this.computePOHash(po, products);

        // Check if we already have a version with the same hash (no changes)
        const versions = (po.generatedPdfVersions ?? {}) as Record<string, { path: string; hash: string }>;
        const existingVersion = Object.values(versions).find((v) => v.hash === contentHash);
        if (existingVersion) {
            this.logger.info(`PO ${po.id}: no changes detected, reusing existing PDF`);
            if (po.generatedPdf !== existingVersion.path) {
                await this.db
                    .update(purchaseOrders)
                    .set({ generatedPdf: existingVersion.path })
                    .where(eq(purchaseOrders.id, po.id));
            }
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
                hsn: p.hsnSac || "",
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

        const data = {
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
            test_certificate_email: po.certRecipient
                ? ((await this.db.select().from(users).where(eq(users.id, po.certRecipient)))[0]?.email ?? "")
                : "",
        };

        try {
            const pdfPaths = await this.pdfGenerator.generatePdfs('po', data, po.id, 'PO');
            if (pdfPaths.length > 0) {
                const now = new Date();
                const label = `v-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;

                const updatedVersions = { ...versions, [label]: { path: pdfPaths[0], hash: contentHash } };

                await this.db
                    .update(purchaseOrders)
                    .set({
                        generatedPdf: pdfPaths[0],
                        generatedPdfVersions: updatedVersions,
                    })
                    .where(eq(purchaseOrders.id, po.id));
            }
        } catch (error) {
            this.logger.error(`PDF generation failed for PO ${po.id}: ${error instanceof Error ? error.message : String(error)}`);
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

        return { ...po, products: enrichedProducts, total };
    }

    async getPurchaseOrderPdf(id: number, version?: string): Promise<{ path: string; filename: string }> {
        const po = (await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)))[0];
        if (!po) throw new NotFoundException("Purchase Order not found");

        if (version) {
            const versions = (po.generatedPdfVersions ?? {}) as Record<string, { path: string; hash: string }>;
            const entry = versions[version];
            if (!entry) throw new NotFoundException(`PDF version "${version}" not found`);
            return {
                path: entry.path,
                filename: `PO_${po.poNumber?.replace(/\//g, "_") || id}_${version}.pdf`,
            };
        }

        if (!po.generatedPdf) throw new NotFoundException("PDF not yet generated for this Purchase Order");
        return {
            path: po.generatedPdf,
            filename: `PO_${po.poNumber?.replace(/\//g, "_") || id}.pdf`,
        };
    }

    async getPurchaseOrderPdfVersions(id: number): Promise<Record<string, { path: string; hash: string }>> {
        const po = (await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)))[0];
        if (!po) throw new NotFoundException("Purchase Order not found");
        return (po.generatedPdfVersions ?? {}) as Record<string, { path: string; hash: string }>;
    }

    async deletePdfVersion(id: number, version: string): Promise<void> {
        const po = (await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)))[0];
        if (!po) throw new NotFoundException("Purchase Order not found");

        const versions = (po.generatedPdfVersions ?? {}) as Record<string, { path: string; hash: string }>;
        if (!versions[version]) throw new NotFoundException(`PDF version "${version}" not found`);

        delete versions[version];

        // If we deleted the latest, point generatedPdf to another version or null
        let latestPdf: string | null = null;
        const remaining = Object.values(versions);
        if (remaining.length > 0) {
            latestPdf = remaining[remaining.length - 1].path;
        }

        await this.db
            .update(purchaseOrders)
            .set({
                generatedPdf: latestPdf,
                generatedPdfVersions: versions,
            })
            .where(eq(purchaseOrders.id, id));
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
                email: body.email || null,
                address: body.address || null,
                gstNo: body.gstNo || null,
                pan: body.pan || null,
                msme: body.msme || null,
                type: body.type || "seller",
            })
            .returning()
        )[0];

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
                    
                    // Optional fields
                    quotationNo: body.quotationNo,
                    quotationDate: body.quotationDate,
                    termsAndConditions: body.termsAndConditions ? (typeof body.termsAndConditions === 'string' ? JSON.parse(body.termsAndConditions) : body.termsAndConditions) : [],
                    technicalSpecsAttachments: body.technicalSpecsAttachments,
                    accessoriesPackagingListAttachments: body.accessoriesPackagingListAttachments,
                    remarks: body.remarks,
                    certRecipient: body.certRecipient,
                    poRaisedBy: userId ?? body.poRaisedBy,
                    
                    updatedAt: new Date(),
                })
                .where(eq(purchaseOrders.id, id))
                .returning()
        )[0];

        // Delete existing products and insert new ones
        await this.db
            .delete(purchaseOrderProducts)
            .where(eq(purchaseOrderProducts.purchaseOrderId, id));

        // Insert updated products
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
                });
            }
        }

        // Generate PDF asynchronously (don't block response)
        this.generatePdfForPO(updatedPO, body.products).catch((err) => {
            this.logger.error(`Failed to generate PO PDF after update: ${err.message}`);
        });

        this.logger.info(`Purchase Order updated: ${updatedPO.poNumber}`);
        return updatedPO;
    }

    async listParties(type?: string) {
        let query = this.db.select().from(projectParties);
        if (type) {
            query = query.where(eq(projectParties.type, type)) as any;
        }
        const res = await query.orderBy(desc(projectParties.createdAt));
        return res;
    }
}
