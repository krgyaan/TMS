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
    client_org: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    cc_emails: [],
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
            client_org: c.client_org,
            client_name: c.client_name,
            client_email: c.client_email,
            client_phone: c.client_phone,
            cc_emails: c.cc_emails ?? [],
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
            client_org: c.client_org,
            client_name: c.client_name,
            client_email: c.client_email,
            client_phone: c.client_phone ?? '',
            cc_emails: c.cc_emails?.filter(email => email.trim() !== '') ?? [],
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
        client_org: client.org || client.organization || '',
        client_name: client.name || client.contactName || '',
        client_email: client.email || '',
        client_phone: client.phone || '',
        cc_emails: [],
    }));
}
