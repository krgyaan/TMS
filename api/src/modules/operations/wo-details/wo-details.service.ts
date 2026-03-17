import { Inject, Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { eq, desc, asc, sql, and, or, ilike, gte, lte, isNull } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { woDetails, woAmendments, woDocuments, woQueries, woBasicDetails } from '@db/schemas/operations';
import type { CreateWoDetailDto, UpdateWoDetailDto, AcceptWoDto, RequestAmendmentDto, WoAcceptanceDecisionDto, CreateWoAmendmentDto, CreateBulkWoAmendmentsDto, UpdateWoAmendmentDto, CreateWoDocumentDto, UpdateWoDocumentDto, CreateBulkWoDocumentsDto, CreateWoQueryDto, RespondToQueryDto, CloseQueryDto, UpdateQueryStatusDto, WoDetailsQueryDto, AmendmentFilterDto, DocumentFilterDto, QueryFilterDto } from './dto/wo-details.dto';

export type WoDetailRow = typeof woDetails.$inferSelect;
export type WoAmendmentRow = typeof woAmendments.$inferSelect;
export type WoDocumentRow = typeof woDocuments.$inferSelect;
export type WoQueryRow = typeof woQueries.$inferSelect;

@Injectable()
export class WoDetailsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    // ============================================
    // MAPPING FUNCTIONS - WO DETAILS
    // ============================================

    private mapCreateToDb(data: CreateWoDetailDto) {
        const now = new Date();
        return {
            woBasicDetailId: data.woBasicDetailId,
            ldApplicable: data.ldApplicable ?? true,
            maxLd: data.maxLd ?? null,
            ldStartDate: data.ldStartDate ?? null,
            maxLdDate: data.maxLdDate ?? null,
            isPbgApplicable: data.isPbgApplicable ?? false,
            filledBgFormat: data.filledBgFormat ?? null,
            isContractAgreement: data.isContractAgreement ?? false,
            contractAgreementFormat: data.contractAgreementFormat ?? null,
            budgetPreGst: data.budgetPreGst ?? null,
            woAcceptance: false,
            woAmendmentNeeded: false,
            status: data.status ?? true,
            createdAt: now,
            updatedAt: now,
        };
    }

    private mapUpdateToDb(data: UpdateWoDetailDto) {
        const out: Record<string, unknown> = { updatedAt: new Date() };

        if (data.ldApplicable !== undefined) out.ldApplicable = data.ldApplicable;
        if (data.maxLd !== undefined) out.maxLd = data.maxLd;
        if (data.ldStartDate !== undefined) out.ldStartDate = data.ldStartDate;
        if (data.maxLdDate !== undefined) out.maxLdDate = data.maxLdDate;
        if (data.isPbgApplicable !== undefined) out.isPbgApplicable = data.isPbgApplicable;
        if (data.filledBgFormat !== undefined) out.filledBgFormat = data.filledBgFormat;
        if (data.isContractAgreement !== undefined) out.isContractAgreement = data.isContractAgreement;
        if (data.contractAgreementFormat !== undefined) out.contractAgreementFormat = data.contractAgreementFormat;
        if (data.budgetPreGst !== undefined) out.budgetPreGst = data.budgetPreGst;
        if (data.status !== undefined) out.status = data.status;

        return out as Partial<typeof woDetails.$inferInsert>;
    }

    private mapRowToResponse(row: WoDetailRow) {
        return {
            id: row.id,
            woBasicDetailId: row.woBasicDetailId,
            ldApplicable: row.ldApplicable,
            maxLd: row.maxLd,
            ldStartDate: row.ldStartDate,
            maxLdDate: row.maxLdDate,
            isPbgApplicable: row.isPbgApplicable,
            filledBgFormat: row.filledBgFormat,
            isContractAgreement: row.isContractAgreement,
            contractAgreementFormat: row.contractAgreementFormat,
            budgetPreGst: row.budgetPreGst,
            woAcceptance: row.woAcceptance,
            woAcceptanceAt: row.woAcceptanceAt,
            woAmendmentNeeded: row.woAmendmentNeeded,
            followupId: row.followupId,
            courierId: row.courierId,
            tlId: row.tlId,
            tlQueryRaisedAt: row.tlQueryRaisedAt,
            tlFinalDecisionAt: row.tlFinalDecisionAt,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    // ============================================
    // MAPPING FUNCTIONS - AMENDMENTS
    // ============================================

    private mapAmendmentToResponse(row: WoAmendmentRow) {
        return {
            id: row.id,
            woDetailId: row.woDetailId,
            pageNo: row.pageNo,
            clauseNo: row.clauseNo,
            currentStatement: row.currentStatement,
            correctedStatement: row.correctedStatement,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    // ============================================
    // MAPPING FUNCTIONS - DOCUMENTS
    // ============================================

    private mapDocumentToResponse(row: WoDocumentRow) {
        return {
            id: row.id,
            woDetailId: row.woDetailId,
            type: row.type,
            version: row.version,
            filePath: row.filePath,
            uploadedAt: row.uploadedAt,
        };
    }

    // ============================================
    // MAPPING FUNCTIONS - QUERIES
    // ============================================

    private mapQueryToResponse(row: WoQueryRow) {
        return {
            id: row.id,
            woDetailId: row.woDetailId,
            queryBy: row.queryBy,
            queryTo: row.queryTo,
            queryText: row.queryText,
            queryRaisedAt: row.queryRaisedAt,
            responseText: row.responseText,
            respondedBy: row.respondedBy,
            respondedAt: row.respondedAt,
            status: row.status,
            createdAt: row.createdAt,
        };
    }

    // ============================================
    // CRUD OPERATIONS - WO DETAILS
    // ============================================

    async findAll(filters?: WoDetailsQueryDto) {
        const page = filters?.page ?? 1;
        const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
        const offset = (page - 1) * limit;
        const sortOrder = filters?.sortOrder ?? 'desc';
        const sortBy = filters?.sortBy ?? 'createdAt';

        // Determine order column
        const orderColumnMap: Record<string, any> = {
            createdAt: woDetails.createdAt,
            updatedAt: woDetails.updatedAt,
            ldStartDate: woDetails.ldStartDate,
            woAcceptanceAt: woDetails.woAcceptanceAt,
            budgetPreGst: woDetails.budgetPreGst,
        };
        const orderColumn = orderColumnMap[sortBy] ?? woDetails.createdAt;
        const orderFn = sortOrder === 'desc' ? desc : asc;

        // Build conditions
        const conditions: any[] = [];

        if (filters?.woBasicDetailId) {
            conditions.push(eq(woDetails.woBasicDetailId, filters.woBasicDetailId));
        }
        if (filters?.ldApplicable !== undefined) {
            conditions.push(eq(woDetails.ldApplicable, filters.ldApplicable));
        }
        if (filters?.isPbgApplicable !== undefined) {
            conditions.push(eq(woDetails.isPbgApplicable, filters.isPbgApplicable));
        }
        if (filters?.isContractAgreement !== undefined) {
            conditions.push(eq(woDetails.isContractAgreement, filters.isContractAgreement));
        }
        if (filters?.woAcceptance !== undefined) {
            conditions.push(eq(woDetails.woAcceptance, filters.woAcceptance));
        }
        if (filters?.woAmendmentNeeded !== undefined) {
            conditions.push(eq(woDetails.woAmendmentNeeded, filters.woAmendmentNeeded));
        }
        if (filters?.status !== undefined) {
            conditions.push(eq(woDetails.status, filters.status));
        }
        if (filters?.tlId) {
            conditions.push(eq(woDetails.tlId, filters.tlId));
        }

        // Date range filters
        if (filters?.ldStartDateFrom) {
            conditions.push(gte(woDetails.ldStartDate, filters.ldStartDateFrom));
        }
        if (filters?.ldStartDateTo) {
            conditions.push(lte(woDetails.ldStartDate, filters.ldStartDateTo));
        }
        if (filters?.createdAtFrom) {
            conditions.push(gte(woDetails.createdAt, new Date(filters.createdAtFrom)));
        }
        if (filters?.createdAtTo) {
            conditions.push(lte(woDetails.createdAt, new Date(filters.createdAtTo)));
        }
        if (filters?.woAcceptanceAtFrom) {
            conditions.push(gte(woDetails.woAcceptanceAt, new Date(filters.woAcceptanceAtFrom)));
        }
        if (filters?.woAcceptanceAtTo) {
            conditions.push(lte(woDetails.woAcceptanceAt, new Date(filters.woAcceptanceAtTo)));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [countResult, rows] = await Promise.all([
            this.db
                .select({ count: sql<number>`count(*)::int` })
                .from(woDetails)
                .where(whereClause)
                .then(([r]) => Number(r?.count ?? 0)),
            this.db
                .select()
                .from(woDetails)
                .where(whereClause)
                .orderBy(orderFn(orderColumn))
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
        const [row] = await this.db
            .select()
            .from(woDetails)
            .where(eq(woDetails.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`WO Detail with ID ${id} not found`);
        }

        return this.mapRowToResponse(row);
    }

    async findByIdWithRelations(id: number) {
        const [row] = await this.db
            .select()
            .from(woDetails)
            .where(eq(woDetails.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`WO Detail with ID ${id} not found`);
        }

        // Fetch related data
        const [amendments, documents, queries, basicDetail] = await Promise.all([
            this.db.select().from(woAmendments).where(eq(woAmendments.woDetailId, id)),
            this.db.select().from(woDocuments).where(eq(woDocuments.woDetailId, id)),
            this.db.select().from(woQueries).where(eq(woQueries.woDetailId, id)),
            this.db
                .select()
                .from(woBasicDetails)
                .where(eq(woBasicDetails.id, row.woBasicDetailId!))
                .limit(1),
        ]);

        return {
            ...this.mapRowToResponse(row),
            amendments: amendments.map((a) => this.mapAmendmentToResponse(a)),
            documents: documents.map((d) => this.mapDocumentToResponse(d)),
            queries: queries.map((q) => this.mapQueryToResponse(q)),
            woBasicDetail: basicDetail[0] ?? null,
        };
    }

    async findByWoBasicDetailId(woBasicDetailId: number) {
        const [row] = await this.db
            .select()
            .from(woDetails)
            .where(eq(woDetails.woBasicDetailId, woBasicDetailId))
            .limit(1);

        if (!row) {
            throw new NotFoundException(
                `WO Detail for Basic Detail ID ${woBasicDetailId} not found`,
            );
        }

        return this.mapRowToResponse(row);
    }

    async create(data: CreateWoDetailDto) {
        // Check if WO Detail already exists for this Basic Detail
        const existing = await this.db
            .select({ id: woDetails.id })
            .from(woDetails)
            .where(eq(woDetails.woBasicDetailId, data.woBasicDetailId))
            .limit(1);

        if (existing.length > 0) {
            throw new ConflictException(
                `WO Detail already exists for Basic Detail ID ${data.woBasicDetailId}`,
            );
        }

        // Verify WO Basic Detail exists
        const [basicDetail] = await this.db
            .select({ id: woBasicDetails.id })
            .from(woBasicDetails)
            .where(eq(woBasicDetails.id, data.woBasicDetailId))
            .limit(1);

        if (!basicDetail) {
            throw new NotFoundException(
                `WO Basic Detail with ID ${data.woBasicDetailId} not found`,
            );
        }

        const insertValues = this.mapCreateToDb(data);

        const [row] = await this.db
            .insert(woDetails)
            .values(insertValues)
            .returning();

        // Update basic detail stage
        await this.db
            .update(woBasicDetails)
            .set({ currentStage: 'wo_details', updatedAt: new Date() })
            .where(eq(woBasicDetails.id, data.woBasicDetailId));

        return this.mapRowToResponse(row!);
    }

    async update(id: number, data: UpdateWoDetailDto) {
        await this.findById(id);

        const updateValues = this.mapUpdateToDb(data);

        const [row] = await this.db
            .update(woDetails)
            .set(updateValues)
            .where(eq(woDetails.id, id))
            .returning();

        if (!row) {
            throw new NotFoundException(`WO Detail with ID ${id} not found`);
        }

        return this.mapRowToResponse(row);
    }

    async delete(id: number): Promise<void> {
        // Delete related records first
        await Promise.all([
            this.db.delete(woAmendments).where(eq(woAmendments.woDetailId, id)),
            this.db.delete(woDocuments).where(eq(woDocuments.woDetailId, id)),
            this.db.delete(woQueries).where(eq(woQueries.woDetailId, id)),
        ]);

        const [row] = await this.db
            .delete(woDetails)
            .where(eq(woDetails.id, id))
            .returning();

        if (!row) {
            throw new NotFoundException(`WO Detail with ID ${id} not found`);
        }
    }

    // ============================================
    // WO ACCEPTANCE WORKFLOW
    // ============================================

    async acceptWo(id: number, data: AcceptWoDto) {
        const current = await this.findById(id);

        if (current.woAcceptance) {
            throw new BadRequestException('WO has already been accepted');
        }

        const now = new Date();

        const [row] = await this.db
            .update(woDetails)
            .set({
                woAcceptance: true,
                woAcceptanceAt: now,
                woAmendmentNeeded: false,
                tlId: data.tlId ?? null,
                tlFinalDecisionAt: now,
                updatedAt: now,
            })
            .where(eq(woDetails.id, id))
            .returning();

        // Update basic detail stage
        await this.db
            .update(woBasicDetails)
            .set({ currentStage: 'wo_upload', updatedAt: now })
            .where(eq(woBasicDetails.id, current.woBasicDetailId!));

        return {
            ...this.mapRowToResponse(row!),
            message: 'WO accepted successfully',
            notes: data.notes ?? null,
        };
    }

    async requestAmendment(id: number, data: RequestAmendmentDto) {
        const current = await this.findById(id);

        if (current.woAcceptance) {
            throw new BadRequestException('Cannot request amendment for already accepted WO');
        }

        const now = new Date();

        // Create amendments
        const amendmentInserts = data.amendments.map((a) => ({
            woDetailId: id,
            pageNo: a.pageNo,
            clauseNo: a.clauseNo,
            currentStatement: a.currentStatement,
            correctedStatement: a.correctedStatement,
            createdAt: now,
            updatedAt: now,
        }));

        await this.db.insert(woAmendments).values(amendmentInserts);

        // Update WO Detail
        const [row] = await this.db
            .update(woDetails)
            .set({
                woAmendmentNeeded: true,
                tlId: data.tlId ?? null,
                tlFinalDecisionAt: now,
                updatedAt: now,
            })
            .where(eq(woDetails.id, id))
            .returning();

        // Pause workflow in basic details
        await this.db
            .update(woBasicDetails)
            .set({
                isWorkflowPaused: true,
                workflowPausedAt: now,
                updatedAt: now,
            })
            .where(eq(woBasicDetails.id, current.woBasicDetailId!));

        return {
            ...this.mapRowToResponse(row!),
            message: 'Amendment requested successfully',
            reason: data.reason,
            amendmentsCreated: data.amendments.length,
        };
    }

    async makeAcceptanceDecision(id: number, data: WoAcceptanceDecisionDto) {
        if (data.accepted) {
            return this.acceptWo(id, { tlId: data.tlId, notes: data.notes });
        } else {
            return this.requestAmendment(id, {
                tlId: data.tlId,
                reason: data.amendmentReason!,
                amendments: data.amendments!,
                followupRequired: true,
            });
        }
    }

    async getAcceptanceStatus(id: number) {
        const row = await this.findById(id);

        return {
            woDetailId: id,
            isAccepted: row.woAcceptance,
            acceptedAt: row.woAcceptanceAt,
            amendmentNeeded: row.woAmendmentNeeded,
            tlId: row.tlId,
            tlFinalDecisionAt: row.tlFinalDecisionAt,
            followupId: row.followupId,
            courierId: row.courierId,
        };
    }

    async getTimeline(id: number) {
        const row = await this.findById(id);

        // Get query history
        const queries = await this.db
            .select()
            .from(woQueries)
            .where(eq(woQueries.woDetailId, id))
            .orderBy(asc(woQueries.queryRaisedAt));

        // Calculate SLA compliance
        const createdAt = new Date(row.createdAt!);
        const queryDeadline = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours

        const events = [
            {
                event: 'WO Detail Created',
                timestamp: row.createdAt,
                type: 'creation',
            },
        ];

        if (row.tlQueryRaisedAt) {
            events.push({
                event: 'TL Query Raised',
                timestamp: row.tlQueryRaisedAt,
                type: 'query',
            });
        }

        queries.forEach((q, index) => {
            events.push({
                event: `Query ${index + 1} Raised`,
                timestamp: q.queryRaisedAt,
                type: 'query',
            });
            if (q.respondedAt) {
                events.push({
                    event: `Query ${index + 1} Responded`,
                    timestamp: q.respondedAt,
                    type: 'response',
                });
            }
        });

        if (row.tlFinalDecisionAt) {
            events.push({
                event: row.woAcceptance ? 'WO Accepted' : 'Amendment Requested',
                timestamp: row.tlFinalDecisionAt,
                type: 'decision',
            });
        }

        return {
            woDetailId: id,
            timeline: events.sort(
                (a, b) =>
                    new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime(),
            ),
            sla: {
                queryDeadline: queryDeadline.toISOString(),
                isQueryOverdue:
                    !row.tlQueryRaisedAt && new Date() > queryDeadline,
            },
        };
    }

    // ============================================
    // AMENDMENT OPERATIONS
    // ============================================

    async listAmendments(woDetailId: number, filters?: AmendmentFilterDto) {
        await this.findById(woDetailId);

        const page = filters?.page ?? 1;
        const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
        const offset = (page - 1) * limit;
        const sortOrder = filters?.sortOrder ?? 'asc';
        const sortBy = filters?.sortBy ?? 'createdAt';

        const orderColumnMap: Record<string, any> = {
            createdAt: woAmendments.createdAt,
            updatedAt: woAmendments.updatedAt,
            pageNo: woAmendments.pageNo,
        };
        const orderColumn = orderColumnMap[sortBy] ?? woAmendments.createdAt;
        const orderFn = sortOrder === 'desc' ? desc : asc;

        const conditions: any[] = [eq(woAmendments.woDetailId, woDetailId)];

        if (filters?.pageNo) {
            conditions.push(ilike(woAmendments.pageNo, `%${filters.pageNo}%`));
        }
        if (filters?.clauseNo) {
            conditions.push(ilike(woAmendments.clauseNo, `%${filters.clauseNo}%`));
        }

        const whereClause = and(...conditions);

        const [countResult, rows] = await Promise.all([
            this.db
                .select({ count: sql<number>`count(*)::int` })
                .from(woAmendments)
                .where(whereClause)
                .then(([r]) => Number(r?.count ?? 0)),
            this.db
                .select()
                .from(woAmendments)
                .where(whereClause)
                .orderBy(orderFn(orderColumn))
                .limit(limit)
                .offset(offset),
        ]);

        return {
            data: rows.map((r) => this.mapAmendmentToResponse(r)),
            meta: {
                total: countResult,
                page,
                limit,
                totalPages: Math.ceil(countResult / limit) || 1,
            },
        };
    }

    async getAmendment(woDetailId: number, amendmentId: number) {
        await this.findById(woDetailId);

        const [row] = await this.db
            .select()
            .from(woAmendments)
            .where(
                and(
                    eq(woAmendments.id, amendmentId),
                    eq(woAmendments.woDetailId, woDetailId),
                ),
            )
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Amendment with ID ${amendmentId} not found`);
        }

        return this.mapAmendmentToResponse(row);
    }

    async createAmendment(woDetailId: number, data: CreateWoAmendmentDto) {
        await this.findById(woDetailId);

        const now = new Date();

        const [row] = await this.db
            .insert(woAmendments)
            .values({
                woDetailId,
                pageNo: data.pageNo,
                clauseNo: data.clauseNo,
                currentStatement: data.currentStatement,
                correctedStatement: data.correctedStatement,
                createdAt: now,
                updatedAt: now,
            })
            .returning();

        // Update woAmendmentNeeded flag
        await this.db
            .update(woDetails)
            .set({ woAmendmentNeeded: true, updatedAt: now })
            .where(eq(woDetails.id, woDetailId));

        return this.mapAmendmentToResponse(row!);
    }

    async createBulkAmendments(woDetailId: number, data: CreateBulkWoAmendmentsDto) {
        await this.findById(woDetailId);

        const now = new Date();

        const insertValues = data.amendments.map((a) => ({
            woDetailId,
            pageNo: a.pageNo,
            clauseNo: a.clauseNo,
            currentStatement: a.currentStatement,
            correctedStatement: a.correctedStatement,
            createdAt: now,
            updatedAt: now,
        }));

        const rows = await this.db
            .insert(woAmendments)
            .values(insertValues)
            .returning();

        // Update woAmendmentNeeded flag
        await this.db
            .update(woDetails)
            .set({ woAmendmentNeeded: true, updatedAt: now })
            .where(eq(woDetails.id, woDetailId));

        return {
            created: rows.length,
            data: rows.map((r) => this.mapAmendmentToResponse(r)),
        };
    }

    async updateAmendment(
        woDetailId: number,
        amendmentId: number,
        data: UpdateWoAmendmentDto,
    ) {
        await this.getAmendment(woDetailId, amendmentId);

        const updateValues: Record<string, unknown> = { updatedAt: new Date() };

        if (data.pageNo !== undefined) updateValues.pageNo = data.pageNo;
        if (data.clauseNo !== undefined) updateValues.clauseNo = data.clauseNo;
        if (data.currentStatement !== undefined)
            updateValues.currentStatement = data.currentStatement;
        if (data.correctedStatement !== undefined)
            updateValues.correctedStatement = data.correctedStatement;

        const [row] = await this.db
            .update(woAmendments)
            .set(updateValues as Partial<typeof woAmendments.$inferInsert>)
            .where(eq(woAmendments.id, amendmentId))
            .returning();

        return this.mapAmendmentToResponse(row!);
    }

    async deleteAmendment(woDetailId: number, amendmentId: number): Promise<void> {
        await this.getAmendment(woDetailId, amendmentId);

        await this.db.delete(woAmendments).where(eq(woAmendments.id, amendmentId));

        // Check if any amendments remain
        const remaining = await this.db
            .select({ count: sql<number>`count(*)::int` })
            .from(woAmendments)
            .where(eq(woAmendments.woDetailId, woDetailId))
            .then(([r]) => Number(r?.count ?? 0));

        if (remaining === 0) {
            await this.db
                .update(woDetails)
                .set({ woAmendmentNeeded: false, updatedAt: new Date() })
                .where(eq(woDetails.id, woDetailId));
        }
    }

    async deleteAllAmendments(woDetailId: number): Promise<void> {
        await this.findById(woDetailId);

        await this.db
            .delete(woAmendments)
            .where(eq(woAmendments.woDetailId, woDetailId));

        await this.db
            .update(woDetails)
            .set({ woAmendmentNeeded: false, updatedAt: new Date() })
            .where(eq(woDetails.id, woDetailId));
    }

    // ============================================
    // DOCUMENT OPERATIONS
    // ============================================

    async listDocuments(woDetailId: number, filters?: DocumentFilterDto) {
        await this.findById(woDetailId);

        const page = filters?.page ?? 1;
        const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
        const offset = (page - 1) * limit;
        const sortOrder = filters?.sortOrder ?? 'desc';
        const sortBy = filters?.sortBy ?? 'uploadedAt';

        const orderColumnMap: Record<string, any> = {
            uploadedAt: woDocuments.uploadedAt,
            version: woDocuments.version,
            type: woDocuments.type,
        };
        const orderColumn = orderColumnMap[sortBy] ?? woDocuments.uploadedAt;
        const orderFn = sortOrder === 'desc' ? desc : asc;

        const conditions: any[] = [eq(woDocuments.woDetailId, woDetailId)];

        if (filters?.type) {
            conditions.push(eq(woDocuments.type, filters.type));
        }
        if (filters?.version) {
            conditions.push(eq(woDocuments.version, filters.version));
        }
        if (filters?.uploadedFrom) {
            conditions.push(gte(woDocuments.uploadedAt, new Date(filters.uploadedFrom)));
        }
        if (filters?.uploadedTo) {
            conditions.push(lte(woDocuments.uploadedAt, new Date(filters.uploadedTo)));
        }

        const whereClause = and(...conditions);

        const [countResult, rows] = await Promise.all([
            this.db
                .select({ count: sql<number>`count(*)::int` })
                .from(woDocuments)
                .where(whereClause)
                .then(([r]) => Number(r?.count ?? 0)),
            this.db
                .select()
                .from(woDocuments)
                .where(whereClause)
                .orderBy(orderFn(orderColumn))
                .limit(limit)
                .offset(offset),
        ]);

        return {
            data: rows.map((r) => this.mapDocumentToResponse(r)),
            meta: {
                total: countResult,
                page,
                limit,
                totalPages: Math.ceil(countResult / limit) || 1,
            },
        };
    }

    async getDocument(woDetailId: number, documentId: number) {
        await this.findById(woDetailId);

        const [row] = await this.db
            .select()
            .from(woDocuments)
            .where(
                and(
                    eq(woDocuments.id, documentId),
                    eq(woDocuments.woDetailId, woDetailId),
                ),
            )
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Document with ID ${documentId} not found`);
        }

        return this.mapDocumentToResponse(row);
    }

    async getDocumentsByType(woDetailId: number, type: string) {
        await this.findById(woDetailId);

        const rows = await this.db
            .select()
            .from(woDocuments)
            .where(
                and(eq(woDocuments.woDetailId, woDetailId), eq(woDocuments.type, type)),
            )
            .orderBy(desc(woDocuments.version));

        return rows.map((r) => this.mapDocumentToResponse(r));
    }

    async getLatestDocumentByType(woDetailId: number, type: string) {
        await this.findById(woDetailId);

        const [row] = await this.db
            .select()
            .from(woDocuments)
            .where(
                and(eq(woDocuments.woDetailId, woDetailId), eq(woDocuments.type, type)),
            )
            .orderBy(desc(woDocuments.version))
            .limit(1);

        if (!row) {
            throw new NotFoundException(
                `No document of type ${type} found for WO Detail ${woDetailId}`,
            );
        }

        return this.mapDocumentToResponse(row);
    }

    async uploadDocument(woDetailId: number, data: CreateWoDocumentDto) {
        await this.findById(woDetailId);

        // Get latest version for this document type
        const [latestVersion] = await this.db
            .select({ version: sql<number>`max(${woDocuments.version})` })
            .from(woDocuments)
            .where(
                and(
                    eq(woDocuments.woDetailId, woDetailId),
                    eq(woDocuments.type, data.type),
                ),
            );

        const newVersion = (latestVersion?.version ?? 0) + 1;

        const [row] = await this.db
            .insert(woDocuments)
            .values({
                woDetailId,
                type: data.type,
                version: data.version ?? newVersion,
                filePath: data.filePath,
                uploadedAt: new Date(),
            })
            .returning();

        return this.mapDocumentToResponse(row!);
    }

    async uploadBulkDocuments(woDetailId: number, data: CreateBulkWoDocumentsDto) {
        await this.findById(woDetailId);

        const now = new Date();
        const results: WoDocumentRow[] = [];

        for (const doc of data.documents) {
            // Get latest version for this document type
            const [latestVersion] = await this.db
                .select({ version: sql<number>`max(${woDocuments.version})` })
                .from(woDocuments)
                .where(
                    and(
                        eq(woDocuments.woDetailId, woDetailId),
                        eq(woDocuments.type, doc.type),
                    ),
                );

            const newVersion = (latestVersion?.version ?? 0) + 1;

            const [row] = await this.db
                .insert(woDocuments)
                .values({
                    woDetailId,
                    type: doc.type,
                    version: doc.version ?? newVersion,
                    filePath: doc.filePath,
                    uploadedAt: now,
                })
                .returning();

            results.push(row!);
        }

        return {
            uploaded: results.length,
            data: results.map((r) => this.mapDocumentToResponse(r)),
        };
    }

    async updateDocument(
        woDetailId: number,
        documentId: number,
        data: UpdateWoDocumentDto,
    ) {
        await this.getDocument(woDetailId, documentId);

        const updateValues: Record<string, unknown> = {};

        if (data.version !== undefined) updateValues.version = data.version;
        if (data.filePath !== undefined) updateValues.filePath = data.filePath;

        if (Object.keys(updateValues).length === 0) {
            return this.getDocument(woDetailId, documentId);
        }

        const [row] = await this.db
            .update(woDocuments)
            .set(updateValues as Partial<typeof woDocuments.$inferInsert>)
            .where(eq(woDocuments.id, documentId))
            .returning();

        return this.mapDocumentToResponse(row!);
    }

    async deleteDocument(woDetailId: number, documentId: number): Promise<void> {
        await this.getDocument(woDetailId, documentId);

        await this.db.delete(woDocuments).where(eq(woDocuments.id, documentId));
    }

    // ============================================
    // QUERY OPERATIONS
    // ============================================

    async listQueries(woDetailId: number, filters?: QueryFilterDto) {
        await this.findById(woDetailId);

        const page = filters?.page ?? 1;
        const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
        const offset = (page - 1) * limit;
        const sortOrder = filters?.sortOrder ?? 'desc';
        const sortBy = filters?.sortBy ?? 'queryRaisedAt';

        const orderColumnMap: Record<string, any> = {
            queryRaisedAt: woQueries.queryRaisedAt,
            respondedAt: woQueries.respondedAt,
        };
        const orderColumn = orderColumnMap[sortBy] ?? woQueries.queryRaisedAt;
        const orderFn = sortOrder === 'desc' ? desc : asc;

        const conditions: any[] = [eq(woQueries.woDetailId, woDetailId)];

        if (filters?.status) {
            conditions.push(eq(woQueries.status, filters.status));
        }
        if (filters?.queryTo) {
            conditions.push(eq(woQueries.queryTo, filters.queryTo));
        }
        if (filters?.queryBy) {
            conditions.push(eq(woQueries.queryBy, filters.queryBy));
        }
        if (filters?.respondedBy) {
            conditions.push(eq(woQueries.respondedBy, filters.respondedBy));
        }
        if (filters?.queryRaisedFrom) {
            conditions.push(
                gte(woQueries.queryRaisedAt, new Date(filters.queryRaisedFrom)),
            );
        }
        if (filters?.queryRaisedTo) {
            conditions.push(
                lte(woQueries.queryRaisedAt, new Date(filters.queryRaisedTo)),
            );
        }

        const whereClause = and(...conditions);

        const [countResult, rows] = await Promise.all([
            this.db
                .select({ count: sql<number>`count(*)::int` })
                .from(woQueries)
                .where(whereClause)
                .then(([r]) => Number(r?.count ?? 0)),
            this.db
                .select()
                .from(woQueries)
                .where(whereClause)
                .orderBy(orderFn(orderColumn))
                .limit(limit)
                .offset(offset),
        ]);

        return {
            data: rows.map((r) => this.mapQueryToResponse(r)),
            meta: {
                total: countResult,
                page,
                limit,
                totalPages: Math.ceil(countResult / limit) || 1,
            },
        };
    }

    async getQuery(woDetailId: number, queryId: number) {
        await this.findById(woDetailId);

        const [row] = await this.db
            .select()
            .from(woQueries)
            .where(
                and(eq(woQueries.id, queryId), eq(woQueries.woDetailId, woDetailId)),
            )
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Query with ID ${queryId} not found`);
        }

        return this.mapQueryToResponse(row);
    }

    async getPendingQueries(woDetailId: number) {
        await this.findById(woDetailId);

        const rows = await this.db
            .select()
            .from(woQueries)
            .where(
                and(
                    eq(woQueries.woDetailId, woDetailId),
                    eq(woQueries.status, 'pending'),
                ),
            )
            .orderBy(asc(woQueries.queryRaisedAt));

        return {
            count: rows.length,
            data: rows.map((r) => this.mapQueryToResponse(r)),
        };
    }

    async createQuery(woDetailId: number, data: CreateWoQueryDto) {
        await this.findById(woDetailId);

        const now = new Date();

        const [row] = await this.db
            .insert(woQueries)
            .values({
                woDetailId,
                queryBy: data.queryBy!,
                queryTo: data.queryTo,
                queryText: data.queryText,
                queryRaisedAt: now,
                status: 'pending',
                createdAt: now,
            })
            .returning();

        // Update TL query timestamp
        await this.db
            .update(woDetails)
            .set({ tlQueryRaisedAt: now, updatedAt: now })
            .where(eq(woDetails.id, woDetailId));

        return this.mapQueryToResponse(row!);
    }

    async respondToQuery(
        woDetailId: number,
        queryId: number,
        data: RespondToQueryDto,
    ) {
        const query = await this.getQuery(woDetailId, queryId);

        if (query.status === 'closed') {
            throw new BadRequestException('Cannot respond to a closed query');
        }

        const now = new Date();

        const [row] = await this.db
            .update(woQueries)
            .set({
                responseText: data.responseText,
                respondedBy: data.respondedBy ?? null,
                respondedAt: now,
                status: 'responded',
            })
            .where(eq(woQueries.id, queryId))
            .returning();

        return this.mapQueryToResponse(row!);
    }

    async closeQuery(woDetailId: number, queryId: number, data: CloseQueryDto) {
        await this.getQuery(woDetailId, queryId);

        const [row] = await this.db
            .update(woQueries)
            .set({ status: 'closed' })
            .where(eq(woQueries.id, queryId))
            .returning();

        return {
            ...this.mapQueryToResponse(row!),
            closedBy: data.closedBy ?? null,
            closureNotes: data.closureNotes ?? null,
        };
    }

    async updateQueryStatus(
        woDetailId: number,
        queryId: number,
        data: UpdateQueryStatusDto,
    ) {
        await this.getQuery(woDetailId, queryId);

        const [row] = await this.db
            .update(woQueries)
            .set({ status: data.status })
            .where(eq(woQueries.id, queryId))
            .returning();

        return this.mapQueryToResponse(row!);
    }

    // ============================================
    // DASHBOARD/REPORTING
    // ============================================

    async getDashboardSummary() {
        const [summary] = await this.db
            .select({
                total: sql<number>`count(*)::int`,
                accepted: sql<number>`count(*) filter (where ${woDetails.woAcceptance} = true)::int`,
                pending: sql<number>`count(*) filter (where ${woDetails.woAcceptance} = false)::int`,
                amendmentNeeded: sql<number>`count(*) filter (where ${woDetails.woAmendmentNeeded} = true)::int`,
                active: sql<number>`count(*) filter (where ${woDetails.status} = true)::int`,
                ldApplicable: sql<number>`count(*) filter (where ${woDetails.ldApplicable} = true)::int`,
                pbgApplicable: sql<number>`count(*) filter (where ${woDetails.isPbgApplicable} = true)::int`,
            })
            .from(woDetails);

        return {
            summary,
            generatedAt: new Date().toISOString(),
        };
    }

    async getPendingAcceptance() {
        const rows = await this.db
            .select()
            .from(woDetails)
            .where(
                and(
                    eq(woDetails.woAcceptance, false),
                    eq(woDetails.status, true),
                ),
            )
            .orderBy(asc(woDetails.createdAt));

        return {
            count: rows.length,
            data: rows.map((r) => this.mapRowToResponse(r)),
        };
    }

    async getAllPendingQueries() {
        const rows = await this.db
            .select({
                query: woQueries,
                woDetail: woDetails,
            })
            .from(woQueries)
            .innerJoin(woDetails, eq(woQueries.woDetailId, woDetails.id))
            .where(eq(woQueries.status, 'pending'))
            .orderBy(asc(woQueries.queryRaisedAt));

        return {
            count: rows.length,
            data: rows.map((r) => ({
                ...this.mapQueryToResponse(r.query),
                woDetail: this.mapRowToResponse(r.woDetail),
            })),
        };
    }

    async getAmendmentsSummary() {
        const [summary] = await this.db
            .select({
                totalAmendments: sql<number>`count(*)::int`,
                uniqueWoDetails: sql<number>`count(distinct ${woAmendments.woDetailId})::int`,
            })
            .from(woAmendments);

        // Get top clauses needing amendments
        const topClauses = await this.db
            .select({
                clauseNo: woAmendments.clauseNo,
                count: sql<number>`count(*)::int`,
            })
            .from(woAmendments)
            .groupBy(woAmendments.clauseNo)
            .orderBy(desc(sql`count(*)`))
            .limit(10);

        return {
            summary,
            topClauses,
            generatedAt: new Date().toISOString(),
        };
    }

    async getSlaComplianceReport() {
        const rows = await this.db
            .select()
            .from(woDetails)
            .where(eq(woDetails.status, true));

        const compliance = rows.map((row) => {
            const createdAt = new Date(row.createdAt!);
            const queryDeadline = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

            let queryOnTime = true;
            let responseOnTime = true;
            let decisionOnTime = true;

            if (row.tlQueryRaisedAt) {
                queryOnTime = new Date(row.tlQueryRaisedAt) <= queryDeadline;
            }

            // Add more SLA checks as needed

            return {
                woDetailId: row.id,
                woBasicDetailId: row.woBasicDetailId,
                createdAt: row.createdAt,
                queryOnTime,
                responseOnTime,
                decisionOnTime,
                isAccepted: row.woAcceptance,
                isCompliant: queryOnTime && responseOnTime && decisionOnTime,
            };
        });

        const compliantCount = compliance.filter((c) => c.isCompliant).length;

        return {
            totalRecords: compliance.length,
            compliantRecords: compliantCount,
            complianceRate:
                compliance.length > 0
                    ? ((compliantCount / compliance.length) * 100).toFixed(2) + '%'
                    : '0%',
            details: compliance,
            generatedAt: new Date().toISOString(),
        };
    }
}
