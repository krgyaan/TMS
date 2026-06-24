import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, like, desc } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { paymentRequests } from "@/db/schemas/operations/payment-requests.schema";
import { beneficiaries } from "@/db/schemas/operations/beneficiaries.schema";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class PaymentRequestService {
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
            .select({ id: paymentRequests.id, requestNo: paymentRequests.requestNo })
            .from(paymentRequests)
            .where(like(paymentRequests.requestNo, `VE/%/${fy}/PR%`))
            .orderBy(desc(paymentRequests.id));

        let next = 1;
        if (last[0]?.requestNo) {
            const match = last[0].requestNo.match(/PR(\d{4})$/);
            if (match) next = parseInt(match[1]) + 1;
        }

        return `${prefix}/PR${next.toString().padStart(4, "0")}`;
    }

    async create(body: any, userId: number) {
        const requestNo = await this.generateNumber(body.projectName);

        const pr = (
            await this.db
                .insert(paymentRequests)
                .values({
                    projectId: body.projectId,
                    requestNo,
                    partyName: body.partyName,
                    accountNumber: body.accountNumber,
                    bankName: body.bankName,
                    ifsc: body.ifsc,
                    amount: body.amount?.toString(),
                    paymentAgainst: body.paymentAgainst,
                    purchaseInvoiceId: body.purchaseInvoiceId,
                    purchaseOrderId: body.purchaseOrderId,
                    uploadedInvoiceFile: body.uploadedInvoiceFile,
                    poFile: body.poFile,
                    remark: body.remark,
                    requestedBy: userId,
                })
                .returning()
        )[0];

        this.logger.info(`Payment Request created: ${requestNo}`);
        return pr;
    }

    async update(id: number, body: any) {
        const existing = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.id, id))
            .then(rows => rows[0]);
        if (!existing) throw new NotFoundException("Payment Request not found");

        const updated = (
            await this.db
                .update(paymentRequests)
                .set({
                    partyName: body.partyName,
                    accountNumber: body.accountNumber,
                    bankName: body.bankName,
                    ifsc: body.ifsc,
                    amount: body.amount?.toString(),
                    paymentAgainst: body.paymentAgainst,
                    purchaseInvoiceId: body.purchaseInvoiceId,
                    purchaseOrderId: body.purchaseOrderId,
                    uploadedInvoiceFile: body.uploadedInvoiceFile,
                    poFile: body.poFile,
                    remark: body.remark,
                    updatedAt: new Date(),
                })
                .where(eq(paymentRequests.id, id))
                .returning()
        )[0];

        return updated;
    }

    async getById(id: number) {
        const pr = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.id, id))
            .then(rows => rows[0]);
        if (!pr) throw new NotFoundException("Payment Request not found");
        return pr;
    }

    async getAll() {
        return this.db
            .select()
            .from(paymentRequests)
            .orderBy(desc(paymentRequests.id));
    }

    async getByProject(projectId: number) {
        return this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.projectId, projectId))
            .orderBy(desc(paymentRequests.id));
    }

    // ── Beneficiary CRUD ──

    async createBeneficiary(body: any) {
        const ben = (
            await this.db
                .insert(beneficiaries)
                .values({
                    name: body.name,
                    accountNumber: body.accountNumber,
                    ifsc: body.ifsc,
                    bankName: body.bankName,
                })
                .returning()
        )[0];
        return ben;
    }

    async listBeneficiaries() {
        return this.db
            .select()
            .from(beneficiaries)
            .orderBy(desc(beneficiaries.createdAt));
    }

    async getBeneficiary(id: number) {
        const ben = await this.db
            .select()
            .from(beneficiaries)
            .where(eq(beneficiaries.id, id))
            .then(rows => rows[0]);
        if (!ben) throw new NotFoundException("Beneficiary not found");
        return ben;
    }

    async updateBeneficiary(id: number, body: any) {
        const existing = await this.db
            .select()
            .from(beneficiaries)
            .where(eq(beneficiaries.id, id))
            .then(rows => rows[0]);
        if (!existing) throw new NotFoundException("Beneficiary not found");

        const updated = (
            await this.db
                .update(beneficiaries)
                .set({
                    name: body.name,
                    accountNumber: body.accountNumber,
                    ifsc: body.ifsc,
                    bankName: body.bankName,
                    updatedAt: new Date(),
                })
                .where(eq(beneficiaries.id, id))
                .returning()
        )[0];
        return updated;
    }

    private sanitizeProjectName(name: string): string {
        return name
            .replace(/[^a-zA-Z0-9\s-]/g, '')
            .trim()
            .replace(/[\s-]+/g, '_');
    }
}
