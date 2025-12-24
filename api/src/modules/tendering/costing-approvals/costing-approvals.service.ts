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
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { EmailService } from '@/modules/email/email.service';

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
    costingStatus: 'Submitted' | 'Approved' | 'Rejected/Redo';
    googleSheetUrl: string | null;
    costingSheetId: number | null;
}

export type CostingApprovalFilters = {
    costingStatus?: 'Submitted' | 'Approved' | 'Rejected/Redo';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export type CostingApprovalDashboardCounts = {
    submitted: number;
    approved: number;
    rejected: number;
    total: number;
};

@Injectable()
export class CostingApprovalsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
    ) { }

    private costingStatusWhere(status?: 'Submitted' | 'Approved' | 'Rejected/Redo') {
        if (status) {
            return eq(tenderCostingSheets.status, status);
        }

        return inArray(tenderCostingSheets.status, [
            'Submitted',
            'Approved',
            'Rejected/Redo',
        ]);
    }

    private costingApprovalBaseWhere() {
        return and(
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost'])
        );
    }

    private costingApprovalBaseQuery(select: any): any {
        return this.db
            .select(select)
            .from(tenderInfos)
            .innerJoin(
                tenderInformation,
                eq(tenderInfos.id, tenderInformation.tenderId)
            )
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .innerJoin(
                tenderCostingSheets,
                eq(tenderCostingSheets.tenderId, tenderInfos.id)
            )
            .innerJoin(users, eq(users.id, tenderInfos.teamMember));
    }

    private getOrderBy(filters?: CostingApprovalFilters) {
        const sortOrder = filters?.sortOrder === 'desc' ? desc : asc;

        switch (filters?.sortBy) {
            case 'tenderNo':
                return sortOrder(tenderInfos.tenderNo);
            case 'tenderName':
                return sortOrder(tenderInfos.tenderName);
            case 'teamMemberName':
                return sortOrder(users.name);
            case 'dueDate':
                return sortOrder(tenderInfos.dueDate);
            case 'gstValues':
                return sortOrder(tenderInfos.gstValues);
            case 'statusName':
                return sortOrder(statuses.name);
            case 'costingStatus':
                return sortOrder(tenderCostingSheets.status);
            default:
                return asc(tenderInfos.dueDate);
        }
    }


    async findAllForApproval(
        userTeam: number,
        filters?: CostingApprovalFilters
    ): Promise<PaginatedResult<CostingApprovalDashboardRow>> {

        const page = filters?.page ?? 1;
        const limit = filters?.limit ?? 50;
        const offset = (page - 1) * limit;

        const whereClause = and(
            this.costingApprovalBaseWhere(),
            this.costingStatusWhere(filters?.costingStatus),
        );
        const [{ count }] = await this.costingApprovalBaseQuery({
            count: sql<number>`count(distinct ${tenderInfos.id})`,
        })
            .where(whereClause) as any;
        const orderByClause = this.getOrderBy(filters);
        const rows = await this.costingApprovalBaseQuery({
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
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset) as any;

        return {
            data: rows.map((row) => ({
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
                costingStatus: row.costingStatus,
                googleSheetUrl: row.googleSheetUrl,
                costingSheetId: row.costingSheetId,
            })),
            meta: {
                total: Number(count),
                page,
                limit,
                totalPages: Math.ceil(Number(count) / limit),
            },
        };
    }

    async getDashboardCounts(): Promise<CostingApprovalDashboardCounts> {
        const [{ count: submitted }] = await this.costingApprovalBaseQuery({
            count: sql<number>`count(distinct ${tenderInfos.id})`,
        })
            .where(eq(tenderCostingSheets.status, 'Submitted')) as any;

        const [{ count: approved }] = await this.costingApprovalBaseQuery({
            count: sql<number>`count(distinct ${tenderInfos.id})`,
        })
            .where(eq(tenderCostingSheets.status, 'Approved')) as any;

        const [{ count: rejected }] = await this.costingApprovalBaseQuery({
            count: sql<number>`count(distinct ${tenderInfos.id})`,
        })
            .where(eq(tenderCostingSheets.status, 'Rejected/Redo')) as any;

        return {
            submitted: Number(submitted),
            approved: Number(approved),
            rejected: Number(rejected),
            total: Number(submitted) + Number(approved) + Number(rejected),
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
        const costingSheet = await this.findById(id, userTeam);

        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(costingSheet.tenderId);
        const prevStatus = currentTender?.status ?? null;

        // AUTO STATUS CHANGE: Update tender status to 7 (Price Bid Approved) and track it
        const newStatus = 7; // Status ID for "Price Bid Approved"

        const [result] = await this.db.transaction(async (tx) => {
            const updated = await tx
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

            // Update tender status
            await tx
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, costingSheet.tenderId));

            // Track status change
            await this.tenderStatusHistoryService.trackStatusChange(
                costingSheet.tenderId,
                newStatus,
                userId,
                prevStatus,
                'Price bid approved'
            );

            return updated;
        });

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
}
