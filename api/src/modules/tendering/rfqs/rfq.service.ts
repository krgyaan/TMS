import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { and, eq, isNotNull, ne, sql, asc, desc, isNull, or, inArray, notInArray } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { tenderInfos } from "@db/schemas/tendering/tenders.schema";
import { statuses } from "@db/schemas/master/statuses.schema";
import { users } from "@db/schemas/auth/users.schema";
import { tenderStatusHistory } from "@db/schemas/tendering/tender-status-history.schema";
import { NewRfq, rfqs, rfqItems, rfqDocuments, NewRfqItem, NewRfqDocument } from "@db/schemas/tendering/rfqs.schema";
import { items } from "@db/schemas/master/items.schema";
import { vendorOrganizations } from "@db/schemas/vendors/vendor-organizations.schema";
import { vendors } from "@db/schemas/vendors/vendors.schema";
import { CreateRfqDto, UpdateRfqDto } from "./dto/rfq.dto";
import { TenderInfosService } from "@/modules/tendering/tenders/tenders.service";
import type { PaginatedResult } from "@/modules/tendering/types/shared.types";
import { TenderStatusHistoryService } from "@/modules/tendering/tender-status-history/tender-status-history.service";
import { EmailService } from "@/modules/email/email.service";
import { RecipientResolver } from "@/modules/email/recipient.resolver";
import type { RecipientSource } from "@/modules/email/dto/send-email.dto";
import { Logger } from "@nestjs/common";
import { StatusCache } from "@/utils/status-cache";
import { wrapPaginatedResponse } from "@/utils/responseWrapper";
import { WorkflowService } from "@/modules/timers/services/workflow.service";

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
    latestStatus: number | null;
    latestStatusName: string | null;
    statusRemark: string | null;
    itemName: string;
    rfqTo: string;
    dueDate: Date;
    rfqId: number | null;
    vendorOrganizationNames: string | null;
};

