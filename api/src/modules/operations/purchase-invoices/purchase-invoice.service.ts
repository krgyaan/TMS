import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, like, desc } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { purchaseInvoices } from "@/db/schemas/operations/purchase-invoices.schema";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class PurchaseInvoiceService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async generateNumber(projectName?: string) {
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
            .where(like(purchaseInvoices.invoiceNo, `VE/%/${fy}/PI%`))
            .orderBy(desc(purchaseInvoices.id));

        let next = 1;
        if (last[0]?.invoiceNo) {
            const match = last[0].invoiceNo.match(/PI(\d{4})$/);
            if (match) next = parseInt(match[1]) + 1;
        }

        return `${prefix}/PI${next.toString().padStart(4, "0")}`;
    }

    async create(body: any, userId: number) {
        const invoiceNo = await this.generateNumber(body.projectName);

        const pi = (
            await this.db
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
                })
                .returning()
        )[0];

        this.logger.info(`Purchase Invoice created: ${invoiceNo}`);
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
            .select()
            .from(purchaseInvoices)
            .orderBy(desc(purchaseInvoices.id));
    }

    async getByProject(projectId: number) {
        return this.db
            .select()
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
