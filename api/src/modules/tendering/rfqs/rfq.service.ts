import { bidSubmissions } from "@/db/schemas";
import { AppLogger } from "@/logger/app-logger.service";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";
import type { RecipientSource } from "@/modules/email/dto/send-email.dto";
import { EmailService } from "@/modules/email/email.service";
import { RecipientResolver } from "@/modules/email/recipient.resolver";
import { TenderStatusHistoryService } from "@/modules/tendering/tender-status-history/tender-status-history.service";
import { TenderInfosService } from "@/modules/tendering/tenders/tenders.service";
import type { PaginatedResult } from "@/modules/tendering/types/shared.types";
import { TimersService } from "@/modules/timers/timers.service";
import { StatusCache } from "@/utils/status-cache";
import { wrapPaginatedResponse } from "@/utils/responseWrapper";
import type { DbInstance } from "@db";
import { DRIZZLE } from "@db/database.module";
import { users } from "@db/schemas/auth/users.schema";
import { items } from "@db/schemas/master/items.schema";
import { statuses } from "@db/schemas/master/statuses.schema";
import { NewRfq, NewRfqDocument, NewRfqItem, rfqDocuments, rfqItems, rfqResponses, rfqs } from "@db/schemas/tendering/rfqs.schema";
import { tenderInfos } from "@db/schemas/tendering/tenders.schema";
import { VendorOrganization, vendorOrganizations } from "@db/schemas/vendors/vendor-organizations.schema";
import { vendors } from "@db/schemas/vendors/vendors.schema";
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, inArray, isNotNull, isNull, ne, notInArray, or, sql, SQL } from "drizzle-orm";
import { CreateRfqDto, UpdateRfqDto } from "./dto/rfq.dto";

export type RfqFilters = {
    rfqStatus?: "pending" | "sent";
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
};

type RfqRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMember: number;
    teamMemberName: string;
    status: number;
    statusName: string;
    responseStatus: string | null;
    latestStatus: number | null;
    latestStatusName: string | null;
    statusRemark: string | null;
    itemName: string;
    rfqTo: string;
    dueDate: Date;
    rfqId: number | null;
    vendorOrganizations: VendorOrganization[];
    rfqCount: number;
    responseCount: number;
};

type RfqDetails = {
    id: number;
    tenderId: number;
    dueDate: Date;
    docList: string | null;
    requestedOrganization: string | null;
    requestedVendor: string | null;
    vendorOrganizations: Array<{
        organizationId: number;
        organizationName: string;
        vendors: Array<{ id: number; name: string; email: string }>;
    }>;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
        id: number;
        rfqId: number;
        requirement: string;
        unit: string | null;
        qty: string | null;
    }>;
    documents: Array<{
        id: number;
        rfqId: number;
        docType: string;
        path: string;
        metadata: any;
    }>;

};

export const responseStatuses = [
    { id: 1, name: "Quotation Received" },
    { id: 2, name: "Product not available" },
    { id: 3, name: "OEM docs not provided" },
    { id: 4, name: "Not allowed by OEM" },
    { id: 5, name: "Not Quoted by OEM" }
] as const;

@Injectable()
export class RfqsService {
    private readonly logger;

    constructor(
        private readonly appLogger: AppLogger,
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly timersService: TimersService
    ) {
        this.logger = this.appLogger.withContext(RfqsService.name);
    }

    /**
     * Build role-based filter conditions for tender queries
     */
    private buildRoleFilterConditions(user?: ValidatedUser, teamId?: number): any[] {
        const roleFilterConditions: any[] = [];

        if (user?.roleId) {
            if (user.dataScope === 'all') {
                // Super User or Admin: Show all, respect teamId filter if provided
                if (teamId !== undefined && teamId !== null) {
                    roleFilterConditions.push(eq(tenderInfos.team, teamId));
                }
            } else if (user.canSwitchTeams && teamId !== undefined && teamId !== null) {
                // Role can switch teams and selected a specific team
                roleFilterConditions.push(eq(tenderInfos.team, teamId));
            } else if (user.dataScope === 'team') {
                // Team-scoped roles: Filter by primary team
                if (user.teamId) {
                    roleFilterConditions.push(eq(tenderInfos.team, user.teamId));
                } else {
                    roleFilterConditions.push(sql`1 = 0`); // Empty results
                }
            } else {
                // Self-scoped roles: Show only own records
                if (user.sub) {
                    roleFilterConditions.push(eq(tenderInfos.teamMember, user.sub));
                } else {
                    roleFilterConditions.push(sql`1 = 0`); // Empty results
                }
            }
        } else {
            // No user provided - return empty for security
            roleFilterConditions.push(sql`1 = 0`);
        }

        return roleFilterConditions;
    }

