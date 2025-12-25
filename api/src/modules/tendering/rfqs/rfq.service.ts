import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNotNull, ne, sql, asc, desc, isNull, or } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import {
    NewRfq,
    rfqs,
    rfqItems,
    rfqDocuments,
    NewRfqItem,
    NewRfqDocument,
} from '@db/schemas/tendering/rfqs.schema';
import { items } from '@db/schemas/master/items.schema';
import { vendorOrganizations } from '@db/schemas/vendors/vendor-organizations.schema';
import { CreateRfqDto, UpdateRfqDto } from './dto/rfq.dto';
import { TenderInfosService, type PaginatedResult } from '@/modules/tendering/tenders/tenders.service';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';

export type RfqFilters = {
    rfqStatus?: 'pending' | 'sent';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

type RfqRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMember: number;
    teamMemberName: string;
    status: number;
    statusName: string;
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
    ) { }

    async findAll(filters?: RfqFilters): Promise<PaginatedResult<RfqRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const conditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            isNotNull(tenderInfos.rfqTo),
            ne(tenderInfos.rfqTo, '0'),
            ne(tenderInfos.rfqTo, ''),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
        ];

        // Build orderBy clause based on sortBy (if it's a database field)
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
                case 'itemName':
                    orderByClause = sortOrder(items.name);
                    break;
                case 'statusName':
                    orderByClause = sortOrder(statuses.name);
                    break;
                default:
                    orderByClause = asc(tenderInfos.dueDate);
            }
        }

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
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(rfqs, eq(tenderInfos.id, rfqs.tenderId))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .where(and(...conditions))
            .orderBy(orderByClause);

        // Filter by rfqStatus (pending = rfqId is null, sent = rfqId is not null)
        let filteredRows = rows;
        if (filters?.rfqStatus) {
            if (filters.rfqStatus === 'pending') {
                filteredRows = rows.filter((row) => row.rfqId === null);
            } else if (filters.rfqStatus === 'sent') {
                filteredRows = rows.filter((row) => row.rfqId !== null);
            }
        }

        // Apply sorting if sortBy is not a database field (e.g., vendorOrganizationNames)
        if (filters?.sortBy && ['vendorOrganizationNames'].includes(filters.sortBy)) {
            const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;
            filteredRows.sort((a, b) => {
                let aVal: any;
                let bVal: any;

                switch (filters.sortBy) {
                    case 'vendorOrganizationNames':
                        aVal = a.vendorOrganizationNames || '';
                        bVal = b.vendorOrganizationNames || '';
                        break;
                    default:
                        return 0;
                }

                if (aVal < bVal) return -1 * sortOrder;
                if (aVal > bVal) return 1 * sortOrder;
                return 0;
            });
        }

        // Apply pagination
        const totalFiltered = filteredRows.length;
        const paginatedData = filteredRows.slice(offset, offset + limit);

        return {
            data: paginatedData as unknown as RfqRow[],
            meta: {
                total: totalFiltered,
                page,
                limit,
                totalPages: Math.ceil(totalFiltered / limit),
            },
        };
    }

    async findById(id: number): Promise<RfqDetails | null> {
        const rfqData = await this.db
            .select()
            .from(rfqs)
            .where(eq(rfqs.id, id))
            .limit(1);

        if (!rfqData[0]) {
            return null;
        }

        const rfqItemsData = await this.db
            .select()
            .from(rfqItems)
            .where(eq(rfqItems.rfqId, id));

        const rfqDocumentsData = await this.db
            .select()
            .from(rfqDocuments)
            .where(eq(rfqDocuments.rfqId, id));

        return {
            ...rfqData[0],
            items: rfqItemsData,
            documents: rfqDocumentsData,
        } as RfqDetails;
    }

    async findByTenderId(tenderId: number): Promise<RfqDetails | null> {
        const rfqData = await this.db
            .select()
            .from(rfqs)
            .where(eq(rfqs.tenderId, tenderId))
            .limit(1);

        if (!rfqData[0]) {
            return null;
        }

        const rfqItemsData = await this.db
            .select()
            .from(rfqItems)
            .where(eq(rfqItems.rfqId, rfqData[0].id));

        const rfqDocumentsData = await this.db
            .select()
            .from(rfqDocuments)
            .where(eq(rfqDocuments.rfqId, rfqData[0].id));

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
            const itemsData: NewRfqItem[] = data.items.map((item) => ({
                rfqId: newRfq.id,
                requirement: item.requirement,
                unit: item.unit || null,
                qty: item.qty?.toString() || null,
            }));
            createdItems = await this.db
                .insert(rfqItems)
                .values(itemsData)
                .returning();
        }

        // Insert documents if provided
        let createdDocuments: any[] = [];
        if (data.documents && data.documents.length > 0) {
            const documentsData: NewRfqDocument[] = data.documents.map((doc) => ({
                rfqId: newRfq.id,
                docType: doc.docType,
                path: doc.path,
                metadata: doc.metadata || {},
            }));
            createdDocuments = await this.db
                .insert(rfqDocuments)
                .values(documentsData)
                .returning();
        }

        // AUTO STATUS CHANGE: Update tender status to 4 (RFQ Sent) and track it
        const newStatus = 4; // Status ID for "RFQ Sent"
        await this.db.transaction(async (tx) => {
            await tx
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, data.tenderId));

            await this.tenderStatusHistoryService.trackStatusChange(
                data.tenderId,
                newStatus,
                changedBy,
                prevStatus,
                'RFQ sent'
            );
        });

        const rfqDetails = {
            ...newRfq,
            items: createdItems,
            documents: createdDocuments,
        } as RfqDetails;

        // Send email notification
        await this.sendRfqSentEmail(data.tenderId, rfqDetails, changedBy);

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

        const [updatedRfq] = await this.db
            .update(rfqs)
            .set(updateData)
            .where(eq(rfqs.id, id))
            .returning();

        if (!updatedRfq) {
            throw new NotFoundException(`RFQ with ID ${id} not found`);
        }

        // Handle items update if provided
        if (data.items !== undefined) {
            // Delete existing items
            await this.db.delete(rfqItems).where(eq(rfqItems.rfqId, id));

            // Insert new items
            if (data.items.length > 0) {
                const itemsData: NewRfqItem[] = data.items.map((item) => ({
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
                const documentsData: NewRfqDocument[] = data.documents.map((doc) => ({
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
        const result = await this.db
            .delete(rfqs)
            .where(eq(rfqs.id, id))
            .returning();
        if (!result[0]) {
            throw new NotFoundException(`RFQ with ID ${id} not found`);
        }
    }

    /**
     * Get RFQ Dashboard data - Updated implementation per requirements
     * Type: 'pending' = rfqId IS NULL, 'sent' = rfqId IS NOT NULL
     */
    async getRfqData(
        type?: 'pending' | 'sent',
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
    ): Promise<PaginatedResult<RfqRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        // Build base conditions
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
            isNotNull(tenderInfos.rfqTo),
            ne(tenderInfos.rfqTo, '0'),
            ne(tenderInfos.rfqTo, ''),
        ];

        // Add type filter
        if (type === 'pending') {
            baseConditions.push(isNull(rfqs.id));
        } else if (type === 'sent') {
            baseConditions.push(isNotNull(rfqs.id));
        }

        const whereClause = and(...baseConditions);

        // Build orderBy clause
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
                default:
                    orderByClause = asc(tenderInfos.dueDate);
            }
        }

        // Get total count
        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
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

        const data: RfqRow[] = rows.map((row) => ({
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: `${row.tenderName} - ${row.tenderNo}`,
            teamMember: row.teamMember || 0,
            teamMemberName: row.teamMemberName || '',
            status: row.status || 0,
            statusName: row.statusName || '',
            itemName: row.itemName || '',
            rfqTo: row.rfqTo || '',
            dueDate: row.dueDate,
            rfqId: row.rfqId,
            vendorOrganizationNames: row.vendorOrganizationNames,
        }));

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
        recipients: { to?: RecipientSource[]; cc?: RecipientSource[] }
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
            });
        } catch (error) {
            this.logger.error(`Failed to send email for tender ${tenderId}: ${error instanceof Error ? error.message : String(error)}`);
            // Don't throw - email failure shouldn't break main operation
        }
    }

    /**
     * Send RFQ sent email to vendors
     */
    private async sendRfqSentEmail(
        tenderId: number,
        rfqDetails: RfqDetails,
        sentBy: number
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember || !tender.rfqTo) return;

        // Get TE user details
        const teUser = await this.recipientResolver.getUserById(tender.teamMember);
        if (!teUser) return;

        // Get vendor organization IDs from rfqTo (comma-separated)
        const vendorOrgIds = tender.rfqTo.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

        if (vendorOrgIds.length === 0) return;

        // Get vendor organization details
        const vendorOrgs = await this.db
            .select({
                id: vendorOrganizations.id,
                name: vendorOrganizations.name,
                email: vendorOrganizations.email,
            })
            .from(vendorOrganizations)
            .where(sql`${vendorOrganizations.id} = ANY(${vendorOrgIds})`);

        if (vendorOrgs.length === 0) return;

        // Get user profile for mobile number
        const [userProfile] = await this.db
            .select({ mobile: users.mobile })
            .from(users)
            .where(eq(users.id, tender.teamMember))
            .limit(1);

        // Format due date
        const dueDate = rfqDetails.dueDate ? new Date(rfqDetails.dueDate).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }) : 'Not specified';

        // Check document types
        const hasScope = rfqDetails.documents.some(doc => doc.docType === 'scope');
        const hasTechnical = rfqDetails.documents.some(doc => doc.docType === 'technical');
        const hasBoq = rfqDetails.documents.some(doc => doc.docType === 'boq');
        const hasMaf = rfqDetails.documents.some(doc => doc.docType === 'maf');
        const hasMii = rfqDetails.documents.some(doc => doc.docType === 'mii');

        // Send email to each vendor organization
        for (const vendorOrg of vendorOrgs) {
            if (!vendorOrg.email) continue;

            const emailData = {
                org: vendorOrg.name,
                items: rfqDetails.items.map(item => ({
                    requirement: item.requirement,
                    qty: item.qty || 'N/A',
                    unit: item.unit || 'N/A',
                })),
                hasScope,
                hasTechnical,
                hasBoq,
                hasMaf,
                hasMii,
                list_of_docs: rfqDetails.docList || 'As per tender requirements',
                due_date: dueDate,
                te_name: teUser.name,
                teMob: userProfile?.mobile || 'Not available',
                teMail: teUser.email,
            };

            await this.sendEmail(
                'rfq.sent',
                tenderId,
                sentBy,
                `RFQ: ${tender.tenderNo}`,
                'rfq-sent',
                emailData,
                {
                    to: [{ type: 'emails', emails: [vendorOrg.email] }],
                }
            );
        }
    }
}
