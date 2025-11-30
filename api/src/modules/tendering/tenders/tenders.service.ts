import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, inArray, isNull, sql, notInArray } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { tenderInfos, type TenderInfo, type NewTenderInfo } from '../../../db/tenders.schema';
import { statuses } from '../../../db/statuses.schema';
import { users } from '../../../db/users.schema';
import { items } from '../../../db/items.schema';
import { organizations } from '../../../db/organizations.schema';
import { locations } from '../../../db/locations.schema';
import { websites } from '../../../db/websites.schema';
import { StatusCache } from '../../../utils/status-cache';

// ============================================================================
// Types
// ============================================================================

export type TenderListFilters = {
    statusIds?: number[];
    unallocated?: boolean;
};

export type TenderInfoWithNames = TenderInfo & {
    organizationName: string | null;
    teamMemberName: string | null;
    teamMemberUsername: string | null;
    statusName: string | null;
    itemName: string | null;
    organizationAcronym: string | null;
    locationName: string | null;
    locationState: string | null;
    websiteName: string | null;
    websiteLink: string | null;
};

/**
 * Minimal tender reference for display in child modules
 */
export type TenderReference = {
    id: number;
    tenderNo: string;
    tenderName: string;
    organizationName: string | null;
    organizationAcronym: string | null;
    teamMemberName: string | null;
    statusName: string | null;
    dueDate: Date;
};

/**
 * Tender data needed for EMD/Payment operations
 */
export type TenderForPayment = {
    id: number;
    tenderNo: string;
    tenderName: string;
    gstValues: string;
    tenderFees: string;
    emd: string;
    dueDate: Date;
    organizationName: string | null;
    teamMemberName: string | null;
};

/**
 * Tender data needed for RFQ operations
 */
export type TenderForRfq = {
    id: number;
    tenderNo: string;
    tenderName: string;
    teamMember: number;
    teamMemberName: string | null;
    status: number;
    statusName: string | null;
    itemName: string | null;
    rfqTo: string | null;
    dueDate: Date;
};

/**
 * Tender data needed for Physical Docs operations
 */
export type TenderForPhysicalDocs = {
    id: number;
    tenderNo: string;
    tenderName: string;
    courierAddress: string | null;
    teamMemberName: string | null;
    statusName: string | null;
    dueDate: Date;
};

/**
 * Tender data needed for Approval operations
 */
