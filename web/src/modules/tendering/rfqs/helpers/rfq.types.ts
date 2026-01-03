import type { RfqFormValues } from './rfq.schema';

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
    status: number;
    statusName: string;
    latestStatus: number | null;
    latestStatusName: string | null;
    statusRemark: string | null;
    dueDate: Date;
    rfqId: number | null;
    vendorOrganizationNames: string | null;
}

export type RfqDashboardFilters = {
    tab?: 'pending' | 'sent' | 'rfq-rejected' | 'tender-dnb';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
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

// Re-export form value types
export type { RfqFormValues };