type RfqDetails = {
    id: number;
    tenderId: number;
    dueDate: Date;
    docList: string | null;
    requestedVendor: string | null;
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

@Injectable()
export class RfqsService {
    private readonly logger = new Logger(RfqsService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly workflowService: WorkflowService
    ) {}

    /**
     * Get RFQ Dashboard data - Refactored to use dashboard config
     */
    async getRfqData(
        tab?: "pending" | "sent" | "rfq-rejected" | "tender-dnb",
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: "asc" | "desc"; search?: string }
    ): Promise<PaginatedResult<RfqRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        // Use default tab if not provided
        const activeTab = tab || "pending";

        // Build base conditions
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            isNotNull(tenderInfos.rfqTo), // NOT NULL
            ne(tenderInfos.rfqTo, ""), // NOT empty string
            ne(tenderInfos.rfqTo, "0"), // NOT '0'
        ];

        // TODO: Add role-based team filtering middleware/guard
        // - Admin: see all tenders
        // - Team Leader/Coordinator: filter by user.team
        // - Others: filter by team_member = user.id

        // Build tab-specific conditions
        const conditions = [...baseConditions];

        if (activeTab === "pending") {
            conditions.push(isNull(rfqs.id));
            conditions.push(TenderInfosService.getExcludeStatusCondition(["dnb", "lost"]));
        } else if (activeTab === "sent") {
            conditions.push(isNotNull(rfqs.id));
            conditions.push(TenderInfosService.getExcludeStatusCondition(["dnb", "lost"]));
        } else if (activeTab === "rfq-rejected") {
            conditions.push(inArray(tenderInfos.status, [10, 14, 35]));
        } else if (activeTab === "tender-dnb") {
            const dnbStatusIds = StatusCache.getIds("dnb");
            if (dnbStatusIds.length > 0) {
                const filteredDnbIds = dnbStatusIds.filter(id => [8, 34].includes(id));
                if (filteredDnbIds.length > 0) {
                    conditions.push(inArray(tenderInfos.status, filteredDnbIds));
                }
            }
        } else {
            throw new BadRequestException(`Invalid tab: ${activeTab}`);
        }

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
            conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
        }

        const whereClause = and(...conditions);

        // Build orderBy clause
        const sortBy = filters?.sortBy;
        const sortOrder = filters?.sortOrder || (activeTab === "pending" ? "asc" : "desc");
        let orderByClause: any = asc(tenderInfos.dueDate); // Default

        // Set default sort based on tab if no sortBy specified
        if (!sortBy) {
            if (activeTab === "pending") {
                orderByClause = asc(tenderInfos.dueDate);
            } else if (activeTab === "sent") {
                orderByClause = desc(tenderInfos.dueDate);
            } else if (activeTab === "rfq-rejected" || activeTab === "tender-dnb") {
                orderByClause = desc(tenderInfos.updatedAt);
            }
        } else {
            const sortFn = sortOrder === "desc" ? desc : asc;
            switch (sortBy) {
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
                case "statusChangeDate":
                    orderByClause = sortFn(tenderInfos.updatedAt);
                    break;
                default:
                    orderByClause = sortFn(tenderInfos.dueDate);
            }
        }

        // Get total count
        const [countResult] = await this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .leftJoin(rfqs, eq(rfqs.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        // Get paginated data
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                teamMember: tenderInfos.teamMember,
                teamMemberName: users.name,
                status: tenderInfos.status,
                statusName: statuses.name,
                item: tenderInfos.item,
                itemName: items.name,
                rfqTo: tenderInfos.rfqTo,
                dueDate: tenderInfos.dueDate,
                rfqId: rfqs.id,
                vendorOrganizationNames: sql<string>`(
                        SELECT string_agg(${vendorOrganizations.name}, ', ')
                        FROM ${vendorOrganizations}
                        WHERE CAST(${vendorOrganizations.id} AS TEXT) = ANY(string_to_array(${tenderInfos.rfqTo}, ','))
                    )`,
            })
            .from(tenderInfos)
            .leftJoin(rfqs, eq(rfqs.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(orderByClause);

        // Enrich rows with latest status log data
        if (rows.length > 0) {
            const tenderIds = rows.map(r => r.tenderId);

            // Get latest status log for each tender
            const allStatusLogs = await this.db
                .select({
                    tenderId: tenderStatusHistory.tenderId,
                    newStatus: tenderStatusHistory.newStatus,
                    comment: tenderStatusHistory.comment,
                    createdAt: tenderStatusHistory.createdAt,
                    id: tenderStatusHistory.id,
                })
                .from(tenderStatusHistory)
                .where(inArray(tenderStatusHistory.tenderId, tenderIds))
                .orderBy(desc(tenderStatusHistory.createdAt), desc(tenderStatusHistory.id));

            // Group by tenderId and take the first (latest) entry for each
            const latestStatusLogMap = new Map<number, (typeof allStatusLogs)[0]>();
            for (const log of allStatusLogs) {
                if (!latestStatusLogMap.has(log.tenderId)) {
                    latestStatusLogMap.set(log.tenderId, log);
                }
            }

            // Get status names for latest status logs
            const latestStatusIds = [...new Set(Array.from(latestStatusLogMap.values()).map(log => log.newStatus))];
            const latestStatuses =
                latestStatusIds.length > 0 ? await this.db.select({ id: statuses.id, name: statuses.name }).from(statuses).where(inArray(statuses.id, latestStatusIds)) : [];

            const statusNameMap = new Map(latestStatuses.map(s => [s.id, s.name]));

            // Enrich rows with latest status log data
            const enrichedRows = rows.map(row => {
                const latestLog = latestStatusLogMap.get(row.tenderId);
                return {
                    tenderId: row.tenderId,
                    tenderNo: row.tenderNo,
                    tenderName: row.tenderName,
                    teamMember: row.teamMember || 0,
                    teamMemberName: row.teamMemberName || "",
                    status: row.status || 0,
                    statusName: row.statusName || "",
                    latestStatus: latestLog?.newStatus || null,
                    latestStatusName: latestLog ? statusNameMap.get(latestLog.newStatus) || null : null,
                    statusRemark: latestLog?.comment || null,
                    itemName: row.itemName || "",
                    rfqTo: row.rfqTo || "",
                    dueDate: row.dueDate,
                    rfqId: row.rfqId,
                    vendorOrganizationNames: row.vendorOrganizationNames,
                };
            });

            return wrapPaginatedResponse(enrichedRows, total, page, limit);
        }

        const data: RfqRow[] = rows.map(row => ({
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: row.tenderName,
            teamMember: row.teamMember || 0,
            teamMemberName: row.teamMemberName || "",
            status: row.status || 0,
            statusName: row.statusName || "",
            latestStatus: null,
            latestStatusName: null,
            statusRemark: null,
            itemName: row.itemName || "",
            rfqTo: row.rfqTo || "",
            dueDate: row.dueDate,
            rfqId: row.rfqId,
            vendorOrganizationNames: row.vendorOrganizationNames,
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    async findById(id: number): Promise<RfqDetails | null> {
        const rfqData = await this.db.select().from(rfqs).where(eq(rfqs.id, id)).limit(1);

        if (!rfqData[0]) {
            return null;
        }

        const rfqItemsData = await this.db.select().from(rfqItems).where(eq(rfqItems.rfqId, id));

        const rfqDocumentsData = await this.db.select().from(rfqDocuments).where(eq(rfqDocuments.rfqId, id));

        return {
            ...rfqData[0],
            items: rfqItemsData,
            documents: rfqDocumentsData,
        } as RfqDetails;
    }

    async findByTenderId(tenderId: number): Promise<RfqDetails | null> {
        const rfqData = await this.db.select().from(rfqs).where(eq(rfqs.tenderId, tenderId)).limit(1);

        if (!rfqData[0]) {
            return null;
        }

        const rfqItemsData = await this.db.select().from(rfqItems).where(eq(rfqItems.rfqId, rfqData[0].id));

        const rfqDocumentsData = await this.db.select().from(rfqDocuments).where(eq(rfqDocuments.rfqId, rfqData[0].id));

        return {
            ...rfqData[0],
            items: rfqItemsData,
            documents: rfqDocumentsData,
        } as RfqDetails;
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

        const rfqDetails = {
            ...newRfq,
            items: createdItems,
            documents: createdDocuments,
        } as RfqDetails;

        // Send email notification
        await this.sendRfqSentEmail(data.tenderId, rfqDetails, changedBy);

        // TIMER TRANSITION: Complete rfq_sent step
        try {
            this.logger.log(`Transitioning timers for tender ${data.tenderId} after RFQ sent`);

            // Get workflow status
            const workflowStatus = await this.workflowService.getWorkflowStatus("TENDER", data.tenderId.toString());

            // Complete the rfq_sent step
            const rfqSentStep = workflowStatus.steps.find(step => step.stepKey === "rfq_sent" && step.status === "IN_PROGRESS");

            if (rfqSentStep) {
                this.logger.log(`Completing rfq_sent step ${rfqSentStep.id} for tender ${data.tenderId}`);
                await this.workflowService.completeStep(rfqSentStep.id.toString(), {
                    userId: changedBy.toString(),
                    notes: "RFQ sent",
                });
                this.logger.log(`Successfully completed rfq_sent step for tender ${data.tenderId}`);
            } else {
                this.logger.warn(`No active rfq_sent step found for tender ${data.tenderId}`);
                // Try to find any rfq_sent step
                const anyRfqSentStep = workflowStatus.steps.find(step => step.stepKey === "rfq_sent");
                if (anyRfqSentStep) {
                    this.logger.warn(`Found rfq_sent step ${anyRfqSentStep.id} with status ${anyRfqSentStep.status}`);
                }
            }
        } catch (error) {
            this.logger.error(`Failed to transition timers for tender ${data.tenderId} after RFQ sent:`, error);
            // Don't fail the entire operation if timer transition fails
        }

        return rfqDetails;
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
     * Get counts for all RFQ dashboard tabs
     */
    async getDashboardCounts(): Promise<{
        pending: number;
        sent: number;
        "rfq-rejected": number;
        "tender-dnb": number;
        total: number;
    }> {
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            // TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
            isNotNull(tenderInfos.rfqTo),
            ne(tenderInfos.rfqTo, "0"),
            ne(tenderInfos.rfqTo, ""),
        ];

        // Count pending: status = 3, rfqId IS NULL
        const pendingConditions = [...baseConditions, isNull(rfqs.id), TenderInfosService.getExcludeStatusCondition(["dnb", "lost"])];

        // Count sent: status = 4, rfqId IS NOT NULL
        const sentConditions = [...baseConditions, isNotNull(rfqs.id), TenderInfosService.getExcludeStatusCondition(["dnb", "lost"])];

        // Count rfq-rejected: status in [10, 14, 35]
        const rfqRejectedConditions = [...baseConditions, inArray(tenderInfos.status, [10, 14, 35])];

        // Count tender-dnb: status in [8, 34] (dnb category)
        const dnbStatusIds = StatusCache.getIds("dnb");
        const filteredDnbIds = dnbStatusIds.filter(id => [8, 34].includes(id));
        const tenderDnbConditions = [...baseConditions, ...(filteredDnbIds.length > 0 ? [inArray(tenderInfos.status, filteredDnbIds)] : [])];

        // Count for each tab
        const counts = await Promise.all([
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .leftJoin(rfqs, eq(rfqs.tenderId, tenderInfos.id))
                .leftJoin(users, eq(users.id, tenderInfos.teamMember))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .where(and(...pendingConditions))
                .then(([result]) => Number(result?.count || 0)),
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .leftJoin(rfqs, eq(rfqs.tenderId, tenderInfos.id))
                .leftJoin(users, eq(users.id, tenderInfos.teamMember))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .where(and(...sentConditions))
                .then(([result]) => Number(result?.count || 0)),
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .leftJoin(rfqs, eq(rfqs.tenderId, tenderInfos.id))
                .leftJoin(users, eq(users.id, tenderInfos.teamMember))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .where(and(...rfqRejectedConditions))
                .then(([result]) => Number(result?.count || 0)),
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .leftJoin(rfqs, eq(rfqs.tenderId, tenderInfos.id))
                .leftJoin(users, eq(users.id, tenderInfos.teamMember))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .where(and(...tenderDnbConditions))
                .then(([result]) => Number(result?.count || 0)),
        ]);

        return {
            pending: counts[0],
            sent: counts[1],
            "rfq-rejected": counts[2],
            "tender-dnb": counts[3],
            total: counts.reduce((sum, count) => sum + count, 0),
        };
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
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember || !tender.rfqTo) return;

        // Get TE user details
        const teUser = await this.recipientResolver.getUserById(tender.teamMember);
        if (!teUser) return;

        // Get vendor organization IDs from rfqTo (comma-separated)
        const vendorOrgIds = tender.rfqTo
            .split(",")
            .map(id => parseInt(id.trim(), 10))
            .filter(id => !isNaN(id));

        if (vendorOrgIds.length === 0) return;

        // Get vendor organization details
        const vendorOrgs = await this.db
            .select({
                id: vendorOrganizations.id,
                name: vendorOrganizations.name,
            })
            .from(vendorOrganizations)
            .where(inArray(vendorOrganizations.id, vendorOrgIds));

        if (vendorOrgs.length === 0) return;

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

        // Check document types
        const hasScope = rfqDetails.documents.some(doc => doc.docType === "scope");
        const hasTechnical = rfqDetails.documents.some(doc => doc.docType === "technical");
        const hasBoq = rfqDetails.documents.some(doc => doc.docType === "boq");
        const hasMaf = rfqDetails.documents.some(doc => doc.docType === "maf");
        const hasMii = rfqDetails.documents.some(doc => doc.docType === "mii");

        // Send email to each vendor organization
        for (const vendorOrg of vendorOrgs) {
            // Get vendors for this organization with emails
            const orgVendors = await this.db
                .select({
                    email: vendors.email,
                })
                .from(vendors)
                .where(and(eq(vendors.orgId, vendorOrg.id), isNotNull(vendors.email)));

            // Skip if no vendors with emails found
            const vendorEmails = orgVendors.map(v => v.email).filter((email): email is string => email !== null);
            if (vendorEmails.length === 0) continue;

            const emailData = {
                org: vendorOrg.name,
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

            await this.sendEmail("rfq.sent", tenderId, sentBy, `RFQ - ${tender.tenderName} - ${tender.tenderNo}`, "rfq-sent", emailData, {
                to: [{ type: "emails", emails: vendorEmails }],
                cc: [
                    { type: "role", role: "Admin", teamId: tender.team },
                    { type: "role", role: "Team Leader", teamId: tender.team },
                    { type: "role", role: "Coordinator", teamId: tender.team },
                ],
                // attachments: attachmentFiles.length > 0 ? { files: attachmentFiles } : undefined,
            });
        }
    }
}
