import { Inject, Injectable, BadRequestException } from '@nestjs/common';
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

export type TenderApprovalFilters = {
    tlStatus?: '0' | '1' | '2' | '3' | number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
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
    ) { }

    /**
     * Get dashboard data by tab
     */
    async getDashboardData(
        tabKey?: 'pending' | 'accepted' | 'rejected' | 'tender-dnb',
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string }
    ): Promise<PaginatedResult<TenderRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const activeTab = tabKey || 'pending';

        // Validate tab key
        if (!['pending', 'accepted', 'rejected', 'tender-dnb'].includes(activeTab)) {
            throw new BadRequestException(`Invalid tab: ${activeTab}`);
        }

        // Base conditions for all tabs
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            // TenderInfosService.getExcludeStatusCondition(['lost']),
        ];

        // TODO: Add role-based team filtering middleware/guard
        // - Admin: see all tenders
        // - Non-admin: filter by user.team

        // Tab-specific conditions
        let tabConditions: any[] = [];
        if (activeTab === 'pending') {
            tabConditions.push(
                or(
                    eq(tenderInfos.tlStatus, 0),
                    eq(tenderInfos.tlStatus, 3),
                    isNull(tenderInfos.tlStatus)
                )
            );
        } else if (activeTab === 'accepted') {
            tabConditions.push(eq(tenderInfos.tlStatus, 1));
        } else if (activeTab === 'rejected') {
            tabConditions.push(eq(tenderInfos.tlStatus, 2));
        } else if (activeTab === 'tender-dnb') {
            tabConditions.push(
                inArray(tenderInfos.status, [8, 34]),
                inArray(tenderInfos.tlStatus, [1, 2, 3])
            );
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
        const sortBy = filters?.sortBy || (activeTab === 'pending' ? 'dueDate' : activeTab === 'accepted' ? 'approvalDate' : activeTab === 'rejected' ? 'rejectionDate' : 'statusChangeDate');
        const sortOrder = filters?.sortOrder || (activeTab === 'pending' ? 'asc' : 'desc');
        let orderByClause: any = asc(tenderInfos.dueDate); // Default

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
                case 'approvalDate':
                    orderByClause = sortFn(tenderInfos.updatedAt);
                    break;
                case 'rejectionDate':
                    orderByClause = sortFn(tenderInfos.updatedAt);
                    break;
                case 'statusChangeDate':
                    orderByClause = sortFn(tenderInfos.updatedAt);
                    break;
                case 'gstValues':
                    orderByClause = sortFn(tenderInfos.gstValues);
                    break;
                case 'itemName':
                    orderByClause = sortFn(items.name);
                    break;
                case 'statusName':
                    orderByClause = sortFn(statuses.name);
                    break;
                case 'tlStatus':
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
            .innerJoin(users, eq(tenderInfos.teamMember, users.id))
            .innerJoin(statuses, eq(tenderInfos.status, statuses.id))
            .innerJoin(items, eq(tenderInfos.item, items.id))
            .innerJoin(
                tenderInformation,
                eq(tenderInformation.tenderId, tenderInfos.id)
            )
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);
        // Execute query
        const rows = (await query) as unknown as TenderRow[];

        // Enrich rows with latest status log data
        if (rows.length > 0) {
            const tenderIds = rows.map(r => r.tenderId);

            // Get latest status log for each tender using window function approach
            const allStatusLogs = await this.db
                .select({
                    tenderId: tenderStatusHistory.tenderId,
                    newStatus: tenderStatusHistory.newStatus,
                    comment: tenderStatusHistory.comment,
                    createdAt: tenderStatusHistory.createdAt,
                    id: tenderStatusHistory.id,
                })
                .from(tenderStatusHistory)
                .where(inArray(tenderStatusHistory.tenderId, tenderIds))
                .orderBy(desc(tenderStatusHistory.createdAt), desc(tenderStatusHistory.id));

            // Group by tenderId and take the first (latest) entry for each
            const latestStatusLogMap = new Map<number, typeof allStatusLogs[0]>();
            for (const log of allStatusLogs) {
                if (!latestStatusLogMap.has(log.tenderId)) {
                    latestStatusLogMap.set(log.tenderId, log);
                }
            }

            // Get status names for latest status logs
            const latestStatusIds = [...new Set(Array.from(latestStatusLogMap.values()).map(log => log.newStatus))];
            const latestStatuses = latestStatusIds.length > 0
                ? await this.db
                    .select({ id: statuses.id, name: statuses.name })
                    .from(statuses)
                    .where(inArray(statuses.id, latestStatusIds))
                : [];

            const statusNameMap = new Map(latestStatuses.map(s => [s.id, s.name]));

            // Enrich rows with latest status log data
            for (const row of rows) {
                const latestLog = latestStatusLogMap.get(row.tenderId);
                if (latestLog) {
                    // Use latest status from log
                    row.status = latestLog.newStatus;
                    row.statusName = statusNameMap.get(latestLog.newStatus) || row.statusName;
                    row.statusRemark = latestLog.comment;
                } else {
                    // Keep current status if no log exists
                    row.statusRemark = null;
                }
            }
        }

        // Get total count
        let countQuery: any = this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .innerJoin(users, eq(tenderInfos.teamMember, users.id))
            .innerJoin(statuses, eq(tenderInfos.status, statuses.id))
            .innerJoin(items, eq(tenderInfos.item, items.id))
            .innerJoin(
                tenderInformation,
                eq(tenderInformation.tenderId, tenderInfos.id)
            );

        // Add search joins to count query if search is used
        if (filters?.search) {
            // Joins already added above
        }

        const [countResult] = await countQuery.where(whereClause);
        const total = Number(countResult?.count || 0);
        this.logger.debug(`[TenderApproval] Query result: ${rows.length} rows, total: ${total}`);

        return wrapPaginatedResponse(rows, total, page, limit);
    }

    async getCounts() {
        // Base conditions for all tabs
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            // TenderInfosService.getExcludeStatusCondition(['lost']),
        ];

        // Build conditions for each tab
        const pendingConditions = [
            ...baseConditions,
            or(
                eq(tenderInfos.tlStatus, 0),
                eq(tenderInfos.tlStatus, 3),
                isNull(tenderInfos.tlStatus)
            )
        ];

        const acceptedConditions = [
            ...baseConditions,
            eq(tenderInfos.tlStatus, 1)
        ];

        const rejectedConditions = [
            ...baseConditions,
            eq(tenderInfos.tlStatus, 2)
        ];

        const tenderDnbConditions = [
            ...baseConditions,
            inArray(tenderInfos.status, [8, 34]),
            inArray(tenderInfos.tlStatus, [1, 2, 3])
        ];

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
            'tender-dnb': tenderDnbCount,
            total: pendingCount + acceptedCount + rejectedCount + tenderDnbCount,
        };
    }

    private async countTabItems(whereClause: any): Promise<number> {
        const countQuery = this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(users, eq(tenderInfos.teamMember, users.id))
            .innerJoin(statuses, eq(tenderInfos.status, statuses.id))
            .innerJoin(items, eq(tenderInfos.item, items.id))
            .innerJoin(
                tenderInformation,
                eq(tenderInformation.tenderId, tenderInfos.id)
            )
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
                .split(',')
                .map(Number)
                .filter((n) => !isNaN(n))
            : [];

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
            incompleteFields: incompleteFieldsResult,
        };
    }

    async getByTenderIdWithDetails(tenderId: number) {
        const [approvalData, tenderDetails] = await Promise.all([
            this.getByTenderId(tenderId),
            this.tenderInfosService.getTenderForApproval(tenderId),
        ]);

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
        let statusComment: string = '';

        // Clear incomplete fields for statuses other than '3'
        if (payload.tlStatus !== '3') {
            await this.db
                .delete(tenderIncompleteFields)
                .where(eq(tenderIncompleteFields.tenderId, tenderId));
        }

        if (payload.tlStatus === '1') {
            // Approved - Status 3
            const rfqToString = payload.rfqTo?.join(',') || '';

            updateData.rfqTo = rfqToString;
            updateData.processingFeeMode = payload.processingFeeMode;
            updateData.tenderFeeMode = payload.tenderFeeMode;
            updateData.emdMode = payload.emdMode;
            updateData.approvePqrSelection = payload.approvePqrSelection;
            updateData.approveFinanceDocSelection =
                payload.approveFinanceDocSelection;

            updateData.tlRejectionRemarks = null;
            updateData.oemNotAllowed = null;
            updateData.status = 3; // Tender Info approved
            newStatus = 3;
            statusComment = 'Tender info approved';
        } else if (payload.tlStatus === '2') {
            // Rejected - Use tenderStatus from payload (contains rejection reason status ID)
            updateData.tlRejectionRemarks = payload.tlRejectionRemarks;
            updateData.oemNotAllowed = payload.oemNotAllowed;

            if (payload.tenderStatus) {
                updateData.status = payload.tenderStatus;
                newStatus = payload.tenderStatus;
                statusComment = 'Tender rejected';
            }

            updateData.rfqTo = null;
            updateData.processingFeeMode = null;
            updateData.tenderFeeMode = null;
            updateData.emdMode = null;
            updateData.approvePqrSelection = null;
            updateData.approveFinanceDocSelection = null;
        } else if (payload.tlStatus === '3') {
            // Incomplete - Status 29
            // Incomplete status - clear approval/rejection fields
            updateData.rfqTo = null;
            updateData.processingFeeMode = null;
            updateData.tenderFeeMode = null;
            updateData.emdMode = null;
            updateData.approvePqrSelection = null;
            updateData.approveFinanceDocSelection = null;
            updateData.tlRejectionRemarks = null;
            updateData.oemNotAllowed = null;
            updateData.status = 29; // Tender Info sheet Incomplete
            newStatus = 29;
            statusComment = 'Tender info sheet incomplete';

            // Delete existing incomplete fields
            await this.db
                .delete(tenderIncompleteFields)
                .where(eq(tenderIncompleteFields.tenderId, tenderId));

            // Insert new incomplete fields
            if (payload.incompleteFields && payload.incompleteFields.length > 0) {
                const incompleteFieldsData = payload.incompleteFields.map(
                    (field) => ({
                        tenderId,
                        fieldName: field.fieldName,
                        comment: field.comment,
                        status: 'pending' as const,
                    })
                );

                await this.db
                    .insert(tenderIncompleteFields)
                    .values(incompleteFieldsData);
            }
        }

        // Update tender and track status change in transaction
        await this.db.transaction(async (tx) => {
            await tx
                .update(tenderInfos)
                .set(updateData)
                .where(eq(tenderInfos.id, tenderId))
                .returning();

            // Track status change if status was updated
            if (newStatus !== null && newStatus !== prevStatus) {
                await this.tenderStatusHistoryService.trackStatusChange(
                    tenderId,
                    newStatus,
                    changedBy,
                    prevStatus,
                    statusComment,
                    tx
                );
            }
        });

        // Send email notification for approval/rejection
        if (payload.tlStatus === '1' || payload.tlStatus === '2') {
            await this.sendApprovalEmail(tenderId, payload, changedBy);
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
    private async sendApprovalEmail(
        tenderId: number,
        payload: TenderApprovalPayload,
        changedBy: number
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

        const assignee = await this.recipientResolver.getUserById(tender.teamMember);
        if (!assignee) return;

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

        const isBidApproved = payload.tlStatus === '1';
        const isRejected = payload.tlStatus === '2';
        const isReview = payload.tlStatus === '3';

        // Generate links (TODO: Update with actual frontend URLs)
        const emdLink = `#/tendering/emds?tenderId=${tenderId}`;
        const tenderFeesLink = `#/tendering/tender-fees?tenderId=${tenderId}`;
        const rfqLink = `#/tendering/rfqs?tenderId=${tenderId}`;

        // Get vendor names from rfqTo
        let vendor = 'Selected Vendors';
        if (payload.rfqTo && payload.rfqTo.length > 0) {
            // TODO: Fetch vendor organization names from rfqTo IDs
            vendor = `${payload.rfqTo.length} vendor(s)`;
        }

        // Get physical docs requirement
        const phyDocs = 'As per tender requirements'; // TODO: Get from tender data if available

        const emailData = {
            assignee: assignee.name,
            isBidApproved,
            isRejected,
            isReview,
            remarks: payload.tlRejectionRemarks || '',
            rej_remark: payload.tlRejectionRemarks || '',
            emdLink,
            tenderFeesLink,
            rfqLink,
            processingFeeMode: payload.processingFeeMode || 'Not specified',
            tenderFeesMode: payload.tenderFeeMode || 'Not specified',
            emdMode: payload.emdMode || 'Not specified',
            vendor,
            phyDocs,
            pqrApproved: payload.approvePqrSelection === '1',
            finApproved: payload.approveFinanceDocSelection === '1',
            tlName,
        };

        const template = isBidApproved ? 'tender-approved-by-tl' : 'tender-rejected-by-tl';
        const subject = isBidApproved
            ? `Tender Approved: ${tender.tenderNo}`
            : `Tender Rejected: ${tender.tenderNo}`;

        await this.sendEmail(
            isBidApproved ? 'tender.approved' : 'tender.rejected',
            tenderId,
            changedBy,
            subject,
            template,
            emailData,
            {
                to: [{ type: 'user', userId: tender.teamMember }],
            }
        );
    }
}
