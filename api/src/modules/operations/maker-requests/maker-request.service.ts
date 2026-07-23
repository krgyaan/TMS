import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { and, eq, like, desc, sql } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { paymentRequests } from "@/db/schemas/operations/payment-requests.schema";
import { users } from "@/db/schemas/";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class MakerRequestService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async generateNumber(): Promise<string> {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const from = month >= 4 ? year.toString().slice(-2) : (year - 1).toString().slice(-2);
        const to = ((parseInt(from) + 1) % 100).toString().padStart(2, "0");
        const fy = `${from}${to}`;

        const last = await this.db
            .select({ id: paymentRequests.id, requestNo: paymentRequests.requestNo })
            .from(paymentRequests)
            .where(and(like(paymentRequests.requestNo, `MR/${fy}/%`), sql`${paymentRequests.projectId} IS NULL`))
            .orderBy(desc(paymentRequests.id));

        let next = 1;
        if (last[0]?.requestNo) {
            const match = last[0].requestNo.match(/(\d{4})$/);
            if (match) next = parseInt(match[1]) + 1;
        }

        return `MR/${fy}/${next.toString().padStart(4, "0")}`;
    }

    async create(body: any, userId: number) {
        const requestNo = await this.generateNumber();

        const mr = (
            await this.db
                .insert(paymentRequests)
                .values({
                    projectId: null,
                    requestNo,
                    partyName: body.partyName,
                    accountNumber: body.accountNumber,
                    bankName: body.bankName,
                    ifsc: body.ifsc,
                    amount: body.amount?.toString(),
                    paymentAgainst: body.category,
                    paymentMode: body.paymentMode || "BANK_TRANSFER",
                    portalLink: body.portalLink || null,
                    billFiles: body.billFiles || [],
                    remark: body.remark,
                    requestedBy: userId,
                })
                .returning()
        )[0];

        this.logger.info(`Maker Request created: ${requestNo}`);
        return mr;
    }

    async updateStatus(id: number, body: { status: string; utrNumber?: string; rejectionReason?: string }) {
        const existing = await this.db
            .select()
            .from(paymentRequests)
            .where(and(eq(paymentRequests.id, id), sql`${paymentRequests.projectId} IS NULL`))
            .then(rows => rows[0]);
        if (!existing) throw new NotFoundException("Maker Request not found");

        const validTransitions: Record<string, string[]> = {
            pending: ["maker_done", "rejected"],
            maker_done: ["payment_done", "rejected"],
        };

        if (!validTransitions[existing.status]?.includes(body.status)) {
            throw new BadRequestException(
                `Cannot transition from "${existing.status}" to "${body.status}"`
            );
        }

        const updated = (
            await this.db
                .update(paymentRequests)
                .set({
                    status: body.status,
                    utrNumber: body.utrNumber || null,
                    rejectionReason: body.rejectionReason || null,
                    updatedAt: new Date(),
                })
                .where(and(eq(paymentRequests.id, id), sql`${paymentRequests.projectId} IS NULL`))
                .returning()
        )[0];

        this.logger.info(`Maker Request #${id} status updated to "${body.status}"`);
        return updated;
    }

    private readonly mrFields = {
        id: paymentRequests.id,
        requestNo: paymentRequests.requestNo,
        partyName: paymentRequests.partyName,
        accountNumber: paymentRequests.accountNumber,
        bankName: paymentRequests.bankName,
        ifsc: paymentRequests.ifsc,
        amount: paymentRequests.amount,
        category: paymentRequests.paymentAgainst,
        paymentMode: paymentRequests.paymentMode,
        portalLink: paymentRequests.portalLink,
        billFiles: paymentRequests.billFiles,
        remark: paymentRequests.remark,
        status: paymentRequests.status,
        utrNumber: paymentRequests.utrNumber,
        rejectionReason: paymentRequests.rejectionReason,
        requestedBy: paymentRequests.requestedBy,
        createdAt: paymentRequests.createdAt,
        updatedAt: paymentRequests.updatedAt,
    };

    async getById(id: number) {
        const rows = await this.db
            .select({
                ...this.mrFields,
                requestedByName: users.name,
            })
            .from(paymentRequests)
            .leftJoin(users, eq(paymentRequests.requestedBy, users.id))
            .where(and(eq(paymentRequests.id, id), sql`${paymentRequests.projectId} IS NULL`));

        const mr = rows[0];
        if (!mr) throw new NotFoundException("Maker Request not found");
        return mr;
    }

    async getByUser(userId: number) {
        return this.db
            .select({
                ...this.mrFields,
                requestedByName: users.name,
            })
            .from(makerRequests)
            .leftJoin(users, eq(makerRequests.requestedBy, users.id))
            .where(eq(makerRequests.requestedBy, userId))
            .orderBy(desc(makerRequests.id));
    }

    async getAll() {
        return this.db
            .select({
                ...this.mrFields,
                requestedByName: users.name,
            })
            .from(paymentRequests)
            .leftJoin(users, eq(paymentRequests.requestedBy, users.id))
            .where(sql`${paymentRequests.projectId} IS NULL`)
            .orderBy(desc(paymentRequests.id));
    }
}
