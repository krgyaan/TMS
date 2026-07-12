import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, like, desc, sql, inArray } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { rename, readFile } from "node:fs/promises";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { PdfGeneratorService } from "@/modules/pdf/pdf-generator.service";
import { ClientDirectorySyncService } from "@/modules/shared/client-directory/client-directory-sync.service";

import { vendorWorkOrders } from "@/db/schemas/operations/vendor-work-orders.schema";
import { vendorWorkOrderItems } from "@/db/schemas/operations/vendor-work-order-items.schema";
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
                const taxableAmount = qty * rate;
                const gstAmount = (taxableAmount * gstRate) / 100;
                const totalAmount = taxableAmount + gstAmount;

                await this.db.insert(vendorWorkOrderItems).values({
                    vendorWorkOrderId: wo.id,
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
                    termsAndConditions: body.termsAndConditions
                        ? (typeof body.termsAndConditions === 'string' ? JSON.parse(body.termsAndConditions) : body.termsAndConditions)
                        : [],
                    scopeOfWork: body.scopeOfWork,
                    accessoriesPackagingListAttachments: body.accessoriesPackagingListAttachments,
                    remarks: body.remarks,
                    certRecipient: body.certRecipient,
                    certRecipients: body.certRecipients ?? [],
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
                const taxableAmount = qty * rate;
                const gstAmount = (taxableAmount * gstRate) / 100;
                const totalAmount = taxableAmount + gstAmount;

                await this.db.insert(vendorWorkOrderItems).values({
                    vendorWorkOrderId: id,
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

        const totals = items.reduce(
            (acc, item) => ({
                totalAmount: acc.totalAmount + Number(item.taxableAmount),
                totalGstAmt: acc.totalGstAmt + Number(item.gstAmount),
                grandTotal: acc.grandTotal + Number(item.totalAmount),
            }),
            { totalAmount: 0, totalGstAmt: 0, grandTotal: 0 }
        );

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
            woRaisedBy: raisedByUser?.name || "—",
        };
    }

    async getAll() {
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
                totalAmount: sql<number>`COALESCE((SELECT SUM(CAST(taxable_amount AS numeric)) FROM vendor_work_order_items WHERE vendor_work_order_id = ${vendorWorkOrders.id}), 0)`,
                totalGstAmt: sql<number>`COALESCE((SELECT SUM(CAST(gst_amount AS numeric)) FROM vendor_work_order_items WHERE vendor_work_order_id = ${vendorWorkOrders.id}), 0)`,
                grandTotal: sql<number>`COALESCE((SELECT SUM(CAST(total_amount AS numeric)) FROM vendor_work_order_items WHERE vendor_work_order_id = ${vendorWorkOrders.id}), 0)`,
                generatedPdfVersions: vendorWorkOrders.generatedPdfVersions,
            })
            .from(vendorWorkOrders)
            .leftJoin(users, eq(vendorWorkOrders.woRaisedBy, users.id))
            .orderBy(desc(vendorWorkOrders.id));

        return rows;
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

                const [raisedByUser] = wo.woRaisedBy
                    ? await this.db
                        .select({ name: users.name })
                        .from(users)
                        .where(eq(users.id, wo.woRaisedBy))
                    : [];

                return { ...wo, products: items, ...totals, woRaisedBy: raisedByUser?.name || "—" };
            })
        );

        return enriched;
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
                    email: body.email,
                    address: body.address,
                    gstNo: body.gstNo,
                    pan: body.pan,
                    msme: body.msme,
                    type: body.type || "seller",
                })
                .returning()
        )[0];
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
                hsnSac: p.hsnSac,
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

        // Determine signature image based on stored team
        const team = wo.team;
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
                const storageDir = 'payment-pdfs/vwo';

                const oldPath = join(process.cwd(), 'uploads', 'tendering', pdfPaths[0]);
                const newPath = join(process.cwd(), 'uploads', 'tendering', storageDir, newFileName);

                await rename(oldPath, newPath);

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
