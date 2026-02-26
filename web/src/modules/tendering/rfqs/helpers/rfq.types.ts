import type { RfqFormValues } from './rfq.schema';
import type { TimerStatus } from '@/modules/tendering/tenders/helpers/tenderInfo.types';

/**
 * Props for RfqForm component
 */
export interface RfqFormProps {
    tenderData: RfqDashboardRow; // Contains tenderNo, tenderName, rfqTo, etc.
    initialData?: Rfq; // For Edit Mode
}

export interface RfqDashboardRow {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    itemName: string;
    rfqTo: string;
    teamMemberName: string;
    status?: number;
    statusName?: string;
    dueDate: Date;
    rfqId: number | null;
    rfqCount?: number;
    responseCount?: number;
}

export interface RfqDashboardRowWithTimer extends RfqDashboardRow {
    vendorOrganizationNames: string | null;
    timer?: {
        remainingSeconds: number;
        status: TimerStatus;
        stepName: string;
    } | null;
}

export type RfqDashboardFilters = {
    tab?: 'pending' | 'sent' | 'rfq-rejected' | 'tender-dnb' | 'responses';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    teamId?: number;
};

export interface Rfq {
    id: number;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    itemName: string;
    rfqTo: string;
    teamMemberName: string;
    statusName: string;
    dueDate: Date;
    rfqId: number | null;
    requestedVendor: string | null;
    items: RfqItem[];
    documents: RfqDocument[];
    docList: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface RfqItem {
    id: number;
    rfqId: number;
    requirement: string;
    unit: string | null;
    qty: string | null;
}

export interface RfqDocument {
    id: number;
    rfqId: number;
    docType: string;
    path: string;
    metadata: any;
}

export interface CreateRfqDto {
    tenderId: number;
    dueDate?: string;
    docList?: string;
    requestedVendor?: string;
    items: Array<{
        requirement: string;
        unit?: string;
        qty?: number;
    }>;
    documents?: Array<{
        docType: string;
        path: string;
        metadata?: any;
    }>;
}

export interface UpdateRfqDto {
    dueDate?: string;
    docList?: string;
    requestedVendor?: string;
    items?: Array<{
        requirement: string;
        unit?: string;
        qty?: number;
    }>;
}

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

// Re-export form value types
export type { RfqFormValues };

export interface RfqDashboardCounts {
    pending: number;
    sent: number;
    "rfq-rejected": number;
    "tender-dnb": number;
    responses: number;
    total: number;
}
