import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, inArray, isNull, sql, asc, desc, ne, or } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    paymentRequests,
    paymentInstruments,
    instrumentDdDetails,
} from '@db/schemas/tendering/emds.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { users } from '@db/schemas/auth/users.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import type { DemandDraftDashboardRow, DemandDraftDashboardCounts } from '@/modules/bi-dashboard/demand-draft/helpers/demandDraft.types';
import { DD_STATUSES } from '@/modules/tendering/emds/constants/emd-statuses';

@Injectable()
export class DemandDraftService {
    private readonly logger = new Logger(DemandDraftService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) { }

    private statusMap() {
        return {
            [DD_STATUSES.PENDING]: 'Pending',
            [DD_STATUSES.ACCOUNTS_FORM_ACCEPTED]: 'Accepted',
            [DD_STATUSES.ACCOUNTS_FORM_REJECTED]: 'Rejected',
            [DD_STATUSES.FOLLOWUP_INITIATED]: 'Followup Initiated',
            [DD_STATUSES.COURIER_RETURN_RECEIVED]: 'Returned',
            [DD_STATUSES.CANCELLATION_REQUESTED]: 'Cancellation Requested',
            [DD_STATUSES.CANCELLED_AT_BRANCH]: 'Cancelled at Branch',
            [DD_STATUSES.BANK_RETURN_COMPLETED]: 'Returned',
            [DD_STATUSES.PROJECT_SETTLEMENT_COMPLETED]: 'Settled with Project',
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

        // Search filter
        if (options?.search) {
            const searchStr = `%${options.search}%`;
            conditions.push(
                sql`(
                    ${tenderInfos.tenderName} ILIKE ${searchStr} OR
                    ${tenderInfos.tenderNo} ILIKE ${searchStr} OR
                    ${instrumentDdDetails.ddNo} ILIKE ${searchStr}
                )`
            );
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
                member: users.name,
                ddStatus: paymentInstruments.status,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .innerJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentDdDetails, eq(instrumentDdDetails.instrumentId, paymentInstruments.id))
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
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentDdDetails, eq(instrumentDdDetails.instrumentId, paymentInstruments.id))
            .where(whereClause);

        const total = Number(countResult?.count || 0);

        function isExpired(dueDate: Date): boolean {
            return dueDate && new Date(dueDate.getTime() + 3 * 30 * 24 * 60 * 60 * 1000) < new Date(Date.now());
        }

        const data: DemandDraftDashboardRow[] = rows.map((row) => ({
            id: row.id,
            ddCreationDate: row.ddCreationDate ? new Date(row.ddCreationDate) : null,
            ddNo: row.ddNo,
            beneficiaryName: row.beneficiaryName,
            ddAmount: row.ddAmount ? Number(row.ddAmount) : null,
            tenderName: row.tenderName || row.projectName,
            tenderNo: row.tenderNo || row.projectNo,
            bidValidity: row.bidValidity ? new Date(row.bidValidity) : null,
            tenderStatus: row.tenderStatus,
            member: row.member,
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
            'initiate-followup': 2,
            'returned-courier': 3,
            'returned-bank-transfer': 4,
            'settled-with-project': 5,
            'request-cancellation': 6,
            'cancelled-at-branch': 7,
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
            updateData.status = DD_STATUSES.COURIER_RETURN_RECEIVED;
            if (filePaths.length > 0) {
                updateData.docketSlip = filePaths[0];
            }
        } else if (body.action === 'returned-bank-transfer') {
            updateData.status = DD_STATUSES.BANK_RETURN_COMPLETED;
            if (body.transfer_date) updateData.transferDate = body.transfer_date;
            if (body.utr) updateData.utr = body.utr;
        } else if (body.action === 'request-cancellation') {
            updateData.status = DD_STATUSES.CANCELLATION_REQUESTED;
        } else if (body.action === 'dd-cancellation-confirmation') {
            updateData.status = DD_STATUSES.CANCELLED_AT_BRANCH;
            if (body.dd_cancellation_date) updateData.creditDate = body.dd_cancellation_date;
            if (body.dd_cancellation_amount) updateData.creditAmount = body.dd_cancellation_amount;
            if (body.dd_cancellation_reference_no) updateData.referenceNo = body.dd_cancellation_reference_no;
        }

        await this.db
            .update(paymentInstruments)
            .set(updateData)
            .where(eq(paymentInstruments.id, instrumentId));

        const ddDetailsUpdate: any = {};
        if (body.action === 'accounts-form-2') {
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
            await this.db
                .update(instrumentDdDetails)
                .set(ddDetailsUpdate)
                .where(eq(instrumentDdDetails.instrumentId, instrumentId));
        }

        if (body.action === 'initiate-followup' && contacts.length > 0) {
            this.logger.log(`Follow-up should be created for instrument ${instrumentId}`);
        }

        return {
            success: true,
            instrumentId,
            action: body.action,
            actionNumber,
        };
    }
}
