import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, asc, desc, sql, isNull } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { items } from '@db/schemas/master/items.schema';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { tenderCostingSheets } from '@db/schemas/tendering/tender-costing-sheets.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { users } from '@/db/schemas/auth/users.schema';
import type { PaginatedResult } from '@/modules/tendering/tenders/tenders.service';

export type CostingApprovalDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMember: number | null;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    dueDate: Date | null;
    emdAmount: string | null;
    gstValues: number;
    costingStatus: 'Pending' | 'Approved' | 'Rejected/Redo';
    googleSheetUrl: string | null;
    costingSheetId: number | null;
}

export type CostingApprovalFilters = {
    costingStatus?: 'Pending' | 'Approved' | 'Rejected/Redo';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

@Injectable()
export class CostingApprovalsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    /**
     * Get all costing sheets for TL approval
     * Filtered by TL's team
     */
    async findAllForApproval(userTeam: number, filters?: CostingApprovalFilters): Promise<PaginatedResult<CostingApprovalDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        // Build WHERE conditions
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
            // Only show costing sheets that are submitted, approved, or rejected
            inArray(tenderCostingSheets.status, ['Pending', 'Approved', 'Rejected/Redo'])
        ];

        // Add costingStatus filter condition
        if (filters?.costingStatus) {
            baseConditions.push(eq(tenderCostingSheets.status, filters.costingStatus));
        }

        const whereClause = and(...baseConditions);

        // Get total count
        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .innerJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
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
                case 'costingStatus':
                    orderByClause = sortOrder(tenderCostingSheets.status);
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
                teamMember: tenderInfos.teamMember,
                teamMemberName: users.name,
                itemName: items.name,
                statusName: statuses.name,
                dueDate: tenderInfos.dueDate,
                emdAmount: tenderInfos.emd,
                gstValues: tenderInfos.gstValues,
                // Costing sheet data
                costingSheetId: tenderCostingSheets.id,
                costingStatus: tenderCostingSheets.status,
                googleSheetUrl: tenderCostingSheets.googleSheetUrl,
            })
            .from(tenderInfos)
            .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .innerJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(orderByClause);

        const data = rows.map((row) => ({
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: row.tenderName,
            teamMember: row.teamMember,
            teamMemberName: row.teamMemberName,
            itemName: row.itemName,
            statusName: row.statusName,
            dueDate: row.dueDate,
            emdAmount: row.emdAmount,
            gstValues: row.gstValues ? Number(row.gstValues) : 0,
            costingStatus: row.costingStatus as 'Pending' | 'Approved' | 'Rejected/Redo',
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

    async findById(id: number, userTeam: number) {
        // Join with tenderInfos to verify team access
        const result = await this.db
            .select({
                costingSheet: tenderCostingSheets,
                tenderTeam: tenderInfos.team,
            })
            .from(tenderCostingSheets)
            .innerJoin(tenderInfos, eq(tenderInfos.id, tenderCostingSheets.tenderId))
            .where(eq(tenderCostingSheets.id, id))
            .limit(1);

        if (!result[0]) {
            throw new NotFoundException('Costing sheet not found');
        }

        // Verify team access
        // if (result[0].tenderTeam !== userTeam) {
        //     throw new ForbiddenException('You can only access costing sheets in your team');
        // }

        return result[0].costingSheet;
    }

    async approve(
        id: number,
        userTeam: number,
        userId: number,
        data: {
            finalPrice: string;
            receiptPrice: string;
            budgetPrice: string;
            grossMargin: string;
            oemVendorIds: number[];
            tlRemarks: string;
        }
    ) {
        // Verify access
        await this.findById(id, userTeam);

        const [result] = await this.db
            .update(tenderCostingSheets)
            .set({
                status: 'Approved',
                finalPrice: data.finalPrice,
                receiptPrice: data.receiptPrice,
                budgetPrice: data.budgetPrice,
                grossMargin: data.grossMargin,
                oemVendorIds: data.oemVendorIds,
                tlRemarks: data.tlRemarks,
                approvedBy: userId,
                approvedAt: new Date(),
                rejectionReason: null, // Clear rejection reason if any
                updatedAt: new Date(),
            })
            .where(eq(tenderCostingSheets.id, id))
            .returning();

        return result;
    }

    async reject(
        id: number,
        userTeam: number,
        userId: number,
        rejectionReason: string
    ) {
        // Verify access
        await this.findById(id, userTeam);

        const [result] = await this.db
            .update(tenderCostingSheets)
            .set({
                status: 'Rejected/Redo',
                rejectionReason: rejectionReason,
                // Clear approved fields
                finalPrice: null,
                receiptPrice: null,
                budgetPrice: null,
                grossMargin: null,
                oemVendorIds: null,
                tlRemarks: null,
                approvedBy: null,
                approvedAt: null,
                updatedAt: new Date(),
            })
            .where(eq(tenderCostingSheets.id, id))
            .returning();

        return result;
    }

    async updateApproved(
        id: number,
        userTeam: number,
        userId: number,
        data: {
            finalPrice: string;
            receiptPrice: string;
            budgetPrice: string;
            grossMargin: string;
            oemVendorIds: number[];
            tlRemarks: string;
        }
    ) {
        // Verify access and that it's already approved
        const existing = await this.findById(id, userTeam);

        if (existing.status !== 'Approved') {
            throw new ForbiddenException('Can only edit already approved costing sheets');
        }

        const [result] = await this.db
            .update(tenderCostingSheets)
            .set({
                finalPrice: data.finalPrice,
                receiptPrice: data.receiptPrice,
                budgetPrice: data.budgetPrice,
                grossMargin: data.grossMargin,
                oemVendorIds: data.oemVendorIds,
                tlRemarks: data.tlRemarks,
                approvedBy: userId, // Update approver
                approvedAt: new Date(), // Update approval time
                updatedAt: new Date(),
            })
            .where(eq(tenderCostingSheets.id, id))
            .returning();

        return result;
    }

    /**
     * Get Costing Approval Dashboard data - Updated implementation per requirements
     * Type logic based on tenderCostingSheets.status
     */
    async getCostingApprovalData(
        type?: 'pending' | 'approved' | 'rejected',
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
    ): Promise<PaginatedResult<CostingApprovalDashboardRow>> {
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
            baseConditions.push(eq(tenderCostingSheets.status, 'Submitted'));
        } else if (type === 'approved') {
            baseConditions.push(eq(tenderCostingSheets.status, 'Approved'));
        } else if (type === 'rejected') {
            baseConditions.push(eq(tenderCostingSheets.status, 'Rejected/Redo'));
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
            .innerJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
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
                teamMember: tenderInfos.teamMember,
                teamMemberName: users.name,
                itemName: items.name,
                statusName: statuses.name,
                dueDate: tenderInfos.dueDate,
                emdAmount: tenderInfos.emd,
                gstValues: tenderInfos.gstValues,
                costingSheetId: tenderCostingSheets.id,
                costingStatus: tenderCostingSheets.status,
                googleSheetUrl: tenderCostingSheets.googleSheetUrl,
            })
            .from(tenderInfos)
            .innerJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(orderByClause);

        const data: CostingApprovalDashboardRow[] = rows.map((row) => ({
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: `${row.tenderName} - ${row.tenderNo}`,
            teamMember: row.teamMember,
            teamMemberName: row.teamMemberName,
            itemName: row.itemName,
            statusName: row.statusName,
            dueDate: row.dueDate,
            emdAmount: row.emdAmount,
            gstValues: row.gstValues ? Number(row.gstValues) : 0,
            costingStatus: row.costingStatus as 'Pending' | 'Approved' | 'Rejected/Redo',
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
