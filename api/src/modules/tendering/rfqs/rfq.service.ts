import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNotNull, ne, sql } from 'drizzle-orm';
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
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class RfqsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService, // Injected
    ) { }

    async findAll(): Promise<RfqRow[]> {
        const conditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            isNotNull(tenderInfos.rfqTo),
            ne(tenderInfos.rfqTo, '0'),
            ne(tenderInfos.rfqTo, ''),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
        ];

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
            .where(and(...conditions));

        // Sort: pending first, then sent
        const pendingRows = rows.filter((row) => row.rfqId === null);
        const sentRows = rows.filter((row) => row.rfqId !== null);

        return [...pendingRows, ...sentRows] as unknown as RfqRow[];
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

    async create(data: CreateRfqDto): Promise<RfqDetails> {
        // Validate tender exists and is approved
        await this.tenderInfosService.validateApproved(data.tenderId);

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

        return {
            ...newRfq,
            items: createdItems,
            documents: createdDocuments,
        } as RfqDetails;
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
}
