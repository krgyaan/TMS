import { z } from 'zod';
import { PhysicalDocsFormSchema } from './physicalDocs.schema';

// Form Values Type
export type PhysicalDocsFormValues = z.infer<typeof PhysicalDocsFormSchema>;

// Person type for form
export interface PhysicalDocsPerson {
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
    submittedDocs: string;
    physicalDocsPersons: PhysicalDocsPerson[];
}

// Update DTO
export interface UpdatePhysicalDocsDto {
    id: number;
    courierNo: number;
    submittedDocs: string;
    physicalDocsPersons: PhysicalDocsPerson[];
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
