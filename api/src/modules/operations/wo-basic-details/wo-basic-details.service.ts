import {
    Inject,
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { eq, desc, asc, sql, and, or, ilike, gte, lte, isNull } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { woBasicDetails, woContacts, woDetails } from '@db/schemas/operations';
import type { CreateWoBasicDetailDto, UpdateWoBasicDetailDto, AssignOeDto, BulkAssignOeDto, RemoveOeAssignmentDto, WoBasicDetailsQueryDto } from './dto/wo-basic-details.dto';

export type WoBasicDetailRow = typeof woBasicDetails.$inferSelect;

@Injectable()
export class WoBasicDetailsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    // ============================================
    // MAPPING FUNCTIONS
    // ============================================

    private mapCreateToDb(data: CreateWoBasicDetailDto) {
        const now = new Date();
        return {
            tenderId: data.tenderId ?? null,
            enquiryId: data.enquiryId ?? null,
            woNumber: data.woNumber ?? null,
            woDate: data.woDate ?? null,
            projectCode: data.projectCode ?? this.generateProjectCode(),
            projectName: data.projectName ?? null,
            currentStage: data.currentStage ?? 'basic_details',
            woValuePreGst: data.woValuePreGst ?? null,
            woValueGstAmt: data.woValueGstAmt ?? null,
            receiptPreGst: data.receiptPreGst ?? null,
            budgetPreGst: data.budgetPreGst ?? null,
            grossMargin: data.grossMargin ?? null,
            wo_draft: data.wo_draft ?? null,
            teChecklistConfirmed: data.teChecklistConfirmed ?? false,
            tmsDocuments: data.tmsDocuments ?? null,
            isWorkflowPaused: false,
            createdAt: now,
            updatedAt: now,
        };
    }

    private mapUpdateToDb(data: UpdateWoBasicDetailDto) {
        const out: Record<string, unknown> = { updatedAt: new Date() };

        if (data.woNumber !== undefined) out.woNumber = data.woNumber;
        if (data.woDate !== undefined) out.woDate = data.woDate;
        if (data.projectCode !== undefined) out.projectCode = data.projectCode;
        if (data.projectName !== undefined) out.projectName = data.projectName;
        if (data.currentStage !== undefined) out.currentStage = data.currentStage;
        if (data.woValuePreGst !== undefined) out.woValuePreGst = data.woValuePreGst;
        if (data.woValueGstAmt !== undefined) out.woValueGstAmt = data.woValueGstAmt;
        if (data.receiptPreGst !== undefined) out.receiptPreGst = data.receiptPreGst;
        if (data.budgetPreGst !== undefined) out.budgetPreGst = data.budgetPreGst;
        if (data.grossMargin !== undefined) out.grossMargin = data.grossMargin;
        if (data.wo_draft !== undefined) out.wo_draft = data.wo_draft;
        if (data.teChecklistConfirmed !== undefined) out.teChecklistConfirmed = data.teChecklistConfirmed;
        if (data.tmsDocuments !== undefined) out.tmsDocuments = data.tmsDocuments;

        return out as Partial<typeof woBasicDetails.$inferInsert>;
    }

    private mapRowToResponse(row: WoBasicDetailRow) {
        return {
            id: row.id,
            tenderId: row.tenderId,
            enquiryId: row.enquiryId,
            woNumber: row.woNumber,
            woDate: row.woDate,
            projectCode: row.projectCode,
            projectName: row.projectName,
            currentStage: row.currentStage,
            woValuePreGst: row.woValuePreGst,
            woValueGstAmt: row.woValueGstAmt,
            receiptPreGst: row.receiptPreGst,
            budgetPreGst: row.budgetPreGst,
            grossMargin: row.grossMargin,
            wo_draft: row.wo_draft,
            teChecklistConfirmed: row.teChecklistConfirmed,
            tmsDocuments: row.tmsDocuments,
            oeFirst: row.oeFirst,
            oeFirstAssignedAt: row.oeFirstAssignedAt,
            oeFirstAssignedBy: row.oeFirstAssignedBy,
            oeSiteVisit: row.oeSiteVisit,
            oeSiteVisitAssignedAt: row.oeSiteVisitAssignedAt,
            oeSiteVisitAssignedBy: row.oeSiteVisitAssignedBy,
            oeDocsPrep: row.oeDocsPrep,
            oeDocsPrepVisitAssignedAt: row.oeDocsPrepVisitAssignedAt,
            oeDocsPrepVisitAssignedBy: row.oeDocsPrepVisitAssignedBy,
            isWorkflowPaused: row.isWorkflowPaused,
            workflowPausedAt: row.workflowPausedAt,
            workflowResumedAt: row.workflowResumedAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    private generateProjectCode(): string {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `PRJ-${timestamp}-${random}`;
    }

    private calculateGrossMargin(receiptPreGst: string, budgetPreGst: string): string | null {
        const receipt = parseFloat(receiptPreGst);
        const budget = parseFloat(budgetPreGst);

        if (isNaN(receipt) || isNaN(budget) || receipt === 0) {
            return null;
        }

        const margin = ((receipt - budget) / receipt) * 100;
        return margin.toFixed(2);
    }

    // ============================================
    // CRUD OPERATIONS
    // ============================================

    async findAll(filters?: WoBasicDetailsQueryDto) {
        const page = filters?.page ?? 1;
        const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
        const offset = (page - 1) * limit;
        const sortOrder = filters?.sortOrder ?? 'desc';
        const sortBy = filters?.sortBy ?? 'createdAt';
        const search = filters?.search?.trim();

        // Determine order column
        const orderColumnMap: Record<string, any> = {
            woDate: woBasicDetails.woDate,
            createdAt: woBasicDetails.createdAt,
            updatedAt: woBasicDetails.updatedAt,
            projectCode: woBasicDetails.projectCode,
            woValuePreGst: woBasicDetails.woValuePreGst,
            grossMargin: woBasicDetails.grossMargin,
        };
        const orderColumn = orderColumnMap[sortBy] ?? woBasicDetails.createdAt;
        const orderFn = sortOrder === 'desc' ? desc : asc;

        // Build conditions
        const conditions: any[] = [];

        // Search condition
        if (search) {
            conditions.push(
                or(
                    ilike(woBasicDetails.projectName, `%${search}%`),
                    ilike(woBasicDetails.woNumber, `%${search}%`),
                    ilike(woBasicDetails.projectCode, `%${search}%`),
                ),
            );
        }

        // Filter conditions
        if (filters?.tenderId) {
            conditions.push(eq(woBasicDetails.tenderId, filters.tenderId));
        }
        if (filters?.enquiryId) {
            conditions.push(eq(woBasicDetails.enquiryId, filters.enquiryId));
        }
        if (filters?.projectCode) {
            conditions.push(ilike(woBasicDetails.projectCode, `%${filters.projectCode}%`));
        }
        if (filters?.projectName) {
            conditions.push(ilike(woBasicDetails.projectName, `%${filters.projectName}%`));
        }
        if (filters?.currentStage) {
            conditions.push(eq(woBasicDetails.currentStage, filters.currentStage));
        }
        if (filters?.oeFirst) {
            conditions.push(eq(woBasicDetails.oeFirst, filters.oeFirst));
        }
        if (filters?.oeSiteVisit) {
            conditions.push(eq(woBasicDetails.oeSiteVisit, filters.oeSiteVisit));
        }
        if (filters?.oeDocsPrep) {
            conditions.push(eq(woBasicDetails.oeDocsPrep, filters.oeDocsPrep));
        }
        if (filters?.isWorkflowPaused !== undefined) {
            conditions.push(eq(woBasicDetails.isWorkflowPaused, filters.isWorkflowPaused));
        }

        // Date range filters
        if (filters?.woDateFrom) {
            conditions.push(gte(woBasicDetails.woDate, filters.woDateFrom));
        }
        if (filters?.woDateTo) {
            conditions.push(lte(woBasicDetails.woDate, filters.woDateTo));
        }
        if (filters?.createdAtFrom) {
            conditions.push(gte(woBasicDetails.createdAt, new Date(filters.createdAtFrom)));
        }
        if (filters?.createdAtTo) {
            conditions.push(lte(woBasicDetails.createdAt, new Date(filters.createdAtTo)));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [countResult, rows] = await Promise.all([
            this.db
                .select({ count: sql<number>`count(*)::int` })
                .from(woBasicDetails)
                .where(whereClause)
                .then(([r]) => Number(r?.count ?? 0)),
            this.db
                .select()
                .from(woBasicDetails)
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
            .from(woBasicDetails)
            .where(eq(woBasicDetails.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`WO Basic Detail with ID ${id} not found`);
        }

        return this.mapRowToResponse(row);
    }

    async findByIdWithRelations(id: number) {
        const [row] = await this.db
            .select()
            .from(woBasicDetails)
            .where(eq(woBasicDetails.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`WO Basic Detail with ID ${id} not found`);
        }

        // Fetch related contacts
        const contacts = await this.db
            .select()
            .from(woContacts)
            .where(eq(woContacts.woBasicDetailId, id));

        // Fetch related WO details
        const [woDetail] = await this.db
            .select()
            .from(woDetails)
            .where(eq(woDetails.woBasicDetailId, id))
            .limit(1);

        return {
            ...this.mapRowToResponse(row),
            contacts,
            woDetail: woDetail ?? null,
        };
    }

    async create(data: CreateWoBasicDetailDto) {
        // Check if project code already exists (if provided)
        if (data.projectCode) {
            const existing = await this.checkProjectCodeExists(data.projectCode);
            if (existing.exists) {
                throw new ConflictException(`Project code ${data.projectCode} already exists`);
            }
        }

        const insertValues = this.mapCreateToDb(data);

        // Auto-calculate gross margin if both values are provided
        if (data.receiptPreGst && data.budgetPreGst) {
            insertValues.grossMargin = this.calculateGrossMargin(
                data.receiptPreGst,
                data.budgetPreGst,
            );
        }

        const [row] = await this.db
            .insert(woBasicDetails)
            .values(insertValues)
            .returning();

        return this.mapRowToResponse(row!);
    }

    async update(id: number, data: UpdateWoBasicDetailDto) {
        // Check if record exists
        await this.findById(id);

        // Check project code uniqueness if being updated
        if (data.projectCode) {
            const existing = await this.db
                .select({ id: woBasicDetails.id })
                .from(woBasicDetails)
                .where(
                    and(
                        eq(woBasicDetails.projectCode, data.projectCode),
                        sql`${woBasicDetails.id} != ${id}`,
                    ),
                )
                .limit(1);

            if (existing.length > 0) {
                throw new ConflictException(`Project code ${data.projectCode} already exists`);
            }
        }

        const updateValues = this.mapUpdateToDb(data);

        // Auto-calculate gross margin if both values are provided
        if (data.receiptPreGst !== undefined || data.budgetPreGst !== undefined) {
            const currentRow = await this.findById(id);
            const receipt = data.receiptPreGst ?? currentRow.receiptPreGst;
            const budget = data.budgetPreGst ?? currentRow.budgetPreGst;

            if (receipt && budget) {
                updateValues.grossMargin = this.calculateGrossMargin(receipt, budget);
            }
        }

        const [row] = await this.db
            .update(woBasicDetails)
            .set(updateValues)
            .where(eq(woBasicDetails.id, id))
            .returning();

        if (!row) {
            throw new NotFoundException(`WO Basic Detail with ID ${id} not found`);
        }

        return this.mapRowToResponse(row);
    }

    async delete(id: number): Promise<void> {
        const [row] = await this.db
            .delete(woBasicDetails)
            .where(eq(woBasicDetails.id, id))
            .returning();

        if (!row) {
            throw new NotFoundException(`WO Basic Detail with ID ${id} not found`);
        }
    }

    // ============================================
    // OE ASSIGNMENT OPERATIONS
    // ============================================

    async assignOe(id: number, data: AssignOeDto) {
        // Check if record exists
        await this.findById(id);

        const now = new Date();
        const updateValues: Record<string, unknown> = { updatedAt: now };

        switch (data.assignmentType) {
            case 'first':
                updateValues.oeFirst = data.oeUserId;
                updateValues.oeFirstAssignedAt = now;
                updateValues.oeFirstAssignedBy = data.assignedBy ?? null;
                break;
            case 'siteVisit':
                updateValues.oeSiteVisit = data.oeUserId;
                updateValues.oeSiteVisitAssignedAt = now;
                updateValues.oeSiteVisitAssignedBy = data.assignedBy ?? null;
                break;
            case 'docsPrep':
                updateValues.oeDocsPrep = data.oeUserId;
                updateValues.oeDocsPrepVisitAssignedAt = now;
                updateValues.oeDocsPrepVisitAssignedBy = data.assignedBy ?? null;
                break;
        }

        const [row] = await this.db
            .update(woBasicDetails)
            .set(updateValues as Partial<typeof woBasicDetails.$inferInsert>)
            .where(eq(woBasicDetails.id, id))
            .returning();

        return this.mapRowToResponse(row!);
    }

    async bulkAssignOe(id: number, data: BulkAssignOeDto) {
        // Check if record exists
        await this.findById(id);

        const now = new Date();
        const updateValues: Record<string, unknown> = { updatedAt: now };

        for (const assignment of data.assignments) {
            switch (assignment.assignmentType) {
                case 'first':
                    updateValues.oeFirst = assignment.oeUserId;
                    updateValues.oeFirstAssignedAt = now;
                    updateValues.oeFirstAssignedBy = data.assignedBy ?? null;
                    break;
                case 'siteVisit':
                    updateValues.oeSiteVisit = assignment.oeUserId;
                    updateValues.oeSiteVisitAssignedAt = now;
                    updateValues.oeSiteVisitAssignedBy = data.assignedBy ?? null;
                    break;
                case 'docsPrep':
                    updateValues.oeDocsPrep = assignment.oeUserId;
                    updateValues.oeDocsPrepVisitAssignedAt = now;
                    updateValues.oeDocsPrepVisitAssignedBy = data.assignedBy ?? null;
                    break;
            }
        }

        const [row] = await this.db
            .update(woBasicDetails)
            .set(updateValues as Partial<typeof woBasicDetails.$inferInsert>)
            .where(eq(woBasicDetails.id, id))
            .returning();

        return this.mapRowToResponse(row!);
    }

    async removeOeAssignment(id: number, data: RemoveOeAssignmentDto) {
        // Check if record exists
        await this.findById(id);

        const updateValues: Record<string, unknown> = { updatedAt: new Date() };

        switch (data.assignmentType) {
            case 'first':
                updateValues.oeFirst = null;
                updateValues.oeFirstAssignedAt = null;
                updateValues.oeFirstAssignedBy = null;
                break;
            case 'siteVisit':
                updateValues.oeSiteVisit = null;
                updateValues.oeSiteVisitAssignedAt = null;
                updateValues.oeSiteVisitAssignedBy = null;
                break;
            case 'docsPrep':
                updateValues.oeDocsPrep = null;
                updateValues.oeDocsPrepVisitAssignedAt = null;
                updateValues.oeDocsPrepVisitAssignedBy = null;
                break;
        }

        const [row] = await this.db
            .update(woBasicDetails)
            .set(updateValues as Partial<typeof woBasicDetails.$inferInsert>)
            .where(eq(woBasicDetails.id, id))
            .returning();

        return this.mapRowToResponse(row!);
    }

    async getOeAssignments(id: number) {
        const row = await this.findById(id);

        return {
            woBasicDetailId: id,
            assignments: {
                first: row.oeFirst
                    ? {
                          oeUserId: row.oeFirst,
                          assignedAt: row.oeFirstAssignedAt,
                          assignedBy: row.oeFirstAssignedBy,
                      }
                    : null,
                siteVisit: row.oeSiteVisit
                    ? {
                          oeUserId: row.oeSiteVisit,
                          assignedAt: row.oeSiteVisitAssignedAt,
                          assignedBy: row.oeSiteVisitAssignedBy,
                      }
                    : null,
                docsPrep: row.oeDocsPrep
                    ? {
                          oeUserId: row.oeDocsPrep,
                          assignedAt: row.oeDocsPrepVisitAssignedAt,
                          assignedBy: row.oeDocsPrepVisitAssignedBy,
                      }
                    : null,
            },
        };
    }

    // ============================================
    // UTILITY OPERATIONS
    // ============================================

    async checkProjectCodeExists(projectCode: string) {
        const [existing] = await this.db
            .select({ id: woBasicDetails.id })
            .from(woBasicDetails)
            .where(eq(woBasicDetails.projectCode, projectCode))
            .limit(1);

        return {
            exists: !!existing,
            projectCode,
        };
    }

    async calculateAndUpdateGrossMargin(id: number) {
        const row = await this.findById(id);

        if (!row.receiptPreGst || !row.budgetPreGst) {
            throw new BadRequestException(
                'Both receiptPreGst and budgetPreGst are required to calculate gross margin',
            );
        }

        const grossMargin = this.calculateGrossMargin(row.receiptPreGst, row.budgetPreGst);

        const [updated] = await this.db
            .update(woBasicDetails)
            .set({
                grossMargin,
                updatedAt: new Date(),
            })
            .where(eq(woBasicDetails.id, id))
            .returning();

        return {
            ...this.mapRowToResponse(updated!),
            calculatedGrossMargin: grossMargin,
        };
    }

    async findByTenderId(tenderId: number) {
        const rows = await this.db
            .select()
            .from(woBasicDetails)
            .where(eq(woBasicDetails.tenderId, tenderId));

        return rows.map((r) => this.mapRowToResponse(r));
    }

    async findByEnquiryId(enquiryId: number) {
        const rows = await this.db
            .select()
            .from(woBasicDetails)
            .where(eq(woBasicDetails.enquiryId, enquiryId));

        return rows.map((r) => this.mapRowToResponse(r));
    }

    // ============================================
    // DASHBOARD/REPORTING
    // ============================================

    async getDashboardSummary() {
        const [stageCounts] = await this.db
            .select({
                total: sql<number>`count(*)::int`,
                basicDetails: sql<number>`count(*) filter (where ${woBasicDetails.currentStage} = 'basic_details')::int`,
                woDetails: sql<number>`count(*) filter (where ${woBasicDetails.currentStage} = 'wo_details')::int`,
                woAcceptance: sql<number>`count(*) filter (where ${woBasicDetails.currentStage} = 'wo_acceptance')::int`,
                woUpload: sql<number>`count(*) filter (where ${woBasicDetails.currentStage} = 'wo_upload')::int`,
                completed: sql<number>`count(*) filter (where ${woBasicDetails.currentStage} = 'completed')::int`,
                paused: sql<number>`count(*) filter (where ${woBasicDetails.isWorkflowPaused} = true)::int`,
            })
            .from(woBasicDetails);

        return {
            summary: stageCounts,
            generatedAt: new Date().toISOString(),
        };
    }

    async getPendingOeAssignments() {
        const rows = await this.db
            .select()
            .from(woBasicDetails)
            .where(
                and(
                    isNull(woBasicDetails.oeFirst),
                    eq(woBasicDetails.currentStage, 'basic_details'),
                ),
            )
            .orderBy(asc(woBasicDetails.createdAt));

        return {
            count: rows.length,
            data: rows.map((r) => this.mapRowToResponse(r)),
        };
    }

    async getWorkflowStatusSummary() {
        const [summary] = await this.db
            .select({
                totalActive: sql<number>`count(*) filter (where ${woBasicDetails.isWorkflowPaused} = false)::int`,
                totalPaused: sql<number>`count(*) filter (where ${woBasicDetails.isWorkflowPaused} = true)::int`,
                avgGrossMargin: sql<string>`round(avg(${woBasicDetails.grossMargin}::numeric), 2)::text`,
                totalWoValue: sql<string>`sum(${woBasicDetails.woValuePreGst}::numeric)::text`,
            })
            .from(woBasicDetails);

        return {
            ...summary,
            generatedAt: new Date().toISOString(),
        };
    }
}
