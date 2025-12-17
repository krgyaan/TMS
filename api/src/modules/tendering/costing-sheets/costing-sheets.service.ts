import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, or, asc, desc, sql, isNull, isNotNull } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import { items } from '@db/schemas/master/items.schema';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { tenderCostingSheets } from '@db/schemas/tendering/tender-costing-sheets.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { PaginatedResult } from '@/modules/tendering/tenders/tenders.service';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';

export type CostingSheetDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    dueDate: Date | null;
    emdAmount: string | null;
    gstValues: number;
    costingStatus: 'Pending' | 'Created' | 'Submitted' | 'Approved' | 'Rejected/Redo';
    submittedFinalPrice: string | null;
    submittedBudgetPrice: string | null;
    googleSheetUrl: string | null;
    costingSheetId: number | null;
}

export type CostingSheetFilters = {
    costingStatus?: 'pending' | 'submitted' | 'rejected';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

@Injectable()
export class CostingSheetsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
    ) { }

    async findAll(filters?: CostingSheetFilters): Promise<PaginatedResult<CostingSheetDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        // Build WHERE conditions
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost'])
        ];

        // Add costingStatus filter condition (based on costingSheetId and status)
        if (filters?.costingStatus) {
            if (filters.costingStatus === 'pending') {
                // Pending or Created: no costingSheet OR costingSheet exists but status is null
                baseConditions.push(
                    or(
                        isNull(tenderCostingSheets.id),
                        isNull(tenderCostingSheets.status)
                    )!
                );
            } else if (filters.costingStatus === 'submitted') {
                // Submitted or Approved: status must be 'Submitted' or 'Approved'
                baseConditions.push(
                    inArray(tenderCostingSheets.status, ['Submitted', 'Approved'])
                );
            } else if (filters.costingStatus === 'rejected') {
                // Rejected: status must be 'Rejected/Redo'
                baseConditions.push(
                    eq(tenderCostingSheets.status, 'Rejected/Redo')
                );
            }
        }

        const whereClause = and(...baseConditions);

        // Get total count
        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        // Apply sorting
        let orderByClause;
        if (filters?.sortBy) {
            const sortOrder = filters.sortOrder === 'desc' ? desc : asc;
            switch (filters.sortBy) {
                case 'tenderNo':
                    orderByClause = sortOrder(tenderInfos.tenderNo);
                    break;
                case 'tenderName':
                    orderByClause = sortOrder(tenderInfos.tenderName);
                    break;
                case 'teamMemberName':
                    orderByClause = sortOrder(users.name);
                    break;
                case 'dueDate':
                    orderByClause = sortOrder(tenderInfos.dueDate);
                    break;
                case 'gstValues':
                    orderByClause = sortOrder(tenderInfos.gstValues);
                    break;
                case 'statusName':
                    orderByClause = sortOrder(statuses.name);
                    break;
                default:
                    orderByClause = asc(tenderInfos.dueDate);
            }
        } else {
            orderByClause = asc(tenderInfos.dueDate);
        }

        // Get paginated data
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                teamMemberName: users.name,
                itemName: items.name,
                statusName: statuses.name,
                dueDate: tenderInfos.dueDate,
                emdAmount: tenderInfos.emd,
                gstValues: tenderInfos.gstValues,
                // Costing sheet data (will be null if not exists)
                costingSheetId: tenderCostingSheets.id,
                costingSheetStatus: tenderCostingSheets.status,
                submittedFinalPrice: tenderCostingSheets.submittedFinalPrice,
                submittedBudgetPrice: tenderCostingSheets.submittedBudgetPrice,
                googleSheetUrl: tenderCostingSheets.googleSheetUrl,
            })
            .from(tenderInfos)
            .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(orderByClause);

        const data = rows.map((row) => ({
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: row.tenderName,
            teamMemberName: row.teamMemberName,
            itemName: row.itemName,
            statusName: row.statusName,
            dueDate: row.dueDate,
            emdAmount: row.emdAmount,
            gstValues: row.gstValues ? Number(row.gstValues) : 0,
            costingStatus: this.determineCostingStatus(row.costingSheetId, row.costingSheetStatus),
            submittedFinalPrice: row.submittedFinalPrice,
            submittedBudgetPrice: row.submittedBudgetPrice,
            googleSheetUrl: row.googleSheetUrl,
            costingSheetId: row.costingSheetId,
        }));

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Determine costing status based on costing sheet existence and status
     *
     * Status Flow:
     * - Pending: No costing sheet exists (tender_id not in tender_costing_sheets)
     * - Created: Costing sheet created (google sheet URL present) but not submitted
     * - Submitted: TE submitted, awaiting TL approval
     * - Approved: TL approved the costing
     * - Rejected/Redo: TL rejected, needs re-submission
     */
    private determineCostingStatus(
        costingSheetId: number | null,
        costingSheetStatus: string | null
    ): 'Pending' | 'Created' | 'Submitted' | 'Approved' | 'Rejected/Redo' {
        if (!costingSheetId) {
            return 'Pending';
        }
        if (!costingSheetStatus) {
            return 'Created';
        }
        return costingSheetStatus as 'Submitted' | 'Approved' | 'Rejected/Redo';
    }

    async getDashboardCounts(): Promise<{ pending: number; submitted: number; rejected: number; total: number }> {
        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderCostingSheets)
            .where(isNull(tenderCostingSheets.id));
        const pending = Number(countResult?.count || 0);
        const [submittedCountResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderCostingSheets)
            .where(inArray(tenderCostingSheets.status, ['Submitted', 'Approved']));
        const submitted = Number(submittedCountResult?.count || 0);
        const [rejectedCountResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderCostingSheets)
            .where(eq(tenderCostingSheets.status, 'Rejected/Redo'));
        const rejected = Number(rejectedCountResult?.count || 0);
        const total = pending + submitted + rejected;
        console.log(pending, submitted, rejected, total);
        return { pending, submitted, rejected, total };
    }

    async findByTenderId(tenderId: number) {
        const result = await this.db
            .select()
            .from(tenderCostingSheets)
            .where(eq(tenderCostingSheets.tenderId, tenderId))
            .limit(1);

        return result[0] || null;
    }

    async findById(id: number) {
        const result = await this.db
            .select()
            .from(tenderCostingSheets)
            .where(eq(tenderCostingSheets.id, id))
            .limit(1);

        if (!result[0]) {
            throw new NotFoundException('Costing sheet not found');
        }

        return result[0];
    }

    async create(data: {
        tenderId: number;
        submittedFinalPrice: string;
        submittedReceiptPrice: string;
        submittedBudgetPrice: string;
        submittedGrossMargin: string;
        teRemarks: string;
        submittedBy: number;
    }) {
        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(data.tenderId);
        const prevStatus = currentTender?.status ?? null;

        // AUTO STATUS CHANGE: Update tender status to 6 (Price Bid ready) and track it
        const newStatus = 6; // Status ID for "Price Bid ready"

        const result = await this.db.transaction(async (tx) => {
            const costingSheet = await tx
                .insert(tenderCostingSheets)
                .values({
                    tenderId: data.tenderId,
                    submittedFinalPrice: data.submittedFinalPrice,
                    submittedReceiptPrice: data.submittedReceiptPrice,
                    submittedBudgetPrice: data.submittedBudgetPrice,
                    submittedGrossMargin: data.submittedGrossMargin,
                    teRemarks: data.teRemarks,
                    submittedBy: data.submittedBy,
                    status: 'Submitted',
                    submittedAt: new Date(),
                })
                .returning();

            // Update tender status
            await tx
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, data.tenderId));

            // Track status change
            await this.tenderStatusHistoryService.trackStatusChange(
                data.tenderId,
                newStatus,
                data.submittedBy,
                prevStatus,
                'Price bid ready',
                tx
            );

            return costingSheet;
        });

        return result[0];
    }

    async update(id: number, data: {
        submittedFinalPrice: string;
        submittedReceiptPrice: string;
        submittedBudgetPrice: string;
        submittedGrossMargin: string;
        teRemarks: string;
    }, changedBy: number) {
        // Get costing sheet to find tenderId
        const costingSheet = await this.findById(id);

        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(costingSheet.tenderId);
        const prevStatus = currentTender?.status ?? null;

        // AUTO STATUS CHANGE: Update tender status to 6 (Price Bid ready) when resubmitted
        const newStatus = 6; // Status ID for "Price Bid ready"

        const [result] = await this.db.transaction(async (tx) => {
            const updated = await tx
                .update(tenderCostingSheets)
                .set({
                    submittedFinalPrice: data.submittedFinalPrice,
                    submittedReceiptPrice: data.submittedReceiptPrice,
                    submittedBudgetPrice: data.submittedBudgetPrice,
                    submittedGrossMargin: data.submittedGrossMargin,
                    teRemarks: data.teRemarks,
                    status: 'Submitted',
                    submittedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(tenderCostingSheets.id, id))
                .returning();

            // Update tender status
            await tx
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, costingSheet.tenderId));

            // Track status change
            await this.tenderStatusHistoryService.trackStatusChange(
                costingSheet.tenderId,
                newStatus,
                changedBy,
                prevStatus,
                'Price bid ready',
                tx
            );

            return updated;
        });

        return result;
    }

    /**
     * Get Costing Sheet Dashboard data - Updated implementation per requirements
     * Type logic based on tenderCostingSheets existence and status
     */
    async getCostingSheetData(
        type?: 'pending' | 'submitted' | 'rejected',
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
    ): Promise<PaginatedResult<CostingSheetDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        // Build base conditions
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
        ];

        // Add type-specific filters
        if (type === 'pending') {
            baseConditions.push(
                or(
                    isNull(tenderCostingSheets.id),
                    isNull(tenderCostingSheets.status)
                )!
            );
        } else if (type === 'submitted') {
            baseConditions.push(
                inArray(tenderCostingSheets.status, ['Submitted', 'Approved'])
            );
        } else if (type === 'rejected') {
            baseConditions.push(
                eq(tenderCostingSheets.status, 'Rejected/Redo')
            );
        }

        const whereClause = and(...baseConditions);

        // Build orderBy clause
        let orderByClause: any = asc(tenderInfos.dueDate); // Default
        if (filters?.sortBy) {
            const sortOrder = filters.sortOrder === 'desc' ? desc : asc;
            switch (filters.sortBy) {
                case 'tenderNo':
                    orderByClause = sortOrder(tenderInfos.tenderNo);
                    break;
                case 'tenderName':
                    orderByClause = sortOrder(tenderInfos.tenderName);
                    break;
                case 'teamMemberName':
                    orderByClause = sortOrder(users.name);
                    break;
                case 'dueDate':
                    orderByClause = sortOrder(tenderInfos.dueDate);
                    break;
                case 'gstValues':
                    orderByClause = sortOrder(tenderInfos.gstValues);
                    break;
                default:
                    orderByClause = asc(tenderInfos.dueDate);
            }
        }

        // Get total count
        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        // Get paginated data
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                teamMemberName: users.name,
                itemName: items.name,
                statusName: statuses.name,
                dueDate: tenderInfos.dueDate,
                emdAmount: tenderInfos.emd,
                gstValues: tenderInfos.gstValues,
                costingSheetId: tenderCostingSheets.id,
                costingSheetStatus: tenderCostingSheets.status,
                submittedFinalPrice: tenderCostingSheets.submittedFinalPrice,
                submittedBudgetPrice: tenderCostingSheets.submittedBudgetPrice,
                googleSheetUrl: tenderCostingSheets.googleSheetUrl,
            })
            .from(tenderInfos)
            .innerJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(orderByClause);

        const data: CostingSheetDashboardRow[] = rows.map((row) => ({
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: `${row.tenderName} - ${row.tenderNo}`,
            teamMemberName: row.teamMemberName,
            itemName: row.itemName,
            statusName: row.statusName,
            dueDate: row.dueDate,
            emdAmount: row.emdAmount,
            gstValues: row.gstValues ? Number(row.gstValues) : 0,
            costingStatus: this.determineCostingStatus(row.costingSheetId, row.costingSheetStatus),
            submittedFinalPrice: row.submittedFinalPrice,
            submittedBudgetPrice: row.submittedBudgetPrice,
            googleSheetUrl: row.googleSheetUrl,
            costingSheetId: row.costingSheetId,
        }));

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
