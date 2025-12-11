import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import type { TenderApprovalPayload } from '@/modules/tendering/tender-approval/dto/tender-approval.dto';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { users } from '@db/schemas/auth/users.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { items } from '@db/schemas/master/items.schema';
import { tenderIncompleteFields } from '@db/schemas/tendering/tender-incomplete-fields.schema';
import { TenderInfosService, type PaginatedResult } from '@/modules/tendering/tenders/tenders.service';

export type TenderApprovalFilters = {
    tlStatus?: '0' | '1' | '2' | '3' | number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

// ============================================================================
// Types
// ============================================================================

const TABS_NAMES = {
    '0': 'Pending',
    '1': 'Approved',
    '2': 'Rejected',
    '3': 'Incomplete',
} as const;

type TabCategory = (typeof TABS_NAMES)[keyof typeof TABS_NAMES];

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
};

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class TenderApprovalService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService, // Injected
    ) { }

    async getAll(filters?: TenderApprovalFilters): Promise<PaginatedResult<TenderRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        console.log("Filters: ", filters);

        const conditions = [
            TenderInfosService.getActiveCondition(),
        ];

        // Filter by tlStatus if provided
        if (filters?.tlStatus !== undefined) {
            conditions.push(eq(tenderInfos.tlStatus, filters.tlStatus as number));
        }

        // Build orderBy clause based on sortBy
        let orderByClause: any = asc(tenderInfos.dueDate); // Default

        if (filters?.sortBy) {
            const sortOrder = filters.sortOrder === 'desc' ? desc : asc;
            switch (filters.sortBy) {
                case 'tenderNo':
                    orderByClause = sortOrder(tenderInfos.tenderNo);
                    break;
                case 'tenderName':
                    orderByClause = sortOrder(tenderInfos.tenderName);
                    break;
                case 'teamMemberName':
                    orderByClause = sortOrder(users.name);
                    break;
                case 'dueDate':
                    orderByClause = sortOrder(tenderInfos.dueDate);
                    break;
                case 'gstValues':
                    orderByClause = sortOrder(tenderInfos.gstValues);
                    break;
                case 'itemName':
                    orderByClause = sortOrder(items.name);
                    break;
                case 'statusName':
                    orderByClause = sortOrder(statuses.name);
                    break;
                case 'tlStatus':
                    orderByClause = sortOrder(tenderInfos.tlStatus);
                    break;
                default:
                    orderByClause = asc(tenderInfos.dueDate);
            }
        }

        const rows = (await this.db
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
            })
            .from(tenderInfos)
            .innerJoin(users, eq(tenderInfos.teamMember, users.id))
            .innerJoin(statuses, eq(tenderInfos.status, statuses.id))
            .innerJoin(items, eq(tenderInfos.item, items.id))
            .innerJoin(
                tenderInformation,
                eq(tenderInformation.tenderId, tenderInfos.id)
            )
            .where(and(...conditions))
            .orderBy(orderByClause)) as unknown as TenderRow[];

        if (filters?.tlStatus !== undefined || filters?.page !== undefined) {
            const totalRows = rows.length;
            const paginatedData = rows.slice(offset, offset + limit);

            return {
                data: paginatedData,
                meta: {
                    total: totalRows,
                    page: page,
                    limit: limit,
                    totalPages: Math.ceil(totalRows / limit),
                },
            };
        }

        return {
            data: rows,
            meta: {
                total: rows.length,
                page: page,
                limit: limit,
                totalPages: Math.ceil(rows.length / limit),
            },
        };
    }


    async getByTenderId(tenderId: number) {
        // Validate tender exists first
        await this.tenderInfosService.validateExists(tenderId);

        const result = await this.db
            .select({
                tlStatus: tenderInfos.tlStatus,
                rfqTo: tenderInfos.rfqTo,
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

    /**
     * Get approval data with full tender details
     * Uses shared tender service method
     */
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

    async updateApproval(tenderId: number, payload: TenderApprovalPayload) {
        // Validate tender exists
        await this.tenderInfosService.validateExists(tenderId);

        const updateData: any = {
            tlStatus: payload.tlStatus,
            updatedAt: new Date(),
        };

        // Clear incomplete fields for statuses other than '3'
        if (payload.tlStatus !== '3') {
            await this.db
                .delete(tenderIncompleteFields)
                .where(eq(tenderIncompleteFields.tenderId, tenderId));
        }

        if (payload.tlStatus === '1') {
            const rfqToString = payload.rfqTo?.join(',') || '';

            updateData.rfqTo = rfqToString;
            updateData.tenderFeeMode = payload.tenderFeeMode;
            updateData.emdMode = payload.emdMode;
            updateData.approvePqrSelection = payload.approvePqrSelection;
            updateData.approveFinanceDocSelection =
                payload.approveFinanceDocSelection;

            updateData.tlRejectionRemarks = null;
            updateData.oemNotAllowed = null;
        } else if (payload.tlStatus === '2') {
            updateData.tlRejectionRemarks = payload.tlRejectionRemarks;
            updateData.oemNotAllowed = payload.oemNotAllowed;

            if (payload.tenderStatus) {
                updateData.status = payload.tenderStatus;
            }

            updateData.rfqTo = null;
            updateData.tenderFeeMode = null;
            updateData.emdMode = null;
            updateData.approvePqrSelection = null;
            updateData.approveFinanceDocSelection = null;
        } else if (payload.tlStatus === '3') {
            // Incomplete status - clear approval/rejection fields
            updateData.rfqTo = null;
            updateData.tenderFeeMode = null;
            updateData.emdMode = null;
            updateData.approvePqrSelection = null;
            updateData.approveFinanceDocSelection = null;
            updateData.tlRejectionRemarks = null;
            updateData.oemNotAllowed = null;

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

        await this.db
            .update(tenderInfos)
            .set(updateData)
            .where(eq(tenderInfos.id, tenderId))
            .returning();

        return this.getByTenderId(tenderId);
    }
}
