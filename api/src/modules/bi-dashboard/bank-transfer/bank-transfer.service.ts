import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, inArray, isNull, sql, asc, desc, or } from 'drizzle-orm';
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
import { BT_STATUSES } from '@/modules/tendering/emds/constants/emd-statuses';
import { FollowUpService } from '@/modules/follow-up/follow-up.service';
import type { CreateFollowUpDto } from '@/modules/follow-up/zod';

@Injectable()
export class BankTransferService {
    private readonly logger = new Logger(BankTransferService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly followUpService: FollowUpService,
    ) { }

    private statusMap() {
        return {
            [BT_STATUSES.PENDING]: 'Pending',
            [BT_STATUSES.ACCOUNTS_FORM_ACCEPTED]: 'Accepted',
            [BT_STATUSES.ACCOUNTS_FORM_REJECTED]: 'Rejected',
            [BT_STATUSES.FOLLOWUP_INITIATED]: 'Followup Initiated',
            [BT_STATUSES.RETURN_VIA_BANK_TRANSFER]: 'Returned',
            [BT_STATUSES.SETTLED_WITH_PROJECT]: 'Settled',
        };
    }

    private buildBtDashboardConditions(tab?: string) {
        const conditions: any[] = [
            eq(paymentInstruments.instrumentType, 'Bank Transfer'),
            eq(paymentInstruments.isActive, true),
        ];

        if (tab === 'pending') {
            conditions.push(
                or(
                    eq(paymentInstruments.action, 0),
                    eq(paymentInstruments.status, BT_STATUSES.PENDING)
                )
            );
        } else if (tab === 'accepted') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                eq(paymentInstruments.status, BT_STATUSES.ACCOUNTS_FORM_ACCEPTED)
            );
        } else if (tab === 'rejected') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                eq(paymentInstruments.status, BT_STATUSES.ACCOUNTS_FORM_REJECTED)
            );
        } else if (tab === 'returned') {
            conditions.push(
                inArray(paymentInstruments.action, [3])
            );
        } else if (tab === 'settled') {
            conditions.push(
                inArray(paymentInstruments.action, [4])
            );
        }

        return conditions;
    }

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

        const conditions = this.buildBtDashboardConditions(tab);

        const searchTerm = options?.search?.trim();

        // Search filter - search across all rendered columns
        if (searchTerm) {
            const searchStr = `%${searchTerm}%`;
            const searchConditions: any[] = [
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${instrumentTransferDetails.utrNum} ILIKE ${searchStr}`,
                sql`${instrumentTransferDetails.accountName} ILIKE ${searchStr}`,
                sql`${users.name} ILIKE ${searchStr}`,
                sql`${statuses.name} ILIKE ${searchStr}`,
                sql`${paymentInstruments.amount}::text ILIKE ${searchStr}`,
                sql`${instrumentTransferDetails.transactionDate}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.dueDate}::text ILIKE ${searchStr}`,
                sql`${paymentInstruments.status} ILIKE ${searchStr}`,
            ];
            conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
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
                requestId: paymentRequests.id,
                date: instrumentTransferDetails.transactionDate,
                teamMember: users.name,
                utrNo: instrumentTransferDetails.utrNum,
                accountName: instrumentTransferDetails.accountName,
                tenderName: tenderInfos.tenderName,
                projectName: paymentRequests.projectName,
                tenderNo: tenderInfos.tenderNo,
                projectNo: paymentRequests.tenderNo,
                bidValidity: tenderInfos.dueDate,
                tenderStatus: statuses.name,
                amount: paymentInstruments.amount,
                btStatus: paymentInstruments.status,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentTransferDetails, eq(instrumentTransferDetails.instrumentId, paymentInstruments.id))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(whereClause)
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        // Count query (join users and statuses when search is used so WHERE can reference them)
        let countQueryBuilder = this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentTransferDetails, eq(instrumentTransferDetails.instrumentId, paymentInstruments.id));
        if (searchTerm) {
            countQueryBuilder = countQueryBuilder
                .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status));
        }
        const [countResult] = await countQueryBuilder.where(whereClause);

        const total = Number(countResult?.count || 0);

        const data: BankTransferDashboardRow[] = rows.map((row) => ({
            id: row.id,
            requestId: row.requestId,
            date: row.date ? new Date(row.date) : null,
            teamMember: row.teamMember?.toString() ?? null,
            member: row.teamMember?.toString() ?? null,
            utrNo: row.utrNo,
            accountName: row.accountName,
            tenderName: row.tenderName || row.projectName,
            tenderNo: row.tenderNo || row.projectNo,
            bidValidity: row.bidValidity ? new Date(row.bidValidity) : null,
            tenderStatus: row.tenderStatus,
            amount: row.amount ? Number(row.amount) : null,
            btStatus: this.statusMap()[row.btStatus],
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    private async countBtByConditions(conditions: any[]) {
        const [result] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...conditions));

        return Number(result?.count || 0);
    }

    async getDashboardCounts(): Promise<BankTransferDashboardCounts> {
        const pending = await this.countBtByConditions(
            this.buildBtDashboardConditions('pending')
        );

        const accepted = await this.countBtByConditions(
            this.buildBtDashboardConditions('accepted')
        );

        const rejected = await this.countBtByConditions(
            this.buildBtDashboardConditions('rejected')
        );

        const returned = await this.countBtByConditions(
            this.buildBtDashboardConditions('returned')
        );

        const settled = await this.countBtByConditions(
            this.buildBtDashboardConditions('settled')
        );

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
            'accounts-form': 1,
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
        this.logger.debug('BT updateAction start', {
            instrumentId,
            action: body?.action,
            bt_req: body?.bt_req,
        });

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

        if (body.action === 'accounts-form' || body.action === 'accounts-form-1') {
            if (body.bt_req === 'Accepted') {
                updateData.status = BT_STATUSES.ACCOUNTS_FORM_ACCEPTED;
            } else if (body.bt_req === 'Rejected') {
                updateData.status = BT_STATUSES.ACCOUNTS_FORM_REJECTED;
                updateData.rejectionReason = body.reason_req || null;
            }
            // Support both payment_datetime (from form) and date_time/payment_date (legacy)
            const dateTime = body.payment_datetime || body.date_time || body.payment_date;
            if (dateTime) {
                updateData.legacyData = {
                    ...(instrument.legacyData || {}),
                    date_time: dateTime,
                };
            }
        } else if (body.action === 'initiate-followup') {
            updateData.status = BT_STATUSES.FOLLOWUP_INITIATED;
        } else if (body.action === 'returned') {
            updateData.status = BT_STATUSES.RETURN_VIA_BANK_TRANSFER;
        } else if (body.action === 'settled') {
            updateData.status = BT_STATUSES.SETTLED_WITH_PROJECT;
        }

        try {
            await this.db
                .update(paymentInstruments)
                .set(updateData)
                .where(eq(paymentInstruments.id, instrumentId));
            // Handle transfer details update or creation
            const transferDetailsUpdate: any = {};
            if (body.action === 'accounts-form' || body.action === 'accounts-form-1') {
                if (body.utr_no) transferDetailsUpdate.utrNum = body.utr_no;
                // Support both payment_datetime (from form) and payment_date (legacy)
                const paymentDateStr = body.payment_datetime || body.payment_date;
                if (paymentDateStr) {
                    const paymentDate = new Date(paymentDateStr);
                    if (isNaN(paymentDate.getTime())) {
                        throw new BadRequestException('Invalid payment date');
                    }
                    transferDetailsUpdate.transactionDate = paymentDate;
                }
                if (body.remarks) transferDetailsUpdate.remarks = body.remarks;
                // Support both utr_message (from form) and utr_mgs (legacy)
                const utrMsg = body.utr_message || body.utr_mgs;
                if (utrMsg) transferDetailsUpdate.utrMsg = utrMsg;
            } else if (body.action === 'returned') {
                // Support both transfer_date (from form) and return_date (legacy)
                const returnDate = body.transfer_date || body.return_date;
                if (returnDate) transferDetailsUpdate.returnTransferDate = returnDate;
                // Support both utr_no (from form) and utr_num (legacy)
                const returnUtr = body.utr_no || body.utr_num;
                if (returnUtr) transferDetailsUpdate.returnUtr = returnUtr;
            } else if (body.action === 'settled') {
                if (body.action === 'settled') transferDetailsUpdate.action = body.action;
            }

            if (Object.keys(transferDetailsUpdate).length > 0) {
                transferDetailsUpdate.updatedAt = new Date();

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
                    await this.db.insert(instrumentTransferDetails).values({
                        instrumentId,
                        ...transferDetailsUpdate,
                        createdAt: new Date(),
                    });
                }
            }

            // Follow-up creation will be handled by a different service class

            this.logger.debug('BT updateAction success', {
                instrumentId,
                action: body.action,
                actionNumber,
            });

            return {
                success: true,
                instrumentId,
                action: body.action,
                actionNumber,
            };
        } catch (err) {
            this.logger.error('BT updateAction error', err);
            throw err;
        }
    }

    async getById(id: number) {
        const [result] = await this.db
            .select({
                // Payment Instrument fields
                instrumentId: paymentInstruments.id,
                instrumentType: paymentInstruments.instrumentType,
                purpose: paymentInstruments.purpose,
                amount: paymentInstruments.amount,
                favouring: paymentInstruments.favouring,
                payableAt: paymentInstruments.payableAt,
                issueDate: paymentInstruments.issueDate,
                expiryDate: paymentInstruments.expiryDate,
                validityDate: paymentInstruments.validityDate,
                claimExpiryDate: paymentInstruments.claimExpiryDate,
                utr: paymentInstruments.utr,
                docketNo: paymentInstruments.docketNo,
                courierAddress: paymentInstruments.courierAddress,
                courierDeadline: paymentInstruments.courierDeadline,
                action: paymentInstruments.action,
                status: paymentInstruments.status,
                isActive: paymentInstruments.isActive,
                generatedPdf: paymentInstruments.generatedPdf,
                cancelPdf: paymentInstruments.cancelPdf,
                docketSlip: paymentInstruments.docketSlip,
                coveringLetter: paymentInstruments.coveringLetter,
                extraPdfPaths: paymentInstruments.extraPdfPaths,
                createdAt: paymentInstruments.createdAt,
                updatedAt: paymentInstruments.updatedAt,

                // Payment Request fields
                requestId: paymentRequests.id,
                tenderId: paymentRequests.tenderId,
                requestType: paymentRequests.type,
                tenderNo: paymentRequests.tenderNo,
                projectName: paymentRequests.projectName,
                requestDueDate: paymentRequests.dueDate,
                requestedBy: paymentRequests.requestedBy,
                requestPurpose: paymentRequests.purpose,
                amountRequired: paymentRequests.amountRequired,
                requestStatus: paymentRequests.status,
                requestRemarks: paymentRequests.remarks,
                requestCreatedAt: paymentRequests.createdAt,
                requestUpdatedAt: paymentRequests.updatedAt,

                // Transfer Details - all fields
                transferDetailsId: instrumentTransferDetails.id,
                portalName: instrumentTransferDetails.portalName,
                accountName: instrumentTransferDetails.accountName,
                accountNumber: instrumentTransferDetails.accountNumber,
                ifsc: instrumentTransferDetails.ifsc,
                transactionDate: instrumentTransferDetails.transactionDate,
                paymentMethod: instrumentTransferDetails.paymentMethod,
                utrMsg: instrumentTransferDetails.utrMsg,
                utrNum: instrumentTransferDetails.utrNum,
                isNetbanking: instrumentTransferDetails.isNetbanking,
                isDebit: instrumentTransferDetails.isDebit,
                returnTransferDate: instrumentTransferDetails.returnTransferDate,
                returnUtr: instrumentTransferDetails.returnUtr,
                reason: instrumentTransferDetails.reason,
                remarks: instrumentTransferDetails.remarks,
                transferDetailsCreatedAt: instrumentTransferDetails.createdAt,
                transferDetailsUpdatedAt: instrumentTransferDetails.updatedAt,

                // Tender Info fields
                tenderName: tenderInfos.tenderName,
                tenderDueDate: tenderInfos.dueDate,
                tenderStatusId: tenderInfos.status,
                tenderOrganizationId: tenderInfos.organization,
                tenderItemId: tenderInfos.item,
                tenderTeamMember: tenderInfos.teamMember,

                // Status fields
                tenderStatusName: statuses.name,

                // User fields
                requestedByName: users.name,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentTransferDetails, eq(instrumentTransferDetails.instrumentId, paymentInstruments.id))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .where(and(
                eq(paymentRequests.id, id),
                eq(paymentInstruments.instrumentType, 'Bank Transfer'),
                eq(paymentInstruments.isActive, true)
            ))
            .limit(1);

        if (!result) {
            throw new NotFoundException(`Payment Request with ID ${id} not found`);
        }

        return result;
    }
}
