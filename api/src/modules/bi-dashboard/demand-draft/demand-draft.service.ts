import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, inArray, isNull, sql, asc, desc, ne, or } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    paymentRequests,
    paymentInstruments,
    instrumentDdDetails,
} from '@db/schemas/tendering/payment-requests.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { users } from '@db/schemas/auth/users.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import type { DemandDraftDashboardRow, DemandDraftDashboardCounts } from '@/modules/bi-dashboard/demand-draft/helpers/demandDraft.types';
import { DD_STATUSES } from '@/modules/tendering/payment-requests/constants/payment-request-statuses';
import { FollowUpService } from '@/modules/follow-up/follow-up.service';
import type { CreateFollowUpDto } from '@/modules/follow-up/zod';
import { followUps } from '@/db/schemas/shared/follow-ups.schema';
import { couriers } from '@/db/schemas/shared/couriers.schema';

@Injectable()
export class DemandDraftService {
    private readonly logger = new Logger(DemandDraftService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly followUpService: FollowUpService,
    ) { }

    private statusMap() {
        return {
            [DD_STATUSES.PENDING]: 'Pending',
            [DD_STATUSES.ACCOUNTS_FORM_ACCEPTED]: 'Accepted',
            [DD_STATUSES.ACCOUNTS_FORM_REJECTED]: 'Rejected',
            [DD_STATUSES.FOLLOWUP_INITIATED]: 'Followup Initiated',
            [DD_STATUSES.RETURN_VIA_COURIER]: 'Returned',
            [DD_STATUSES.CANCELLATION_REQUESTED]: 'Cancellation Requested',
            [DD_STATUSES.CANCELLED]: 'Cancelled at Branch',
            [DD_STATUSES.RETURN_VIA_BANK_TRANSFER]: 'Returned',
            [DD_STATUSES.SETTLED_WITH_PROJECT]: 'Settled with Project',
        };
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
                eq(paymentInstruments.status, DD_STATUSES.ACCOUNTS_FORM_ACCEPTED)
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
                .leftJoin(users, eq(users.id, paymentRequests.requestedBy));
        }
        const [countResult] = await countQueryBuilder.where(whereClause);

        const total = Number(countResult?.count || 0);

        function isExpired(dueDate: Date): boolean {
            return dueDate && new Date(dueDate.getTime() + 3 * 30 * 24 * 60 * 60 * 1000) < new Date(Date.now());
        }

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
            expiry: row.ddCreationDate ? (isExpired(new Date(row.ddCreationDate)) ? 'Expired' : 'Valid') : null,
            ddStatus: this.statusMap()[row.ddStatus],
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
            'accounts-form-1': 1,
            'initiate-followup': 2,
            'returned-courier': 3,
            'returned-bank-transfer': 4,
            'settled': 5,
            'settled-with-project': 5,
            'request-cancellation': 6,
            'dd-cancellation-confirmation': 7,
            'cancelled-at-branch': 7,
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

        if (body.action === 'accounts-form-1' || body.action === 'accounts-form') {
            if (body.dd_req === 'Accepted') {
                updateData.status = DD_STATUSES.ACCOUNTS_FORM_ACCEPTED;
            } else if (body.dd_req === 'Rejected') {
                updateData.status = DD_STATUSES.ACCOUNTS_FORM_REJECTED;
                updateData.rejectionReason = body.reason_req || null;
            }
        } else if (body.action === 'initiate-followup') {
            updateData.status = DD_STATUSES.FOLLOWUP_INITIATED;
        } else if (body.action === 'returned-courier') {
            updateData.status = DD_STATUSES.RETURN_VIA_COURIER;
            updateData.docketSlip = body.docket_slip || null;
        } else if (body.action === 'returned-bank-transfer') {
            updateData.status = DD_STATUSES.RETURN_VIA_BANK_TRANSFER;
            if (body.transfer_date) updateData.transferDate = body.transfer_date;
            if (body.utr) updateData.utr = body.utr;
        } else if (body.action === 'settled' || body.action === 'settled-with-project') {
            updateData.status = DD_STATUSES.SETTLED_WITH_PROJECT;
        } else if (body.action === 'request-cancellation') {
            updateData.status = DD_STATUSES.CANCELLATION_REQUESTED;
        } else if (body.action === 'dd-cancellation-confirmation') {
            updateData.status = DD_STATUSES.CANCELLED;
            if (body.dd_cancellation_date) updateData.creditDate = body.dd_cancellation_date;
            if (body.dd_cancellation_amount) updateData.creditAmount = body.dd_cancellation_amount;
            if (body.dd_cancellation_reference_no) updateData.referenceNo = body.dd_cancellation_reference_no;
        }

        await this.db
            .update(paymentInstruments)
            .set(updateData)
            .where(eq(paymentInstruments.id, instrumentId));

        const ddDetailsUpdate: any = {};
        if (body.action === 'accounts-form-1' || body.action === 'accounts-form') {
            // Store dd_no, dd_date, req_no when Accepted (form requires these)
            if (body.dd_req === 'Accepted') {
                if (body.dd_no) ddDetailsUpdate.ddNo = body.dd_no;
                if (body.dd_date) ddDetailsUpdate.ddDate = body.dd_date;
                if (body.req_no) ddDetailsUpdate.reqNo = body.req_no;
            }
        } else if (body.action === 'accounts-form-2') {
            if (body.dd_no) ddDetailsUpdate.ddNo = body.dd_no;
            if (body.dd_date) ddDetailsUpdate.ddDate = body.dd_date;
            if (body.req_no) ddDetailsUpdate.reqNo = body.req_no;
            if (body.remarks) ddDetailsUpdate.ddRemarks = body.remarks;
        } else if (body.action === 'dd-cancellation-confirmation') {
            // Store cancellation details - these might go to paymentInstruments instead
            // Based on schema, these fields might need to be stored differently
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
                this.logger.warn(`Failed to create followup for DD instrument ${instrumentId}: ${error.message}`);
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

        return result;
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
                ddNo: instrumentDdDetails.ddNo,
                ddDate: instrumentDdDetails.ddDate,
                reqNo: instrumentDdDetails.reqNo,
                ddNeeds: instrumentDdDetails.ddNeeds,
                ddPurpose: instrumentDdDetails.ddPurpose,
                ddRemarks: instrumentDdDetails.ddRemarks,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentDdDetails, eq(instrumentDdDetails.instrumentId, paymentInstruments.id))
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
                        status: courier.status,
                    };
                }
            }
        }

        return {
            id: result.id,
            action: result.action,
            ddStatus: this.statusMap()[result.status] || result.status,
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
            reqNo: result.reqNo,
            ddNeeds: result.ddNeeds,
            ddPurpose: result.ddPurpose,
            ddRemarks: result.ddRemarks,
            courierDetails,
            courierAddress: result.courierAddress,
            courierAddressJson: result.courierAddressJson as Record<string, any> | null,
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
