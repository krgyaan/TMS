import { couriers } from '@/db/schemas/shared/couriers.schema';
import { followUps } from '@/db/schemas/shared/follow-ups.schema';
import type { DemandDraftDashboardCounts, DemandDraftDashboardRow } from '@/modules/bi-dashboard/demand-draft/helpers/demandDraft.types';
import { FollowUpService } from '@/modules/follow-up/follow-up.service';
import type { CreateFollowUpDto } from '@/modules/follow-up/zod';
import { CHEQUE_STATUSES, DD_STATUSES } from '@/modules/tendering/payment-requests/constants/payment-request-statuses';
import { PaymentRequestsNotificationService } from '@/modules/tendering/payment-requests/services/payment-requests-notification.service';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { DbInstance } from '@db';
import { DRIZZLE } from '@db/database.module';
import { users } from '@db/schemas/auth/users.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { instrumentChequeDetails, instrumentDdDetails, paymentInstruments, paymentRequests } from '@db/schemas/tendering/payment-requests.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';

@Injectable()
export class DemandDraftService {
    private readonly logger = new Logger(DemandDraftService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly followUpService: FollowUpService,
        private readonly notificationService: PaymentRequestsNotificationService,
    ) { }

    private deriveDdStatus(status: string | null): string {
        const map: Record<string, string> = {
            [DD_STATUSES.PENDING]: 'Pending',
            [DD_STATUSES.ACCOUNTS_FORM_ACCEPTED]: 'DD Created',
            [DD_STATUSES.ACCOUNTS_FORM_REJECTED]: 'DD Rejected',
            [DD_STATUSES.FOLLOWUP_INITIATED]: 'Followup Initiated',
            [DD_STATUSES.RETURN_VIA_COURIER]: 'Returned via courier',
            [DD_STATUSES.RETURN_VIA_BANK_TRANSFER]: 'Returned via Bank Transfer',
            [DD_STATUSES.SETTLED_WITH_PROJECT]: 'Settled with Project Account',
            [DD_STATUSES.CANCELLATION_REQUESTED]: 'DD Cancellation request sent to branch',
            [DD_STATUSES.CANCELLED]: 'DD Cancelled at Branch',
        };
        return map[status as string] || status || 'Pending';
    }

    private deriveDdExpiryStatus(ddCreationDate: Date | null): string {
        if (!ddCreationDate) return 'No date';
        const expiryDate = new Date(ddCreationDate.getTime() + 3 * 30 * 24 * 60 * 60 * 1000);
        return expiryDate < new Date() ? 'Expired' : 'Valid';
    }

