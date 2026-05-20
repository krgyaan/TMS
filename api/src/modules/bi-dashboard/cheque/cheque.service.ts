import { Inject, Injectable, Logger, NotFoundException, BadRequestException, forwardRef } from '@nestjs/common';
import { eq, and, inArray, isNull, isNotNull, sql, asc, desc, ne, notInArray, or, ilike } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    paymentRequests,
    paymentInstruments,
    instrumentChequeDetails,
    instrumentDdDetails,
    instrumentFdrDetails,
} from '@db/schemas/tendering/payment-requests.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { users } from '@db/schemas/auth/users.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import type { ChequeDashboardRow, ChequeDashboardCounts } from '@/modules/bi-dashboard/cheque/helpers/cheque.types';
import { CHEQUE_STATUSES } from '@/modules/tendering/payment-requests/constants/payment-request-statuses';
import { PaymentRequestsNotificationService } from '@/modules/tendering/payment-requests/services/payment-requests-notification.service';
import { FollowUpService } from '@/modules/follow-up/follow-up.service';
import type { CreateFollowUpDto } from '@/modules/follow-up/zod';
import { followUps } from '@/db/schemas/shared/follow-ups.schema';

@Injectable()
export class ChequeService {
    private readonly logger = new Logger(ChequeService.name);
    private readonly requestedByUser = alias(users, 'requested_by_user');

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject(forwardRef(() => PaymentRequestsNotificationService)) private readonly notificationService: PaymentRequestsNotificationService,
        private readonly followUpService: FollowUpService,
    ) { }

    private deriveChequeStatus(status: string | null, chequeReason: string | null): string {
        if (status === CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED) {
            if (chequeReason === 'DD') return 'DD Created';
            if (chequeReason === 'FDR') return 'FDR Created';
            return 'Cheque Created';
        }
        const map: Record<string, string> = {
            [CHEQUE_STATUSES.PENDING]: 'Pending',
            [CHEQUE_STATUSES.ACCOUNTS_FORM_REJECTED]: 'Cheque Rejected',
            [CHEQUE_STATUSES.FOLLOWUP_INITIATED]: 'Followup Initiated',
            [CHEQUE_STATUSES.STOP_REQUESTED]: 'Cheque Stopped via Bank',
            [CHEQUE_STATUSES.DEPOSITED_IN_BANK]: 'Deposited in Bank',
            [CHEQUE_STATUSES.PAID_VIA_BANK_TRANSFER]: 'Paid via Bank Transfer',
            [CHEQUE_STATUSES.CANCELLED_TORN]: 'Returned/Cancelled/Torn by Party',
        };
        return map[status as string] || status || 'Pending';
    }

    private deriveExpiryStatus(dueDate: Date | null, chequeReason: string | null, status: string | null): string | null {
        const isAccepted = status === CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED;
        if (isAccepted && chequeReason === 'DD') return 'DD Created';
        if (isAccepted && chequeReason === 'FDR') return 'FDR Created';
        if (!dueDate) return 'No date';
        const expiryDate = new Date(dueDate.getTime() + 3 * 30 * 24 * 60 * 60 * 1000);
        return expiryDate < new Date() ? 'Expired' : 'Valid';
    }

    private getNotExpiredCondition() {
        return or(
            isNull(instrumentChequeDetails.dueDate),
            sql`${instrumentChequeDetails.dueDate} + INTERVAL '3 months' >= CURRENT_DATE`
        );
    }

    private getExpiredConditionSQL() {
        return and(
            isNotNull(instrumentChequeDetails.dueDate),
            sql`${instrumentChequeDetails.dueDate} + INTERVAL '3 months' < CURRENT_DATE`
        );
    }

    private buildChequeDashboardConditions(tab?: string) {
        const conditions: any[] = [
            eq(paymentInstruments.instrumentType, 'Cheque'),
            eq(paymentInstruments.isActive, true),
        ];

        if (tab === 'cheque-pending') {
            conditions.push(
                eq(paymentInstruments.action, 0),
                eq(paymentInstruments.status, CHEQUE_STATUSES.PENDING),
                this.getNotExpiredCondition(),
            );
        } else if (tab === 'cheque-payable') {
            conditions.push(
                ne(paymentInstruments.action, 6), // not cancelled
                eq(paymentInstruments.action, 1),
                eq(paymentInstruments.status, CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED),
                or(
                    ilike(instrumentChequeDetails.chequeReason, '%Payable%'),
                    ilike(instrumentChequeDetails.chequeReason, '%other_payment%')
                ),
                this.getNotExpiredCondition(),
            );
        } else if (tab === 'cheque-paid-stop') {
            conditions.push(
                inArray(paymentInstruments.action, [3, 4, 5]),
                ne(paymentInstruments.action, 6), // not cancelled
                this.getNotExpiredCondition(),
            );
        } else if (tab === 'cheque-for-security') {
            conditions.push(
                ne(paymentInstruments.action, 6), // not cancelled
                eq(instrumentChequeDetails.chequeReason, 'Security'),
                eq(paymentInstruments.status, CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED),
                this.getNotExpiredCondition(),
            );
        } else if (tab === 'cheque-for-dd-fdr') {
            conditions.push(
                ne(paymentInstruments.action, 6), // not cancelled
                inArray(instrumentChequeDetails.chequeReason, ['DD', 'FDR', 'EMD']),
                eq(paymentInstruments.status, CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED),
                this.getNotExpiredCondition(),
            );
        } else if (tab === 'rejected') {
            conditions.push(
                eq(paymentInstruments.action, 1),
                eq(paymentInstruments.status, CHEQUE_STATUSES.ACCOUNTS_FORM_REJECTED),
                this.getNotExpiredCondition(),
            );
        } else if (tab === 'cancelled') {
            conditions.push(
                eq(paymentInstruments.action, 6),
                this.getNotExpiredCondition(),
            );
        } else if (tab === 'expired') {
            conditions.push(
                this.getExpiredConditionSQL()
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
    ): Promise<PaginatedResult<ChequeDashboardRow>> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const offset = (page - 1) * limit;

        const conditions = this.buildChequeDashboardConditions(tab);

        const searchTerm = options?.search?.trim();

        // Search filter - search across all rendered columns
        if (searchTerm) {
            const searchStr = `%${searchTerm}%`;
            const searchConditions: any[] = [
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${instrumentChequeDetails.chequeNo} ILIKE ${searchStr}`,
                sql`${instrumentChequeDetails.chequeReason} ILIKE ${searchStr}`,
                sql`${paymentInstruments.favouring} ILIKE ${searchStr}`,
                sql`${paymentInstruments.amount}::text ILIKE ${searchStr}`,
                sql`${instrumentChequeDetails.chequeDate}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.dueDate}::text ILIKE ${searchStr}`,
                sql`${instrumentChequeDetails.dueDate}::text ILIKE ${searchStr}`,
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
                    orderClause = direction(instrumentChequeDetails.chequeDate);
                    break;
                case 'chequeNo':
                    orderClause = direction(instrumentChequeDetails.chequeNo);
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
                chequeNo: instrumentChequeDetails.chequeNo,
                payeeName: paymentInstruments.favouring,
                bidValidity: tenderInfos.dueDate,
                amount: paymentInstruments.amount,
                type: instrumentChequeDetails.chequeReason,
                cheque: instrumentChequeDetails.chequeDate,
                dueDate: instrumentChequeDetails.dueDate,
                chequeStatus: paymentInstruments.status,
                requestedBy: this.requestedByUser.name,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(this.requestedByUser, eq(this.requestedByUser.id, paymentRequests.requestedBy))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(whereClause)
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        // Count query for pagination
        // Using same joins to ensure Search works on Tender Name etc
        const [countResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
            .where(whereClause);

        const total = Number(countResult?.count || 0);

        const data: ChequeDashboardRow[] = rows.map((row) => ({
            id: row.id,
            requestId: row.requestId,
            purpose: row.purpose,
            requestedBy: row.requestedBy,
            chequeNo: row.chequeNo,
            payeeName: row.payeeName,
            bidValidity: row.bidValidity ? new Date(row.bidValidity) : null,
            amount: row.amount ? Number(row.amount) : null,
            type: row.type,
            cheque: row.cheque,
            dueDate: row.dueDate ? new Date(row.dueDate) : null,
            expiry: this.deriveExpiryStatus(row.dueDate ? new Date(row.dueDate) : null, row.type, row.chequeStatus),
            chequeStatus: this.deriveChequeStatus(row.chequeStatus, row.type),
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    private async countChequeByConditions(conditions: any[]) {
        // FIXED: Added Left Join to instrumentChequeDetails
        // Without this, filters like 'eq(instrumentChequeDetails.chequeReason, ...)' would fail
        const [result] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
            .where(and(...conditions));

        return Number(result?.count || 0);
    }

    async getDashboardCounts(): Promise<ChequeDashboardCounts> {
        // Run these in parallel for better performance
        const [
            chequePending,
            chequePayable,
            chequePaidStop,
            chequeForSecurity,
            chequeForDdFdr,
            rejected,
            cancelled,
            expired
        ] = await Promise.all([
            this.countChequeByConditions(this.buildChequeDashboardConditions('cheque-pending')),
            this.countChequeByConditions(this.buildChequeDashboardConditions('cheque-payable')),
            this.countChequeByConditions(this.buildChequeDashboardConditions('cheque-paid-stop')),
            this.countChequeByConditions(this.buildChequeDashboardConditions('cheque-for-security')),
            this.countChequeByConditions(this.buildChequeDashboardConditions('cheque-for-dd-fdr')),
            this.countChequeByConditions(this.buildChequeDashboardConditions('rejected')),
            this.countChequeByConditions(this.buildChequeDashboardConditions('cancelled')),
            this.countChequeByConditions(this.buildChequeDashboardConditions('expired'))
        ]);

        return {
            'cheque-pending': chequePending,
            'cheque-payable': chequePayable,
            'cheque-paid-stop': chequePaidStop,
            'cheque-for-security': chequeForSecurity,
            'cheque-for-dd-fdr': chequeForDdFdr,
            rejected,
            cancelled,
            expired,
            total: chequePending + chequePayable + chequePaidStop +
                chequeForSecurity + chequeForDdFdr + rejected + cancelled + expired,
        };
    }

    private mapActionToNumber(action: string): number {
        const actionMap: Record<string, number> = {
            'accounts-form': 1,
            'initiate-followup': 2,
            'stop-cheque': 3,
            'paid-via-bank-transfer': 4,
            'deposited-in-bank': 5,
            'cancelled-torn': 6,
        };
        return actionMap[action] || 1;
    }

    async updateAction(
        instrumentId: number,
        body: any,
        user: any,
    ) {
        this.logger.debug("Printing the id ", instrumentId);
        this.logger.debug("Printing the body of action update", body);

        const [instrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            throw new NotFoundException(`Instrument ${instrumentId} not found`);
        }

        if (instrument.instrumentType !== 'Cheque') {
            throw new BadRequestException('Instrument is not a Cheque');
        }

        const actionNumber = this.mapActionToNumber(body.action);

        // Get file path from body (set by TenderFileUploader prior to form submission)
        const getFilePathFromBody = (fieldname: string, body: any): string | null => {
            const val = body[fieldname];
            if (!val) return null;
            if (typeof val === 'string') return val;
            return null;
        };

        const updateData: any = {
            action: actionNumber,
            updatedAt: new Date(),
        };

        if (body.action === 'accounts-form') {
            if (body.cheque_req === 'Accepted') {
                updateData.status = CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED;
            } else if (body.cheque_req === 'Rejected') {
                updateData.status = CHEQUE_STATUSES.ACCOUNTS_FORM_REJECTED;
                updateData.rejectionReason = body.reason_req || null;
            }
        } else if (body.action === 'initiate-followup') {
            updateData.status = CHEQUE_STATUSES.FOLLOWUP_INITIATED;
        } else if (body.action === 'stop-cheque') {
            updateData.status = CHEQUE_STATUSES.STOP_REQUESTED;
        } else if (body.action === 'paid-via-bank-transfer') {
            updateData.status = CHEQUE_STATUSES.PAID_VIA_BANK_TRANSFER;
            if (body.transfer_date) updateData.transferDate = body.transfer_date;
            if (body.utr) updateData.utr = body.utr;
        } else if (body.action === 'deposited-in-bank') {
            updateData.status = CHEQUE_STATUSES.DEPOSITED_IN_BANK;
        } else if (body.action === 'cancelled-torn') {
            updateData.status = CHEQUE_STATUSES.CANCELLED_TORN;
        }

        await this.db
            .update(paymentInstruments)
            .set(updateData)
            .where(eq(paymentInstruments.id, instrumentId));

        const chequeDetailsUpdate: any = {};
        if (body.action === 'accounts-form') {
            if (body.cheque_no) chequeDetailsUpdate.chequeNo = body.cheque_no;
            if (body.due_date) chequeDetailsUpdate.dueDate = body.due_date;

            const receivingChequePath = getFilePathFromBody('receiving_cheque_handed_over', body);
            if (receivingChequePath) {
                chequeDetailsUpdate.handover = receivingChequePath;
            }

            const positivePayPath = getFilePathFromBody('positive_pay_confirmation', body);
            if (positivePayPath) {
                chequeDetailsUpdate.confirmation = positivePayPath;
            }

            if (body.remarks) {
                chequeDetailsUpdate.remarks = body.remarks;
            }

            if (body.cheque_given_from_account) {
                chequeDetailsUpdate.chequeGivenFromAccount = body.cheque_given_from_account;
            }

            // Handle cheque_images - can be array (JSON) or string (form-data fallback)
            const chequeImages = body.cheque_images;
            if (chequeImages) {
                if (Array.isArray(chequeImages)) {
                    chequeDetailsUpdate.chequeImagePath = chequeImages.join(',');
                } else if (typeof chequeImages === 'string') {
                    try {
                        const parsed = JSON.parse(chequeImages);
                        if (Array.isArray(parsed)) {
                            chequeDetailsUpdate.chequeImagePath = parsed.join(',');
                        } else {
                            chequeDetailsUpdate.chequeImagePath = chequeImages;
                        }
                    } catch {
                        chequeDetailsUpdate.chequeImagePath = chequeImages;
                    }
                }
            }
        } else if (body.action === 'stop-cheque') {
            if (body.stop_reason_text) chequeDetailsUpdate.stopReasonText = body.stop_reason_text;

            const proofImagePath = getFilePathFromBody('proof_image', body);
            if (proofImagePath) {
                chequeDetailsUpdate.proofImage = proofImagePath;
            }
        } else if (body.action === 'paid-via-bank-transfer') {
            if (body.transfer_date) chequeDetailsUpdate.transferDate = body.transfer_date;
            if (body.utr) chequeDetailsUpdate.reference = body.utr;
            if (body.amount) chequeDetailsUpdate.amount = body.amount;
        } else if (body.action === 'deposited-in-bank') {
            if (body.bt_transfer_date) chequeDetailsUpdate.btTransferDate = body.bt_transfer_date;
            if (body.reference) chequeDetailsUpdate.reference = body.reference;
        } else if (body.action === 'cancelled-torn') {
            const cancelledImagePath = getFilePathFromBody('cancelled_image_path', body);
            if (cancelledImagePath) {
                chequeDetailsUpdate.cancelledImagePath = cancelledImagePath;
            }
        }

        if (Object.keys(chequeDetailsUpdate).length > 0) {
            chequeDetailsUpdate.updatedAt = new Date();

            const [existing] = await this.db
                .select({ id: instrumentChequeDetails.id })
                .from(instrumentChequeDetails)
                .where(eq(instrumentChequeDetails.instrumentId, instrumentId))
                .limit(1);

            if (existing) {
                await this.db
                    .update(instrumentChequeDetails)
                    .set(chequeDetailsUpdate)
                    .where(eq(instrumentChequeDetails.instrumentId, instrumentId));
            } else {
                await this.db
                    .insert(instrumentChequeDetails)
                    .values({
                        instrumentId,
                        ...chequeDetailsUpdate,
                    });
            }
        }

        // Send emails after cheque action accounts-form accepted
        if (body.action === 'accounts-form' && body.cheque_req === 'Accepted') {
            this.logger.debug(`Email trigger condition met for cheque ${instrumentId}`);
            try {
                const [chequeDetails] = await this.db
                    .select()
                    .from(instrumentChequeDetails)
                    .where(eq(instrumentChequeDetails.instrumentId, instrumentId))
                    .limit(1);

                this.logger.debug(`Cheque details for ${instrumentId}: linkedDdId=${chequeDetails?.linkedDdId}, linkedFdrId=${chequeDetails?.linkedFdrId}`);

                if (chequeDetails?.linkedDdId) {
                    const [ddInstrument] = await this.db
                        .select()
                        .from(paymentInstruments)
                        .where(eq(paymentInstruments.id, chequeDetails.linkedDdId))
                        .limit(1);
                        
                    if (ddInstrument) {
                        const requestId = ddInstrument.requestId;
                        const [request] = await this.db
                            .select()
                            .from(paymentRequests)
                            .where(eq(paymentRequests.id, requestId))
                            .limit(1);
                        const tenderId = request?.tenderId || 0;

                        const result = await this.notificationService.sendDdMailAfterChequeAction(
                            instrument,
                            chequeDetails,
                            ddInstrument.id,
                            tenderId,
                            requestId,
                        );

                        if (result?.success) {
                            this.logger.log(`DD mail sent after cheque action for cheque ${instrumentId}, DD instrument ${ddInstrument.id}`);
                        } else {
                            this.logger.warn(`DD mail not sent for cheque ${instrumentId} (DD instrument ${ddInstrument.id}): ${result?.success || 'unknown'}`);
                        }
                    }
                } else if (chequeDetails?.linkedFdrId) {
                    const [fdrDetail] = await this.db
                        .select()
                        .from(instrumentFdrDetails)
                        .where(eq(instrumentFdrDetails.id, chequeDetails.linkedFdrId))
                        .limit(1);

                    if (fdrDetail) {
                        const [fdrInstrument] = await this.db
                            .select()
                            .from(paymentInstruments)
                            .where(eq(paymentInstruments.id, fdrDetail.instrumentId))
                            .limit(1);

                        if (fdrInstrument) {
                            const requestId = fdrInstrument.requestId;
                            const [request] = await this.db
                                .select()
                                .from(paymentRequests)
                                .where(eq(paymentRequests.id, requestId))
                                .limit(1);
                            const tenderId = request?.tenderId || 0;

                            const result = await this.notificationService.sendFdrMailAfterChequeAction(
                                instrument,
                                chequeDetails,
                                fdrInstrument.id,
                                tenderId,
                                requestId,
                            );

                            if (result?.success) {
                                this.logger.log(`FDR mail sent after cheque action for cheque ${instrumentId}, FDR instrument ${fdrInstrument.id}`);
                            } else {
                                this.logger.warn(`FDR mail not sent for cheque ${instrumentId} (FDR instrument ${fdrInstrument.id}): ${result?.success || 'unknown'}`);
                            }
                        }
                    }
                } else {
                    await this.notificationService.sendChequeCreatedMail(
                        instrumentId,
                        'Accepted',
                        undefined,
                        user.id,
                    );

                    this.logger.log(`Cheque created mail triggered after cheque action for cheque ${instrumentId}`);
                }
            } catch (error) {
                this.logger.error(`Failed to send mail after cheque action for cheque ${instrumentId}:`, error);
            }
        }

        if (body.action === 'initiate-followup' && body.emailBody) {
            try {
                let contacts: any[] = [];
                if (body.contacts) {
                    if (Array.isArray(body.contacts)) {
                        contacts = body.contacts;
                    } else if (typeof body.contacts === 'string') {
                        try {
                            contacts = JSON.parse(body.contacts);
                        } catch {
                            this.logger.warn('Failed to parse contacts string', body.contacts);
                        }
                    }
                }
                const followupDto: CreateFollowUpDto = {
                    area: 'Accounts',
                    partyName: body.organisation_name || 'Unknown',
                    details: body.emailBody,
                    contacts: contacts.map((c: any) => ({
                        name: c.name,
                        email: c.email || null,
                        phone: c.phone || null,
                        org: body.organisation_name || null,
                    })),
                    frequency: body.frequency || null,
                    startFrom: body.followup_start_date || undefined,
                    emdId: instrumentId,
                    followupFor: 'Cheque Followup',
                    assignedToId: null,
                    createdById: null,
                    amount: 0,
                    attachments: [],
                    followUpHistory: []
                };
                await this.followUpService.create(followupDto, user.id || user.sub);
            } catch (error) {
                this.logger.warn(`Failed to create followup for Cheque instrument ${instrumentId}: ${error.message}`);
            }
        }

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

                // Cheque Details - all fields
                chequeDetailsId: instrumentChequeDetails.id,
                chequeNo: instrumentChequeDetails.chequeNo,
                chequeDate: instrumentChequeDetails.chequeDate,
                bankName: instrumentChequeDetails.bankName,
                chequeImagePath: instrumentChequeDetails.chequeImagePath,
                cancelledImagePath: instrumentChequeDetails.cancelledImagePath,
                linkedDdId: instrumentChequeDetails.linkedDdId,
                linkedFdrId: instrumentChequeDetails.linkedFdrId,
                reqType: instrumentChequeDetails.reqType,
                chequeNeeds: instrumentChequeDetails.chequeNeeds,
                chequeReason: instrumentChequeDetails.chequeReason,
                dueDate: instrumentChequeDetails.dueDate,
                transferDate: instrumentChequeDetails.transferDate,
                btTransferDate: instrumentChequeDetails.btTransferDate,
                handover: instrumentChequeDetails.handover,
                confirmation: instrumentChequeDetails.confirmation,
                reference: instrumentChequeDetails.reference,
                stopReasonText: instrumentChequeDetails.stopReasonText,
                chequeAmount: instrumentChequeDetails.amount,
                chequeDetailsCreatedAt: instrumentChequeDetails.createdAt,
                chequeDetailsUpdatedAt: instrumentChequeDetails.updatedAt,

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
            .leftJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .where(and(
                eq(paymentRequests.id, id),
                eq(paymentInstruments.instrumentType, 'Cheque'),
                eq(paymentInstruments.isActive, true)
            ))
            .limit(1);

        if (!result) {
            throw new NotFoundException(`Payment Request with ID ${id} not found`);
        }

        let linkedDd: {
            requestId: number;
            ddNo: string | null;
            ddDate: Date | null;
            amount: string | null;
            status: string | null;
            favouring: string | null;
            payableAt: string | null;
        } | null = null;
        let linkedFdr: {
            requestId: number;
            fdrNo: string | null;
            fdrDate: Date | null;
            amount: string | null;
            status: string | null;
            favouring: string | null;
            payableAt: string | null;
        } | null = null;

        if (result.linkedDdId) {
            const [ddRow] = await this.db
                .select({
                    requestId: paymentRequests.id,
                    ddNo: instrumentDdDetails.ddNo,
                    ddDate: instrumentDdDetails.ddDate,
                    amount: paymentInstruments.amount,
                    status: paymentInstruments.status,
                    favouring: paymentInstruments.favouring,
                    payableAt: paymentInstruments.payableAt,
                })
                .from(instrumentDdDetails)
                .innerJoin(paymentInstruments, eq(paymentInstruments.id, instrumentDdDetails.instrumentId))
                .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
                .where(eq(instrumentDdDetails.id, result.linkedDdId))
                .limit(1);
            if (ddRow) {
                // Fix: Convert ddDate from string to Date if necessary
                linkedDd = {
                    ...ddRow,
                    ddDate: ddRow.ddDate ? new Date(ddRow.ddDate) : null,
                };
            }
        }

        if (result.linkedFdrId) {
            const [fdrRow] = await this.db
                .select({
                    requestId: paymentRequests.id,
                    fdrNo: instrumentFdrDetails.fdrNo,
                    fdrDate: instrumentFdrDetails.fdrDate,
                    amount: paymentInstruments.amount,
                    status: paymentInstruments.status,
                    favouring: paymentInstruments.favouring,
                    payableAt: paymentInstruments.payableAt,
                })
                .from(instrumentFdrDetails)
                .innerJoin(paymentInstruments, eq(paymentInstruments.id, instrumentFdrDetails.instrumentId))
                .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
                .where(eq(instrumentFdrDetails.instrumentId, result.linkedFdrId))
                .limit(1);
            if (fdrRow) {
                // Fix: Convert fdrDate from string to Date if necessary
                linkedFdr = {
                    ...fdrRow,
                    fdrDate: fdrRow.fdrDate ? new Date(fdrRow.fdrDate) : null,
                };
            }

            return { ...result, linkedDd, linkedFdr };
        }
        return { ...result, linkedDd, linkedFdr };
    }

    async getActionFormData(id: number) {
        const [result] = await this.db
            .select({
                id: paymentInstruments.id,
                action: paymentInstruments.action,
                status: paymentInstruments.status,
                amount: paymentInstruments.amount,
                favouring: paymentInstruments.favouring,
                payableAt: paymentInstruments.payableAt,
                issueDate: paymentInstruments.issueDate,
                expiryDate: paymentInstruments.expiryDate,
                purpose: paymentInstruments.purpose,
                utr: paymentInstruments.utr,
                docketNo: paymentInstruments.docketNo,
                courierAddress: paymentInstruments.courierAddress,
                courierDeadline: paymentInstruments.courierDeadline,
                generatedPdf: paymentInstruments.generatedPdf,
                cancelPdf: paymentInstruments.cancelPdf,
                docketSlip: paymentInstruments.docketSlip,
                tenderNo: paymentRequests.tenderNo,
                tenderName: paymentRequests.projectName,
                tenderId: paymentRequests.tenderId,
                requestPurpose: paymentRequests.purpose,
                requestCreatedAt: paymentRequests.createdAt,
                requestedByName: users.name,
                chequeNo: instrumentChequeDetails.chequeNo,
                chequeDate: instrumentChequeDetails.chequeDate,
                bankName: instrumentChequeDetails.bankName,
                chequeNeeds: instrumentChequeDetails.chequeNeeds,
                chequeReason: instrumentChequeDetails.chequeReason,
                chequeImagePath: instrumentChequeDetails.chequeImagePath,
                handover: instrumentChequeDetails.handover,
                confirmation: instrumentChequeDetails.confirmation,
                reference: instrumentChequeDetails.reference,
                btTransferDate: instrumentChequeDetails.btTransferDate,
                linkedDdId: instrumentChequeDetails.linkedDdId,
                linkedFdrId: instrumentChequeDetails.linkedFdrId,
                stopReasonText: instrumentChequeDetails.stopReasonText,
                chequeGivenFromAccount: instrumentChequeDetails.chequeGivenFromAccount,
                proofImage: instrumentChequeDetails.proofImage,
                cancelledImagePath: instrumentChequeDetails.cancelledImagePath,
                chequeRemarks: instrumentChequeDetails.remarks,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .where(and(
                eq(paymentInstruments.id, id),
                eq(paymentInstruments.instrumentType, 'Cheque'),
                eq(paymentInstruments.isActive, true)
            ))
            .limit(1);

        if (!result) {
            throw new NotFoundException(`Payment Instrument with ID ${id} not found`);
        }

        const hasAccountsFormData = result.action != null && result.action >= 1;
        const hasReturnedData = result.action != null && [3, 4].includes(result.action);
        const hasSettledData = result.action != null && [5, 6].includes(result.action);

        return {
            id: result.id,
            action: result.action,
            chequeStatus: this.deriveChequeStatus(result.status, result.chequeReason),
            tenderNo: result.tenderNo,
            tenderName: result.tenderName,
            tenderId: result.tenderId,
            amount: result.amount ? Number(result.amount) : null,
            favouring: result.favouring,
            payableAt: result.payableAt,
            issueDate: result.issueDate ? new Date(result.issueDate) : null,
            expiryDate: result.expiryDate ? new Date(result.expiryDate) : null,
            purpose: result.purpose,
            requestPurpose: result.requestPurpose,
            requestedByName: result.requestedByName?.toString() || null,
            requestCreatedAt: result.requestCreatedAt ? result.requestCreatedAt.toISOString() : null,
            chequeNo: result.chequeNo,
            chequeDate: result.chequeDate ? new Date(result.chequeDate) : null,
            bankName: result.bankName,
            chequeNeeds: result.chequeNeeds,
            chequeReason: result.chequeReason,
            chequeImagePath: result.chequeImagePath,
            handover: result.handover,
            confirmation: result.confirmation,
            reference: result.reference,
            btTransferDate: result.btTransferDate ? new Date(result.btTransferDate) : null,
            linkedDdId: result.linkedDdId,
            linkedFdrId: result.linkedFdrId,
            stopReasonText: result.stopReasonText,
            chequeGivenFromAccount: result.chequeGivenFromAccount,
            proofImage: result.proofImage,
            cancelledImagePath: result.cancelledImagePath,
            chequeRemarks: result.chequeRemarks,
            courierAddress: result.courierAddress,
            courierDeadline: result.courierDeadline ? Number(result.courierDeadline) : null,
            utr: result.utr,
            docketNo: result.docketNo,
            generatedPdf: result.generatedPdf,
            cancelPdf: result.cancelPdf,
            docketSlip: result.docketSlip,
            hasAccountsFormData,
            hasReturnedData,
            hasSettledData,
        };
    }

    async getFollowupData(instrumentId: number) {
        const [result] = await this.db
            .select({
                id: followUps.id,
                emdId: followUps.emdId,
                partyName: followUps.partyName,
                area: followUps.area,
                amount: followUps.amount,
                contacts: followUps.contacts,
                frequency: followUps.frequency,
                startFrom: followUps.startFrom,
                nextFollowUpDate: followUps.nextFollowUpDate,
                stopReason: followUps.stopReason,
                proofText: followUps.proofText,
                stopRemarks: followUps.stopRemarks,
                proofImagePath: followUps.proofImagePath,
                assignmentStatus: followUps.assignmentStatus,
                createdAt: followUps.createdAt,
            })
            .from(followUps)
            .where(and(
                eq(followUps.emdId, instrumentId),
                isNull(followUps.deletedAt)
            ))
            .orderBy(desc(followUps.createdAt))
            .limit(1);

        if (!result) {
            return null;
        }

        return {
            id: result.id,
            organisationName: result.partyName,
            area: result.area,
            amount: result.amount ? Number(result.amount) : null,
            contacts: result.contacts || [],
            frequency: result.frequency,
            followupStartDate: result.startFrom ? new Date(result.startFrom) : null,
            nextFollowUpDate: result.nextFollowUpDate ? new Date(result.nextFollowUpDate) : null,
            stopReason: result.stopReason,
            proofText: result.proofText,
            stopRemarks: result.stopRemarks,
            proofImagePath: result.proofImagePath,
            assignmentStatus: result.assignmentStatus,
            createdAt: result.createdAt,
        };
    }
}
