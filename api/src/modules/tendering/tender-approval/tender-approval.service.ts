import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import type { TenderApprovalPayload } from '@/modules/tendering/tender-approval/dto/tender-approval.dto';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { eq, and, asc, desc, sql, or, inArray, isNull } from 'drizzle-orm';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { tenderStatusHistory } from '@db/schemas/tendering/tender-status-history.schema';
import { users } from '@db/schemas/auth/users.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { items } from '@db/schemas/master/items.schema';
import { tenderIncompleteFields } from '@db/schemas/tendering/tender-incomplete-fields.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import { TimersService } from '@/modules/timers/timers.service';
import { TenderInfoSheetsService } from '../info-sheets/info-sheets.service';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { pqrDocuments } from '@db/schemas/shared/pqr.schema';
import { financeDocuments } from '@db/schemas/shared/finance_docs.schema';

export type TenderApprovalFilters = {
    tlStatus?: "0" | "1" | "2" | "3" | number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
};

type TenderRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    item: number;
    gstValues: number;
    tenderFees: number;
    emd: number;
    teamMember: number;
    dueDate: Date;
    status: number;
    teamMemberName: string;
    itemName: string;
    statusName: string;
    tlStatus: string | number;
    statusRemark?: string | null;
    rejectReason?: number | null;
    rejectRemarks?: string | null;
};

@Injectable()
export class TenderApprovalService {
    private readonly logger = new Logger(TenderApprovalService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly timersService: TimersService,
        private readonly tenderInfoSheetsService: TenderInfoSheetsService,
    ) { }

    /**
     * Build role-based filter conditions for tender queries
     */
    private buildRoleFilterConditions(user?: ValidatedUser, teamId?: number): any[] {
        const roleFilterConditions: any[] = [];

        if (user && user.roleId) {
            if (user.roleId === 1 || user.roleId === 2) {
                // Super User or Admin: Show all, respect teamId filter if provided
                if (teamId !== undefined && teamId !== null) {
                    roleFilterConditions.push(eq(tenderInfos.team, teamId));
                }
            } else if (user.roleId === 3 || user.roleId === 4 || user.roleId === 6) {
                // Team Leader, Coordinator, Engineer: Filter by primary_team_id
                if (user.teamId) {
                    roleFilterConditions.push(eq(tenderInfos.team, user.teamId));
                } else {
                    roleFilterConditions.push(sql`1 = 0`); // Empty results
                }
            } else {
                if (teamId !== undefined && teamId !== null) {
                    roleFilterConditions.push(eq(tenderInfos.team, teamId));
                } else if (user.sub) {
                    roleFilterConditions.push(eq(tenderInfos.teamMember, user.sub));
                } else {
                    roleFilterConditions.push(sql`1 = 0`); // Empty results
                }
            }
        } else {
            // No user provided - return empty for security
            roleFilterConditions.push(sql`1 = 0`);
        }

        return roleFilterConditions;
    }

