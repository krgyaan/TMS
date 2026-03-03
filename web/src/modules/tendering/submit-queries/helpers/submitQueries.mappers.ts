import type { SubmitQueryFormValues, QueryItemValues, ClientContactValues } from './submitQueries.schema';
import type {
    SubmitQueryResponse,
    SubmitQueryListRow,
    CreateSubmitQueryPayload,
    UpdateSubmitQueryPayload
} from './submitQueries.types';

// Default empty query item
export const defaultQueryItem: QueryItemValues = {
    pageNo: '',
    clauseNo: '',
    queryType: 'technical',
    currentStatement: '',
    requestedStatement: '',
};

// Default empty client contact
export const defaultClientContact: ClientContactValues = {
    org: '',
    name: '',
    email: '',
    phone: '',
    ccEmails: [],
};

// Build default values for new form
export function buildDefaultValues(tenderId?: number): SubmitQueryFormValues {
    return {
        tenderId: tenderId ?? 0,
        queries: [{ ...defaultQueryItem }],
        clientContacts: [{ ...defaultClientContact }],
    };
}

// Map API response to form values
export function mapResponseToForm(data: SubmitQueryResponse | SubmitQueryListRow): SubmitQueryFormValues {
    return {
        tenderId: data.tenderId,
        queries: data.queries.map(q => ({
            pageNo: q.pageNo,
            clauseNo: q.clauseNo,
            queryType: q.queryType,
            currentStatement: q.currentStatement,
            requestedStatement: q.requestedStatement,
        })),
        clientContacts: data.clientContacts.map(c => ({
            org: c.org,
            name: c.name,
            email: c.email,
            phone: c.phone,
            ccEmails: c.ccEmails ?? [],
        })),
    };
}

// Map form values to create payload
export function mapFormToCreatePayload(values: SubmitQueryFormValues): CreateSubmitQueryPayload {
    return {
        tenderId: values.tenderId,
        queries: values.queries.map(q => ({
            pageNo: q.pageNo,
            clauseNo: q.clauseNo,
            queryType: q.queryType,
            currentStatement: q.currentStatement,
            requestedStatement: q.requestedStatement,
        })),
        clientContacts: values.clientContacts.map(c => ({
            org: c.org,
            name: c.name,
            email: c.email,
            phone: c.phone ?? '',
            ccEmails: c.ccEmails?.filter(email => email.trim() !== '') ?? [],
        })),
    };
}

// Map form values to update payload
export function mapFormToUpdatePayload(id: number, values: SubmitQueryFormValues): UpdateSubmitQueryPayload {
    return mapFormToCreatePayload(values);
}

// Map tender clients to form client contacts (for pre-populating)
export function mapTenderClientsToFormClients(tenderClients: any[]): ClientContactValues[] {
    if (!tenderClients || tenderClients.length === 0) {
        return [{ ...defaultClientContact }];
    }

    return tenderClients.map(client => ({
        org: client.org || client.organization || '',
        name: client.name || client.contactName || '',
        email: client.email || '',
        phone: client.phone || '',
        ccEmails: [],
    }));
}
