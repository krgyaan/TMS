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
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import type { PayOnPortalDashboardRow, PayOnPortalDashboardCounts } from '@/modules/bi-dashboard/pay-on-portal/helpers/payOnPortal.types';
import { FollowUpService } from '@/modules/follow-up/follow-up.service';
import { PORTAL_STATUSES } from '@/modules/tendering/emds/constants/emd-statuses';
import type { CreateFollowUpDto } from '@/modules/follow-up/zod';

@Injectable()
export class PayOnPortalService {
    private readonly logger = new Logger(PayOnPortalService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly followUpService: FollowUpService,
    ) { }

    private statusMap() {
        return {
            [PORTAL_STATUSES.PENDING]: 'Pending',
            [PORTAL_STATUSES.ACCOUNTS_FORM_ACCEPTED]: 'Accepted',
            [PORTAL_STATUSES.ACCOUNTS_FORM_REJECTED]: 'Rejected',
            [PORTAL_STATUSES.RETURN_VIA_BANK_TRANSFER]: 'Returned',
            [PORTAL_STATUSES.SETTLED_WITH_PROJECT]: 'Settled',
        };
    }

    private buildPopDashboardConditions(tab?: string) {
        const conditions: any[] = [
            eq(paymentInstruments.instrumentType, 'Portal Payment'),
            eq(paymentInstruments.isActive, true),
        ];

        if (tab === 'pending') {
            conditions.push(
                or(
                    eq(paymentInstruments.action, 0),
                    eq(paymentInstruments.status, PORTAL_STATUSES.PENDING)
                )
            );
        } else if (tab === 'accepted') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                eq(paymentInstruments.status, PORTAL_STATUSES.ACCOUNTS_FORM_ACCEPTED)
            );
        } else if (tab === 'rejected') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                eq(paymentInstruments.status, PORTAL_STATUSES.ACCOUNTS_FORM_REJECTED)
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
    ): Promise<PaginatedResult<PayOnPortalDashboardRow>> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const offset = (page - 1) * limit;

        const conditions = this.buildPopDashboardConditions(tab);

        const searchTerm = options?.search?.trim();

        // Search filter - search across all rendered columns
        if (searchTerm) {
            const searchStr = `%${searchTerm}%`;
            const searchConditions: any[] = [
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${instrumentTransferDetails.utrNum} ILIKE ${searchStr}`,
                sql`${instrumentTransferDetails.portalName} ILIKE ${searchStr}`,
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
                purpose: paymentRequests.purpose,
                date: instrumentTransferDetails.transactionDate,
                teamMember: users.name,
                utrNo: instrumentTransferDetails.utrNum,
                portalName: instrumentTransferDetails.portalName,
                tenderName: tenderInfos.tenderName,
                tenderNo: tenderInfos.tenderNo,
                bidValidity: tenderInfos.dueDate,
                tenderStatus: statuses.name,
                amount: paymentInstruments.amount,
                popStatus: paymentInstruments.status,
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

        // Count query (join users and statuses when search is used so WHERE can reference them)
        let countQueryBuilder = this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .innerJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentTransferDetails, eq(instrumentTransferDetails.instrumentId, paymentInstruments.id));
        if (searchTerm) {
            countQueryBuilder = countQueryBuilder
                .leftJoin(users, eq(users.id, tenderInfos.teamMember))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status));
        }
        const [countResult] = await countQueryBuilder.where(whereClause);

        const total = Number(countResult?.count || 0);

        const data: PayOnPortalDashboardRow[] = rows.map((row) => ({
            id: row.id,
            requestId: row.requestId,
            purpose: row.purpose,
            date: row.date ? new Date(row.date) : null,
            teamMember: row.teamMember,
            utrNo: row.utrNo,
            portalName: row.portalName,
            tenderName: row.tenderName,
            tenderNo: row.tenderNo,
            bidValidity: row.bidValidity ? new Date(row.bidValidity) : null,
            tenderStatus: row.tenderStatus,
            amount: row.amount ? Number(row.amount) : null,
            popStatus: this.statusMap()[row.popStatus],
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    private async countPopByConditions(conditions: any[]) {
        const [result] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...conditions));

        return Number(result?.count || 0);
    }

    async getDashboardCounts(): Promise<PayOnPortalDashboardCounts> {
        const pending = await this.countPopByConditions(
            this.buildPopDashboardConditions('pending')
        );

        const accepted = await this.countPopByConditions(
            this.buildPopDashboardConditions('accepted')
        );

        const rejected = await this.countPopByConditions(
            this.buildPopDashboardConditions('rejected')
        );

        const returned = await this.countPopByConditions(
            this.buildPopDashboardConditions('returned')
        );

        const settled = await this.countPopByConditions(
            this.buildPopDashboardConditions('settled')
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
        const [instrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            throw new NotFoundException(`Instrument ${instrumentId} not found`);
        }

        if (instrument.instrumentType !== 'Portal Payment') {
            throw new BadRequestException('Instrument is not a Portal Payment');
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
            if (body.pop_req === 'Accepted') {
                updateData.status = PORTAL_STATUSES.ACCOUNTS_FORM_ACCEPTED;
            } else if (body.pop_req === 'Rejected') {
                updateData.status = PORTAL_STATUSES.ACCOUNTS_FORM_REJECTED;
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
            updateData.status = PORTAL_STATUSES.FOLLOWUP_INITIATED;
        } else if (body.action === 'returned') {
            updateData.status = PORTAL_STATUSES.RETURN_VIA_BANK_TRANSFER;
        } else if (body.action === 'settled') {
            updateData.status = PORTAL_STATUSES.SETTLED_WITH_PROJECT;
        }

        await this.db
            .update(paymentInstruments)
            .set(updateData)
            .where(eq(paymentInstruments.id, instrumentId));

        // Handle transfer details update or creation
        const transferDetailsUpdate: any = {};
        if (body.action === 'accounts-form-1') {
            if (body.utr_no) transferDetailsUpdate.utrNum = body.utr_no;
            if (body.portal_name) transferDetailsUpdate.portalName = body.portal_name;
            if (body.amount) transferDetailsUpdate.amount = body.amount;
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
            const returnDateStr = body.transfer_date || body.return_date;
            if (returnDateStr) {
                const returnDate = new Date(returnDateStr);
                if (isNaN(returnDate.getTime())) {
                    throw new BadRequestException('Invalid return date');
                }
                transferDetailsUpdate.returnTransferDate = returnDate;
            }
            if (body.return_reason) transferDetailsUpdate.reason = body.return_reason;
            if (body.return_remarks) transferDetailsUpdate.remarks = body.return_remarks;
            if (body.utr_no) transferDetailsUpdate.returnUtr = body.utr_no;
        } else if (body.action === 'settled') {
            if (body.settlement_date) {
                const settlementDate = new Date(body.settlement_date);
                if (isNaN(settlementDate.getTime())) {
                    throw new BadRequestException('Invalid settlement date');
                }
                transferDetailsUpdate.transactionDate = settlementDate;
            }
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

        // Follow-up creation will be handled by a different service class
        return {
            success: true,
            instrumentId,
            action: body.action,
            actionNumber,
        };
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

                // Transfer Details (Portal Payment) - all fields
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
                eq(paymentInstruments.instrumentType, 'Portal Payment'),
                eq(paymentInstruments.isActive, true)
            ))
            .limit(1);

        if (!result) {
            throw new NotFoundException(`Payment Request with ID ${id} not found`);
        }

        return result;
    }
}
