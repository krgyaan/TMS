import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, inArray, isNull, sql, asc, desc } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    paymentRequests,
    paymentInstruments,
    instrumentTransferDetails,
} from '@db/schemas/tendering/emds.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { users } from '@db/schemas/auth/users.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { teams } from '@db/schemas/master/teams.schema';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import type { BankTransferDashboardRow, BankTransferDashboardCounts } from '@/modules/bi-dashboard/bank-transfer/helpers/bankTransfer.types';
import { FollowUpService } from '@/modules/follow-up/follow-up.service';
import type { CreateFollowUpDto } from '@/modules/follow-up/zod';

@Injectable()
export class BankTransferService {
    private readonly logger = new Logger(BankTransferService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly followUpService: FollowUpService,
    ) { }

    async getDashboardData(
        tab?: string,
        options?: {
            page?: number;
            limit?: number;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
            search?: string;
        },
    ): Promise<PaginatedResult<BankTransferDashboardRow>> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const offset = (page - 1) * limit;

        const conditions: any[] = [
            eq(paymentInstruments.instrumentType, 'Bank Transfer'),
            eq(paymentInstruments.isActive, true),
        ];

        // Apply tab-specific filters
        if (tab === 'pending') {
            conditions.push(isNull(paymentInstruments.action));
        } else if (tab === 'accepted') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                eq(paymentInstruments.status, 'Accepted')
            );
        } else if (tab === 'rejected') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                eq(paymentInstruments.status, 'Rejected')
            );
        } else if (tab === 'returned') {
            conditions.push(eq(paymentInstruments.action, 3));
        } else if (tab === 'settled') {
            conditions.push(eq(paymentInstruments.action, 4));
        }

        // Search filter
        if (options?.search) {
            const searchStr = `%${options.search}%`;
            conditions.push(
                sql`(
                    ${tenderInfos.tenderName} ILIKE ${searchStr} OR
                    ${tenderInfos.tenderNo} ILIKE ${searchStr} OR
                    ${instrumentTransferDetails.utrNum} ILIKE ${searchStr} OR
                    ${instrumentTransferDetails.accountName} ILIKE ${searchStr}
                )`
            );
        }

        const whereClause = and(...conditions);

        // Build order clause
        let orderClause: any = desc(paymentInstruments.createdAt);
        if (options?.sortBy) {
            const direction = options.sortOrder === 'desc' ? desc : asc;
            switch (options.sortBy) {
                case 'date':
                    orderClause = direction(instrumentTransferDetails.transactionDate);
                    break;
                case 'tenderNo':
                    orderClause = direction(tenderInfos.tenderNo);
                    break;
                case 'amount':
                    orderClause = direction(paymentInstruments.amount);
                    break;
                default:
                    orderClause = direction(paymentInstruments.createdAt);
            }
        }

        // Data query
        const rows = await this.db
            .select({
                id: paymentInstruments.id,
                date: instrumentTransferDetails.transactionDate,
                teamMember: users.name,
                utrNo: instrumentTransferDetails.utrNum,
                accountName: instrumentTransferDetails.accountName,
                tenderName: tenderInfos.tenderName,
                tenderNo: tenderInfos.tenderNo,
                bidValidity: tenderInfos.dueDate,
                tenderStatus: statuses.name,
                amount: paymentInstruments.amount,
                btStatus: paymentInstruments.status,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .innerJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentTransferDetails, eq(instrumentTransferDetails.instrumentId, paymentInstruments.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(whereClause)
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        // Count query
        const [countResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .innerJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentTransferDetails, eq(instrumentTransferDetails.instrumentId, paymentInstruments.id))
            .where(whereClause);

        const total = Number(countResult?.count || 0);

        const data: BankTransferDashboardRow[] = rows.map((row) => ({
            id: row.id,
            date: row.date ? new Date(row.date) : null,
            teamMember: row.teamMember,
            utrNo: row.utrNo,
            accountName: row.accountName,
            tenderName: row.tenderName,
            tenderNo: row.tenderNo,
            bidValidity: row.bidValidity ? new Date(row.bidValidity) : null,
            tenderStatus: row.tenderStatus,
            amount: row.amount ? Number(row.amount) : null,
            btStatus: row.btStatus,
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    async getDashboardCounts(): Promise<BankTransferDashboardCounts> {
        const baseConditions = [
            eq(paymentInstruments.instrumentType, 'Bank Transfer'),
            eq(paymentInstruments.isActive, true),
        ];

        // Count pending
        const pendingConditions = [
            ...baseConditions,
            isNull(paymentInstruments.action),
        ];
        const [pendingResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...pendingConditions));
        const pending = Number(pendingResult?.count || 0);

        // Count accepted
        const acceptedConditions = [
            ...baseConditions,
            inArray(paymentInstruments.action, [1, 2]),
            eq(paymentInstruments.status, 'Accepted'),
        ];
        const [acceptedResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...acceptedConditions));
        const accepted = Number(acceptedResult?.count || 0);

        // Count rejected
        const rejectedConditions = [
            ...baseConditions,
            inArray(paymentInstruments.action, [1, 2]),
            eq(paymentInstruments.status, 'Rejected'),
        ];
        const [rejectedResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...rejectedConditions));
        const rejected = Number(rejectedResult?.count || 0);

        // Count returned
        const returnedConditions = [
            ...baseConditions,
            eq(paymentInstruments.action, 3),
        ];
        const [returnedResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...returnedConditions));
        const returned = Number(returnedResult?.count || 0);

        // Count settled
        const settledConditions = [
            ...baseConditions,
            eq(paymentInstruments.action, 4),
        ];
        const [settledResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...settledConditions));
        const settled = Number(settledResult?.count || 0);

        return {
            pending,
            accepted,
            rejected,
            returned,
            settled,
            total: pending + accepted + rejected + returned + settled,
        };
    }

    private mapActionToNumber(action: string): number {
        const actionMap: Record<string, number> = {
            'accounts-form-1': 1,
            'initiate-followup': 2,
            'returned': 3,
            'settled': 4,
        };
        return actionMap[action] || 1;
    }

    async updateAction(
        instrumentId: number,
        body: any,
        files: Express.Multer.File[],
        user: any,
    ) {
        const [instrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            throw new NotFoundException(`Instrument ${instrumentId} not found`);
        }

        if (instrument.instrumentType !== 'Bank Transfer') {
            throw new BadRequestException('Instrument is not a Bank Transfer');
        }

        const actionNumber = this.mapActionToNumber(body.action);
        let contacts: any[] = [];
        if (body.contacts) {
            try {
                contacts = typeof body.contacts === 'string' ? JSON.parse(body.contacts) : body.contacts;
            } catch (e) {
                this.logger.warn('Failed to parse contacts', e);
            }
        }

        const filePaths: string[] = [];
        if (files && files.length > 0) {
            for (const file of files) {
                const relativePath = `bi-dashboard/${file.filename}`;
                filePaths.push(relativePath);
            }
        }

        const updateData: any = {
            action: actionNumber,
            updatedAt: new Date(),
        };

        if (body.action === 'accounts-form-1') {
            if (body.bt_req === 'Accepted') {
                updateData.status = 'ACCOUNTS_FORM_ACCEPTED';
            } else if (body.bt_req === 'Rejected') {
                updateData.status = 'ACCOUNTS_FORM_REJECTED';
                updateData.rejectionReason = body.reason_req || null;
            }
            // Store date_time in legacyData for timer stop functionality
            if (body.date_time) {
                updateData.legacyData = {
                    ...(instrument.legacyData || {}),
                    date_time: body.date_time,
                };
            }
        } else if (body.action === 'initiate-followup') {
            updateData.status = 'FOLLOWUP_INITIATED';
        } else if (body.action === 'returned') {
            updateData.status = 'RETURNED';
        } else if (body.action === 'settled') {
            updateData.status = 'SETTLED';
        }

        await this.db
            .update(paymentInstruments)
            .set(updateData)
            .where(eq(paymentInstruments.id, instrumentId));

        // Handle transfer details update or creation
        const transferDetailsUpdate: any = {};
        if (body.action === 'accounts-form-1') {
            if (body.utr_no) transferDetailsUpdate.utrNum = body.utr_no;
            if (body.account_name) transferDetailsUpdate.accountName = body.account_name;
            if (body.account_no) transferDetailsUpdate.accountNumber = body.account_no;
            if (body.ifsc_code) transferDetailsUpdate.ifsc = body.ifsc_code;
            if (body.amount) transferDetailsUpdate.amount = body.amount;
            if (body.payment_date) transferDetailsUpdate.transactionDate = body.payment_date;
            if (body.remarks) transferDetailsUpdate.remarks = body.remarks;
            if (body.utr_mgs) transferDetailsUpdate.utrMsg = body.utr_mgs;
        } else if (body.action === 'returned') {
            if (body.return_date) transferDetailsUpdate.returnTransferDate = body.return_date;
            if (body.return_reason) transferDetailsUpdate.reason = body.return_reason;
            if (body.return_remarks) transferDetailsUpdate.remarks = body.return_remarks;
            if (body.utr_num) transferDetailsUpdate.returnUtr = body.utr_num;
        } else if (body.action === 'settled') {
            if (body.settlement_date) transferDetailsUpdate.transactionDate = body.settlement_date;
            if (body.settlement_amount) transferDetailsUpdate.amount = body.settlement_amount;
            if (body.settlement_reference_no) transferDetailsUpdate.transactionId = body.settlement_reference_no;
        }

        if (Object.keys(transferDetailsUpdate).length > 0) {
            transferDetailsUpdate.updatedAt = new Date();

            // Check if transfer details record exists
            const [existingDetails] = await this.db
                .select()
                .from(instrumentTransferDetails)
                .where(eq(instrumentTransferDetails.instrumentId, instrumentId))
                .limit(1);

            if (existingDetails) {
                await this.db
                    .update(instrumentTransferDetails)
                    .set(transferDetailsUpdate)
                    .where(eq(instrumentTransferDetails.instrumentId, instrumentId));
            } else {
                // Create new transfer details record
                await this.db.insert(instrumentTransferDetails).values({
                    instrumentId,
                    ...transferDetailsUpdate,
                    createdAt: new Date(),
                });
            }
        }

        // Handle followup creation
        if (body.action === 'initiate-followup') {
            try {
                // Get payment request and tender info
                const [request] = await this.db
                    .select({
                        requestId: paymentRequests.id,
                        tenderId: paymentRequests.tenderId,
                    })
                    .from(paymentRequests)
                    .where(eq(paymentRequests.id, instrument.requestId))
                    .limit(1);

                if (request) {
                    const [tender] = await this.db
                        .select({
                            teamId: tenderInfos.team,
                            teamMemberId: tenderInfos.teamMember,
                        })
                        .from(tenderInfos)
                        .where(eq(tenderInfos.id, request.tenderId))
                        .limit(1);

                    if (tender) {
                        // Get team name
                        const [team] = await this.db
                            .select({ name: teams.name })
                            .from(teams)
                            .where(eq(teams.id, tender.teamId))
                            .limit(1);

                        const area = team?.name === 'AC' ? 'AC Team' : 'DC Team';

                        // Identify proof image from files
                        let proofImagePath: string | null = null;
                        if (files && files.length > 0) {
                            // Look for proof image by field name or filename pattern
                            const proofImage = files.find(
                                (f) => f.fieldname === 'proof_image' || f.filename?.includes('proof')
                            );
                            if (proofImage) {
                                proofImagePath = proofImage.filename;
                            }
                        }

                        // Map contacts to ContactPersonDto format and filter out invalid ones
                        const mappedContacts = contacts
                            .filter((contact) => contact.name && contact.name.trim().length > 0)
                            .map((contact) => ({
                                name: contact.name.trim(),
                                email: contact.email || null,
                                phone: contact.phone || null,
                                org: contact.org || null,
                            }));

                        if (mappedContacts.length === 0) {
                            throw new BadRequestException('At least one valid contact with name is required');
                        }

                        // Create followup DTO
                        const followUpDto: CreateFollowUpDto = {
                            area,
                            partyName: body.organisation_name || '',
                            amount: instrument.amount ? Number(instrument.amount) : 0,
                            followupFor: 'Bank Transfer',
                            assignedToId: tender.teamMemberId || null,
                            emdId: request.requestId,
                            contacts: mappedContacts,
                            frequency: body.frequency ? Number(body.frequency) : 1,
                            startFrom: body.followup_start_date || undefined,
                            stopReason: body.stop_reason ? Number(body.stop_reason) : null,
                            proofText: body.proof_text || null,
                            proofImagePath: proofImagePath,
                            stopRemarks: body.stop_remarks || null,
                            attachments: [],
                            createdById: user.id,
                            followUpHistory: [],
                        };

                        await this.followUpService.create(followUpDto, user.id);
                        this.logger.log(`Follow-up created successfully for instrument ${instrumentId}`);
                    }
                }
            } catch (error) {
                this.logger.error(`Failed to create follow-up for instrument ${instrumentId}:`, error);
                // Don't throw - allow the action to complete even if followup creation fails
            }
        }

        return {
            success: true,
            instrumentId,
            action: body.action,
            actionNumber,
        };
    }
}
