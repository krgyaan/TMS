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
    tab?: 'pending' | 'sent' | 'rfq-rejected' | 'tender-dnb';
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
    total: number;
}
