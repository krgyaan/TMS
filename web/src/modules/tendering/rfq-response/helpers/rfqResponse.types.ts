import type { RfqItem, RfqDocument } from '@/modules/tendering/rfqs/helpers/rfq.types';

/** List row for GET /rfqs/:rfqId/responses or GET /rfqs/responses (all) */
export interface RfqResponseListItem {
    id: number;
    rfqId: number;
    vendorId: number;
    vendorName: string | null;
    receiptDatetime: string;
    tenderNo?: string | null;
    tenderName?: string | null;
    itemSummary?: string | null;
    dueDate?: string | null;
    tenderId?: number | null;
}

/** Item row within an RFQ response */
export interface RfqResponseItemRow {
    id: number;
    rfqResponseId: number;
    rfqItemId: number;
    requirement: string;
    unit: string | null;
    qty: string | null;
    unitPrice: string | null;
    totalPrice: string | null;
    createdAt: string;
}

/** Document row within an RFQ response */
export interface RfqResponseDocumentRow {
    id: number;
    rfqResponseId: number;
    docType: string;
    path: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

/** RFQ detail as returned inside RfqResponseDetail (parent RFQ table data) */
export interface RfqDetailForResponse {
    id: number;
    tenderId: number;
    dueDate: string | null;
    docList: string | null;
    requestedVendor: string | null;
    items: RfqItem[];
    documents: RfqDocument[];
}

/** Detail for GET /rfqs/responses/:responseId */
export interface RfqResponseDetail {
    id: number;
    rfqId: number;
    vendorId: number;
    vendorName: string | null;
    receiptDatetime: string;
    gstPercentage: string | null;
    gstType: string | null;
    deliveryTime: number | null;
    freightType: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    items: RfqResponseItemRow[];
    documents: RfqResponseDocumentRow[];
    /** Parent RFQ table data (header + items + documents) */
    rfq?: RfqDetailForResponse;
}

/** Request body for POST /rfqs/:rfqId/responses */
export interface CreateRfqResponseBodyDto {
    vendorId: number;
    receiptDatetime: string;
    gstPercentage?: number;
    gstType?: string;
    deliveryTime?: number;
    freightType?: string;
    notes?: string;
    items: Array<{
        itemId: number;
        requirement: string;
        unit?: string;
        qty?: number;
        unitPrice?: number;
        totalPrice?: number;
    }>;
    documents?: Array<{ docType: string; path: string; metadata?: any }>;
}
