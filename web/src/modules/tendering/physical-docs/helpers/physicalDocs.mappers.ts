import type {
    PhysicalDocsFormValues,
    PhysicalDocsResponse,
    CreatePhysicalDocsDto,
    UpdatePhysicalDocsDto,
    PhysicalDocsPerson,
} from './physicalDocs.types';
import type { TenderInfoSheetResponse } from '@/modules/tendering/info-sheet/helpers/tenderInfoSheet.types';

// Build default values (for create mode)
export const buildDefaultValues = (
    tenderId: number,
    infoSheet?: TenderInfoSheetResponse | null
): PhysicalDocsFormValues => {
    // Pre-fill persons from info sheet clients if available
    const personsFromClients: PhysicalDocsPerson[] = infoSheet?.clients?.length
        ? infoSheet.clients.map(client => ({
            name: client.clientName || '',
            email: client.clientEmail || '',
            phone: client.clientMobile || '',
        }))
        : [];

    return {
        tenderId,
        courierNo: undefined as unknown as number,
        submittedDocs: [],
        physicalDocsPersons: personsFromClients.length > 0
            ? personsFromClients
            : [],
    };
};

// Map API response to form values (for edit mode)
export const mapResponseToForm = (
    tenderId: number,
    existingData: PhysicalDocsResponse | null,
    infoSheet?: TenderInfoSheetResponse | null
): PhysicalDocsFormValues => {
    if (!existingData) {
        return buildDefaultValues(tenderId, infoSheet);
    }

    // Parse submittedDocs from JSON array string (e.g., '["2"]') or comma-separated string (legacy)
    let submittedDocsArray: string[] = [];
    if (existingData.submittedDocs) {
        try {
            // Try parsing as JSON array first
            const parsed = JSON.parse(existingData.submittedDocs);
            if (Array.isArray(parsed)) {
                submittedDocsArray = parsed.filter(Boolean);
            } else {
                // Fallback to comma-separated string (legacy format)
                submittedDocsArray = existingData.submittedDocs.split(',').filter(Boolean);
            }
        } catch {
            // If JSON parsing fails, treat as comma-separated string (legacy format)
            submittedDocsArray = existingData.submittedDocs.split(',').filter(Boolean);
        }
    }

    return {
        tenderId,
        courierNo: existingData.courierNo,
        submittedDocs: submittedDocsArray,
        physicalDocsPersons: existingData.persons?.map(person => ({
            name: person.name,
            email: person.email,
            phone: person.phone,
        })) || [],
    };
};

// Map form values to Create DTO
export const mapFormToCreatePayload = (values: PhysicalDocsFormValues): CreatePhysicalDocsDto => {
    return {
        tenderId: values.tenderId,
        courierNo: values.courierNo,
        submittedDocs: JSON.stringify(values.submittedDocs),
        physicalDocsPersons: values.physicalDocsPersons.map(person => ({
            name: person.name,
            email: person.email || '',
            phone: person.phone || '',
        })),
    };
};

// Map form values to Update DTO
export const mapFormToUpdatePayload = (
    id: number,
    values: PhysicalDocsFormValues
): UpdatePhysicalDocsDto => {
    return {
        id,
        courierNo: values.courierNo,
        submittedDocs: JSON.stringify(values.submittedDocs),
        physicalDocsPersons: values.physicalDocsPersons.map(person => ({
            name: person.name,
            email: person.email || '',
            phone: person.phone || '',
        })),
    };
};
