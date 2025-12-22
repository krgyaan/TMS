import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, inArray, isNull, notInArray, sql, desc } from 'drizzle-orm';
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
import { tenderInformation } from '@/db/schemas/tendering/tender-info-sheet.schema';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';

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

export type TenderForPhysicalDocs = {
    id: number;
    tenderNo: string;
    tenderName: string;
    courierAddress: string | null;
    teamMemberName: string | null;
    statusName: string | null;
    dueDate: Date;
};

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

// Define the response structure
export type PaginatedResult<T> = {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
};

export type TenderListFilters = {
    statusIds?: number[];
    unallocated?: boolean;
    page?: number;
    limit?: number;
    search?: string;
    teamId?: number;
    assignedTo?: number;
};

@Injectable()
export class TenderInfosService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
    ) { }

    static getExcludeStatusCondition(categories: string[]) {
        const statusIds = categories
            .flatMap((cat) => StatusCache.getIds(cat))
            .filter(Boolean);
        console.log('statusIds', statusIds);

        return notInArray(tenderInfos.status, statusIds);
    }

    static getIncludeStatusCondition(categories: string[]) {
        const statusIds = categories
            .flatMap((cat) => StatusCache.getIds(cat))
            .filter(Boolean);
        return inArray(tenderInfos.status, statusIds);
    }

    static getActiveCondition() {
        return eq(tenderInfos.deleteStatus, 0);
    }

    static getApprovedCondition() {
        return eq(tenderInfos.tlStatus, 1);
    }

    static getRaApplicableCondition() {
        return eq(tenderInformation.reverseAuctionApplicable, 'Yes');
    }

    static getBaseFilters() {
        return and(
            this.getActiveCondition(),
            this.getApprovedCondition(),
            this.getExcludeStatusCondition(['dnb'])
        );
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

    async findAll(filters?: TenderListFilters): Promise<PaginatedResult<TenderInfoWithNames>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        // 1. Build Where Conditions
        const conditions = [eq(tenderInfos.deleteStatus, 0)];

        if (filters?.unallocated) {
            conditions.push(isNull(tenderInfos.teamMember), eq(tenderInfos.status, 1));
        } else if (filters?.statusIds?.length) {
            conditions.push(inArray(tenderInfos.status, filters.statusIds));
        }

        // Search Logic (Server-side search is best for pagination)
        if (filters?.search) {
            const searchStr = `%${filters.search}%`;
            conditions.push(sql`(${tenderInfos.tenderName} ILIKE ${searchStr} OR ${tenderInfos.tenderNo} ILIKE ${searchStr})`);
        }

        // Team filter - skip when unallocated is true (unallocated means no team member assigned)
        if (!filters?.unallocated && filters?.teamId !== undefined && filters?.teamId !== null) {
            conditions.push(eq(tenderInfos.team, filters.teamId));
        }

        // Assigned to filter - skip when unallocated is true (conflicts with teamMember IS NULL)
        if (!filters?.unallocated && filters?.assignedTo !== undefined && filters?.assignedTo !== null) {
            conditions.push(eq(tenderInfos.teamMember, filters.assignedTo));
        }

        const whereClause = and(...conditions);

        // 2. Get Total Count
        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        // 3. Get Data (Paginated)
        const rows = await this.getBaseQueryBuilder()
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(tenderInfos.createdAt));

        // 4. Map Data
        const data = rows.map((row) =>
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

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
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
        const newTender = rows[0];

        // Track initial status (status = 1) automatically
        const initialStatus = data.status ?? 1;
        await this.tenderStatusHistoryService.trackStatusChange(
            newTender.id as number,
            initialStatus,
            data.teamMember ?? 0,
            null,
            'Tender created'
        );

        return newTender;
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

    /**
     * Update tender status manually with comment
     */
    async updateStatus(
        tenderId: number,
        newStatus: number,
        changedBy: number,
        comment: string
    ): Promise<TenderInfo> {
        const currentTender = await this.validateExists(tenderId);
        const prevStatus = currentTender.status;

        if (prevStatus === newStatus) {
            throw new BadRequestException('Status is already set to this value');
        }

        // Update status in transaction
        const updated = await this.db.transaction(async (tx) => {
            // Update tender status
            const [updatedTender] = await tx
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, tenderId))
                .returning();

            if (!updatedTender) {
                throw new NotFoundException(`Tender with ID ${tenderId} not found`);
            }

            // Track status change
            await this.tenderStatusHistoryService.trackStatusChange(
                tenderId,
                newStatus,
                changedBy,
                prevStatus,
                comment
            );

            return updatedTender;
        });

        return updated;
    }

    /**
     * Generate a unique tender name based on organization, item, and location
     */
    async generateTenderName(
        organizationId: number,
        itemId: number,
        locationId?: number
    ): Promise<{ tenderName: string }> {
        // Fetch organization acronym
        const [organization] = await this.db
            .select({ acronym: organizations.acronym })
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .limit(1);

        if (!organization || !organization.acronym) {
            throw new NotFoundException(`Organization with ID ${organizationId} not found or has no acronym`);
        }

        // Fetch item name
        const [item] = await this.db
            .select({ name: items.name })
            .from(items)
            .where(eq(items.id, itemId))
            .limit(1);

        if (!item || !item.name) {
            throw new NotFoundException(`Item with ID ${itemId} not found`);
        }

        // Build base name parts: org loc item
        const nameParts = [organization.acronym.trim()];

        // Add location name if provided
        if (locationId) {
            const [location] = await this.db
                .select({ name: locations.name })
                .from(locations)
                .where(eq(locations.id, locationId))
                .limit(1);

            if (location && location.name) {
                nameParts.push(location.name.trim());
            }
        }

        // Add item name last
        nameParts.push(item.name.trim());

        // Build base name
        const baseName = nameParts.join(' ');

        // Query existing tenders with names starting with baseName
        const existingTenders = await this.db
            .select({ tenderName: tenderInfos.tenderName })
            .from(tenderInfos)
            .where(sql`${tenderInfos.tenderName} LIKE ${`${baseName}%`}`)
            .limit(100); // Reasonable limit to check duplicates

        // Count how many tenders start with this base name
        const existingCount = existingTenders.length;

        // Generate unique name
        let uniqueName = baseName;
        if (existingCount > 0) {
            uniqueName = `${baseName} (${existingCount})`;
        }
        console.log("Tender Name: ", uniqueName);
        return { tenderName: uniqueName };
    }
}
