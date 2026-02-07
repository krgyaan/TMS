import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { and, eq, inArray, or, asc, desc, sql, isNull, isNotNull, notInArray } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import { items } from '@db/schemas/master/items.schema';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { tenderCostingSheets } from '@db/schemas/tendering/tender-costing-sheets.schema';
import { tenderStatusHistory } from '@db/schemas/tendering/tender-status-history.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { GoogleDriveService } from '@/modules/integrations/google/google-drive.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import { TimersService } from '@/modules/timers/timers.service';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

export type CostingSheetDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    itemName: string | null;
    status: number;
    statusName: string | null;
    latestStatus: number | null;
    latestStatusName: string | null;
    statusRemark: string | null;
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
    search?: string;
};

@Injectable()
export class CostingSheetsService {
    private readonly logger = new Logger(CostingSheetsService.name);
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly googleDriveService: GoogleDriveService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly timersService: TimersService,
    ) { }

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

    /**
     * Get dashboard data by tab - Direct queries without config
     */
    async getDashboardData(
        tabKey?: 'pending' | 'submitted' | 'tender-dnb',
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string },
        user?: ValidatedUser,
        teamId?: number
    ): Promise<PaginatedResult<CostingSheetDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const activeTab = tabKey || 'pending';

        // Build base conditions
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            // TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
        ];

        // Apply role-based filtering
        const roleFilterConditions: any[] = [];
        if (user && user.roleId) {
            // Role ID 1 = Super User, 2 = Admin: Show all tenders, respect teamId filter if provided
            if (user.roleId === 1 || user.roleId === 2) {
                // Super User or Admin: Show all, respect teamId filter if provided
                if (teamId !== undefined && teamId !== null) {
                    roleFilterConditions.push(eq(tenderInfos.team, teamId));
                }
                // If no teamId filter, show all (no additional condition added)
            } else if (user.roleId === 3 || user.roleId === 4 || user.roleId === 6) {
                // Role ID 3 = Team Leader, 4 = Coordinator, 6 = Engineer: Filter by primary_team_id
                if (user.teamId) {
                    roleFilterConditions.push(eq(tenderInfos.team, user.teamId));
                } else {
                    // If no teamId, return empty results (user has no team assigned)
                    roleFilterConditions.push(sql`1 = 0`); // Always false condition
                }
            } else {
                // All other roles: Show only own tenders
                if (user.sub) {
                    roleFilterConditions.push(eq(tenderInfos.teamMember, user.sub));
                } else {
                    // If no user ID, return empty results
                    roleFilterConditions.push(sql`1 = 0`); // Always false condition
                }
            }
        } else {
            // No user provided - return empty results for security
            roleFilterConditions.push(sql`1 = 0`); // Always false condition
        }

        // Build tab-specific conditions
        const conditions = [...baseConditions, ...roleFilterConditions];

        if (activeTab === 'pending') {
            conditions.push(TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']));
            conditions.push(or(inArray(tenderCostingSheets.status, ['Pending', 'Rejected/Redo']),
                isNull(tenderCostingSheets.submittedFinalPrice)) as any);
        } else if (activeTab === 'submitted') {
            conditions.push(TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']));
            conditions.push(or(eq(tenderCostingSheets.status, 'Submitted'),
                isNotNull(tenderCostingSheets.submittedFinalPrice)) as any);
        } else if (activeTab === 'tender-dnb') {
            conditions.push(inArray(tenderInfos.status, [8, 34]));
        } else {
            throw new BadRequestException(`Invalid tab: ${activeTab}`);
        }

        // Add search conditions
        if (filters?.search) {
            const searchStr = `%${filters.search}%`;
            conditions.push(
                sql`(
                    ${tenderInfos.tenderName} ILIKE ${searchStr} OR
                    ${tenderInfos.tenderNo} ILIKE ${searchStr} OR
                    ${tenderInfos.dueDate}::text ILIKE ${searchStr} OR
                    ${users.name} ILIKE ${searchStr} OR
                    ${statuses.name} ILIKE ${searchStr}
                )`
            );
        }

        const whereClause = and(...conditions);

        // Build orderBy clause
        const sortBy = filters?.sortBy;
        const sortOrder = filters?.sortOrder || 'desc'; // Default to desc like Laravel
        let orderByClause: any = desc(tenderInfos.dueDate); // Default to desc

        if (sortBy) {
            const sortFn = sortOrder === 'desc' ? desc : asc;
            switch (sortBy) {
                case 'tenderNo':
                    orderByClause = sortFn(tenderInfos.tenderNo);
                    break;
                case 'tenderName':
                    orderByClause = sortFn(tenderInfos.tenderName);
                    break;
                case 'teamMemberName':
                    orderByClause = sortFn(users.name);
                    break;
                case 'dueDate':
                    orderByClause = sortFn(tenderInfos.dueDate);
                    break;
                case 'submissionDate':
                    orderByClause = sortFn(tenderCostingSheets.createdAt);
                    break;
                case 'statusChangeDate':
                    orderByClause = sortFn(tenderInfos.updatedAt);
                    break;
                case 'gstValues':
                    orderByClause = sortFn(tenderInfos.gstValues);
                    break;
                case 'statusName':
                    orderByClause = sortFn(statuses.name);
                    break;
                default:
                    orderByClause = sortFn(tenderInfos.dueDate);
            }
        }

        // Get total count
        const [countResult] = await this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
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
                status: tenderInfos.status,
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
            .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        const data = rows.map((row) => ({
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: row.tenderName,
            teamMemberName: row.teamMemberName,
            itemName: row.itemName,
            status: row.status,
            statusName: row.statusName,
            latestStatus: null,
            latestStatusName: null,
            statusRemark: null,
            dueDate: row.dueDate,
            emdAmount: row.emdAmount,
            gstValues: row.gstValues ? Number(row.gstValues) : 0,
            costingStatus: this.determineCostingStatus(row.costingSheetId, row.costingSheetStatus),
            submittedFinalPrice: row.submittedFinalPrice,
            submittedBudgetPrice: row.submittedBudgetPrice,
            googleSheetUrl: row.googleSheetUrl,
            costingSheetId: row.costingSheetId,
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    async getDashboardCounts(user?: ValidatedUser, teamId?: number): Promise<{ pending: number; submitted: number; 'tender-dnb': number; total: number }> {
        const baseCondition = TenderInfosService.getActiveCondition();

        // Apply role-based filtering
        const roleFilterConditions: any[] = [];
        if (user && user.roleId) {
            // Role ID 1 = Super User, 2 = Admin: Show all tenders, respect teamId filter if provided
            if (user.roleId === 1 || user.roleId === 2) {
                // Super User or Admin: Show all, respect teamId filter if provided
                if (teamId !== undefined && teamId !== null) {
                    roleFilterConditions.push(eq(tenderInfos.team, teamId));
                }
                // If no teamId filter, show all (no additional condition added)
            } else if (user.roleId === 3 || user.roleId === 4 || user.roleId === 6) {
                // Role ID 3 = Team Leader, 4 = Coordinator, 6 = Engineer: Filter by primary_team_id
                if (user.teamId) {
                    roleFilterConditions.push(eq(tenderInfos.team, user.teamId));
                } else {
                    // If no teamId, return empty results (user has no team assigned)
                    roleFilterConditions.push(sql`1 = 0`); // Always false condition
                }
            } else {
                // All other roles: Show only own tenders
                if (user.sub) {
                    roleFilterConditions.push(eq(tenderInfos.teamMember, user.sub));
                } else {
                    // If no user ID, return empty results
                    roleFilterConditions.push(sql`1 = 0`); // Always false condition
                }
            }
        } else {
            // No user provided - return empty results for security
            roleFilterConditions.push(sql`1 = 0`); // Always false condition
        }

        const filteredBaseCondition = roleFilterConditions.length > 0
            ? and(baseCondition, ...roleFilterConditions)
            : baseCondition;

        const baseConditions = [
            filteredBaseCondition,
            TenderInfosService.getApprovedCondition(),
            // TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
        ];

        // Count pending: sheet doesn't exist OR sheet exists but final_price is null
        const pendingConditions = [
            ...baseConditions,
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
            or(inArray(tenderCostingSheets.status, ['Pending', 'Rejected/Redo']),
                isNull(tenderCostingSheets.submittedFinalPrice)),
        ];
        const submittedConditions = [
            ...baseConditions,
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
            or(eq(tenderCostingSheets.status, 'Submitted'),
                isNotNull(tenderCostingSheets.submittedFinalPrice)),
        ];

        const tenderDnbConditions = [
            ...baseConditions,
            inArray(tenderInfos.status, [8, 34]),
        ];

        const counts = await Promise.all([
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
                .innerJoin(users, eq(users.id, tenderInfos.teamMember))
                .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
                .where(and(...pendingConditions))
                .then(([result]) => Number(result?.count || 0)),
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
                .innerJoin(users, eq(users.id, tenderInfos.teamMember))
                .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
                .where(and(...submittedConditions))
                .then(([result]) => Number(result?.count || 0)),
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
                .innerJoin(users, eq(users.id, tenderInfos.teamMember))
                .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
                .where(and(...tenderDnbConditions))
                .then(([result]) => Number(result?.count || 0)),
        ]);

        return {
            pending: counts[0],
            submitted: counts[1],
            'tender-dnb': counts[2],
            total: counts.reduce((sum, count) => sum + count, 0),
        };
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

        // Send email notification
        await this.sendCostingSheetSubmittedEmail(data.tenderId, result[0], data.submittedBy);

        // TIMER TRANSITION: Stop costing_sheet timer
        try {
            this.logger.log(`Stopping timer for tender ${data.tenderId} after costing sheet submitted`);
            await this.timersService.stopTimer({
                entityType: 'TENDER',
                entityId: data.tenderId,
                stage: 'costing_sheet',
                userId: data.submittedBy,
                reason: 'Costing sheet submitted'
            });
            this.logger.log(`Successfully stopped costing_sheet timer for tender ${data.tenderId}`);
        } catch (error) {
            this.logger.error(`Failed to stop timer for tender ${data.tenderId} after costing sheet submitted:`, error);
            // Don't fail the entire operation if timer transition fails
        }

        return result[0];
    }

    async update(id: number, data: {
        submittedFinalPrice?: string;
        submittedReceiptPrice?: string;
        submittedBudgetPrice?: string;
        submittedGrossMargin?: string;
        teRemarks?: string;
    }, changedBy: number) {
        // Get costing sheet to find tenderId
        const costingSheet = await this.findById(id);

        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(costingSheet.tenderId);
        const prevStatus = currentTender?.status ?? null;

        // AUTO STATUS CHANGE: Update tender status to 6 (Price Bid ready) when resubmitted
        const newStatus = 6; // Status ID for "Price Bid ready"

        const updateData: any = {
            status: 'Submitted',
            submittedAt: new Date(),
            updatedAt: new Date(),
        };

        if (data.submittedFinalPrice !== undefined) updateData.submittedFinalPrice = data.submittedFinalPrice;
        if (data.submittedReceiptPrice !== undefined) updateData.submittedReceiptPrice = data.submittedReceiptPrice;
        if (data.submittedBudgetPrice !== undefined) updateData.submittedBudgetPrice = data.submittedBudgetPrice;
        if (data.submittedGrossMargin !== undefined) updateData.submittedGrossMargin = data.submittedGrossMargin;
        if (data.teRemarks !== undefined) updateData.teRemarks = data.teRemarks;

        const [result] = await this.db.transaction(async (tx) => {
            const updated = await tx
                .update(tenderCostingSheets)
                .set(updateData)
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

        // Send email notification
        await this.sendCostingSheetSubmittedEmail(costingSheet.tenderId, result, changedBy);

        // TIMER TRANSITION: Stop costing_sheet timer if status is 'Submitted'
        if (updateData.status === 'Submitted') {
            try {
                this.logger.log(`Stopping timer for tender ${costingSheet.tenderId} after costing sheet resubmitted`);
                await this.timersService.stopTimer({
                    entityType: 'TENDER',
                    entityId: costingSheet.tenderId,
                    stage: 'costing_sheet',
                    userId: changedBy,
                    reason: 'Costing sheet resubmitted'
                });
                this.logger.log(`Successfully stopped costing_sheet timer for tender ${costingSheet.tenderId}`);
            } catch (error) {
                this.logger.error(`Failed to stop timer for tender ${costingSheet.tenderId} after costing sheet resubmitted:`, error);
                // Don't fail the entire operation if timer transition fails
            }
        }

        return result;
    }

    /**
 * Check user's Drive scope status
 */
    async checkDriveScopes(userId: number) {
        return this.googleDriveService.checkUserHasDriveScopes(userId);
    }

    /**
     * Create Google Sheet for a tender
     */
    async createGoogleSheet(tenderId: number, userId: number): Promise<{
        success: boolean;
        sheetUrl?: string;
        sheetId?: string;
        message?: string;
        isDuplicate?: boolean;
        existingSheetUrl?: string;
        suggestedName?: string;
    }> {
        // 1. Get tender details
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender) {
            throw new NotFoundException(`Tender with ID ${tenderId} not found`);
        }

        const teamId = tender.team;
        const sheetName = tender.tenderName;

        // 2. Check team config
        const teamConfig = this.googleDriveService.getTeamConfig(teamId);
        if (!teamConfig) {
            throw new BadRequestException(
                `Team ${teamId} is not configured for Google Drive integration`,
            );
        }

        if (!teamConfig.folderId) {
            throw new BadRequestException(
                `Google Drive folder not configured for team "${teamConfig.teamName}". Please contact administrator.`,
            );
        }

        // 3. Check if costing sheet already exists for this tender
        const existingSheet = await this.findByTenderId(tenderId);
        if (existingSheet?.googleSheetUrl) {
            return {
                success: false,
                message: 'Costing sheet already exists for this tender',
                sheetUrl: existingSheet.googleSheetUrl,
                sheetId: existingSheet.googleSheetId || undefined,
            };
        }

        // 4. Check for duplicate name in Drive folder
        let duplicateCheck;
        try {
            duplicateCheck = await this.googleDriveService.checkDuplicateInFolder(
                userId,
                teamId,
                sheetName,
            );
        } catch (error) {
            this.logger.error(`Error checking for duplicate sheet: ${error instanceof Error ? error.message : String(error)}`);
            throw new BadRequestException(
                `Failed to check for duplicate sheet: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }

        if (duplicateCheck.isDuplicate) {
            return {
                success: false,
                isDuplicate: true,
                message: `A costing sheet with name "${sheetName}" already exists in the folder.`,
                existingSheetUrl: duplicateCheck.existingSheetUrl,
                suggestedName: duplicateCheck.suggestedName,
            };
        }

        // 5. Create the Google Sheet
        let sheetResult;
        try {
            sheetResult = await this.googleDriveService.createSheet(
                userId,
                teamId,
                sheetName,
            );
        } catch (error) {
            this.logger.error(`Error creating Google Sheet: ${error instanceof Error ? error.message : String(error)}`);
            // Re-throw NestJS exceptions (BadRequestException, ForbiddenException, NotFoundException, etc.)
            if (error instanceof BadRequestException ||
                error instanceof NotFoundException ||
                error instanceof ForbiddenException) {
                throw error;
            }
            // Wrap other errors
            throw new BadRequestException(
                `Failed to create Google Sheet: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }

        // 6. Save to database
        const now = new Date();

        if (existingSheet) {
            // Update existing record
            await this.db
                .update(tenderCostingSheets)
                .set({
                    googleSheetId: sheetResult.sheetId,
                    googleSheetUrl: sheetResult.sheetUrl,
                    sheetTitle: sheetResult.sheetTitle,
                    driveFolderId: sheetResult.folderId,
                    sheetCreatedBy: userId.toString(),
                    sheetCreatedAt: now,
                    updatedAt: now,
                })
                .where(eq(tenderCostingSheets.id, existingSheet.id));
        } else {
            // Create new record
            await this.db.insert(tenderCostingSheets).values({
                tenderId,
                googleSheetId: sheetResult.sheetId,
                googleSheetUrl: sheetResult.sheetUrl,
                sheetTitle: sheetResult.sheetTitle,
                driveFolderId: sheetResult.folderId,
                sheetCreatedBy: userId.toString(),
                sheetCreatedAt: now,
            });
        }

        this.logger.log(
            `Created costing sheet for tender ${tenderId}: ${sheetResult.sheetUrl}`,
        );

        return {
            success: true,
            sheetUrl: sheetResult.sheetUrl,
            sheetId: sheetResult.sheetId,
        };
    }

    /**
     * Create Google Sheet with a custom name (for duplicate resolution)
     */
    async createGoogleSheetWithName(
        tenderId: number,
        userId: number,
        customName: string,
    ): Promise<{
        success: boolean;
        sheetUrl?: string;
        sheetId?: string;
        message?: string;
    }> {
        // 1. Get tender details
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender) {
            throw new NotFoundException(`Tender with ID ${tenderId} not found`);
        }

        const teamId = tender.team;

        // 2. Check team config
        const teamConfig = this.googleDriveService.getTeamConfig(teamId);
        if (!teamConfig || !teamConfig.folderId) {
            throw new BadRequestException(
                `Google Drive not configured for this team`,
            );
        }

        // 3. Check if costing sheet already exists
        const existingSheet = await this.findByTenderId(tenderId);
        if (existingSheet?.googleSheetUrl) {
            return {
                success: false,
                message: 'Costing sheet already exists for this tender',
                sheetUrl: existingSheet.googleSheetUrl,
            };
        }

        // 4. Create the Google Sheet with custom name
        const sheetResult = await this.googleDriveService.createSheet(
            userId,
            teamId,
            customName,
        );

        // 5. Save to database
        const now = new Date();

        if (existingSheet) {
            await this.db
                .update(tenderCostingSheets)
                .set({
                    googleSheetId: sheetResult.sheetId,
                    googleSheetUrl: sheetResult.sheetUrl,
                    sheetTitle: sheetResult.sheetTitle,
                    driveFolderId: sheetResult.folderId,
                    sheetCreatedBy: userId.toString(),
                    sheetCreatedAt: now,
                    updatedAt: now,
                })
                .where(eq(tenderCostingSheets.id, existingSheet.id));
        } else {
            await this.db.insert(tenderCostingSheets).values({
                tenderId,
                googleSheetId: sheetResult.sheetId,
                googleSheetUrl: sheetResult.sheetUrl,
                sheetTitle: sheetResult.sheetTitle,
                driveFolderId: sheetResult.folderId,
                sheetCreatedBy: userId.toString(),
                sheetCreatedAt: now,
            });
        }

        return {
            success: true,
            sheetUrl: sheetResult.sheetUrl,
            sheetId: sheetResult.sheetId,
        };
    }

    /**
     * Helper method to send email notifications
     */
    private async sendEmail(
        eventType: string,
        tenderId: number,
        fromUserId: number,
        subject: string,
        template: string,
        data: Record<string, any>,
        recipients: { to?: RecipientSource[]; cc?: RecipientSource[] }
    ) {
        try {
            await this.emailService.sendTenderEmail({
                tenderId,
                eventType,
                fromUserId,
                to: recipients.to || [],
                cc: recipients.cc,
                subject,
                template,
                data,
            });
        } catch (error) {
            this.logger.error(`Failed to send email for tender ${tenderId}: ${error instanceof Error ? error.message : String(error)}`);
            // Don't throw - email failure shouldn't break main operation
        }
    }

    /**
     * Send costing sheet submitted email
     */
    private async sendCostingSheetSubmittedEmail(
        tenderId: number,
        costingSheet: { googleSheetUrl: string | null; submittedFinalPrice: string | null; submittedReceiptPrice: string | null; submittedBudgetPrice: string | null; submittedGrossMargin: string | null; teRemarks: string | null },
        submittedBy: number
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

        // Get Team Leader name
        const teamLeaderEmails = await this.recipientResolver.getEmailsByRole('Team Leader', tender.team);
        let tlName = 'Team Leader';
        if (teamLeaderEmails.length > 0) {
            const [tlUser] = await this.db
                .select({ name: users.name })
                .from(users)
                .where(eq(users.email, teamLeaderEmails[0]))
                .limit(1);
            if (tlUser?.name) {
                tlName = tlUser.name;
            }
        }

        // Get TE name
        const teUser = await this.recipientResolver.getUserById(tender.teamMember);
        const teName = teUser?.name || 'Tender Executive';

        // Format due date and time
        const dueDate = tender.dueDate ? new Date(tender.dueDate).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }) : 'Not specified';
        const dueTime = tender.dueDate ? new Date(tender.dueDate).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        // Format currency values
        const formatCurrency = (value: string | null) => {
            if (!value) return '₹0';
            const num = Number(value);
            return isNaN(num) ? value : `₹${num.toLocaleString('en-IN')}`;
        };

        const emailData = {
            tlName,
            tender_name: tender.tenderName,
            costingSheetLink: costingSheet.googleSheetUrl || '#',
            tenderValue: formatCurrency(tender.gstValues),
            finalPrice: formatCurrency(costingSheet.submittedFinalPrice),
            receipt: formatCurrency(costingSheet.submittedReceiptPrice),
            budget: formatCurrency(costingSheet.submittedBudgetPrice),
            grossMargin: costingSheet.submittedGrossMargin ? `${costingSheet.submittedGrossMargin}%` : '0%',
            remarks: costingSheet.teRemarks || 'None',
            dueDate,
            dueTime,
            teName,
        };

        await this.sendEmail(
            'costing-sheet.submitted',
            tenderId,
            submittedBy,
            `Costing Sheet submitted - ${tender.tenderName}`,
            'costing-sheet-submitted',
            emailData,
            {
                to: [{ type: 'role', role: 'Team Leader', teamId: tender.team }],
                cc: [
                    { type: 'role', role: 'Admin', teamId: tender.team },
                ],
            }
        );
    }
}
