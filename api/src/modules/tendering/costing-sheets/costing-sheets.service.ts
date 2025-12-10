import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, or, asc } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import { items } from '@db/schemas/master/items.schema';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { tenderCostingSheets } from '@db/schemas/tendering/tender-costing-sheets.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';

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

@Injectable()
export class CostingSheetsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<CostingSheetDashboardRow[]> {
        // Get all approved tenders with their costing sheet info (if exists)
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
            .where(and(
                TenderInfosService.getActiveCondition(),
                TenderInfosService.getApprovedCondition(),
                TenderInfosService.getExcludeStatusCondition(['dnb', 'lost'])
            ))
            .orderBy(asc(tenderInfos.dueDate));

        return rows.map((row) => ({
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
        const [result] = await this.db
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

        return result;
    }

    async update(id: number, data: {
        submittedFinalPrice: string;
        submittedReceiptPrice: string;
        submittedBudgetPrice: string;
        submittedGrossMargin: string;
        teRemarks: string;
    }) {
        const [result] = await this.db
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

        return result;
    }
}
