import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
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
import { GoogleDriveService } from '@/modules/integrations/google/google-drive.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';

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
    private readonly logger = new Logger(CostingSheetsService.name);
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly googleDriveService: GoogleDriveService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
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
                        isNull(tenderCostingSheets.status),
                        eq(tenderCostingSheets.status, 'Pending')
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
        // Build base WHERE conditions (same as findAll)
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost'])
        ];

        const baseWhereClause = and(...baseConditions);

        // Count pending: no costingSheet OR costingSheet exists but status is null
        const [pendingResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .where(
                and(
                    baseWhereClause,
                    or(
                        isNull(tenderCostingSheets.id),
                        isNull(tenderCostingSheets.status),
                        eq(tenderCostingSheets.status, 'Pending')
                    )!
                )
            );
        const pending = Number(pendingResult?.count || 0);

        // Count submitted: status must be 'Submitted' or 'Approved'
        const [submittedResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .where(
                and(
                    baseWhereClause,
                    inArray(tenderCostingSheets.status, ['Submitted', 'Approved'])
                )
            );
        const submitted = Number(submittedResult?.count || 0);

        // Count rejected: status must be 'Rejected/Redo'
        const [rejectedResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .where(
                and(
                    baseWhereClause,
                    eq(tenderCostingSheets.status, 'Rejected/Redo')
                )
            );
        const rejected = Number(rejectedResult?.count || 0);

        const total = pending + submitted + rejected;
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

        // Send email notification
        await this.sendCostingSheetSubmittedEmail(data.tenderId, result[0], data.submittedBy);

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

        // Send email notification
        await this.sendCostingSheetSubmittedEmail(costingSheet.tenderId, result, changedBy);

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
                message: `A costing sheet with name "${sheetName}" already exists in the ${new Date().getFullYear()} folder.`,
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
            `Costing Sheet Submitted: ${tender.tenderNo}`,
            'costing-sheet-submitted',
            emailData,
            {
                to: [{ type: 'role', role: 'Team Leader', teamId: tender.team }],
            }
        );
    }
}
