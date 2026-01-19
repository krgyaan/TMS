import { z } from 'zod';
import { PhysicalDocsFormSchema } from './physicalDocs.schema';
import type { TimerStatus } from '@/modules/tendering/tenders/helpers/tenderInfo.types';

// Form Values Type
export type PhysicalDocsFormValues = z.infer<typeof PhysicalDocsFormSchema>;

// Person type for form
export interface PhysicalDocsPerson {
    id?: number;
    name: string;
    email: string;
    phone: string;
}

// Response from API - Physical Docs with Persons
export interface PhysicalDocsResponse {
    id: number;
    tenderId: number;
    courierNo: number;
    submittedDocs: string | null;
    persons: Array<{
        id: number;
        physicalDocId: number;
        name: string;
        email: string;
        phone: string;
        createdAt?: string;
        updatedAt?: string;
    }>;
    createdAt: string;
    updatedAt: string;
}

// Create DTO
export interface CreatePhysicalDocsDto {
    tenderId: number;
    courierNo: number;
    submittedDocs?: string;
    physicalDocsPersons?: Omit<PhysicalDocsPerson, "id">[];
}

// Update DTO
export interface UpdatePhysicalDocsDto {
    id: number;
    courierNo?: number;
    submittedDocs?: string;
    physicalDocsPersons?: Omit<PhysicalDocsPerson, "id">[];
}

export interface PhysicalDocs {
    id: number;
    tenderId: number;
    courierNo: number;
    submittedDocs: string | null;
    persons: PhysicalDocsPerson[];
    createdAt?: string;
    updatedAt?: string;
}

export interface PhysicalDocsListParams {
    physicalDocsSent?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
}

export interface PhysicalDocsDashboardRow {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    courierAddress: string;
    physicalDocsRequired: string;
    physicalDocsDeadline: Date;
    teamMemberName: string;
    status: number;
    statusName: string;
    latestStatus: number | null;
    latestStatusName: string | null;
    statusRemark: string | null;
    physicalDocs: number | null;
    courierNo: number | null;
    courierDate: Date | null;
}

export interface PhysicalDocsDashboardRowWithTimer extends PhysicalDocsDashboardRow {
    timer?: {
        remainingSeconds: number;
        status: TimerStatus;
        stepName: string;
    } | null;
}

export interface PhysicalDocWithPersons {
    id: number;
    tenderId: number;
    courierNo: number;
    submittedDocs: string | null;
    persons: PhysicalDocsPerson[];
}

export interface PhysicalDocsDashboardCounts {
    pending: number;
    sent: number;
    "tender-dnb": number;
    total: number;
}

// Constants - Courier Options
export const courierOptions = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
];

// Constants - Submitted Docs Options
export const submittedDocsOptions = [
    { value: 'technicalBid', label: 'Technical Bid' },
    { value: 'financialBid', label: 'Financial Bid' },
    { value: 'emd', label: 'EMD' },
    { value: 'other', label: 'Other' },
];
