import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc, asc, sql, and, or, ilike, SQL } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { CreateSubmitQueriesDto, UpdateSubmitQueriesDto, ClientContact, QueryListItem } from './dto/submit-queries.dto';
import { submitQueries, submitQueriesLists } from '@/db/schemas/tendering/submit-queries.schema';
import { tenderInfos, teams, userProfiles, users, companies } from '@/db/schemas';
import { EmailService } from '../../email/email.service';
import { RecipientResolver } from '../../email/recipient.resolver';

export type SubmitQueriesFilters = {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export type SubmitQueryResponse = {
    id: number;
    tenderId: number;
    tenderName?: string;
    tenderNo?: string;
    clientContacts: ClientContact[];
    queries: QueryListItem[];
    createdAt: Date;
    updatedAt: Date;
};

@Injectable()
export class SubmitQueriesService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
    ) {}

    // Map create DTO to database insert values
    private mapCreateToDb(data: CreateSubmitQueriesDto) {
        const now = new Date();
        return {
            tenderId: data.tenderId,
            clientContacts: data.clientContacts,
            createdAt: now,
            updatedAt: now,
        };
    }

    // Map update DTO to database update values
    private mapUpdateToDb(data: UpdateSubmitQueriesDto) {
        const out: Record<string, unknown> = { updatedAt: new Date() };

        if (data.tenderId !== undefined) {
            out.tenderId = data.tenderId;
        }
        if (data.clientContacts !== undefined) {
            out.clientContacts = data.clientContacts;
        }

        return out as Partial<typeof submitQueries.$inferInsert>;
    }

    // Map database row to response format
    private mapRowToResponse(row: any, queries: any[] = []): SubmitQueryResponse {
        const clientContacts = (row.clientContacts as ClientContact[]) || [];

        return {
            id: row.id,
            tenderId: row.tenderId,
            tenderName: row.tenderName,
            tenderNo: row.tenderNo,
            clientContacts: clientContacts,
            queries: queries.map(q => ({
                pageNo: q.pageNo,
                clauseNo: q.clauseNo,
                queryType: q.queryType,
                currentStatement: q.currentStatement,
                requestedStatement: q.requestedStatement,
            })),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    async findAll(filters?: SubmitQueriesFilters) {
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
                    ilike(tenderInfos.tenderName, `%${search}%`),
                    ilike(tenderInfos.tenderNo, `%${search}%`),
                ),
            );
        }
        const whereClause = conditions.length > 0 ? and(...conditions.filter(Boolean)) : undefined;

        const baseQuery = this.db
            .select({ count: sql<number>`count(*)::int` })
            .from(submitQueries)
            .innerJoin(tenderInfos, eq(submitQueries.tenderId, tenderInfos.id));

        const [countResult, rows] = await Promise.all([
            baseQuery.where(whereClause).then(([r]) => Number(r?.count ?? 0)),
            this.db
                .select({
                    id: submitQueries.id,
                    tenderId: submitQueries.tenderId,
                    tenderName: tenderInfos.tenderName,
                    tenderNo: tenderInfos.tenderNo,
                    clientContacts: submitQueries.clientContacts,
                    createdAt: submitQueries.createdAt,
                    updatedAt: submitQueries.updatedAt,
                })
                .from(submitQueries)
                .innerJoin(tenderInfos, eq(submitQueries.tenderId, tenderInfos.id))
                .where(whereClause)
                .orderBy(orderFn(submitQueries.createdAt))
                .limit(limit)
                .offset(offset),
        ]);

        // Fetch queries for each submit_queries record
        const data = await Promise.all(
            rows.map(async (row) => {
                const queries = await this.db
                    .select()
                    .from(submitQueriesLists)
                    .where(eq(submitQueriesLists.submitQueriesId, BigInt(row.id)));

                return this.mapRowToResponse(row, queries);
            }),
        );

        return {
            data,
            meta: {
                total: countResult,
                page,
                limit,
                totalPages: Math.ceil(countResult / limit) || 1,
            },
        };
    }

    async findById(id: number, db: DbInstance = this.db) {
        const [row] = await db
            .select({
                id: submitQueries.id,
                tenderId: submitQueries.tenderId,
                tenderName: tenderInfos.tenderName,
                tenderNo: tenderInfos.tenderNo,
                clientContacts: submitQueries.clientContacts,
                createdAt: submitQueries.createdAt,
                updatedAt: submitQueries.updatedAt,
            })
            .from(submitQueries)
            .innerJoin(tenderInfos, eq(submitQueries.tenderId, tenderInfos.id))
            .where(eq(submitQueries.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Submit Query with ID ${id} not found`);
        }

        const queries = await db
            .select()
            .from(submitQueriesLists)
            .where(eq(submitQueriesLists.submitQueriesId, BigInt(id)));

        return this.mapRowToResponse(row, queries);
    }

    async findByTenderId(tenderId: number) {
        const [row] = await this.db
            .select({
                id: submitQueries.id,
                tenderId: submitQueries.tenderId,
                tenderName: tenderInfos.tenderName,
                tenderNo: tenderInfos.tenderNo,
                clientContacts: submitQueries.clientContacts,
                createdAt: submitQueries.createdAt,
                updatedAt: submitQueries.updatedAt,
            })
            .from(submitQueries)
            .innerJoin(tenderInfos, eq(submitQueries.tenderId, tenderInfos.id))
            .where(eq(submitQueries.tenderId, tenderId))
            .orderBy(desc(submitQueries.createdAt))
            .limit(1);

        if (!row) {
            return null;
        }

        const queries = await this.db
            .select()
            .from(submitQueriesLists)
            .where(eq(submitQueriesLists.submitQueriesId, BigInt(row.id)));

        return this.mapRowToResponse(row, queries);
    }

    async create(data: CreateSubmitQueriesDto) {
        const result = await this.db.transaction(async (tx) => {
            // Insert main record
            const insertValues = this.mapCreateToDb(data);
            const [inserted] = await tx
                .insert(submitQueries)
                .values(insertValues)
                .returning({ id: submitQueries.id });

            // Insert query list items
            if (data.queries && data.queries.length > 0) {
                const now = new Date();
                const queryListValues = data.queries.map((q) => ({
                    submitQueriesId: BigInt(inserted.id),
                    pageNo: q.pageNo,
                    clauseNo: q.clauseNo,
                    queryType: q.queryType,
                    currentStatement: q.currentStatement,
                    requestedStatement: q.requestedStatement,
                    createdAt: now,
                    updatedAt: now,
                }));

                await tx.insert(submitQueriesLists).values(queryListValues);
            }

            // Use transaction context for findById
            return this.findById(inserted.id, tx as unknown as DbInstance);
        });

        // Trigger email notification
        const [tender] = await this.db
            .select({ teamMember: tenderInfos.teamMember })
            .from(tenderInfos)
            .where(eq(tenderInfos.id, result.tenderId))
            .limit(1);

        if (tender && tender.teamMember) {
            await this.sendMail(result.id, tender.teamMember);
        }

        return result;
    }

    async update(id: number, data: UpdateSubmitQueriesDto) {
        const result = await this.db.transaction(async (tx) => {
            // Check if record exists
            const [existing] = await tx
                .select({ id: submitQueries.id })
                .from(submitQueries)
                .where(eq(submitQueries.id, id))
                .limit(1);

            if (!existing) {
                throw new NotFoundException(`Submit Query with ID ${id} not found`);
            }

            // Update main record
            const updateValues = this.mapUpdateToDb(data);
            await tx
                .update(submitQueries)
                .set(updateValues)
                .where(eq(submitQueries.id, id));

            // Update queries if provided
            if (data.queries !== undefined) {
                // Delete existing queries
                await tx
                    .delete(submitQueriesLists)
                    .where(eq(submitQueriesLists.submitQueriesId, BigInt(id)));

                // Insert new queries
                if (data.queries.length > 0) {
                    const now = new Date();
                    const queryListValues = data.queries.map((q) => ({
                        submitQueriesId: BigInt(id),
                        pageNo: q.pageNo,
                        clauseNo: q.clauseNo,
                        queryType: q.queryType,
                        currentStatement: q.currentStatement,
                        requestedStatement: q.requestedStatement,
                        createdAt: now,
                        updatedAt: now,
                    }));

                    await tx.insert(submitQueriesLists).values(queryListValues);
                }
            }

            // Use transaction context for findById
            return this.findById(id, tx as unknown as DbInstance);
        });

        // Trigger email notification
        const [tender] = await this.db
            .select({ teamMember: tenderInfos.teamMember })
            .from(tenderInfos)
            .where(eq(tenderInfos.id, result.tenderId))
            .limit(1);

        if (tender && tender.teamMember) {
            await this.sendMail(result.id, tender.teamMember);
        }

        return result;
    }

    async delete(id: number): Promise<void> {
        const [row] = await this.db
            .delete(submitQueries)
            .where(eq(submitQueries.id, id))
            .returning({ id: submitQueries.id });

        if (!row) {
            throw new NotFoundException(`Submit Query with ID ${id} not found`);
        }
    }

    async sendMail(id: number, fromUserId: number) {
        const sub = await this.findById(id);
        const tender = await this.db
            .select()
            .from(tenderInfos)
            .where(eq(tenderInfos.id, sub.tenderId))
            .limit(1)
            .then(rows => rows[0]);

        if (!tender) throw new NotFoundException('Tender not found');

        // Resolve DC Team recipients
        const dcTeam = await this.db
            .select({ id: teams.id })
            .from(teams)
            .where(eq(teams.name, 'DC'))
            .limit(1)
            .then(rows => rows[0]);

        if (!dcTeam) throw new NotFoundException('DC Team not found');

        const [admin, tl, coord] = await Promise.all([
            this.recipientResolver.getTeamAdmin(dcTeam.id),
            this.recipientResolver.getTeamLeader(dcTeam.id),
            this.recipientResolver.getTeamCoordinator(dcTeam.id),
        ]);

        const externalCc = sub.clientContacts.flatMap(c => c.cc_emails || []);
        const cc = [...new Set([...externalCc, admin, tl, coord].filter(Boolean) as string[])];

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

        const to = [{ type: 'emails', emails: sub.clientContacts.map(c => c.client_email).filter(Boolean) as string[] }] as any;

        if (!to[0].emails.length) throw new Error('No client emails found to send to');

        return await this.emailService.sendTenderEmail({
            tenderId: tender.id,
            fromUserId,
            to,
            cc: [{ type: 'emails', emails: cc }] as any,
            // Clarifications needed - Tender No.
            subject: `Clarifications needed - ${tender.tenderNo}`,
            template: 'tender-submit-query',
            data: {
                tender_no: tender.tenderNo,
                date: new Date().toLocaleDateString('en-IN'),
                queries: sub.queries.map(q => ({
                    page_no: q.pageNo,
                    clause_no: q.clauseNo,
                    query_type: q.queryType,
                    current_statement: q.currentStatement,
                    requested_statement: q.requestedStatement,
                })),
                client_details: {
                    name: sub.clientContacts[0]?.client_name || 'Sir/Madam',
                },
                assignee: assignee?.name || 'Tender Executive',
                te_mobile: assignee?.phone || '',
                te_email: assignee?.email || '',
                ve_address: company?.registeredAddress || 'B1/D8 2nd Floor, Mohan Cooperative Industrial Estate, New Delhi 110044',
            },
            eventType: 'Submit Query Sent',
        });
    }
}