    private getDefaultSortByRfqTab(tab: string): SQL<unknown> {
        switch (tab) {
            case "pending":
                // Soonest due date first, NULLs last
                return sql`${tenderInfos.dueDate} ASC NULLS LAST`;

            case "sent":
                // Latest due date first
                return sql`${tenderInfos.dueDate} DESC NULLS LAST`;

            case "responses":
                // For responses tab, we query rfqResponses directly so we can use receiptDatetime
                return sql`${rfqResponses.receiptDatetime} DESC NULLS LAST`;

            case "rfq-rejected":
                // Latest due date first
                return sql`${tenderInfos.dueDate} DESC NULLS LAST`;

            case "tender-dnb":
                // Latest due date first
                return sql`${tenderInfos.dueDate} DESC NULLS LAST`;

            default:
                return sql`${tenderInfos.dueDate} ASC NULLS LAST`;
        }
    }

    async getRfqData(
        user?: ValidatedUser,
        teamId?: number,
        tab?: "pending" | "sent" | "rfq-rejected" | "tender-dnb" | "responses",
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: "asc" | "desc"; search?: string }
    ): Promise<PaginatedResult<RfqRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        // Use default tab if not provided
        const activeTab = tab || "pending";

        if (!["pending", "sent", "responses", "rfq-rejected", "tender-dnb"].includes(activeTab)) {
            throw new BadRequestException(`Invalid tab: ${activeTab}`);
        }

        const conditions = this.buildDashboardConditions(user, teamId, activeTab);

        // Add search conditions - search across all rendered columns
        if (filters?.search) {
            const searchStr = `%${filters.search}%`;
            const searchConditions: any[] = [
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${tenderInfos.dueDate}::text ILIKE ${searchStr}`,
                sql`${users.name} ILIKE ${searchStr}`,
                sql`${statuses.name} ILIKE ${searchStr}`,
                sql`${items.name} ILIKE ${searchStr}`,
                sql`EXISTS (
                    SELECT 1 FROM ${vendorOrganizations}
                    WHERE CAST(${vendorOrganizations.id} AS TEXT) = ANY(string_to_array(${tenderInfos.rfqTo}, ','))
                    AND ${vendorOrganizations.name} ILIKE ${searchStr}
                )`,
            ];
            if (activeTab === "responses") {
                searchConditions.push(sql`EXISTS (
                    SELECT 1 FROM ${vendors}
                    LEFT JOIN ${vendorOrganizations} ON ${vendorOrganizations.id} = ${vendors.orgId}
                    WHERE ${vendors.id} = ${rfqResponses.vendorId}
                    AND (${vendors.name} ILIKE ${searchStr} OR ${vendorOrganizations.name} ILIKE ${searchStr})
                )`);
                
            }

            conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
        }

        const whereClause = and(...conditions);

        // Build orderBy clause
        let orderByClause: SQL<unknown>;

        if (filters?.sortBy) {
            // User-specified sorting takes priority
            const sortFn = filters.sortOrder === "desc" ? desc : asc;
            switch (filters.sortBy) {
                case "tenderNo":
                    orderByClause = sortFn(tenderInfos.tenderNo);
                    break;
                case "tenderName":
                    orderByClause = sortFn(tenderInfos.tenderName);
                    break;
                case "teamMemberName":
                    orderByClause = sortFn(users.name);
                    break;
                case "dueDate":
                    orderByClause = sortFn(tenderInfos.dueDate);
                    break;
                case "responseDate":
                    // Sort by latest response date
                    if (activeTab === "responses") {
                        orderByClause = sql`${rfqResponses.createdAt} ${filters.sortOrder === "desc" ? sql`DESC NULLS LAST` : sql`ASC NULLS LAST`}`;
                    } else {
                        orderByClause = sql`(
                            SELECT MAX(${rfqResponses.createdAt})
                            FROM ${rfqResponses}
                            JOIN ${rfqs} ON ${rfqResponses.rfqId} = ${rfqs.id}
                            WHERE ${rfqs.tenderId} = ${tenderInfos.id}
                        ) ${filters.sortOrder === "desc" ? sql`DESC NULLS LAST` : sql`ASC NULLS LAST`}`;
                    }
                    break;
                case "statusName":
                    orderByClause = sortFn(statuses.name);
                    break;
                default:
                    orderByClause = this.getDefaultSortByRfqTab(activeTab);
            }
        } else {
            // Default sorting based on tab
            orderByClause = this.getDefaultSortByRfqTab(activeTab);
        }

        if (activeTab === "responses") {
            // Bifurcate by rfqResponses
            const [countResult] = await this.db
                .select({ count: sql<number>`count(distinct ${rfqResponses.id})` })
                .from(rfqResponses)
                .innerJoin(rfqs, eq(rfqs.id, rfqResponses.rfqId))
                .innerJoin(tenderInfos, eq(tenderInfos.id, rfqs.tenderId))
                .leftJoin(users, eq(users.id, tenderInfos.teamMember))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .where(whereClause);
            const total = Number(countResult?.count || 0);

            const rows = await this.db
                .select({
                    responseId: rfqResponses.id,
                    vendorId: rfqResponses.vendorId,
                    tenderId: tenderInfos.id,
                    tenderNo: tenderInfos.tenderNo,
                    tenderName: tenderInfos.tenderName,
                    teamMember: tenderInfos.teamMember,
                    teamMemberName: users.name,
                    status: tenderInfos.status,
                    statusName: statuses.name,
                    item: tenderInfos.item,
                    itemName: items.name,
                    responseStatus: rfqResponses.responseStatus,
                    rfqTo: tenderInfos.rfqTo,
                    dueDate: tenderInfos.dueDate,
                    rfqId: rfqs.id,
                    rfqRequired: tenderInfos.rfqRequired,
                    vendorName: vendors.name,
                    vendorOrganization: vendorOrganizations,
                })
                .from(rfqResponses)
                .innerJoin(rfqs, eq(rfqs.id, rfqResponses.rfqId))
                .innerJoin(tenderInfos, eq(tenderInfos.id, rfqs.tenderId))
                .leftJoin(vendors, eq(vendors.id, rfqResponses.vendorId))
                .leftJoin(vendorOrganizations, eq(vendorOrganizations.id, rfqResponses.organizationId))
                .leftJoin(users, eq(users.id, tenderInfos.teamMember))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .where(whereClause)
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);

            const data: RfqRow[] = rows.map(row => {
                const vendorName = row.vendorName || null;
                const responseStatusLabel = row.responseStatus
                    ? responseStatuses.find(s => s.id === Number(row.responseStatus))?.name || "Awaiting Response"
                    : "Awaiting Response";

                return {
                    tenderId: row.tenderId,
                    tenderNo: row.tenderNo,
                    tenderName: row.tenderName,
                    teamMember: row.teamMember || 0,
                    teamMemberName: row.teamMemberName || "",
                    status: row.status || 0,
                    statusName: row.statusName || "",
                    responseStatus: responseStatusLabel,
                    latestStatus: null,
                    latestStatusName: null,
                    statusRemark: null,
                    itemName: row.itemName || "",
                    rfqTo: row.rfqTo || "",
                    dueDate: row.dueDate,
                    rfqId: row.rfqId,
                    vendorOrganizations: row.vendorOrganization ? [row.vendorOrganization] : [],
                    vendorName,
                    rfqCount: 1,
                    responseCount: 1,
                };
            });

            return wrapPaginatedResponse(data, total, page, limit);
        }

        // Get total count (for non-responses tabs)
        const [countResult] = await this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .leftJoin(rfqs, eq(rfqs.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        // Get paginated data (for non-responses tabs)
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                teamMember: tenderInfos.teamMember,
                teamMemberName: users.name,
                status: tenderInfos.status,
                statusName: statuses.name,
                rfqStatusName: statuses.name,
                item: tenderInfos.item,
                itemName: items.name,
                rfqTo: tenderInfos.rfqTo,
                dueDate: tenderInfos.dueDate,
                rfqId: sql<number>`MAX(${rfqs.id})`,
                rfqRequired: tenderInfos.rfqRequired,
                vendorOrganizationIds: sql<string>`(ARRAY_AGG(${rfqs.requestedOrganization} ORDER BY ${rfqs.id} DESC))[1]`,
                rfqCount: sql<number>`(SELECT count(*)::int FROM ${rfqs} WHERE ${rfqs.tenderId} = ${tenderInfos.id})`,
                responseCount: sql<number>`(SELECT count(*)::int FROM ${rfqResponses} JOIN ${rfqs} ON ${rfqResponses.rfqId} = ${rfqs.id} WHERE ${rfqs.tenderId} = ${tenderInfos.id})`,
            })
            .from(tenderInfos)
            .leftJoin(rfqs, eq(rfqs.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .where(whereClause)
            .groupBy(tenderInfos.id, users.id, statuses.id, items.id)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        const data: RfqRow[] = await Promise.all(
            rows.map(async row => {
                let fetchedVendorOrganizations: VendorOrganization[] = [];

                if (activeTab === "pending") {
                    const orgIdsStr = row.rfqTo || "";
                    const vendorOrganizationIds = orgIdsStr
                        .split(",")
                        .map(id => parseInt(id.trim(), 10))
                        .filter(id => Number.isInteger(id) && id > 0);

                    if (vendorOrganizationIds.length > 0) {
                        fetchedVendorOrganizations = await this.db
                            .select()
                            .from(vendorOrganizations)
                            .where(inArray(vendorOrganizations.id, vendorOrganizationIds));
                    }
                } else {
                    const orgIdsStr = row.vendorOrganizationIds || "";
                    const vendorOrganizationIds = orgIdsStr
                        .split(",")
                        .map(id => parseInt(id.trim(), 10))
                        .filter(id => Number.isInteger(id) && id > 0);

                    if (vendorOrganizationIds.length > 0) {
                        fetchedVendorOrganizations = await this.db
                            .select()
                            .from(vendorOrganizations)
                            .where(inArray(vendorOrganizations.id, vendorOrganizationIds));
                    }
                }

                return {
                    tenderId: row.tenderId,
                    tenderNo: row.tenderNo,
                    tenderName: row.tenderName,
                    teamMember: row.teamMember || 0,
                    teamMemberName: row.teamMemberName || "",
                    status: row.status || 0,
                    statusName: row.statusName || "",
                    responseStatus: row.statusName || "",
                    latestStatus: null,
                    latestStatusName: null,
                    statusRemark: null,
                    itemName: row.itemName || "",
                    rfqTo: row.rfqTo || "",
                    dueDate: row.dueDate,
                    rfqId: row.rfqId,
                    vendorOrganizations: fetchedVendorOrganizations,
                    rfqCount: Number(row.rfqCount ?? 0),
                    responseCount: Number(row.responseCount ?? 0),
                };
            })
        );

        return wrapPaginatedResponse(data, total, page, limit);
    }

    //TO DO : use this later -> still deciding how i am going to use it
    private async getVendorOrgName(vendorId: number) : Promise<VendorOrganization | undefined> {
        //getting the orgId from our vendor ID
        const [vendor] = await this.db
            .select()
            .from(vendors)
            .where(eq(vendors.id, vendorId));

        if (!vendor || vendor.orgId === null) {
            return undefined;
        }

        const [org] = await this.db
            .select()
            .from(vendorOrganizations)
            .where(eq(vendorOrganizations.id, vendor.orgId));
        
        return org;
    }

    /**
     * Get counts for all RFQ dashboard tabs
     */
    async getDashboardCounts(
        user?: ValidatedUser,
        teamId?: number
    ): Promise<{ pending: number; sent: number; "rfq-rejected": number; "tender-dnb": number; responses: number; total: number }> {
        const baseWhere = and(
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            inArray(tenderInfos.rfqRequired, ["yes", "Yes", "YES"]),
            ...this.buildRoleFilterConditions(user, teamId),
        );

        const lostIds = StatusCache.getIds("lost").filter(Boolean);

        const notLost = lostIds.length > 0
            ? notInArray(tenderInfos.status, lostIds)
            : sql`1 = 1`;

        const notTenderMissed = or(
            ne(bidSubmissions.status, "Tender Missed"),
            isNull(bidSubmissions.status)
        );

        const { rows } = await this.db.execute(sql`
            SELECT
                COUNT(DISTINCT ${tenderInfos.id}) FILTER (WHERE ${isNull(rfqs.id)} AND ${notLost} AND ${notTenderMissed}) AS pending,
                COUNT(DISTINCT ${tenderInfos.id}) FILTER (WHERE ${isNotNull(rfqs.id)} AND ${notLost} AND ${notTenderMissed}) AS sent,
                COUNT(DISTINCT ${tenderInfos.id}) FILTER (WHERE ${isNull(rfqs.id)} AND ${eq(bidSubmissions.status, "Tender Missed")}) AS rfq_rejected,
                COUNT(DISTINCT ${tenderInfos.id}) FILTER (WHERE ${isNotNull(rfqs.id)} AND ${eq(bidSubmissions.status, "Tender Missed")}) AS tender_dnb,
                COUNT(DISTINCT ${rfqResponses.id}) FILTER (WHERE ${isNotNull(rfqs.id)} AND ${isNotNull(rfqResponses.id)} AND ${or(eq(rfqResponses.responseStatus, 1), isNull(rfqResponses.responseStatus))} AND ${notTenderMissed}) AS responses
            FROM ${tenderInfos}
            LEFT JOIN ${rfqs} ON ${eq(rfqs.tenderId, tenderInfos.id)}
            LEFT JOIN ${bidSubmissions} ON ${eq(bidSubmissions.tenderId, tenderInfos.id)}
            LEFT JOIN ${rfqResponses} ON ${eq(rfqResponses.rfqId, rfqs.id)}
            LEFT JOIN ${users} ON ${eq(users.id, tenderInfos.teamMember)}
            LEFT JOIN ${statuses} ON ${eq(statuses.id, tenderInfos.status)}
            LEFT JOIN ${items} ON ${eq(items.id, tenderInfos.item)}
            WHERE ${baseWhere}
        `);

        const row = rows?.[0] ?? { pending: 0, sent: 0, rfq_rejected: 0, tender_dnb: 0, responses: 0 };
        const pending = Number(row.pending ?? 0);
        const sent = Number(row.sent ?? 0);
        const rejected = Number(row.rfq_rejected ?? 0);
        const dnb = Number(row.tender_dnb ?? 0);
        const responses = Number(row.responses ?? 0);

        return {
            pending,
            sent,
            "rfq-rejected": rejected,
            "tender-dnb": dnb,
            responses,
            total: pending + sent + rejected + dnb + responses,
        };
    }

    private buildDashboardConditions(user?: ValidatedUser, teamId?: number, tab?: string): any[] {
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            inArray(tenderInfos.rfqRequired, ["yes", "Yes", "YES"])
        ];

        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);
        const conditions = [...baseConditions, ...roleFilterConditions];

        if (tab === "pending") {
            conditions.push(isNull(rfqs.id));
            conditions.push(TenderInfosService.getExcludeStatusCondition(["lost"]));
            conditions.push(or(ne(bidSubmissions.status, "Tender Missed"), isNull(bidSubmissions.status)));
        } else if (tab === "sent") {
            conditions.push(isNotNull(rfqs.id));
            conditions.push(TenderInfosService.getExcludeStatusCondition(["lost"]));
            conditions.push(or(ne(bidSubmissions.status, "Tender Missed"), isNull(bidSubmissions.status)));
        } else if (tab === "responses") {
            conditions.push(isNotNull(rfqs.id));
            conditions.push(sql`EXISTS (SELECT 1 FROM ${rfqResponses} WHERE ${rfqResponses.rfqId} = ${rfqs.id})`);
            conditions.push(
                or(
                    eq(rfqResponses.responseStatus, 1),
                    isNull(rfqResponses.responseStatus)
                )
            );
            conditions.push(or(ne(bidSubmissions.status, "Tender Missed"), isNull(bidSubmissions.status)));
        } else if (tab === "rfq-rejected") {
            conditions.push(isNull(rfqs.id));
            conditions.push(eq(bidSubmissions.status, "Tender Missed"));
        } else if (tab === "tender-dnb") {
            conditions.push(isNotNull(rfqs.id));
            conditions.push(eq(bidSubmissions.status, "Tender Missed"));
        }

        return conditions;
    }

    async findResponseStatuses() {
        return {
            status: responseStatuses,
            count: responseStatuses.length
        };
    }

    private async getVendorOrganizations(
        requestedOrganization: string | null,
        requestedVendor: string | null = null
    ): Promise<any[]> {
        const orgIds = requestedOrganization
            ? requestedOrganization
                .split(',')
                .map(id => parseInt(id.trim(), 10))
                .filter(id => !isNaN(id))
            : [];

        const vendorIds = requestedVendor
            ? requestedVendor
                .split(',')
                .map(id => parseInt(id.trim(), 10))
                .filter(id => !isNaN(id))
            : [];

        if (orgIds.length === 0 && vendorIds.length === 0) return [];

        const conditions: SQL[] = [];
        
        if (orgIds.length > 0) {
            conditions.push(inArray(vendorOrganizations.id, orgIds));
        }
        if (vendorIds.length > 0) {
            conditions.push(inArray(vendors.id, vendorIds));
        }

        const rawOrgData = await this.db.select({
                organization: vendorOrganizations,
                vendor: vendors
            })
            .from(vendorOrganizations)
            .leftJoin(vendors, eq(vendors.orgId, vendorOrganizations.id))
            .where(or(...conditions));

        const groupsMap = new Map<number, any>();
        rawOrgData.forEach((row: any) => {
            const org = row.organization;
            const vendor = row.vendor;
            if (!org) return;
            
            if (!groupsMap.has(org.id)) {
                groupsMap.set(org.id, {
                    organizationId: org.id,
                    organizationName: org.name,
                    vendors: []
                });
            }
            
            if (vendor) {
                const group = groupsMap.get(org.id);
                if (!group.vendors.some((v: any) => v.id === vendor.id)) {
                    group.vendors.push({
                        id: vendor.id,
                        name: vendor.name,
                        email: vendor.email
                    });
                }
            }
        });

        return Array.from(groupsMap.values());
    }

    // Updated findById
    async findById(id: number): Promise<RfqDetails | null> {
        const rfqData = await this.db.select().from(rfqs).where(eq(rfqs.id, id)).limit(1);

        if (!rfqData[0]) {
            return null;
        }

        const rfqRow = rfqData[0];

        const [rfqItemsData, rfqDocumentsData, tender, vendorOrganizations] = await Promise.all([
            this.db.select().from(rfqItems).where(eq(rfqItems.rfqId, id)),
            this.db.select().from(rfqDocuments).where(eq(rfqDocuments.rfqId, id)),
            this.db.select().from(tenderInfos).where(eq(tenderInfos.id, rfqRow.tenderId)),
            this.getVendorOrganizations(rfqRow.requestedOrganization, rfqRow.requestedVendor)
        ]);

        return {
            ...rfqRow,
            items: rfqItemsData,
            tender: tender[0],
            documents: rfqDocumentsData,
            vendorOrganizations,
        } as RfqDetails;
    }


    // Updated findByTenderId
    async findByTenderId(tenderId: number): Promise<RfqDetails | null> {
        const rfqData = await this.db.select().from(rfqs).where(eq(rfqs.tenderId, tenderId)).limit(1);

        if (!rfqData[0]) {
            return null;
        }

        const rfqRow = rfqData[0];

        const [rfqItemsData, rfqDocumentsData, vendorOrganizations] = await Promise.all([
            this.db.select().from(rfqItems).where(eq(rfqItems.rfqId, rfqRow.id)),
            this.db.select().from(rfqDocuments).where(eq(rfqDocuments.rfqId, rfqRow.id)),
            this.getVendorOrganizations(rfqRow.requestedOrganization, rfqRow.requestedVendor),
        ]);

        return {
            ...rfqRow,
            items: rfqItemsData,
            documents: rfqDocumentsData,
            vendorOrganizations,
        } as RfqDetails;
    }

    // Updated findAllByTenderId
    async findAllByTenderId(tenderId: number): Promise<RfqDetails[]> {
        const rfqRows = await this.db.select().from(rfqs).where(eq(rfqs.tenderId, tenderId));

        if (rfqRows.length === 0) {
            return [];
        }

        const result: RfqDetails[] = await Promise.all(
            rfqRows.map(async rfqRow => {
                const [rfqItemsData, rfqDocumentsData, vendorOrganizations] = await Promise.all([
                    this.db.select().from(rfqItems).where(eq(rfqItems.rfqId, rfqRow.id)),
                    this.db.select().from(rfqDocuments).where(eq(rfqDocuments.rfqId, rfqRow.id)),
                    this.getVendorOrganizations(rfqRow.requestedOrganization, rfqRow.requestedVendor),
                ]);

                return {
                    ...rfqRow,
                    items: rfqItemsData,
                    documents: rfqDocumentsData,
                    vendorOrganizations,
                } as RfqDetails;
            })
        );

        return result;
    }

    /**
     * Get RFQ with tender details
     * Uses shared tender service method
     */
    async findByIdWithTender(id: number) {
        const rfq = await this.findById(id);
        if (!rfq) {
            throw new NotFoundException(`RFQ with ID ${id} not found`);
        }

        const tender = await this.tenderInfosService.getTenderForRfq(rfq.tenderId);

        return {
            ...rfq,
            tender,
        };
    }

    async create(data: CreateRfqDto, changedBy: number): Promise<RfqDetails> {
        // Validate tender exists and is approved
        await this.tenderInfosService.validateApproved(data.tenderId);

        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(data.tenderId);
        const prevStatus = currentTender?.status ?? null;

        // Create the main RFQ record
        const rfqData: NewRfq = {
            tenderId: data.tenderId,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            docList: data.docList || null,
            requestedOrganization: data.requestedOrganization || null,
            requestedVendor: data.requestedVendor || null,
        };

        const [newRfq] = await this.db.insert(rfqs).values(rfqData).returning();

        // Insert items if provided
        let createdItems: any[] = [];
        if (data.items && data.items.length > 0) {
            const itemsData: NewRfqItem[] = data.items.map(item => ({
                rfqId: newRfq.id,
                requirement: item.requirement,
                unit: item.unit || null,
                qty: item.qty?.toString() || null,
            }));
            createdItems = await this.db.insert(rfqItems).values(itemsData).returning();
        }

        // Insert documents if provided
        let createdDocuments: any[] = [];
        if (data.documents && data.documents.length > 0) {
            const documentsData: NewRfqDocument[] = data.documents.map(doc => ({
                rfqId: newRfq.id,
                docType: doc.docType,
                path: doc.path,
                metadata: doc.metadata || {},
            }));
            createdDocuments = await this.db.insert(rfqDocuments).values(documentsData).returning();
        }

        // AUTO STATUS CHANGE: Update tender status to 4 (RFQ Sent) and track it
        const newStatus = 4; // Status ID for "RFQ Sent"
        await this.db.transaction(async tx => {
            await tx.update(tenderInfos).set({ status: newStatus, updatedAt: new Date() }).where(eq(tenderInfos.id, data.tenderId));

            await this.tenderStatusHistoryService.trackStatusChange(data.tenderId, newStatus, changedBy, prevStatus, "RFQ sent");
        });
        
        const vendorOrganizations = await this.getVendorOrganizations(newRfq.requestedOrganization, newRfq.requestedVendor);

        const rfqDetails = {
            ...newRfq,
            items: createdItems,
            documents: createdDocuments,
            vendorOrganizations,
        } as RfqDetails;

        // Return immediately after transaction commits to avoid blocking the HTTP response
        // Background operations (emails, timer transition) run asynchronously
        this.handleBackgroundOperations(data.tenderId, rfqDetails, changedBy).catch(error => {
            this.logger.error("Background operations failed:", error);
        });

        return rfqDetails;
    }

    /**
     * Handle background operations (emails, timer transition) asynchronously
     * This runs after the HTTP response is returned to avoid blocking and timeout issues
     */
    private async handleBackgroundOperations(tenderId: number, rfqDetails: RfqDetails, changedBy: number): Promise<void> {
        try {
            // Send email notification

            this.logger.log("background option logs", {
                tenderId,
                rfqDetails,
                changedBy,
            });

            await this.sendRfqSentEmail(tenderId, rfqDetails, changedBy);

            // TIMER TRANSITION: Stop rfq timer
            try {
                this.logger.log(`Stopping timer for tender ${tenderId} after RFQ sent`);
                await this.timersService.stopTimer({
                    entityType: "TENDER",
                    entityId: tenderId,
                    stage: "rfq_sent",
                    userId: changedBy,
                    reason: "RFQ sent",
                });
                this.logger.log(`Successfully stopped rfq_sent timer for tender ${tenderId}`);
            } catch (error) {
                if (error instanceof ConflictException) {
                    this.logger.warn(`Timer already completed for tender ${tenderId} after RFQ sent — skipping`);
                } else {
                    this.logger.error(`Failed to stop timer for tender ${tenderId} after RFQ sent:`, error);
                }
            }
        } catch (error) {
            this.logger.error("Unexpected error in background operations:", error);
            // Re-throw to be caught by the caller's error handler
            throw error;
        }
    }

    async update(id: number, data: UpdateRfqDto): Promise<RfqDetails> {
        // Update the main RFQ record
        const updateData: Partial<NewRfq> = {
            updatedAt: new Date(),
        };

        if (data.dueDate !== undefined) {
            updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
        }
        if (data.docList !== undefined) {
            updateData.docList = data.docList;
        }
        if (data.requestedOrganization !== undefined) {
            updateData.requestedOrganization = data.requestedOrganization;
        }
        if (data.requestedVendor !== undefined) {
            updateData.requestedVendor = data.requestedVendor;
        }

        const [updatedRfq] = await this.db.update(rfqs).set(updateData).where(eq(rfqs.id, id)).returning();

        if (!updatedRfq) {
            throw new NotFoundException(`RFQ with ID ${id} not found`);
        }

        // Handle items update if provided
        if (data.items !== undefined) {
            // Delete existing items
            await this.db.delete(rfqItems).where(eq(rfqItems.rfqId, id));

            // Insert new items
            if (data.items.length > 0) {
                const itemsData: NewRfqItem[] = data.items.map(item => ({
                    rfqId: id,
                    requirement: item.requirement,
                    unit: item.unit || null,
                    qty: item.qty?.toString() || null,
                }));
                await this.db.insert(rfqItems).values(itemsData);
            }
        }

        // Handle documents update if provided
        if (data.documents !== undefined) {
            // Delete existing documents
            await this.db.delete(rfqDocuments).where(eq(rfqDocuments.rfqId, id));

            // Insert new documents
            if (data.documents.length > 0) {
                const documentsData: NewRfqDocument[] = data.documents.map(doc => ({
                    rfqId: id,
                    docType: doc.docType,
                    path: doc.path,
                    metadata: doc.metadata || {},
                }));
                await this.db.insert(rfqDocuments).values(documentsData);
            }
        }

        // Fetch the complete updated RFQ with items and documents
        const result = await this.findById(id);
        if (!result) {
            throw new NotFoundException(`RFQ with ID ${id} not found after update`);
        }

        return result;
    }

    async delete(id: number): Promise<void> {
        const result = await this.db.delete(rfqs).where(eq(rfqs.id, id)).returning();
        if (!result[0]) {
            throw new NotFoundException(`RFQ with ID ${id} not found`);
        }
    }


    /**
     * Helper method to send email notifications
     */
    private async sendEmail(
        eventType: string,
        tenderId: number,
        fromUserId: number,
        subject: string,
        template: string,
        data: Record<string, any>,
        recipients: { to?: RecipientSource[]; cc?: RecipientSource[]; attachments?: { files: string[]; baseDir?: string } }
    ) {
        try {
            this.logger.log(`Sending ${eventType} email for tender ${tenderId} to ${recipients.to?.length || 0} recipients`);

            await this.emailService.sendTenderEmail({
                tenderId,
                eventType,
                fromUserId,
                to: recipients.to || [],
                cc: recipients.cc,
                subject,
                template,
                data,
                attachments: recipients.attachments,
            });
        } catch (error) {
            this.logger.error(`Failed to send email for tender ${tenderId}: ${error instanceof Error ? error.message : String(error)}`);
            // Don't throw - email failure shouldn't break main operation
        }
    }

    /**
     * Send RFQ sent email to vendors
     */
    private async sendRfqSentEmail(tenderId: number, rfqDetails: RfqDetails, sentBy: number) {
        // 1) Resolve tender basics directly from DB (no tenderInfosService / rfqTo usage)
        const [tender] = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                team: tenderInfos.team,
                teamMember: tenderInfos.teamMember,
            })
            .from(tenderInfos)
            .where(eq(tenderInfos.id, tenderId))
            .limit(1);

        if (!tender || !tender.teamMember) {
            this.logger.warn(`sendRfqSentEmail: Tender ${tenderId} not found or missing teamMember`);
            return;
        }

        // 2) Resolve selected vendor contacts from RFQ (requestedVendor CSV)
        const requestedVendorIds = (rfqDetails.requestedVendor || "")
            .split(",")
            .map(id => parseInt(id.trim(), 10))
            .filter(id => !isNaN(id));

        if (requestedVendorIds.length === 0) {
            this.logger.warn(`sendRfqSentEmail: No requestedVendor IDs found for RFQ ${rfqDetails.id}`);
            return;
        }

        const vendorRows = await this.db
            .select({
                id: vendors.id,
                orgId: vendors.orgId,
                email: vendors.email,
            })
            .from(vendors)
            .where(inArray(vendors.id, requestedVendorIds));

        // Filter to vendors that have an email and orgId
        const validVendors = vendorRows.filter(v => v.email && v.orgId);
        if (validVendors.length === 0) {
            this.logger.warn(`sendRfqSentEmail: No vendors with valid email/org found for RFQ ${rfqDetails.id}`);
            return;
        }

        // 3) Load organization names for involved orgIds
        const orgIds = Array.from(new Set(validVendors.map(v => v.orgId as number)));
        const orgRows = await this.db
            .select({
                id: vendorOrganizations.id,
                name: vendorOrganizations.name,
            })
            .from(vendorOrganizations)
            .where(inArray(vendorOrganizations.id, orgIds));

        if (orgRows.length === 0) {
            this.logger.warn(`sendRfqSentEmail: No vendor organizations found for orgIds [${orgIds.join(", ")}]`);
            return;
        }

        const orgNameById = new Map<number, string>(orgRows.map(org => [org.id, org.name]));

        // 4) Get TE user details (team member)
        const teUser = await this.recipientResolver.getUserById(tender.teamMember);
        if (!teUser) {
            this.logger.warn(`sendRfqSentEmail: TE user ${tender.teamMember} not found for tender ${tenderId}`);
            return;
        }

        // Get user profile for mobile number
        const [userProfile] = await this.db.select({ mobile: users.mobile }).from(users).where(eq(users.id, tender.teamMember)).limit(1);

        // Format due date
        const dueDate = rfqDetails.dueDate
            ? new Date(rfqDetails.dueDate).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
              })
            : "Not specified";

        // Check document types based on RFQ document docType values
        const hasScope = rfqDetails.documents.some(doc => doc.docType === "SCOPE_OF_WORK");
        const hasTechnical = rfqDetails.documents.some(doc => doc.docType === "TECH_SPECS");
        const hasBoq = rfqDetails.documents.some(doc => doc.docType === "DETAILED_BOQ");
        const hasMaf = rfqDetails.documents.some(doc => doc.docType === "MAF_FORMAT");
        const hasMii = rfqDetails.documents.some(doc => doc.docType === "MII_FORMAT");

        // 5) Group selected vendors by organization and send one email per org
        const vendorsByOrg = new Map<number, string[]>();
        for (const v of validVendors) {
            const orgId = v.orgId as number;
            const email = v.email as string;
            if (!vendorsByOrg.has(orgId)) {
                vendorsByOrg.set(orgId, []);
            }
            vendorsByOrg.get(orgId)!.push(email);
        }

        for (const [orgId, vendorEmails] of vendorsByOrg.entries()) {
            if (vendorEmails.length === 0) continue;

            const orgName = orgNameById.get(orgId) || "Vendor Organization";

            this.logger.log(
                `sendRfqSentEmail: building emailData for tenderId=${tenderId}, rfqId=${rfqDetails.id}, orgId=${orgId}, orgName="${orgName}", vendorCount=${vendorEmails.length}, itemsCount=${rfqDetails.items.length}`
            );

            const emailData = {
                org: orgName,
                items: rfqDetails.items.map(item => ({
                    requirement: item.requirement,
                    qty: item.qty || "N/A",
                    unit: item.unit || "N/A",
                })),
                hasScope,
                hasTechnical,
                hasBoq,
                hasMaf,
                hasMii,
                list_of_docs: rfqDetails.docList || "As per tender requirements",
                due_date: dueDate,
                te_name: teUser.name,
                teMob: userProfile?.mobile || "Not available",
                teMail: teUser.email,
            };

            // Collect attachment file paths from RFQ documents
            const attachmentFiles = rfqDetails.documents?.map(doc => doc.path).filter((path): path is string => !!path) || [];

            const shouldLogAttachmentDetails = process.env.EMAIL_LOG_ATTACHMENTS === "1";
            if (shouldLogAttachmentDetails && rfqDetails.documents?.length) {
                const sampleDoc = rfqDetails.documents[0];
                this.logger.debug(`sendRfqSentEmail: sample document for tenderId=${tenderId}, rfqId=${rfqDetails.id}: docType=${sampleDoc.docType}, path=${sampleDoc.path}`);
            }

            this.logger.log(
                `sendRfqSentEmail: tenderId=${tenderId}, rfqId=${rfqDetails.id}, orgId=${orgId} has ${attachmentFiles.length} attachment file(s): ${JSON.stringify(attachmentFiles)}`
            );

            await this.sendEmail("rfq.sent", tenderId, sentBy, `RFQ - ${tender.tenderName} - ${tender.tenderNo}`, "rfq-sent", emailData, {
                to: [{ type: "emails", emails: vendorEmails }],
                cc: [
                    { type: "role", role: "Admin", teamId: tender.team },
                    { type: "role", role: "Team Leader", teamId: tender.team },
                    { type: "role", role: "Coordinator", teamId: tender.team },
                ],
                attachments: attachmentFiles.length > 0 ? { files: attachmentFiles } : undefined,
            });
        }
    }
}
