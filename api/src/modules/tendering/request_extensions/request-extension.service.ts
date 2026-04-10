import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc, asc, sql, and, or, ilike, SQL } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { CreateRequestExtensionDto, UpdateRequestExtensionDto } from './dto/request-extension.dto';
import { requestExtension, type Client } from '@/db/schemas/tendering/request-extension.schema';
import { tenderInfos, userProfiles, users, companies } from '@/db/schemas';
import { EmailService } from '../../email/email.service';
import { RecipientResolver } from '../../email/recipient.resolver';

export type RequestExtensionFilters = {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export type RequestExtensionResponse = {
    id: number;
    tenderId: number;
    tenderName: string;
    tenderNo: string;
    tenderDue: string;
    days: number;
    reason: string;
    clients: string | Client[];
    createdAt: Date;
    updatedAt: Date;
};

@Injectable()
export class RequestExtensionsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
    ) { }

    private mapCreateToDb(data: CreateRequestExtensionDto) {
        const now = new Date();
        return {
            tenderId: data.tenderId,
            days: data.days,
            reason: data.reason,
            clients: data.clients,
            createdAt: now,
            updatedAt: now,
        };
    }

    private mapUpdateToDb(data: UpdateRequestExtensionDto) {
        const out: Record<string, unknown> = { updatedAt: new Date() };

        if (data.tenderId !== undefined) out.tenderId = data.tenderId;
        if (data.days !== undefined) out.days = data.days;
        if (data.reason !== undefined) out.reason = data.reason;
        if (data.clients !== undefined) out.clients = data.clients;

        return out as Partial<typeof requestExtension.$inferInsert>;
    }

    private mapRowToResponse(row: any): RequestExtensionResponse {
        return {
            id: row.id,
            tenderId: row.tenderId,
            tenderName: row.tenderName,
            tenderNo: row.tenderNo,
            tenderDue: row.tenderDue,
            days: row.days,
            reason: row.reason,
            clients: row.clients,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    async findAll(filters?: RequestExtensionFilters) {
        const page = filters?.page ?? 1;
        const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
        const offset = (page - 1) * limit;
        const sortOrder = filters?.sortOrder ?? 'desc';
        const search = filters?.search?.trim();

        const orderFn = sortOrder === 'desc' ? desc : asc;

        const conditions: (SQL<any> | undefined)[] = [];
        if (search) {
            conditions.push(
                or(
                    ilike(requestExtension.reason, `%${search}%`),
                    ilike(requestExtension.clients, `%${search}%`),
                ),
            );
        }
        const whereClause = conditions.length > 0 ? and(...conditions.filter(Boolean)) : undefined;

        // Build the base query with JOIN — needed for both count and data
        const baseQuery = this.db
            .select({ count: sql<number>`count(*)::int` })
            .from(requestExtension)
            .innerJoin(tenderInfos, eq(requestExtension.tenderId, tenderInfos.id));

        const [countResult, rows] = await Promise.all([
            baseQuery
                .where(whereClause)
                .then(([r]) => Number(r?.count ?? 0)),
            this.db
                .select({
                    id: requestExtension.id,
                    tenderId: requestExtension.tenderId,
                    tenderName: tenderInfos.tenderName,
                    tenderNo: tenderInfos.tenderNo,
                    tenderDue: tenderInfos.dueDate,
                    days: requestExtension.days,
                    reason: requestExtension.reason,
                    clients: requestExtension.clients,
                    createdAt: requestExtension.createdAt,
                    updatedAt: requestExtension.updatedAt,
                })
                .from(requestExtension)
                .innerJoin(tenderInfos, eq(requestExtension.tenderId, tenderInfos.id))
                .where(whereClause)
                .orderBy(orderFn(requestExtension.createdAt))
                .limit(limit)
                .offset(offset),
        ]);

        const total = countResult;
        const data = rows.map((r) => this.mapRowToResponse(r));

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }

    async findById(id: number) {
        const [row] = await this.db.select({
            id: requestExtension.id,
            tenderId: requestExtension.tenderId,
            tenderName: tenderInfos.tenderName,
            tenderNo: tenderInfos.tenderNo,
            tenderDue: tenderInfos.dueDate,
            days: requestExtension.days,
            reason: requestExtension.reason,
            clients: requestExtension.clients,
            createdAt: requestExtension.createdAt,
            updatedAt: requestExtension.updatedAt,
        })
            .from(requestExtension)
            .innerJoin(tenderInfos, eq(requestExtension.tenderId, tenderInfos.id))
            .where(eq(requestExtension.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Request Extension with ID ${id} not found`);
        }

        return this.mapRowToResponse(row);
    }

    async create(data: CreateRequestExtensionDto) {
        const insertValues = this.mapCreateToDb(data);
        const [inserted] = await this.db
            .insert(requestExtension)
            .values(insertValues as never)
            .returning({ id: requestExtension.id });

        const result = await this.findById(inserted.id);

        // Fetch tender to get teamMember
        const [tender] = await this.db
            .select({ teamMember: tenderInfos.teamMember })
            .from(tenderInfos)
            .where(eq(tenderInfos.id, result.tenderId))
            .limit(1);

        if (tender && tender.teamMember) {
            await this.sendMail(inserted.id, tender.teamMember);
        }

        return result;
    }

    async update(id: number, data: UpdateRequestExtensionDto) {
        const updateValues = this.mapUpdateToDb(data);
        await this.db
            .update(requestExtension)
            .set(updateValues)
            .where(eq(requestExtension.id, id));

        const result = await this.findById(id);

        // Fetch tender to get teamMember
        const [tender] = await this.db
            .select({ teamMember: tenderInfos.teamMember })
            .from(tenderInfos)
            .where(eq(tenderInfos.id, result.tenderId))
            .limit(1);

        if (tender && tender.teamMember) {
            await this.sendMail(id, tender.teamMember);
        }

        return result;
    }

    async delete(id: number): Promise<void> {
        const [row] = await this.db
            .delete(requestExtension)
            .where(eq(requestExtension.id, id))
            .returning();

        if (!row) {
            throw new NotFoundException(`Request Extension with ID ${id} not found`);
        }
    }

    async sendMail(id: number, fromUserId: number) {
        const ext = await this.findById(id);
        const tender = await this.db
            .select()
            .from(tenderInfos)
            .where(eq(tenderInfos.id, ext.tenderId))
            .limit(1)
            .then(rows => rows[0]);

        if (!tender) throw new NotFoundException('Tender not found');

        // Resolve internal recipients
        const [admin, tl, coord] = await Promise.all([
            this.recipientResolver.getTeamAdmin(tender.team),
            this.recipientResolver.getTeamLeader(tender.team),
            this.recipientResolver.getTeamCoordinator(tender.team),
        ]);

        const cc = [admin, tl, coord].filter(Boolean) as string[];
        if (!coord) {
            const fallbackCoord = await this.recipientResolver.getEmailByUserId(7);
            if (fallbackCoord.length) cc.push(fallbackCoord[0]);
        }

        // Fetch Assignee (TE) details
        const assignee = await this.db
            .select({
                name: users.name,
                email: users.email,
                phone: userProfiles.phone,
            })
            .from(users)
            .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
            .where(eq(users.id, tender.teamMember || 0))
            .limit(1)
            .then(rows => rows[0]);

        // Fetch Company details
        const company = await this.db
            .select()
            .from(companies)
            .limit(1)
            .then(rows => rows[0]);

        const clients = (typeof ext.clients === 'string' ? JSON.parse(ext.clients) : ext.clients) as Client[];
        const to = [{ type: 'emails', emails: clients.map(c => c.email).filter(Boolean) as string[] }] as any;

        if (!to[0].emails.length) throw new Error('No client emails found to send to');

        return await this.emailService.sendTenderEmail({
            tenderId: tender.id,
            fromUserId,
            to,
            cc: [{ type: 'emails', emails: cc }] as any,
            // Request for Extension of Tender Due date - Tender No.
            subject: `Request for Extension of Tender Due date - ${tender.tenderNo}`,
            template: 'tender-request-extension',
            data: {
                tender_no: tender.tenderNo,
                days: ext.days,
                reason: ext.reason,
                assignee: assignee?.name || 'Assigned TE',
                te_mobile: assignee?.phone || '',
                te_email: assignee?.email || '',
                ve_address: company?.registeredAddress || '',
            },
            eventType: 'Request Extension Sent',
        });
    }
}
