import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql, desc } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import {
    rfqs,
    rfqResponses,
    rfqResponseItems,
    rfqResponseDocuments,
    NewRfqResponse,
    NewRfqResponseItem,
    NewRfqResponseDocument,
} from "@db/schemas/tendering/rfqs.schema";
import { tenderInfos } from "@db/schemas/tendering/tenders.schema";
import { vendorOrganizations } from "@db/schemas/vendors/vendor-organizations.schema";
import { vendors } from "@db/schemas/vendors/vendors.schema";
import { RfqsService } from "@/modules/tendering/rfqs/rfq.service";
import type { CreateRfqResponseBodyDto } from "./dto/rfq-response.dto";

@Injectable()
export class RfqResponseService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly rfqsService: RfqsService,
    ) {}

    async create(rfqId: number, data: CreateRfqResponseBodyDto) {
        const rfq = await this.rfqsService.findById(rfqId);
        if (!rfq) {
            throw new NotFoundException(`RFQ with ID ${rfqId} not found`);
        }

        const responseData: NewRfqResponse = {
            rfqId,
            vendorId: data.vendorId,
            receiptDatetime: new Date(data.receiptDatetime),
            gstPercentage: data.gstPercentage != null ? String(data.gstPercentage) : null,
            gstType: data.gstType ?? null,
            deliveryTime: data.deliveryTime ?? null,
            freightType: data.freightType ?? null,
            notes: data.notes ?? null,
        };

        const [newResponse] = await this.db.insert(rfqResponses).values(responseData).returning();

        if (data.items && data.items.length > 0) {
            const itemsData: NewRfqResponseItem[] = data.items.map(item => ({
                rfqResponseId: newResponse.id,
                rfqItemId: item.itemId,
                requirement: item.requirement,
                unit: item.unit ?? null,
                qty: item.qty != null ? String(item.qty) : null,
                unitPrice: item.unitPrice != null ? String(item.unitPrice) : null,
                totalPrice: item.totalPrice != null ? String(item.totalPrice) : null,
            }));
            await this.db.insert(rfqResponseItems).values(itemsData);
        }

        if (data.documents && data.documents.length > 0) {
            const documentsData: NewRfqResponseDocument[] = data.documents.map(doc => ({
                rfqResponseId: newResponse.id,
                docType: doc.docType,
                path: doc.path.length > 255 ? doc.path.slice(0, 255) : doc.path,
                metadata: doc.metadata ?? {},
            }));
            await this.db.insert(rfqResponseDocuments).values(documentsData);
        }

        return { id: newResponse.id, rfqId, vendorId: data.vendorId };
    }

    async findAll() {
        const rows = await this.db
            .select({
                id: rfqResponses.id,
                rfqId: rfqResponses.rfqId,
                vendorId: rfqResponses.vendorId,
                vendorName: vendorOrganizations.name,
                receiptDatetime: rfqResponses.receiptDatetime,
                tenderId: rfqs.tenderId,
                tenderName: tenderInfos.tenderName,
                tenderNo: tenderInfos.tenderNo,
                dueDate: tenderInfos.dueDate,
                itemSummary: sql<string>`(SELECT string_agg(ri.requirement, ', ') FROM rfq_items ri WHERE ri.rfq_id = rfqs.id)`.as("item_summary"),
            })
            .from(rfqResponses)
            .leftJoin(vendors, eq(rfqResponses.vendorId, vendors.id))
            .leftJoin(vendorOrganizations, eq(vendors.orgId, vendorOrganizations.id))
            .leftJoin(rfqs, eq(rfqResponses.rfqId, rfqs.id))
            .leftJoin(tenderInfos, eq(rfqs.tenderId, tenderInfos.id))
            .orderBy(desc(rfqResponses.createdAt));
        return rows;
    }

    async findByRfqId(rfqId: number) {
        const rfq = await this.rfqsService.findById(rfqId);
        if (!rfq) {
            throw new NotFoundException(`RFQ with ID ${rfqId} not found`);
        }
        const rows = await this.db
            .select({
                id: rfqResponses.id,
                rfqId: rfqResponses.rfqId,
                vendorId: rfqResponses.vendorId,
                vendorName: vendorOrganizations.name,
                receiptDatetime: rfqResponses.receiptDatetime,
                tenderName: tenderInfos.tenderName,
                tenderNo: tenderInfos.tenderNo,
                dueDate: tenderInfos.dueDate,
                itemSummary: sql<string>`(SELECT string_agg(ri.requirement, ', ') FROM rfq_items ri WHERE ri.rfq_id = rfqs.id)`.as("item_summary"),
            })
            .from(rfqResponses)
            .leftJoin(vendors, eq(rfqResponses.vendorId, vendors.id))
            .leftJoin(vendorOrganizations, eq(vendors.orgId, vendorOrganizations.id))
            .leftJoin(rfqs, eq(rfqResponses.rfqId, rfqs.id))
            .leftJoin(tenderInfos, eq(rfqs.tenderId, tenderInfos.id))
            .where(eq(rfqResponses.rfqId, rfqId))
            .orderBy(desc(rfqResponses.createdAt));
        return rows;
    }

    async findById(responseId: number) {
        const [row] = await this.db
            .select({
                id: rfqResponses.id,
                rfqId: rfqResponses.rfqId,
                vendorId: rfqResponses.vendorId,
                vendorName: vendorOrganizations.name,
                receiptDatetime: rfqResponses.receiptDatetime,
                gstPercentage: rfqResponses.gstPercentage,
                gstType: rfqResponses.gstType,
                deliveryTime: rfqResponses.deliveryTime,
                freightType: rfqResponses.freightType,
                notes: rfqResponses.notes,
                createdAt: rfqResponses.createdAt,
                updatedAt: rfqResponses.updatedAt,
            })
            .from(rfqResponses)
            .leftJoin(vendors, eq(rfqResponses.vendorId, vendors.id))
            .leftJoin(vendorOrganizations, eq(vendors.orgId, vendorOrganizations.id))
            .where(eq(rfqResponses.id, responseId));
        if (!row) {
            throw new NotFoundException(`RFQ response with ID ${responseId} not found`);
        }
        const items = await this.db.select().from(rfqResponseItems).where(eq(rfqResponseItems.rfqResponseId, responseId));
        const documents = await this.db.select().from(rfqResponseDocuments).where(eq(rfqResponseDocuments.rfqResponseId, responseId));
        const rfqDetails = await this.rfqsService.findById(row.rfqId);
        return {
            ...row,
            items: items.map(i => ({
                id: i.id,
                rfqResponseId: i.rfqResponseId,
                rfqItemId: i.rfqItemId,
                requirement: i.requirement,
                unit: i.unit,
                qty: i.qty,
                unitPrice: i.unitPrice,
                totalPrice: i.totalPrice,
                createdAt: i.createdAt,
            })),
            documents: documents.map(d => ({
                id: d.id,
                rfqResponseId: d.rfqResponseId,
                docType: d.docType,
                path: d.path,
                metadata: d.metadata,
                createdAt: d.createdAt,
            })),
            rfq: rfqDetails ?? undefined,
        };
    }
}