export type TenderForApproval = {
    id: number;
    tenderNo: string;
    tenderName: string;
    item: number;
    itemName: string | null;
    gstValues: string;
    tenderFees: string;
    emd: string;
    teamMember: number;
    teamMemberName: string | null;
    dueDate: Date;
    status: number;
    statusName: string | null;
    tlStatus: number;
};

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class TenderInfosService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    // ========================================================================
    // Static Utility Methods (Shared Query Conditions)
    // ========================================================================

    /**
     * Get condition to exclude DNB/Lost status tenders
     * Used by: RFQ, Physical Docs, and other dashboard queries
     */
    static getExcludeDnbTlStatusCondition() {
        const statusIds = ['dnb', 'lost']
            .flatMap((cat) => StatusCache.getIds(cat))
            .filter(Boolean);

        return notInArray(tenderInfos.status, statusIds);
    }

    /**
     * Get condition for active (non-deleted) tenders
     */
    static getActiveCondition() {
        return eq(tenderInfos.deleteStatus, 0);
    }

    /**
     * Get condition for approved tenders (tlStatus = 1)
     */
    static getApprovedCondition() {
        return eq(tenderInfos.tlStatus, 1);
    }

    // ========================================================================
    // Private Helpers
    // ========================================================================

    private mapJoinedRow = (row: {
        tenderInfos: typeof tenderInfos.$inferSelect;
        users: { name: string | null; username: string | null } | null;
        statuses: { name: string | null } | null;
        items: { name: string | null } | null;
        organizations: { name: string | null; acronym: string | null } | null;
        locations: { name: string | null; state: string | null } | null;
        websites: { name: string | null; url: string | null } | null;
    }): TenderInfoWithNames => {
        const t = row.tenderInfos;
        return {
            ...t,
            organizationName: row.organizations?.name ?? null,
            organizationAcronym: row.organizations?.acronym ?? null,
            itemName: row.items?.name ?? null,
            teamMemberName: row.users?.name ?? null,
            teamMemberUsername: row.users?.username ?? null,
            statusName: row.statuses?.name ?? null,
            locationName: row.locations?.name ?? null,
            locationState: row.locations?.state ?? null,
            websiteName: row.websites?.name ?? null,
            websiteLink: row.websites?.url ?? null,
        };
    };

    private getTenderBaseSelect() {
        return {
            tenderInfos,
            users: {
                name: users.name,
                username: users.username,
                isActive: users.isActive,
            },
            statuses: {
                id: statuses.id,
                name: statuses.name,
            },
            items: {
                id: items.id,
                name: items.name,
            },
            organizations: {
                acronym: organizations.acronym,
                name: organizations.name,
            },
            locations: {
                state: locations.state,
                name: locations.name,
            },
            websites: {
                name: websites.name,
                url: websites.url,
            },
        };
    }

    /**
     * Build base query with all standard joins
     * Reusable for any query that needs tender + relations
     */
    private getBaseQueryBuilder() {
        return this.db
            .select(this.getTenderBaseSelect())
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(organizations, eq(organizations.id, tenderInfos.organization))
            .leftJoin(locations, eq(locations.id, tenderInfos.location))
            .leftJoin(websites, eq(websites.id, tenderInfos.website));
    }

    // ========================================================================
    // 🔥 SHARED METHODS - Used by child services (EMD, RFQ, etc.)
    // ========================================================================

    /**
     * Check if tender exists (returns boolean, doesn't throw)
     * Use when you just need to verify existence
     */
    async exists(id: number): Promise<boolean> {
        const [result] = await this.db
            .select({ id: tenderInfos.id })
            .from(tenderInfos)
            .where(eq(tenderInfos.id, id))
            .limit(1);

        return !!result;
    }

    /**
     * Validate tender exists and is not deleted
     * Throws NotFoundException if not found
     * Use before creating child records
     */
    async validateExists(id: number): Promise<TenderInfo> {
        const [tender] = await this.db
            .select()
            .from(tenderInfos)
            .where(and(eq(tenderInfos.id, id), eq(tenderInfos.deleteStatus, 0)))
            .limit(1);

        if (!tender) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }

        return tender;
    }

    /**
     * Validate tender exists and is approved (tlStatus = 1)
     * Use for operations that require approved tenders
     */
    async validateApproved(id: number): Promise<TenderInfo> {
        const [tender] = await this.db
            .select()
            .from(tenderInfos)
            .where(
                and(
                    eq(tenderInfos.id, id),
                    eq(tenderInfos.deleteStatus, 0),
                    eq(tenderInfos.tlStatus, 1)
                )
            )
            .limit(1);

        if (!tender) {
            throw new NotFoundException(
                `Tender with ID ${id} not found or not approved`
            );
        }

        return tender;
    }

    /**
     * Get minimal tender reference for display
     * Use in lists, dropdowns, breadcrumbs
     */
    async getReference(id: number): Promise<TenderReference> {
        const [row] = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                dueDate: tenderInfos.dueDate,
                organizationName: organizations.name,
                organizationAcronym: organizations.acronym,
                teamMemberName: users.name,
                statusName: statuses.name,
            })
            .from(tenderInfos)
            .leftJoin(organizations, eq(organizations.id, tenderInfos.organization))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(eq(tenderInfos.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }

        return row as TenderReference;
    }

    /**
     * Get tender data needed for EMD/Payment operations
     * Includes: amounts, due date, organization info
     */
    async getTenderForPayment(id: number): Promise<TenderForPayment> {
        const [row] = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                gstValues: tenderInfos.gstValues,
                tenderFees: tenderInfos.tenderFees,
                emd: tenderInfos.emd,
                dueDate: tenderInfos.dueDate,
                organizationName: organizations.name,
                teamMemberName: users.name,
            })
            .from(tenderInfos)
            .leftJoin(organizations, eq(organizations.id, tenderInfos.organization))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .where(and(eq(tenderInfos.id, id), eq(tenderInfos.deleteStatus, 0)))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }

        return row as TenderForPayment;
    }

    /**
     * Get tender data needed for RFQ operations
     * Includes: team member, status, item, rfqTo
     */
    async getTenderForRfq(id: number): Promise<TenderForRfq> {
        const [row] = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                teamMember: tenderInfos.teamMember,
                teamMemberName: users.name,
                status: tenderInfos.status,
                statusName: statuses.name,
                itemName: items.name,
                rfqTo: tenderInfos.rfqTo,
                dueDate: tenderInfos.dueDate,
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .where(and(eq(tenderInfos.id, id), eq(tenderInfos.deleteStatus, 0)))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }

        return row as TenderForRfq;
    }

    /**
     * Get tender data needed for Physical Docs operations
     */
    async getTenderForPhysicalDocs(id: number): Promise<TenderForPhysicalDocs> {
        const [row] = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                courierAddress: tenderInfos.courierAddress,
                teamMemberName: users.name,
                statusName: statuses.name,
                dueDate: tenderInfos.dueDate,
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(and(eq(tenderInfos.id, id), eq(tenderInfos.deleteStatus, 0)))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }

        return row as TenderForPhysicalDocs;
    }

    /**
     * Get tender data needed for Approval operations
     */
    async getTenderForApproval(id: number): Promise<TenderForApproval> {
        const [row] = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                item: tenderInfos.item,
                itemName: items.name,
                gstValues: tenderInfos.gstValues,
                tenderFees: tenderInfos.tenderFees,
                emd: tenderInfos.emd,
                teamMember: tenderInfos.teamMember,
                teamMemberName: users.name,
                dueDate: tenderInfos.dueDate,
                status: tenderInfos.status,
                statusName: statuses.name,
                tlStatus: tenderInfos.tlStatus,
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .where(and(eq(tenderInfos.id, id), eq(tenderInfos.deleteStatus, 0)))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }

        return row as TenderForApproval;
    }

    /**
     * Get multiple tenders by IDs
     * Use for bulk operations
     */
    async findByIds(ids: number[]): Promise<TenderInfoWithNames[]> {
        if (ids.length === 0) return [];

        const rows = await this.getBaseQueryBuilder().where(
            and(inArray(tenderInfos.id, ids), eq(tenderInfos.deleteStatus, 0))
        );

        return rows.map((row) =>
            this.mapJoinedRow({
                tenderInfos: row.tenderInfos,
                users: row.users,
                statuses: row.statuses,
                items: row.items,
                organizations: row.organizations,
                locations: row.locations,
                websites: row.websites,
            })
        );
    }

    // ========================================================================
    // CRUD Operations (Existing)
    // ========================================================================

    async findAll(filters?: TenderListFilters): Promise<TenderInfoWithNames[]> {
        const conditions = [eq(tenderInfos.deleteStatus, 0)];

        if (filters?.unallocated) {
            conditions.push(
                isNull(tenderInfos.teamMember),
                eq(tenderInfos.status, 1)
            );
        } else if (filters?.statusIds?.length) {
            conditions.push(inArray(tenderInfos.status, filters.statusIds));
        }

        const rows = await this.getBaseQueryBuilder().where(and(...conditions));

        return rows.map((row) =>
            this.mapJoinedRow({
                tenderInfos: row.tenderInfos,
                users: row.users,
                statuses: row.statuses,
                items: row.items,
                organizations: row.organizations,
                locations: row.locations,
                websites: row.websites,
            })
        );
    }

    async findById(id: number): Promise<TenderInfoWithNames | null> {
        const rows = await this.getBaseQueryBuilder()
            .where(eq(tenderInfos.id, id))
            .limit(1);

        const row = rows[0];
        if (!row) return null;

        return this.mapJoinedRow({
            tenderInfos: row.tenderInfos,
            users: row.users,
            statuses: row.statuses,
            items: row.items,
            organizations: row.organizations,
            locations: row.locations,
            websites: row.websites,
        });
    }

    async create(data: NewTenderInfo): Promise<TenderInfo> {
        const rows = await this.db.insert(tenderInfos).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewTenderInfo>): Promise<TenderInfo> {
        const rows = await this.db
            .update(tenderInfos)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(tenderInfos.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(tenderInfos)
            .where(eq(tenderInfos.id, id))
            .returning();
        if (!result[0]) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }
    }

    // ========================================================================
    // Approval Related (Existing)
    // ========================================================================

    getApprovalData(tender: TenderInfoWithNames) {
        const rfqToNumbers = tender.rfqTo
            ? tender.rfqTo.split(',').map(Number)
            : [];

        return {
            id: tender.id,
            tenderId: tender.id,
            tlStatus: tender.tlStatus as number | null,
            rfqTo: rfqToNumbers,
            tenderFeeMode: tender.tenderFeeMode ?? null,
            emdMode: tender.emdMode ?? null,
            approvePqrSelection: tender.approvePqrSelection ?? null,
            approveFinanceDocSelection: tender.approveFinanceDocSelection ?? null,
            tenderApprovalStatus: tender.tenderApprovalStatus ?? null,
            oemNotAllowed: tender.oemNotAllowed ?? null,
            tlRejectionRemarks: tender.tlRejectionRemarks ?? null,
            createdAt: tender.createdAt,
            updatedAt: tender.updatedAt,
        };
    }

    async updateApproval(
        id: number,
        data: {
            tlStatus: number;
            rfqTo?: string;
            tenderFeeMode?: string;
            emdMode?: string;
            approvePqrSelection?: string;
            approveFinanceDocSelection?: string;
            tenderApprovalStatus?: string;
            oemNotAllowed?: string;
            tlRejectionRemarks?: string;
        }
    ): Promise<TenderInfo> {
        const updateData: Partial<NewTenderInfo> = {
            tlStatus: data.tlStatus ?? null,
            rfqTo: data.rfqTo ?? null,
            tenderFeeMode: data.tenderFeeMode ?? null,
            emdMode: data.emdMode ?? null,
            approvePqrSelection: data.approvePqrSelection ?? null,
            approveFinanceDocSelection: data.approveFinanceDocSelection ?? null,
            tenderApprovalStatus: data.tenderApprovalStatus ?? null,
            oemNotAllowed: data.oemNotAllowed ?? null,
            tlRejectionRemarks: data.tlRejectionRemarks ?? null,
        };

        // Clear YES decision fields if decision is NO
        if (data.tlStatus === 0) {
            updateData.rfqTo = null;
            updateData.tenderFeeMode = null;
            updateData.emdMode = null;
            updateData.approvePqrSelection = null;
            updateData.approveFinanceDocSelection = null;
            updateData.tenderApprovalStatus = null;
            updateData.oemNotAllowed = null;
            updateData.tlRejectionRemarks = null;
        }

        return this.update(id, updateData);
    }
}
