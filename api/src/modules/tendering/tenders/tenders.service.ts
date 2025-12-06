import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, inArray, isNull, notInArray } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos, type TenderInfo, type NewTenderInfo } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import { items } from '@db/schemas/master/items.schema';
import { organizations } from '@db/schemas/master/organizations.schema';
import { locations } from '@db/schemas/master/locations.schema';
import { websites } from '@db/schemas/master/websites.schema';
import { StatusCache } from '@/utils/status-cache';

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

@Injectable()
export class TenderInfosService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    static getExcludeDnbTlStatusCondition() {
        const statusIds = ['dnb']
            .flatMap((cat) => StatusCache.getIds(cat))
            .filter(Boolean);

        return notInArray(tenderInfos.status, statusIds);
    }

    static getActiveCondition() {
        return eq(tenderInfos.deleteStatus, 0);
    }

    static getApprovedCondition() {
        return eq(tenderInfos.tlStatus, 1);
    }

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

    async exists(id: number): Promise<boolean> {
        const [result] = await this.db
            .select({ id: tenderInfos.id })
            .from(tenderInfos)
            .where(eq(tenderInfos.id, id))
            .limit(1);

        return !!result;
    }

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