    /**
     * Get dashboard data by tab
     */
    async getDashboardData(
        user?: ValidatedUser,
        teamId?: number,
        tabKey?: "pending" | "accepted" | "rejected" | "tender-dnb",
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: "asc" | "desc"; search?: string }
    ): Promise<PaginatedResult<TenderRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const activeTab = tabKey || "pending";

        // Validate tab key
        if (!["pending", "accepted", "rejected", "tender-dnb"].includes(activeTab)) {
            throw new BadRequestException(`Invalid tab: ${activeTab}`);
        }

        // Base conditions for all tabs
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            // TenderInfosService.getExcludeStatusCondition(['lost']),
        ];

        // Apply role-based filtering
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);

        // Tab-specific conditions
        let tabConditions: any[] = [];
        tabConditions.push(...roleFilterConditions);
        if (activeTab === "pending") {
            tabConditions.push(or(eq(tenderInfos.tlStatus, 0), eq(tenderInfos.tlStatus, 3), isNull(tenderInfos.tlStatus)));
        } else if (activeTab === "accepted") {
            tabConditions.push(eq(tenderInfos.tlStatus, 1));
        } else if (activeTab === "rejected") {
            tabConditions.push(eq(tenderInfos.tlStatus, 2));
        } else if (activeTab === "tender-dnb") {
            tabConditions.push(inArray(tenderInfos.status, [8, 34]), inArray(tenderInfos.tlStatus, [1, 2, 3]));
        }

        // Search conditions
        if (filters?.search) {
            const searchStr = `%${filters.search}%`;
            tabConditions.push(
                sql`(
                    ${tenderInfos.tenderName} ILIKE ${searchStr} OR
                    ${tenderInfos.tenderNo} ILIKE ${searchStr} OR
                    ${tenderInfos.gstValues}::text ILIKE ${searchStr} OR
                    ${tenderInfos.dueDate}::text ILIKE ${searchStr} OR
                    ${users.name} ILIKE ${searchStr} OR
                    ${items.name} ILIKE ${searchStr} OR
                    ${tenderInformation.teRejectionRemarks} ILIKE ${searchStr}
                )`
            );
        }

        const allConditions = [...baseConditions, ...tabConditions];
        const whereClause = and(...allConditions);

        // Build orderBy clause
        const sortBy =
            filters?.sortBy || (activeTab === "pending" ? "dueDate" : activeTab === "accepted" ? "approvalDate" : activeTab === "rejected" ? "rejectionDate" : "statusChangeDate");
        const sortOrder = filters?.sortOrder || (activeTab === "pending" ? "asc" : "desc");
        let orderByClause: any = asc(tenderInfos.dueDate); // Default

        if (sortBy) {
            const sortFn = sortOrder === "desc" ? desc : asc;
            switch (sortBy) {
                case "tenderNo":
                    orderByClause = sortFn(tenderInfos.tenderNo);
                    break;
                case "tenderName":
                    orderByClause = sortFn(tenderInfos.tenderName);
                    break;
                case "teamMemberName":
                    orderByClause = sortFn(users.name);
                    break;
                case "dueDate":
                    orderByClause = sortFn(tenderInfos.dueDate);
                    break;
                case "approvalDate":
                    orderByClause = sortFn(tenderInfos.updatedAt);
                    break;
                case "rejectionDate":
                    orderByClause = sortFn(tenderInfos.updatedAt);
                    break;
                case "statusChangeDate":
                    orderByClause = sortFn(tenderInfos.updatedAt);
                    break;
                case "gstValues":
                    orderByClause = sortFn(tenderInfos.gstValues);
                    break;
                case "itemName":
                    orderByClause = sortFn(items.name);
                    break;
                case "statusName":
                    orderByClause = sortFn(statuses.name);
                    break;
                case "tlStatus":
                    orderByClause = sortFn(tenderInfos.tlStatus);
                    break;
                default:
                    orderByClause = sortFn(tenderInfos.dueDate);
            }
        }

        // Build query
        const query = this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                item: tenderInfos.item,
                gstValues: tenderInfos.gstValues,
                tenderFees: tenderInfos.tenderFees,
                emd: tenderInfos.emd,
                teamMember: tenderInfos.teamMember,
                dueDate: tenderInfos.dueDate,
                status: tenderInfos.status,
                tlStatus: tenderInfos.tlStatus,
                teamMemberName: users.name,
                itemName: items.name,
                statusName: statuses.name,
                rejectReason: tenderInformation.teRejectionReason,
                rejectRemarks: tenderInformation.teRejectionRemarks,
            })
            .from(tenderInfos)
            .leftJoin(users, eq(tenderInfos.teamMember, users.id))
            .leftJoin(statuses, eq(tenderInfos.status, statuses.id))
            .leftJoin(items, eq(tenderInfos.item, items.id))
            .innerJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);
        // Execute query
        const rows = (await query) as unknown as TenderRow[];
        console.log("rows", rows);

        // Get total count
        let countQuery: any = this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .leftJoin(users, eq(tenderInfos.teamMember, users.id))
            .leftJoin(statuses, eq(tenderInfos.status, statuses.id))
            .leftJoin(items, eq(tenderInfos.item, items.id))
            .innerJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id));

        // Add search joins to count query if search is used
        if (filters?.search) {
            // Joins already added above
        }

        const [countResult] = await countQuery.where(whereClause);
        const total = Number(countResult?.count || 0);

        return wrapPaginatedResponse(rows, total, page, limit);
    }

    async getCounts(user?: ValidatedUser, teamId?: number) {
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);

        // Base conditions for all tabs
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            // TenderInfosService.getExcludeStatusCondition(['lost']),
            ...roleFilterConditions,
        ];

        // Build conditions for each tab
        const pendingConditions = [...baseConditions, or(eq(tenderInfos.tlStatus, 0), eq(tenderInfos.tlStatus, 3), isNull(tenderInfos.tlStatus))];

        const acceptedConditions = [...baseConditions, eq(tenderInfos.tlStatus, 1)];

        const rejectedConditions = [...baseConditions, eq(tenderInfos.tlStatus, 2)];

        const tenderDnbConditions = [...baseConditions, inArray(tenderInfos.status, [8, 34]), inArray(tenderInfos.tlStatus, [1, 2, 3])];

        // Count for each tab
        const [pendingCount, acceptedCount, rejectedCount, tenderDnbCount] = await Promise.all([
            this.countTabItems(and(...pendingConditions)),
            this.countTabItems(and(...acceptedConditions)),
            this.countTabItems(and(...rejectedConditions)),
            this.countTabItems(and(...tenderDnbConditions)),
        ]);

        return {
            pending: pendingCount,
            accepted: acceptedCount,
            rejected: rejectedCount,
            "tender-dnb": tenderDnbCount,
            total: pendingCount + acceptedCount + rejectedCount + tenderDnbCount,
        };
    }

    private async countTabItems(whereClause: any): Promise<number> {
        const countQuery = this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .leftJoin(users, eq(tenderInfos.teamMember, users.id))
            .leftJoin(statuses, eq(tenderInfos.status, statuses.id))
            .leftJoin(items, eq(tenderInfos.item, items.id))
            .innerJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .where(whereClause);

        const [result] = await countQuery;
        return Number(result?.count || 0);
    }

    async getByTenderId(tenderId: number) {
        // Validate tender exists first
        await this.tenderInfosService.validateExists(tenderId);

        const result = await this.db
            .select({
                tlStatus: tenderInfos.tlStatus,
                rfqRequired: tenderInfos.rfqRequired,
                quotationFiles: tenderInfos.quotationFiles,
                rfqTo: tenderInfos.rfqTo,
                processingFeeMode: tenderInfos.processingFeeMode,
                tenderFeeMode: tenderInfos.tenderFeeMode,
                emdMode: tenderInfos.emdMode,
                approvePqrSelection: tenderInfos.approvePqrSelection,
                approveFinanceDocSelection: tenderInfos.approveFinanceDocSelection,
                tenderStatus: tenderInfos.status,
                oemNotAllowed: tenderInfos.oemNotAllowed,
                tlRejectionRemarks: tenderInfos.tlRejectionRemarks,
            })
            .from(tenderInfos)
            .where(eq(tenderInfos.id, tenderId))
            .limit(1);

        if (!result.length) {
            return null;
        }

        const data = result[0];

        const rfqToArray = data.rfqTo
            ? data.rfqTo
                .split(",")
                .map(Number)
                .filter(n => !isNaN(n))
            : [];

        // Parse quotationFiles from JSON string if present
        let quotationFilesArray: string[] = [];
        if (data.quotationFiles) {
            try {
                quotationFilesArray = JSON.parse(data.quotationFiles);
            } catch (e) {
                // If parsing fails, treat as empty array
                quotationFilesArray = [];
            }
        }

        // Fetch incomplete fields
        const incompleteFieldsResult = await this.db
            .select({
                id: tenderIncompleteFields.id,
                fieldName: tenderIncompleteFields.fieldName,
                comment: tenderIncompleteFields.comment,
                status: tenderIncompleteFields.status,
            })
            .from(tenderIncompleteFields)
            .where(eq(tenderIncompleteFields.tenderId, tenderId));

        return {
            ...data,
            rfqTo: rfqToArray,
            quotationFiles: quotationFilesArray,
            incompleteFields: incompleteFieldsResult,
        };
    }

    async getByTenderIdWithDetails(tenderId: number) {
        const [approvalData, tenderDetails] = await Promise.all([this.getByTenderId(tenderId), this.tenderInfosService.getTenderForApproval(tenderId)]);

        return {
            ...approvalData,
            tender: tenderDetails,
        };
    }

    async updateApproval(tenderId: number, payload: TenderApprovalPayload, changedBy: number) {
        // Validate tender exists
        await this.tenderInfosService.validateExists(tenderId);

        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(tenderId);
        const prevStatus = currentTender?.status ?? null;

        const updateData: any = {
            tlStatus: payload.tlStatus,
            updatedAt: new Date(),
        };

        let newStatus: number | null = null;
        let statusComment: string = "";

        // Clear incomplete fields for statuses other than '3'
        if (payload.tlStatus !== "3") {
            await this.db.delete(tenderIncompleteFields).where(eq(tenderIncompleteFields.tenderId, tenderId));
        }

        if (payload.tlStatus === "1") {
            // Approved - Status 3
            const rfqToString = payload.rfqTo?.join(",") || "";

            updateData.rfqTo = rfqToString;
            updateData.rfqRequired = payload.rfqRequired ?? null;
            updateData.quotationFiles = payload.quotationFiles ? JSON.stringify(payload.quotationFiles) : null;
            updateData.processingFeeMode = payload.processingFeeMode ?? null;
            updateData.tenderFeeMode = payload.tenderFeeMode ?? null;
            updateData.emdMode = payload.emdMode ?? null;
            updateData.approvePqrSelection = payload.approvePqrSelection ?? null;
            updateData.approveFinanceDocSelection = payload.approveFinanceDocSelection ?? null;

            updateData.tlRejectionRemarks = null;
            updateData.oemNotAllowed = null;
            updateData.status = 3; // Tender Info approved
            newStatus = 3;
            statusComment = "Tender info approved";

            // Update tender values from info sheet
            const infoSheet = await this.tenderInfoSheetsService.findByTenderId(tenderId);
            if (infoSheet) {
                // Convert numeric values to string for decimal fields
                if (infoSheet.tenderValue !== null && infoSheet.tenderValue !== undefined) {
                    updateData.gstValues = String(infoSheet.tenderValue);
                }
                if (infoSheet.tenderFeeAmount !== null && infoSheet.tenderFeeAmount !== undefined) {
                    updateData.tenderFees = String(infoSheet.tenderFeeAmount);
                }
                if (infoSheet.emdAmount !== null && infoSheet.emdAmount !== undefined) {
                    updateData.emd = String(infoSheet.emdAmount);
                }
            }
        } else if (payload.tlStatus === "2") {
            // Rejected - Use tenderStatus from payload (contains rejection reason status ID)
            updateData.tlRejectionRemarks = payload.tlRejectionRemarks;
            updateData.oemNotAllowed = payload.oemNotAllowed;

            if (payload.tenderStatus) {
                updateData.status = payload.tenderStatus;
                newStatus = payload.tenderStatus;
                statusComment = "Tender rejected";
            }

            updateData.rfqTo = null;
            updateData.rfqRequired = null;
            updateData.quotationFiles = null;
            updateData.processingFeeMode = null;
            updateData.tenderFeeMode = null;
            updateData.emdMode = null;
            updateData.approvePqrSelection = null;
            updateData.approveFinanceDocSelection = null;
        } else if (payload.tlStatus === "3") {
            // Incomplete - Status 29
            // Incomplete status - clear approval/rejection fields
            updateData.rfqTo = null;
            updateData.rfqRequired = null;
            updateData.quotationFiles = null;
            updateData.processingFeeMode = null;
            updateData.tenderFeeMode = null;
            updateData.emdMode = null;
            updateData.approvePqrSelection = null;
            updateData.approveFinanceDocSelection = null;
            updateData.tlRejectionRemarks = null;
            updateData.oemNotAllowed = null;
            updateData.status = 29; // Tender Info sheet Incomplete
            newStatus = 29;
            statusComment = "Tender info sheet incomplete";

            // Delete existing incomplete fields
            await this.db.delete(tenderIncompleteFields).where(eq(tenderIncompleteFields.tenderId, tenderId));

            // Insert new incomplete fields
            if (payload.incompleteFields && payload.incompleteFields.length > 0) {
                const incompleteFieldsData = payload.incompleteFields.map(field => ({
                    tenderId,
                    fieldName: field.fieldName,
                    comment: field.comment,
                    status: "pending" as const,
                }));

                await this.db.insert(tenderIncompleteFields).values(incompleteFieldsData);
            }
        }

        // Update tender and track status change in transaction
        await this.db.transaction(async tx => {
            await tx.update(tenderInfos).set(updateData).where(eq(tenderInfos.id, tenderId)).returning();

            // Track status change if status was updated
            if (newStatus !== null && newStatus !== prevStatus) {
                await this.tenderStatusHistoryService.trackStatusChange(tenderId, newStatus, changedBy, prevStatus, statusComment, tx);
            }
        });

        // Send email notification for approval/rejection/review
        if (payload.tlStatus === "1" || payload.tlStatus === "2" || payload.tlStatus === "3") {
            await this.sendApprovalEmail(tenderId, payload, changedBy);
        }

        try {
            // TIMER TRANSITION
            this.logger.log(`Transitioning timers for tender ${tenderId} after approval`);

            // 1. Stop the tender_approval timer
            try {
                await this.timersService.stopTimer({
                    entityType: 'TENDER',
                    entityId: tenderId,
                    stage: 'tender_approval',
                    userId: changedBy,
                    reason: 'Tender approved'
                });
                this.logger.log(`Successfully stopped tender_approval timer for tender ${tenderId}`);
            } catch (error) {
                this.logger.warn(`Failed to stop tender_approval timer for tender ${tenderId}:`, error);
            }

            // 2. Get tender and info sheet data
            const tender = await this.tenderInfosService.findById(tenderId);
            const infoSheet = await this.tenderInfoSheetsService.findByTenderId(tenderId);

            if (!tender || !infoSheet) {
                throw new NotFoundException(`Tender or info sheet not found for tender ${tenderId}`);
            }

            // 3. Determine which timers should be started based on tender configuration
            const stagesToStart: Array<{ stage: string; timerConfig?: any }> = [];

            if (tender.rfqTo && tender.rfqTo !== '0' && tender.rfqTo !== '1') {
                stagesToStart.push({ stage: 'rfq_sent' });
            }
            if (infoSheet.emdRequired === 'YES' || infoSheet.emdRequired === '1') {
                stagesToStart.push({ stage: 'emd_requested' });
            }
            if (infoSheet.physicalDocsRequired === 'YES') {
                stagesToStart.push({ stage: 'physical_docs' });
            }
            // Always start these timers
            stagesToStart.push({ stage: 'document_checklist' });
            stagesToStart.push({ stage: 'costing_sheets' });

            // 4. Configure negative countdown timers if due date exists
            if (tender.dueDate) {
                const dueDate = new Date(tender.dueDate);
                for (const item of stagesToStart) {
                    if (item.stage === 'document_checklist' || item.stage === 'costing_sheets') {
                        const hoursBeforeDeadline = -72;
                        const deadlineAt = new Date(dueDate.getTime() + hoursBeforeDeadline * 60 * 60 * 1000);
                        item.timerConfig = {
                            type: 'NEGATIVE_COUNTDOWN',
                            hoursBeforeDeadline: hoursBeforeDeadline
                        };
                        // Note: deadlineAt will be set when starting the timer
                    }
                }
            }

            this.logger.log(`Found ${stagesToStart.length} timers to start after approval for tender ${tenderId}`, {
                stages: stagesToStart.map(item => item.stage)
            });

            // 5. Start all eligible timers
            for (const item of stagesToStart) {
                try {
                    this.logger.log(`Starting timer for stage ${item.stage} for tender ${tenderId}`);
                    const timerInput: any = {
                        entityType: 'TENDER',
                        entityId: tenderId,
                        stage: item.stage,
                        userId: changedBy,
                        timerConfig: item.timerConfig || {
                            type: 'FIXED_DURATION',
                            durationHours: 24
                        }
                    };

                    // Set deadline for negative countdown timers
                    if (tender.dueDate && item.timerConfig?.type === 'NEGATIVE_COUNTDOWN') {
                        const dueDate = new Date(tender.dueDate);
                        const hoursBeforeDeadline = item.timerConfig.hoursBeforeDeadline || -72;
                        timerInput.deadlineAt = new Date(dueDate.getTime() + hoursBeforeDeadline * 60 * 60 * 1000);
                    }

                    await this.timersService.startTimer(timerInput);
                    this.logger.log(`Successfully started timer for stage ${item.stage} for tender ${tenderId}`);
                } catch (error) {
                    this.logger.error(`Failed to start timer for stage ${item.stage} for tender ${tenderId}:`, error);
                }
            }

            this.logger.log(`Successfully transitioned timers after approval for tender ${tenderId}`);
        } catch (error) {
            this.logger.error(`Failed to transition timers after approval for tender ${tenderId}:`, error);
            // Don't fail the entire operation if timer transition fails
        }

        return this.getByTenderId(tenderId);
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
     * Send approval/rejection email
     */
    private async sendApprovalEmail(tenderId: number, payload: TenderApprovalPayload, changedBy: number) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

        const assignee = await this.recipientResolver.getUserById(tender.teamMember);
        if (!assignee) return;

        // Get Team Leader name
        const teamLeaderEmails = await this.recipientResolver.getEmailsByRole("Team Leader", tender.team);
        let tlName = "Team Leader";
        if (teamLeaderEmails.length > 0) {
            const [tlUser] = await this.db.select({ name: users.name }).from(users).where(eq(users.email, teamLeaderEmails[0])).limit(1);
            if (tlUser?.name) {
                tlName = tlUser.name;
            }
        }

        const isBidApproved = payload.tlStatus === "1";
        const isRejected = payload.tlStatus === "2";
        const isReview = payload.tlStatus === "3";

        // Generate links (TODO: Update with actual frontend URLs)
        const emdLink = `#/tendering/emds?tenderId=${tenderId}`;
        const tenderFeesLink = `#/tendering/tender-fees?tenderId=${tenderId}`;
        const rfqLink = `#/tendering/rfqs?tenderId=${tenderId}`;

        // Get vendor names from rfqTo
        let vendor = "Selected Vendors";
        if (payload.rfqTo && payload.rfqTo.length > 0) {
            // TODO: Fetch vendor organization names from rfqTo IDs
            vendor = `${payload.rfqTo.length} vendor(s)`;
        }

        // Get physical docs requirement
        const phyDocs = "As per tender requirements"; // TODO: Get from tender data if available

        // Fetch info sheet to get original documents
        const infoSheet = await this.tenderInfoSheetsService.findByTenderId(tenderId);

        // Fetch all PQR and Finance documents for mapping
        const [allPqrDocs, allFinanceDocs] = await Promise.all([
            this.db.select().from(pqrDocuments).limit(1000),
            this.db.select().from(financeDocuments).limit(1000),
        ]);

        // Create maps for document lookup
        const pqrMap = new Map<number, string>();
        allPqrDocs.forEach(pqr => {
            const label = pqr.projectName
                ? (pqr.item ? `${pqr.projectName} - ${pqr.item}` : pqr.projectName)
                : `PQR ${pqr.id}`;
            pqrMap.set(pqr.id, label);
        });

        const financeMap = new Map<number, string>();
        allFinanceDocs.forEach(doc => {
            if (doc.documentName) {
                financeMap.set(doc.id, doc.documentName);
            }
        });

        // Map original technical documents from info sheet
        const mapTechnicalDocs = (docs: Array<{ id?: number; documentName: string }> | string[] | null | undefined): string[] => {
            if (!docs || !Array.isArray(docs) || docs.length === 0) return [];
            return docs.map(doc => {
                if (typeof doc === 'string') {
                    const docId = parseInt(doc, 10);
                    if (!isNaN(docId) && pqrMap.has(docId)) {
                        return pqrMap.get(docId)!;
                    }
                    return doc; // Return as-is if not a valid ID or not found
                }
                const docId = parseInt(doc.documentName, 10);
                if (!isNaN(docId) && pqrMap.has(docId)) {
                    return pqrMap.get(docId)!;
                }
                return doc.documentName || '';
            }).filter(Boolean);
        };

        // Map original financial documents from info sheet
        const mapFinancialDocs = (docs: Array<{ id?: number; documentName: string }> | string[] | null | undefined): string[] => {
            if (!docs || !Array.isArray(docs) || docs.length === 0) return [];
            return docs.map(doc => {
                if (typeof doc === 'string') {
                    const docId = parseInt(doc, 10);
                    if (!isNaN(docId) && financeMap.has(docId)) {
                        return financeMap.get(docId)!;
                    }
                    return doc; // Return as-is if not a valid ID or not found
                }
                const docId = parseInt(doc.documentName, 10);
                if (!isNaN(docId) && financeMap.has(docId)) {
                    return financeMap.get(docId)!;
                }
                return doc.documentName || '';
            }).filter(Boolean);
        };

        // Map alternative documents (using the same logic)
        const mapAlternativeTechnicalDocs = (ids: string[] | undefined): string[] => {
            if (!ids || !Array.isArray(ids)) return [];
            return ids.map(id => {
                const docId = parseInt(id, 10);
                if (!isNaN(docId) && pqrMap.has(docId)) {
                    return pqrMap.get(docId)!;
                }
                return id;
            }).filter(Boolean);
        };

        const mapAlternativeFinancialDocs = (ids: string[] | undefined): string[] => {
            if (!ids || !Array.isArray(ids)) return [];
            return ids.map(id => {
                const docId = parseInt(id, 10);
                if (!isNaN(docId) && financeMap.has(docId)) {
                    return financeMap.get(docId)!;
                }
                return id;
            }).filter(Boolean);
        };

        const originalTechnicalDocs = infoSheet ? mapTechnicalDocs(infoSheet.technicalWorkOrders) : [];
        const originalFinancialDocs = infoSheet ? mapFinancialDocs(infoSheet.commercialDocuments) : [];
        const alternativeTechnicalDocNames = mapAlternativeTechnicalDocs(payload.alternativeTechnicalDocs);
        const alternativeFinancialDocNames = mapAlternativeFinancialDocs(payload.alternativeFinancialDocs);

        const emailData = {
            assignee: assignee.name,
            isBidApproved,
            isRejected,
            isReview,
            remarks: payload.tlRejectionRemarks || "",
            rej_remark: payload.tlRejectionRemarks || "",
            emdLink,
            tenderFeesLink,
            rfqLink,
            processingFeeMode: payload.processingFeeMode || "Not specified",
            tenderFeesMode: payload.tenderFeeMode || "Not specified",
            emdMode: payload.emdMode || "Not specified",
            vendor,
            phyDocs,
            pqrApproved: payload.approvePqrSelection === "1",
            finApproved: payload.approveFinanceDocSelection === "1",
            technicalDocs: originalTechnicalDocs.length > 0 ? originalTechnicalDocs.join(", ") : "None",
            financialDocs: originalFinancialDocs.length > 0 ? originalFinancialDocs.join(", ") : "None",
            alternativeTechnicalDocs: alternativeTechnicalDocNames.length > 0 ? alternativeTechnicalDocNames.join(", ") : "",
            alternativeFinancialDocs: alternativeFinancialDocNames.length > 0 ? alternativeFinancialDocNames.join(", ") : "",
            tlName,
        };

        const template = isBidApproved ? "tender-approved-by-tl" : isReview ? "tender-rejected-by-tl" : "tender-rejected-by-tl";
        let subject: string;
        let eventType: string;

        if (isBidApproved) {
            subject = `Tender Approved - ${tender.tenderName}`;
            eventType = "tender.approved";
        } else if (isReview) {
            subject = `Tender Needs Review - ${tender.tenderName}`;
            eventType = "tender.review";
        } else {
            subject = `Tender Rejected - ${tender.tenderName}`;
            eventType = "tender.rejected";
        }

        await this.sendEmail(eventType, tenderId, changedBy, subject, template, emailData, {
            to: [{ type: "user", userId: tender.teamMember }],
            cc: [
                { type: "role", role: "Admin", teamId: tender.team },
                { type: "role", role: "Coordinator", teamId: tender.team },
            ],
        });
    }
}
