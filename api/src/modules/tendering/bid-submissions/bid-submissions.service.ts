import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, eq, isNotNull, isNull, or, asc, desc, sql, inArray, ilike, ne, notInArray } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import { items } from '@db/schemas/master/items.schema';
import { tenderCostingSheets } from '@db/schemas/tendering/tender-costing-sheets.schema';
import { bidSubmissions } from '@db/schemas/tendering/bid-submissions.schema';
import { teams } from '@db/schemas/master/teams.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import { TimersService } from '@/modules/timers/timers.service';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { paymentInstruments, paymentRequestRelations, paymentRequests, tenderIncompleteFields } from '@/db/schemas';

export type BidSubmissionDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    dueDate: Date | null;
    emdAmount: string | null;
    gstValues: number;
    finalCosting: string | null; // TL approved finalPrice
    bidStatus: 'Submission Pending' | 'Bid Submitted' | 'Tender Missed';
    bidSubmissionId: number | null;
    costingSheetId: number | null;
}

export type BidSubmissionFilters = {
    bidStatus?: 'Submission Pending' | 'Bid Submitted' | 'Tender Missed';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export type BidSubmissionDashboardCounts = {
    pending: number;
    submitted: number;
    missed: number;
    total: number;
};

export const RFQActionStatuses = [10, 35, 14];
export const EMDActionStatuses = [10, 33 ,35, 14];

@Injectable()
export class BidSubmissionsService {
    private readonly logger = new Logger(BidSubmissionsService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly timersService: TimersService,
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
                // All other roles: Show only own tenders
                if (user.sub) {
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
     * Get dashboard data by tab - Direct queries without config
     */
    private buildDashboardConditions(user?: ValidatedUser, teamId?: number, activeTab?: string ){
        //building the base conditions
        const conditions: any[] = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            // eq(tenderCostingSheets.status, 'Approved'),
        ]

        //building the role conditions
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);
        conditions.push(...roleFilterConditions);
        
        //building the tab conditions
        
        if (activeTab === 'pending') {
            conditions.push(isNull(bidSubmissions.id));
            conditions.push(TenderInfosService.getExcludeStatusCondition(['lost']));
            conditions.push(or(ne(bidSubmissions.status, 'Tender Missed'), isNull(bidSubmissions.status)));
        } else if (activeTab === 'submitted') {
            conditions.push(isNotNull(bidSubmissions.id), eq(bidSubmissions.status, 'Bid Submitted'));
            conditions.push(TenderInfosService.getExcludeStatusCondition(['lost']));
            conditions.push(or(ne(bidSubmissions.status, 'Tender Missed'), isNull(bidSubmissions.status)));
        } else if (activeTab === 'disqualified') {
            conditions.push(eq(bidSubmissions.status, "Tender Missed"));
            conditions.push(inArray(bidSubmissions.reasonStatus,[33])); //33 -> EMD Not paid
        } else if (activeTab === 'tender-dnb') {
            conditions.push(eq(bidSubmissions.status, "Tender Missed"));
            conditions.push(
                or(
                    notInArray(bidSubmissions.reasonStatus,[33]),
                    isNull(bidSubmissions.reasonStatus)
                )
            )
        } else {
            throw new BadRequestException(`Invalid tab: ${activeTab}`);
        }

        //returning the tab conditions
        return conditions;

    }

    async getDashboardData(
        user?: ValidatedUser,
        teamId?: number,
        tab?: 'pending' | 'submitted' | 'disqualified' | 'tender-dnb',
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string }
    ): Promise<PaginatedResult<BidSubmissionDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const activeTab = tab ?? 'pending';

        if(!['pending', 'submitted', 'disqualified' ,'tender-dnb'].includes(activeTab)){
            throw new BadRequestException(`Invalid Status: ${tab}`);
        }

        const conditions : any[] = this.buildDashboardConditions(user, teamId, tab);
        
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
                    orderByClause = sortFn(bidSubmissions.submissionDatetime);
                    break;
                case 'statusChangeDate':
                    orderByClause = sortFn(tenderInfos.updatedAt);
                    break;
                case 'gstValues':
                    orderByClause = sortFn(tenderInfos.gstValues);
                    break;
                case 'finalCosting':
                    orderByClause = sortFn(tenderCostingSheets.finalPrice);
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
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
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
                finalCosting: tenderCostingSheets.finalPrice,
                costingStatus: tenderCostingSheets.status,
                bidSubmissionId: bidSubmissions.id,
                bidSubmissionStatus: bidSubmissions.status,
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        // Map rows
        const mappedRows = rows.map((row) => {
            let bidStatus: 'Submission Pending' | 'Bid Submitted' | 'Tender Missed';
            if (!row.bidSubmissionId || !row.bidSubmissionStatus) {
                bidStatus = 'Submission Pending';
            } else {
                bidStatus = row.bidSubmissionStatus as 'Submission Pending' | 'Bid Submitted' | 'Tender Missed';
            }

            return {
                tenderId: row.tenderId,
                tenderNo: row.tenderNo,
                tenderName: row.tenderName,
                teamMemberName: row.teamMemberName,
                itemName: row.itemName,
                statusName: row.statusName,
                dueDate: row.dueDate,
                emdAmount: row.emdAmount,
                gstValues: row.gstValues ? Number(row.gstValues) : 0,
                finalCosting: row.finalCosting,
                bidStatus: bidStatus,
                bidSubmissionId: row.bidSubmissionId,
                costingSheetId: row.costingSheetId,
            };
        });

        return wrapPaginatedResponse(mappedRows, total, page, limit);
    }

    async getDashboardCounts(user?: ValidatedUser, teamId?: number): Promise<{ pending: number; submitted: number; disqualified: number; 'tender-dnb': number; total: number }> {

        const counts = await Promise.all([
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .leftJoin(users, eq(users.id, tenderInfos.teamMember))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
                .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
                .where(and(...this.buildDashboardConditions(user, teamId, 'pending')))
                .then(([result]) => Number(result?.count || 0)),
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .leftJoin(users, eq(users.id, tenderInfos.teamMember))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
                .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
                .where(and(...this.buildDashboardConditions(user, teamId, 'submitted')))
                .then(([result]) => Number(result?.count || 0)),
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .leftJoin(users, eq(users.id, tenderInfos.teamMember))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
                .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
                .where(and(...this.buildDashboardConditions(user, teamId, 'disqualified')))
                .then(([result]) => Number(result?.count || 0)),
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .leftJoin(users, eq(users.id, tenderInfos.teamMember))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
                .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
                .where(and(...this.buildDashboardConditions(user, teamId, 'tender-dnb')))
                .then(([result]) => Number(result?.count || 0)),
        ]);

        return {
            pending: counts[0],
            submitted: counts[1],
            disqualified: counts[2],
            'tender-dnb': counts[3],
            total: counts.reduce((sum, count) => sum + count, 0),
        };
    }

    async findById(id: number) {
        const result = await this.db
            .select()
            .from(bidSubmissions)
            .where(eq(bidSubmissions.id, id))
            .limit(1);

        if (!result[0]) {
            throw new NotFoundException('Bid submission not found');
        }

        return result[0];
    }

    async findByTenderId(tenderId: number) {
        const result = await this.db
            .select()
            .from(bidSubmissions)
            .where(eq(bidSubmissions.tenderId, tenderId))
            .limit(1);

        return result[0] || null;
    }

    async submitBid(data: {
        tenderId: number;
        submissionDatetime: Date;
        submittedDocs: string[];
        proofOfSubmission: string;
        finalPriceSs: string;
        finalBiddingPrice: string | null;
        submittedBy: number;
    }) {
        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(data.tenderId);
        const prevStatus = currentTender?.status ?? null;

        // AUTO STATUS CHANGE: Update tender status to 17 (Bid Submitted) and track it
        const newStatus = 17; // Status ID for "Bid Submitted"

        // Check if bid submission already exists
        const existing = await this.findByTenderId(data.tenderId);

        const result = await this.db.transaction(async (tx) => {
            let bidSubmission;
            if (existing) {
                // Update existing
                const [updated] = await tx
                    .update(bidSubmissions)
                    .set({
                        status: 'Bid Submitted',
                        submissionDatetime: data.submissionDatetime,
                        finalBiddingPrice: data.finalBiddingPrice,
                        documents: {
                            submittedDocs: data.submittedDocs,
                            submissionProof: data.proofOfSubmission,
                            finalPriceSs: data.finalPriceSs,
                        },
                        submittedBy: data.submittedBy,
                        // Clear missed fields if any
                        reasonForMissing: null,
                        preventionMeasures: null,
                        tmsImprovements: null,
                        updatedAt: new Date(),
                    })
                    .where(eq(bidSubmissions.id, existing.id))
                    .returning();

                bidSubmission = updated;
            } else {
                // Create new
                const [created] = await tx
                    .insert(bidSubmissions)
                    .values({
                        tenderId: data.tenderId,
                        status: 'Bid Submitted',
                        submissionDatetime: data.submissionDatetime,
                        finalBiddingPrice: data.finalBiddingPrice,
                        documents: {
                            submittedDocs: data.submittedDocs,
                            submissionProof: data.proofOfSubmission,
                            finalPriceSs: data.finalPriceSs,
                        },
                        submittedBy: data.submittedBy,
                    })
                    .returning();

                bidSubmission = created;
            }

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
                'Bid submitted'
            );

            return bidSubmission;
        });

        // Send email notification
        await this.sendBidSubmittedEmail(data.tenderId, result, data.submittedBy);

        // TIMER TRANSITION: Stop bid_submission timer
        try {
            this.logger.log(`Stopping timer for tender ${data.tenderId} after bid submitted`);
            await this.timersService.stopTimer({
                entityType: 'TENDER',
                entityId: data.tenderId,
                stage: 'bid_submission',
                userId: data.submittedBy,
                reason: 'Bid submitted'
            });
            this.logger.log(`Successfully stopped bid_submission timer for tender ${data.tenderId}`);
        } catch (error) {
            this.logger.error(`Failed to stop timer for tender ${data.tenderId} after bid submitted:`, error);
            // Don't fail the entire operation if timer transition fails
        }

        return result;
    }

    async markAsMissed(data: {
        tenderId: number;
        reasonForMissing: string;
        preventionMeasures: string;
        tmsImprovements: string;
        submittedBy: number;
    }) {
        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(data.tenderId);

        if(!currentTender){
            throw new Error("Tender not found!")
        }

        const prevStatus = currentTender?.status ?? null;

        // AUTO STATUS CHANGE: Update tender status to 8 (Missed) and track it
        const newStatus = 8; // Status ID for "Bid Missed" -> new updated status specifically for Bid Missed

        // Check if bid submission already exists
        const existing = await this.findByTenderId(data.tenderId);

        const result = await this.db.transaction(async (tx) => {
            let bidSubmission;
            if (existing) {
                // Update existing
                const [updated] = await tx
                    .update(bidSubmissions)
                    .set({
                        status: 'Tender Missed',
                        reasonForMissing: data.reasonForMissing,
                        preventionMeasures: data.preventionMeasures,
                        tmsImprovements: data.tmsImprovements,
                        submittedBy: data.submittedBy,
                        // Clear bid fields if any
                        submissionDatetime: null,
                        finalBiddingPrice: null,
                        documents: null,
                        updatedAt: new Date(),
                    })
                    .where(eq(bidSubmissions.id, existing.id))
                    .returning();

                bidSubmission = updated;
            } else {
                // Create new
                const [created] = await tx
                    .insert(bidSubmissions)
                    .values({
                        tenderId: data.tenderId,
                        status: 'Tender Missed',
                        reasonForMissing: data.reasonForMissing,
                        preventionMeasures: data.preventionMeasures,
                        tmsImprovements: data.tmsImprovements,
                        submittedBy: data.submittedBy,
                    })
                    .returning();

                bidSubmission = created;
            }

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
                'Tender missed'
            );

            return bidSubmission;
        });

        // Send email notification
        await this.sendBidMissedEmail(data.tenderId, result, data.submittedBy);


        //stopping all the timers running for this tender
        //for the time being stopping all the running timers
        this.timersService.stopAllTimers({
            entityId    : currentTender.id,
            entityType  : 'TENDER',
            userId      : data.submittedBy
        });

        return result;
    }

    async markAsMissedGlobal(data : {tenderId: number, rejectionStatus : number, preventionMeasures? : string, tmsImprovements?: string, submittedBy: number}){
        try{

            //checking the tender entry
            const [tender] = await this.db.select().from(tenderInfos).where(eq(tenderInfos.id, data.tenderId));

            if(!tender){
                throw new Error("tender not found.");
            }

            const prevStatus = tender?.status ?? null; 

            const [status] = await this.db.select({name: statuses.name, id: statuses.id}).from(statuses).where(eq(statuses.id, data.rejectionStatus));
            const newStatus = status.id;


            // checking for various actions to be performed
            if (EMDActionStatuses.includes(data.rejectionStatus)) {
                // applicable stage, we will perform EMD actions
                await this.rejectEMD(tender.id, data.submittedBy, data.rejectionStatus);
            }
            

            //checking bid submissionis
            const existing = await this.findByTenderId(data.tenderId);

            //marking the db value as missed
            const result = await this.db.transaction(async (tx) => {
                // Update tender status
                await tx
                    .update(tenderInfos)
                    .set({ status: newStatus, updatedAt: new Date() })
                    .where(eq(tenderInfos.id, data.tenderId));

                // track status change
                await this.tenderStatusHistoryService.trackStatusChange(
                    data.tenderId,
                    newStatus,
                    data.submittedBy,
                    prevStatus,
                    'Tender missed',
                    tx
                );

                // Fetch the full status history for this tender
                const statusHistory = await this.tenderStatusHistoryService.findByTenderId(data.tenderId, tx);

                let bidSubmission;
                if (existing) {
                    // Update existing
                    const [updated] = await tx
                        .update(bidSubmissions)
                        .set({
                            status: 'Tender Missed',
                            reasonForMissing: status.name,
                            reasonStatus: status.id,
                            preventionMeasures: data.preventionMeasures,
                            tmsImprovements: data.tmsImprovements,
                            submittedBy: data.submittedBy,
                            statusHistoryMetatag: statusHistory,
                            updatedAt: new Date(),
                        })
                        .where(eq(bidSubmissions.id, existing.id))
                        .returning();

                    bidSubmission = updated;
                } else {
                    // Create new
                    const [created] = await tx
                        .insert(bidSubmissions)
                        .values({
                            tenderId: data.tenderId,
                            status: 'Tender Missed',
                            reasonForMissing: status.name,
                            reasonStatus: status.id,
                            preventionMeasures: data.preventionMeasures,
                            tmsImprovements: data.tmsImprovements,
                            submittedBy: data.submittedBy,
                            statusHistoryMetatag: statusHistory,
                        })
                        .returning();

                    bidSubmission = created;
                }

                return bidSubmission;
            });

            // Send email notification
            // await this.sendBidMissedEmail(data.tenderId, result, data.submittedBy);

            //stopping all the timers running for this tender
            //for the time being stopping all the running timers
            this.timersService.stopAllTimers({
                entityId    : tender.id,
                entityType  : 'TENDER',
                userId      : data.submittedBy
            });

        } catch (err){
            //logging the error 
            this.logger.error("Failed to update the status" , data, err);
        }     
    }

    // Implementing actions for different statuses
    // Two actions required for now
    // RejectRFQ -> action for statuses ->10, 35, 14
    // RejectEMD -> action for statuses ->10, 33, 35, 14 

    async rejectRFQ(tenderId : number){
        //not needed for now since we use tenderstatus already
        
    }

    async rejectEMD(tenderId: number , userId: number, statusId: number){
        //reject the emd once these statuses are implemented
        //need the rejection reason for rejecting the payment request

        const pendingEmds = await this.db.
                select({
                    paymentRequests: paymentRequests,
                    paymentInstruments: paymentInstruments,
                    users: users,
                })
                .from(paymentRequests)
                .where
                (and(
                    eq(paymentRequests.tenderId, tenderId),
                    ilike(paymentInstruments.status, '%pending'),
                ))
                .leftJoin(paymentInstruments, eq(paymentInstruments.requestId, paymentRequests.id))
                .leftJoin(users, eq(users.id, userId));


        //no such pending entry found 

        if(!pendingEmds){
            return ;
        }

        const [status] = await this.db
            .select()
            .from(statuses)
            .where(eq(statuses.id, statusId));

        for (const emd of pendingEmds) {
            // Updating each instrument and request in the table
            if (emd.paymentInstruments?.id) {
                // Stripping 'PENDING' from the end and replacing with 'REJECTED'
                const newStatus = emd.paymentInstruments.status.replace(/PENDING$/i, 'REJECTED');

                await this.db.update(paymentInstruments)
                    .set({ 
                        status: newStatus,
                        action : 1
                     })
                    .where(eq(paymentInstruments.id, emd.paymentInstruments.id));
            }

            // 'remarks' exists in paymentRequests, not paymentInstruments
            await this.db.update(paymentRequests)
                .set({
                    remarks: `Bid Missed - ${status?.name || 'Unknown'} - ${emd?.users?.name || 'Unknown'}`,
                })
                .where(eq(paymentRequests.id, emd.paymentRequests.id));
        }

    }

    async getValidMissedStatuses(stage: string) {
        let validStatusIds: number[] = [];

        // Define valid status IDs for each stage
        switch (stage) {
            case 'tender-info':
                validStatusIds = [9, 10, 11, 12, 13, 14, 15, 31, 32];
                break;
            case 'tender-info-approval':
                validStatusIds = [9, 10, 11, 12, 13, 14, 15, 31, 32]; 
                break;
            case 'phy-doc':
                validStatusIds = []; 
                break;
            case 'rfq':
                validStatusIds = [14 ,35]; 
                break;
            case 'emd':
                validStatusIds = [8]; 
            case 'checklist':
                validStatusIds = [];
                break;
            case 'costing-sheet':
                validStatusIds = [8 ,10, 14 ,34 ]; 
                break;
            case 'costing-approval':
                validStatusIds = []; 
                break;
            case 'bid-submission':
                validStatusIds = [8 , 10, 16 , 33 , 34, 35 ,36];
                break;
        }

        if (validStatusIds.length > 0) {
            return this.db
                .select({ id: statuses.id, name: statuses.name })
                .from(statuses)
                .where(inArray(statuses.id, validStatusIds));
        }

        // Fallback: return any status containing "Missed" or "Reject"
        return "Missed";
    }

    async update(
        id: number,
        data: {
            submissionDatetime?: Date;
            submittedDocs?: string[];
            proofOfSubmission?: string;
            finalPriceSs?: string;
            finalBiddingPrice?: string | null;
            reasonForMissing?: string;
            preventionMeasures?: string;
            tmsImprovements?: string;
        }
    ) {
        const existing = await this.findById(id);

        // Build update object based on status
        const updateData: any = {
            updatedAt: new Date(),
        };

        if (existing.status === 'Bid Submitted') {
            // Update bid-related fields
            if (data.submissionDatetime) updateData.submissionDatetime = data.submissionDatetime;
            if (data.finalBiddingPrice !== undefined) updateData.finalBiddingPrice = data.finalBiddingPrice;
            if (data.submittedDocs || data.proofOfSubmission || data.finalPriceSs) {
                updateData.documents = {
                    submittedDocs: data.submittedDocs || existing.documents?.submittedDocs || [],
                    submissionProof: data.proofOfSubmission || existing.documents?.submissionProof || null,
                    finalPriceSs: data.finalPriceSs || existing.documents?.finalPriceSs || null,
                };
            }
        } else if (existing.status === 'Tender Missed') {
            // Update missed-related fields
            if (data.reasonForMissing) updateData.reasonForMissing = data.reasonForMissing;
            if (data.preventionMeasures) updateData.preventionMeasures = data.preventionMeasures;
            if (data.tmsImprovements !== undefined) updateData.tmsImprovements = data.tmsImprovements;
        }

        const [result] = await this.db
            .update(bidSubmissions)
            .set(updateData)
            .where(eq(bidSubmissions.id, id))
            .returning();

        return result;
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
        recipients: { to?: RecipientSource[]; cc?: RecipientSource[]; attachments?: { files: string[]; baseDir?: string } }
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
                attachments: recipients.attachments,
            });
        } catch (error) {
            this.logger.error(`Failed to send email for tender ${tenderId}: ${error instanceof Error ? error.message : String(error)}`);
            // Don't throw - email failure shouldn't break main operation
        }
    }

    /**
     * Send bid submitted email
     */
    private async sendBidSubmittedEmail(
        tenderId: number,
        bidSubmission: { submissionDatetime: Date | null; documents?: { submittedDocs?: string[]; submissionProof?: string | null; finalPriceSs?: string | null } | null },
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

        // Format dates
        const dueDate = tender.dueDate ? new Date(tender.dueDate).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        const bidSubmissionDate = bidSubmission.submissionDatetime ? new Date(bidSubmission.submissionDatetime).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        // Calculate time before deadline
        let timeBeforeDeadline = 'N/A';
        if (tender.dueDate && bidSubmission.submissionDatetime) {
            const diffMs = new Date(tender.dueDate).getTime() - new Date(bidSubmission.submissionDatetime).getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            timeBeforeDeadline = `${diffHours} hours ${diffMinutes} minutes`;
        }

        const emailData = {
            tlName,
            tenderName: tender.tenderName,
            dueDate,
            bidSubmissionDate,
            timeBeforeDeadline,
            teName,
        };

        // Get accounts team ID for CC
        const accountsTeamId = await this.getAccountsTeamId();

        const ccRecipients: RecipientSource[] = [
            { type: 'role', role: 'Admin', teamId: tender.team },
            { type: 'role', role: 'Coordinator', teamId: tender.team },
        ];

        // Add accounts team admin if accounts team exists
        if (accountsTeamId) {
            ccRecipients.push({ type: 'role', role: 'Admin', teamId: accountsTeamId });
        }

        // Collect attachments
        const attachmentFiles: string[] = [];
        if (bidSubmission.documents) {
            if (bidSubmission.documents.submittedDocs && bidSubmission.documents.submittedDocs.length > 0) {
                attachmentFiles.push(...bidSubmission.documents.submittedDocs);
            }
            if (bidSubmission.documents.submissionProof) {
                attachmentFiles.push(bidSubmission.documents.submissionProof);
            }
            if (bidSubmission.documents.finalPriceSs) {
                attachmentFiles.push(bidSubmission.documents.finalPriceSs);
            }
        }

        await this.sendEmail(
            'bid.submitted',
            tenderId,
            submittedBy,
            `Bid Submitted - ${tender.tenderName}`,
            'bid-submitted',
            emailData,
            {
                to: [{ type: 'role', role: 'Team Leader', teamId: tender.team }],
                cc: ccRecipients,
                attachments: attachmentFiles.length > 0 ? { files: attachmentFiles } : undefined,
            }
        );
    }

    /**
     * Get Accounts team ID
     */
    private async getAccountsTeamId(): Promise<number | null> {
        const [accountsTeam] = await this.db
            .select({ id: teams.id })
            .from(teams)
            .where(sql`LOWER(${teams.name}) LIKE '%account%'`)
            .limit(1);

        return accountsTeam?.id || null;
    }

    /**
     * Send bid missed email
     */
    private async sendBidMissedEmail(
        tenderId: number,
        bidSubmission: { reasonForMissing: string | null; preventionMeasures: string | null; tmsImprovements: string | null },
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
        const dueDateTime = tender.dueDate ? new Date(tender.dueDate).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        const emailData = {
            tl_name: tlName,
            tender_name: tender.tenderName,
            due_date_time: dueDateTime,
            reason: bidSubmission.reasonForMissing || 'Not specified',
            prevention: bidSubmission.preventionMeasures || 'Not specified',
            tms_improvements: bidSubmission.tmsImprovements || 'None',
            te_name: teName,
        };

        // Get accounts team ID for CC
        const accountsTeamId = await this.getAccountsTeamId();

        const ccRecipients: RecipientSource[] = [
            { type: 'role', role: 'Admin', teamId: tender.team },
            { type: 'role', role: 'Coordinator', teamId: tender.team },
        ];

        // Add accounts team admin if accounts team exists
        if (accountsTeamId) {
            ccRecipients.push({ type: 'role', role: 'Admin', teamId: accountsTeamId });
        }

        await this.sendEmail(
            'bid.missed',
            tenderId,
            submittedBy,
            `Bid Submission deadline Missed - ${tender.tenderName}`,
            'bid-missed',
            emailData,
            {
                to: [{ type: 'role', role: 'Team Leader', teamId: tender.team }],
                cc: ccRecipients,
            }
        );
    }
}