    private buildDdDashboardConditions(tab?: string) {
        const conditions: any[] = [
            eq(paymentInstruments.instrumentType, 'DD'),
            eq(paymentInstruments.isActive, true),
        ];

        if (tab === 'pending') {
            conditions.push(
                or(
                    eq(paymentInstruments.action, 0),
                    eq(paymentInstruments.status, DD_STATUSES.PENDING)
                )
            );
        } else if (tab === 'created') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                inArray(paymentInstruments.status, [DD_STATUSES.ACCOUNTS_FORM_ACCEPTED, DD_STATUSES.FOLLOWUP_INITIATED])
            );
        } else if (tab === 'rejected') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                eq(paymentInstruments.status, DD_STATUSES.ACCOUNTS_FORM_REJECTED)
            );
        } else if (tab === 'returned') {
            conditions.push(
                inArray(paymentInstruments.action, [3, 4, 5])
            );
        } else if (tab === 'cancelled') {
            conditions.push(
                inArray(paymentInstruments.action, [6, 7])
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
    ): Promise<PaginatedResult<DemandDraftDashboardRow>> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const offset = (page - 1) * limit;

        const conditions = this.buildDdDashboardConditions(tab);

        const searchTerm = options?.search?.trim();

        // Search filter - search across all rendered columns
        if (searchTerm) {
            const searchStr = `%${searchTerm}%`;
            const searchConditions: any[] = [
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${instrumentDdDetails.ddNo} ILIKE ${searchStr}`,
                sql`${paymentInstruments.favouring} ILIKE ${searchStr}`,
                sql`${paymentInstruments.amount}::text ILIKE ${searchStr}`,
                sql`${statuses.name} ILIKE ${searchStr}`,
                sql`${users.name} ILIKE ${searchStr}`,
                sql`${instrumentDdDetails.ddDate}::text ILIKE ${searchStr}`,
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
                case 'ddCreationDate':
                    orderClause = direction(instrumentDdDetails.ddDate);
                    break;
                case 'ddNo':
                    orderClause = direction(instrumentDdDetails.ddNo);
                    break;
                case 'tenderNo':
                    orderClause = direction(tenderInfos.tenderNo);
                    break;
                case 'ddAmount':
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
                ddCreationDate: instrumentDdDetails.ddDate,
                ddNo: instrumentDdDetails.ddNo,
                beneficiaryName: paymentInstruments.favouring,
                ddAmount: paymentInstruments.amount,
                tenderName: tenderInfos.tenderName,
                projectName: paymentRequests.projectName,
                projectNo: paymentRequests.tenderNo,
                tenderNo: tenderInfos.tenderNo,
                bidValidity: tenderInfos.dueDate,
                tenderStatus: statuses.name,
                teamMember: users.name,
                ddStatus: paymentInstruments.status,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .innerJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentDdDetails, eq(instrumentDdDetails.instrumentId, paymentInstruments.id))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .where(whereClause)
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        // Count query (join statuses and users when search is used so WHERE can reference them)
        let countQueryBuilder = this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentDdDetails, eq(instrumentDdDetails.instrumentId, paymentInstruments.id));
        if (searchTerm) {
            countQueryBuilder = countQueryBuilder
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
                .leftJoin(users, eq(users.id, paymentRequests.requestedBy));
        }
        const [countResult] = await countQueryBuilder.where(whereClause);

        const total = Number(countResult?.count || 0);

        const data: DemandDraftDashboardRow[] = rows.map((row) => ({
            id: row.id,
            requestId: row.requestId,
            purpose: row.purpose,
            ddCreationDate: row.ddCreationDate ? new Date(row.ddCreationDate) : null,
            ddNo: row.ddNo,
            beneficiaryName: row.beneficiaryName,
            ddAmount: row.ddAmount ? Number(row.ddAmount) : null,
            tenderName: row.tenderName || row.projectName,
            tenderNo: row.tenderNo || row.projectNo,
            bidValidity: row.bidValidity ? new Date(row.bidValidity) : null,
            tenderStatus: row.tenderStatus,
            teamMember: row.teamMember?.toString() ?? null,
            expiry: this.deriveDdExpiryStatus(row.ddCreationDate ? new Date(row.ddCreationDate) : null),
            ddStatus: this.deriveDdStatus(row.ddStatus),
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    private async countDdByConditions(conditions: any[]) {
        const [result] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...conditions));

        return Number(result?.count || 0);
    }

    async getDashboardCounts(): Promise<DemandDraftDashboardCounts> {
        const pending = await this.countDdByConditions(
            this.buildDdDashboardConditions('pending')
        );

        const created = await this.countDdByConditions(
            this.buildDdDashboardConditions('created')
        );

        const rejected = await this.countDdByConditions(
            this.buildDdDashboardConditions('rejected')
        );

        const returned = await this.countDdByConditions(
            this.buildDdDashboardConditions('returned')
        );

        const cancelled = await this.countDdByConditions(
            this.buildDdDashboardConditions('cancelled')
        );

        return {
            pending,
            created,
            rejected,
            returned,
            cancelled,
            total: pending + created + rejected + returned + cancelled,
        };
    }

    private mapActionToNumber(action: string): number {
        const actionMap: Record<string, number> = {
            'accounts-form': 1,
            'initiate-followup': 2,
            'returned-courier': 3,
            'returned-bank-transfer': 4,
            'settled': 5,
            'request-cancellation': 6,
            'cancellation-confirmation': 7,
        };
        return actionMap[action] || 1;
    }

    async updateAction(
        instrumentId: number,
        body: Record<string, any>,
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

        if (instrument.instrumentType !== 'DD') {
            throw new BadRequestException('Instrument is not a Demand Draft');
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

        const updateData: any = {
            action: actionNumber,
            updatedAt: new Date(),
        };

        if (body.action === 'accounts-form') {
            const [linkedCheque] = await this.db
                .select({
                    id: instrumentChequeDetails.id,
                    instrumentId: instrumentChequeDetails.instrumentId,
                    status: paymentInstruments.status,
                    rejectionReason: paymentInstruments.rejectionReason,
                })
                .from(instrumentChequeDetails)
                .innerJoin(paymentInstruments, eq(paymentInstruments.id, instrumentChequeDetails.instrumentId))
                .where(eq(instrumentChequeDetails.linkedDdId, instrumentId))
                .limit(1);
            console.log({linkedCheque});
            if (linkedCheque) {
                if (linkedCheque.status === CHEQUE_STATUSES.ACCOUNTS_FORM_REJECTED) {
                    body.dd_req = 'Rejected';
                    if (!body.reason_req) {
                        body.reason_req = linkedCheque.rejectionReason || 'Linked Cheque was rejected';
                    }
                } else if (linkedCheque.status == CHEQUE_STATUSES.PENDING) {
                    throw new BadRequestException(
                        'Cannot process: linked Cheque is not yet accepted. Please accept the Cheque first.'
                    );
                }
            }
        }

        if (body.action === 'accounts-form') {
            if (body.dd_req === 'Accepted') {
                updateData.status = DD_STATUSES.ACCOUNTS_FORM_ACCEPTED;
                if (body.courier_address_json) {
                    try {
                        updateData.courierAddressJson = typeof body.courier_address_json === 'string'
                            ? JSON.parse(body.courier_address_json)
                            : body.courier_address_json;
                    } catch {
                        this.logger.warn('Failed to parse courier_address_json');
                    }
                }
            } else if (body.dd_req === 'Rejected') {
                updateData.status = DD_STATUSES.ACCOUNTS_FORM_REJECTED;
                updateData.rejectionReason = body.reason_req || null;
            }
        } else if (body.action === 'initiate-followup') {
            updateData.status = DD_STATUSES.FOLLOWUP_INITIATED;
        } else if (body.action === 'returned-courier') {
            updateData.status = DD_STATUSES.RETURN_VIA_COURIER;
            if (body.docket_no) updateData.docketNo = body.docket_no;
        } else if (body.action === 'returned-bank-transfer') {
            updateData.status = DD_STATUSES.RETURN_VIA_BANK_TRANSFER;
            if (body.transfer_date) updateData.transferDate = body.transfer_date;
            if (body.utr) updateData.utr = body.utr;
        } else if (body.action === 'settled') {
            updateData.status = DD_STATUSES.SETTLED_WITH_PROJECT;
        } else if (body.action === 'request-cancellation') {
            updateData.status = DD_STATUSES.CANCELLATION_REQUESTED;
        } else if (body.action === 'cancellation-confirmation') {
            updateData.status = DD_STATUSES.CANCELLED;
            if (body.dd_cancellation_date) updateData.cancelledDate = body.dd_cancellation_date;
            if (body.dd_cancellation_amount) updateData.amountCredited = body.dd_cancellation_amount;
            if (body.dd_cancellation_reference_no) updateData.referenceNo = body.dd_cancellation_reference_no;
        }

        await this.db
            .update(paymentInstruments)
            .set(updateData)
            .where(eq(paymentInstruments.id, instrumentId));

        const ddDetailsUpdate: any = {};
        if (body.action === 'accounts-form') {
            // Store dd_no, dd_date, req_no when Accepted (form requires these)
            if (body.dd_req === 'Accepted') {
                if (body.dd_no) ddDetailsUpdate.ddNo = body.dd_no;
                if (body.dd_date) ddDetailsUpdate.ddDate = body.dd_date;
                if (body.req_no) ddDetailsUpdate.reqNo = body.req_no;
            }
        }

        if (Object.keys(ddDetailsUpdate).length > 0) {
            ddDetailsUpdate.updatedAt = new Date();

            // Check if ddDetails record exists
            const [existingDdDetails] = await this.db
                .select()
                .from(instrumentDdDetails)
                .where(eq(instrumentDdDetails.instrumentId, instrumentId))
                .limit(1);

            if (existingDdDetails) {
                await this.db
                    .update(instrumentDdDetails)
                    .set(ddDetailsUpdate)
                    .where(eq(instrumentDdDetails.instrumentId, instrumentId));
            } else {
                // Create new ddDetails record
                await this.db.insert(instrumentDdDetails).values({
                    instrumentId,
                    ...ddDetailsUpdate,
                    createdAt: new Date(),
                });
            }
        }

        // Send email notification for accounts-form (accept/reject)
        if (body.action === 'accounts-form') {
            try {
                await this.notificationService.sendDdCreatedMail(instrumentId, body, user);
            } catch (error) {
                this.logger.error(`Failed to send DD created email for instrument ${instrumentId}:`, error);
            }
        }

        if (body.action === 'initiate-followup' && body.emailBody) {
            try {
                let contacts: any[] = [];
                if (body.contacts) {
                    try {
                        contacts = typeof body.contacts === 'string' ? JSON.parse(body.contacts) : body.contacts;
                    } catch (e) {
                        this.logger.warn('Failed to parse contacts for followup', e);
                    }
                }
                const followupDto: CreateFollowUpDto = {
                    area: (body.area || 'Accounts'),
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
                    followupFor: 'EMD Refund',
                    assignedToId: null,
                    createdById: null,
                    amount: 0,
                    attachments: [],
                    followUpHistory: []
                };
                await this.followUpService.create(followupDto, user.id || user.sub);
            } catch (error) {
                this.logger.warn(`Failed to create followup for DD instrument ${instrumentId}: ${error}`);
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
                courierAddressJson: paymentInstruments.courierAddressJson,
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

                // DD Details - all fields
                ddDetailsId: instrumentDdDetails.id,
                ddNo: instrumentDdDetails.ddNo,
                ddDate: instrumentDdDetails.ddDate,
                reqNo: instrumentDdDetails.reqNo,
                ddNeeds: instrumentDdDetails.ddNeeds,
                ddPurpose: instrumentDdDetails.ddPurpose,
                ddRemarks: instrumentDdDetails.ddRemarks,
                ddDetailsCreatedAt: instrumentDdDetails.createdAt,
                ddDetailsUpdatedAt: instrumentDdDetails.updatedAt,

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
            .leftJoin(instrumentDdDetails, eq(instrumentDdDetails.instrumentId, paymentInstruments.id))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .where(and(
                eq(paymentRequests.id, id),
                eq(paymentInstruments.instrumentType, 'DD'),
                eq(paymentInstruments.isActive, true)
            ))
            .limit(1);

        if (!result) {
            throw new NotFoundException(`Payment Request with ID ${id} not found`);
        }

        let linkedCheque: any = null;
        if (result.instrumentId) {
            const [cheque] = await this.db
                .select({
                    chequeNo: instrumentChequeDetails.chequeNo,
                    chequeDate: instrumentChequeDetails.chequeDate,
                    bankName: instrumentChequeDetails.bankName,
                    amount: paymentInstruments.amount,
                    status: paymentInstruments.status,
                    favouring: paymentInstruments.favouring,
                    requestId: paymentRequests.id,
                })
                .from(instrumentChequeDetails)
                .innerJoin(paymentInstruments, eq(paymentInstruments.id, instrumentChequeDetails.instrumentId))
                .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
                .where(eq(instrumentChequeDetails.linkedDdId, result.instrumentId))
                .limit(1);
            if (cheque) {
                linkedCheque = {
                    ...cheque,
                    chequeDate: cheque.chequeDate ? new Date(cheque.chequeDate) : null,
                };
            }
        }

        return { ...result, linkedCheque };
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
                utr: paymentInstruments.utr,
                docketNo: paymentInstruments.docketNo,
                courierAddress: paymentInstruments.courierAddress,
                courierAddressJson: paymentInstruments.courierAddressJson,
                courierDeadline: paymentInstruments.courierDeadline,
                generatedPdf: paymentInstruments.generatedPdf,
                cancelPdf: paymentInstruments.cancelPdf,
                docketSlip: paymentInstruments.docketSlip,
                tenderNo: paymentRequests.tenderNo,
                tenderName: paymentRequests.projectName,
                tenderId: paymentRequests.tenderId,
                ddDetailsId: instrumentDdDetails.id,
                ddNo: instrumentDdDetails.ddNo,
                ddDate: instrumentDdDetails.ddDate,
                reqNo: instrumentDdDetails.reqNo,
                ddNeeds: instrumentDdDetails.ddNeeds,
                ddPurpose: instrumentDdDetails.ddPurpose,
                ddRemarks: instrumentDdDetails.ddRemarks,
                tenderStatusName: statuses.name,
                requestedByName: users.name,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentDdDetails, eq(instrumentDdDetails.instrumentId, paymentInstruments.id))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .where(and(
                eq(paymentInstruments.id, id),
                eq(paymentInstruments.instrumentType, 'DD'),
                eq(paymentInstruments.isActive, true)
            ))
            .limit(1);

        if (!result) {
            throw new NotFoundException(`Payment Instrument with ID ${id} not found`);
        }

        const hasAccountsFormData = result.action != null && result.action >= 1;
        const hasReturnedData = result.action != null && result.action >= 3;
        const hasSettledData = result.action === 5 || result.action === 7;

        let linkedChequeData: any = null;
        if (result.id) {
            const [cheque] = await this.db
                .select({
                    chequeNo: instrumentChequeDetails.chequeNo,
                    amount: paymentInstruments.amount,
                    status: paymentInstruments.status,
                    requestId: paymentInstruments.id,
                    ddDetailsId: instrumentChequeDetails.linkedDdId,
                })
                .from(instrumentChequeDetails)
                .innerJoin(paymentInstruments, eq(paymentInstruments.id, instrumentChequeDetails.instrumentId))
                .where(eq(instrumentChequeDetails.linkedDdId, result.id))
                .limit(1);
            if (cheque) {
                linkedChequeData = cheque;
            }
        }

        let courierDetails: any = null;
        if (result.reqNo) {
            const courierId = Number(result.reqNo);
            if (!isNaN(courierId)) {
                const [courier] = await this.db
                    .select()
                    .from(couriers)
                    .where(eq(couriers.id, courierId))
                    .limit(1);
                if (courier) {
                    const courierStatusLabels = ['Pending', 'In Transit', 'Dispatched', 'Not Delivered', 'Delivered', 'Rejected'];
                    courierDetails = {
                        id: courier.id,
                        toOrg: courier.toOrg,
                        toName: courier.toName,
                        toAddr: courier.toAddr,
                        toPin: courier.toPin,
                        toMobile: courier.toMobile,
                        trackingNumber: courier.trackingNumber,
                        courierProvider: courier.courierProvider,
                        docketNo: courier.docketNo,
                        docketSlip: courier.docketSlip,
                        courierDocs: courier.courierDocs,
                        deliveryPod: courier.deliveryPod,
                        deliveryDate: courier.deliveryDate,
                        pickupDate: courier.pickupDate,
                        status: courier.status,
                        courierStatusName: courier.status != null ? (courierStatusLabels[courier.status] || 'Unknown') : 'Unknown',
                    };
                }
            }
        }

        return {
            id: result.id,
            action: result.action,
            ddStatus: this.deriveDdStatus(result.status),
            tenderNo: result.tenderNo,
            tenderName: result.tenderName,
            tenderId: result.tenderId,
            amount: result.amount ? Number(result.amount) : null,
            favouring: result.favouring,
            payableAt: result.payableAt,
            issueDate: result.issueDate ? new Date(result.issueDate) : null,
            expiryDate: result.expiryDate ? new Date(result.expiryDate) : null,
            ddNo: result.ddNo,
            ddDate: result.ddDate ? new Date(result.ddDate) : null,
            tenderStatusName: result.tenderStatusName,
            requestedByName: result.requestedByName || null,
            reqNo: result.reqNo,
            ddNeeds: result.ddNeeds,
            ddPurpose: result.ddPurpose,
            ddRemarks: result.ddRemarks,
            courierDetails,
            courierAddress: result.courierAddress,
            courierAddressJson: result.courierAddressJson as Record<string, any> | null,
            courierDeadline: result.courierDeadline ? Number(result.courierDeadline) : null,
            deliverBy: result.courierDeadline != null
                ? (result.courierDeadline === -1 ? 'Tender Due Date'
                    : result.courierDeadline === 24 ? '24 Hours'
                    : result.courierDeadline === 48 ? '48 Hours'
                    : `${result.courierDeadline} Hours`)
                : null,
            utr: result.utr,
            docketNo: result.docketNo,
            generatedPdf: result.generatedPdf,
            cancelPdf: result.cancelPdf,
            docketSlip: result.docketSlip,
            hasAccountsFormData,
            hasReturnedData,
            hasSettledData,
            linkedCheque: linkedChequeData,
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
