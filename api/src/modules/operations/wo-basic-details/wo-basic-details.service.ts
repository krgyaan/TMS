import {
    Inject,
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { eq, desc, asc, sql, and, or, ilike, gte, lte, isNull, inArray, SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { woBasicDetails, woContacts, woDetails } from '@db/schemas/operations';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { users } from '@db/schemas/auth/users.schema';
import type { CreateWoBasicDetailDto, UpdateWoBasicDetailDto, AssignOeDto, BulkAssignOeDto, RemoveOeAssignmentDto, WoBasicDetailsQueryDto } from './dto/wo-basic-details.dto';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

const oeFirstUser = alias(users, 'oeFirstUser');
const oeSiteVisitUser = alias(users, 'oeSiteVisitUser');
const oeDocsPrepUser = alias(users, 'oeDocsPrepUser');

export type WoBasicDetailRow = typeof woBasicDetails.$inferSelect;

@Injectable()
export class WoBasicDetailsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    private mapCreateToDb(data: CreateWoBasicDetailDto) {
        const now = new Date();
        const out: Record<string, any> = {
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
            woDraft: data.woDraft ?? null,
            teChecklistConfirmed: data.teChecklistConfirmed ?? false,
            tmsDocuments: data.tmsDocuments ?? null,
            isWorkflowPaused: false,
            createdAt: now,
            updatedAt: now,
        };
        return out as Partial<typeof woBasicDetails.$inferInsert>;
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
        if (data.woDraft !== undefined) out.woDraft = data.woDraft;
        if (data.teChecklistConfirmed !== undefined) out.teChecklistConfirmed = data.teChecklistConfirmed;
        if (data.tmsDocuments !== undefined) out.tmsDocuments = data.tmsDocuments;

        return out as any;
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
            woDraft: row.woDraft,
            tmsDocuments: row.tmsDocuments,
            oeFirst: row.oeFirst,
            oeFirstAssignedAt: row.oeFirstAssignedAt,
            oeFirstAssignedBy: row.oeFirstAssignedBy,
            oeSiteVisit: row.oeSiteVisit,
            oeSiteVisitAssignedAt: row.oeSiteVisitAssignedAt,
            oeSiteVisitAssignedBy: row.oeSiteVisitAssignedBy,
            oeDocsPrep: row.oeDocsPrep,
            oeDocsPrepAssignedAt: row.oeDocsPrepAssignedAt,
            oeDocsPrepAssignedBy: row.oeDocsPrepAssignedBy,
            isWorkflowPaused: row.isWorkflowPaused,
            workflowPausedAt: row.workflowPausedAt,
            workflowResumedAt: row.workflowResumedAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    private mapJoinedRowToResponse(row: {
        woBasicDetails: typeof woBasicDetails.$inferSelect;
        oeFirstUser: { name: string | null } | null;
        oeSiteVisitUser: { name: string | null } | null;
        oeDocsPrepUser: { name: string | null } | null;
    }) {
        const r = row.woBasicDetails;
        return {
            ...this.mapRowToResponse(r),
            // Joined fields
            oeFirstName: row.oeFirstUser?.name ?? null,
            oeSiteVisitName: row.oeSiteVisitUser?.name ?? null,
            oeDocsPrepName: row.oeDocsPrepUser?.name ?? null,
        };
    }

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

    private getWoBaseSelect() {
        return {
            woBasicDetails,
            oeFirstUser: {
                name: oeFirstUser.name,
            },
            oeSiteVisitUser: {
                name: oeSiteVisitUser.name,
            },
            oeDocsPrepUser: {
                name: oeDocsPrepUser.name,
            },
        };
    }

    private getBaseQueryBuilder() {
        return this.db
            .select(this.getWoBaseSelect())
            .from(woBasicDetails)
            .leftJoin(oeFirstUser, eq(oeFirstUser.id, woBasicDetails.oeFirst))
            .leftJoin(oeSiteVisitUser, eq(oeSiteVisitUser.id, woBasicDetails.oeSiteVisit))
            .leftJoin(oeDocsPrepUser, eq(oeDocsPrepUser.id, woBasicDetails.oeDocsPrep));
    }

    async findAll(filters?: WoBasicDetailsQueryDto) {
        const page = filters?.page ?? 1;
        const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
        const offset = (page - 1) * limit;
        const sortOrder = filters?.sortOrder ?? 'desc';
        const sortBy = filters?.sortBy ?? 'createdAt';
        const search = filters?.search?.trim();

        // 1. Build Conditions
        const conditions: any[] = [];

        // Apply role-based filtering
        if (filters?.user) {
            conditions.push(...this.getVisibilityConditions(filters.user, filters.teamId));
        }

        if (filters?.unallocated) {
            conditions.push(isNull(woBasicDetails.team));
        }

        // Additional filters
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
        if (filters?.status && filters.status.length > 0) {
            conditions.push(inArray(woBasicDetails.status, filters.status));
        }

        // Search condition (Expanded to joined fields)
        if (search) {
            const searchStr = `%${search}%`;
            conditions.push(
                or(
                    ilike(woBasicDetails.projectName, searchStr),
                    ilike(woBasicDetails.woNumber, searchStr),
                    ilike(woBasicDetails.projectCode, searchStr),
                    ilike(oeFirstUser.name, searchStr),
                    ilike(oeSiteVisitUser.name, searchStr),
                    ilike(oeDocsPrepUser.name, searchStr),
                ),
            );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // 2. Get Total Count
        let countQuery: any = this.db
            .select({ count: sql<number>`count(distinct ${woBasicDetails.id})::int` })
            .from(woBasicDetails);

        // Add joins if search is being used (searches in joined tables)
        if (search) {
            countQuery = countQuery
                .leftJoin(oeFirstUser, eq(oeFirstUser.id, woBasicDetails.oeFirst))
                .leftJoin(oeSiteVisitUser, eq(oeSiteVisitUser.id, woBasicDetails.oeSiteVisit))
                .leftJoin(oeDocsPrepUser, eq(oeDocsPrepUser.id, woBasicDetails.oeDocsPrep));
        }

        const [countResult] = await countQuery.where(whereClause);
        const total = Number(countResult?.count || 0);

        // 3. Determine sorting
        const orderFn = sortOrder === 'desc' ? desc : asc;
        let orderByClause: any;

        switch (sortBy) {
            case 'woDate':
                orderByClause = orderFn(woBasicDetails.woDate);
                break;
            case 'projectCode':
                orderByClause = orderFn(woBasicDetails.projectCode);
                break;
            case 'woNumber':
                orderByClause = orderFn(woBasicDetails.woNumber);
                break;
            case 'projectName':
                orderByClause = orderFn(woBasicDetails.projectName);
                break;
            case 'woValuePreGst':
                orderByClause = orderFn(woBasicDetails.woValuePreGst);
                break;
            case 'woValueGstAmt':
                orderByClause = orderFn(woBasicDetails.woValueGstAmt);
                break;
            case 'grossMargin':
                orderByClause = orderFn(woBasicDetails.grossMargin);
                break;
            case 'oeFirstName':
                orderByClause = orderFn(oeFirstUser.name);
                break;
            case 'oeSiteVisitName':
                orderByClause = orderFn(oeSiteVisitUser.name);
                break;
            case 'oeDocsPrepName':
                orderByClause = orderFn(oeDocsPrepUser.name);
                break;
            case 'currentStage':
                orderByClause = orderFn(woBasicDetails.currentStage);
                break;
            default:
                orderByClause = orderFn(woBasicDetails.createdAt);
        }

        // 4. Get Data
        const rows = await this.getBaseQueryBuilder()
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        const data = rows.map((r) => this.mapJoinedRowToResponse(r as any));

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

    async create(data: CreateWoBasicDetailDto, userId?: number) {
        // Check if project code already exists (if provided)
        if (data.projectCode) {
            const existing = await this.checkProjectCodeExists(data.projectCode);
            if (existing.exists) {
                throw new ConflictException(`Project code ${data.projectCode} already exists`);
            }
        }

        const insertValues = this.mapCreateToDb(data);
        if (userId) {
            insertValues.createdBy = userId;
            insertValues.updatedBy = userId;
        }

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

    async update(id: number, data: UpdateWoBasicDetailDto, userId?: number) {
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
        if (userId) {
            updateValues.updatedBy = userId;
        }

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
                          assignedAt: row.oeDocsPrepAssignedAt,
                          assignedBy: row.oeDocsPrepAssignedBy,
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

    private getVisibilityConditions(user: ValidatedUser, teamId?: number) {
        const conditions: any[] = [];

        // Role ID 1 = Super User, 2 = Admin: Show all, respect teamId filter if provided
        if (user.roleId === 1 || user.roleId === 2) {
            if (teamId !== undefined && teamId !== null) {
                conditions.push(eq(woBasicDetails.team, teamId));
            }
        } else if (user.roleId === 3 || user.roleId === 4 || user.roleId === 6) {
            // Team Leader, Coordinator, Engineer: Filter by teamId
            if (user.teamId) {
                conditions.push(eq(woBasicDetails.team, user.teamId));
            }
        } else {
            // Other roles: Show where they created or are assigned as OE
            conditions.push(
                or(
                    eq(woBasicDetails.createdBy, user.sub),
                    eq(woBasicDetails.oeFirst, user.sub),
                    eq(woBasicDetails.oeSiteVisit, user.sub),
                    eq(woBasicDetails.oeDocsPrep, user.sub),
                ),
            );
        }

        return conditions;
    }

    async getDashboardSummary(user?: ValidatedUser) {
        const conditions: any[] = [];
        if (user) {
            conditions.push(...this.getVisibilityConditions(user));
        }
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
            .from(woBasicDetails)
            .where(whereClause);

        return {
            summary: stageCounts,
            generatedAt: new Date().toISOString(),
        };
    }

    async getPendingOeAssignments(user?: ValidatedUser) {
        const conditions: any[] = [
            isNull(woBasicDetails.oeFirst),
            eq(woBasicDetails.currentStage, 'basic_details'),
        ];
        if (user) {
            conditions.push(...this.getVisibilityConditions(user));
        }

        const rows = await this.db
            .select()
            .from(woBasicDetails)
            .where(and(...conditions))
            .orderBy(asc(woBasicDetails.createdAt));

        return {
            count: rows.length,
            data: rows.map((r) => this.mapRowToResponse(r)),
        };
    }

    async getWorkflowStatusSummary(user?: ValidatedUser) {
        const conditions: any[] = [];
        if (user) {
            conditions.push(...this.getVisibilityConditions(user));
        }
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [summary] = await this.db
            .select({
                totalActive: sql<number>`count(*) filter (where ${woBasicDetails.isWorkflowPaused} = false)::int`,
                totalPaused: sql<number>`count(*) filter (where ${woBasicDetails.isWorkflowPaused} = true)::int`,
                avgGrossMargin: sql<string>`round(avg(${woBasicDetails.grossMargin}::numeric), 2)::text`,
                totalWoValue: sql<string>`sum(${woBasicDetails.woValuePreGst}::numeric)::text`,
            })
            .from(woBasicDetails)
            .where(whereClause);

        return {
            ...summary,
            generatedAt: new Date().toISOString(),
        };
    }
}
