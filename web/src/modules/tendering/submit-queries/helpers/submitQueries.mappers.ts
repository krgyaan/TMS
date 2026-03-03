import type { TenderClient } from "@/types/api.types";
import type { Client, SubmitQueryListRow, SubmitQueryResponse } from "./submitQueries.types";
import type { SubmitQueriesFormValues } from "./submitQueries.schema";

// Build default values (for create mode)
export const buildDefaultValues = (tenderId?: number): SubmitQueriesFormValues => {
    return {
        tenderId: tenderId || 0,
        clients: [],
        queries: [],
    };
};

// Map tender clients to form clients (for create mode)
export const mapTenderClientsToFormClients = (tenderClients: TenderClient[]): Client[] => {
  return tenderClients.map((tc) => ({
    org: '',
    name: tc.clientName,
    email: tc.clientEmail ?? '',
    phone: tc.clientMobile ?? '',
  }));
};

// Map form values to Create DTO
export const mapResponseToForm = (
  response: SubmitQueryResponse | SubmitQueryListRow
): SubmitQueriesFormValues => ({
  tenderId: response.tenderId,
  queries: response.queries.map((query) => ({
    pageNo: query.pageNo,
    clauseNo: query.clauseNo,
    queryType: query.queryType,
    currentStatement: query.currentStatement,
    requestedStatement: query.requestedStatement,
  })),
  clients: response.clients.map((client) => ({
    org: client.org,
    name: client.name,
    email: client.email,
    phone: client.phone || '', // Ensure phone is always a string
  })),
});

export const mapFormToCreatePayload = (values: SubmitQueriesFormValues) => ({
  tenderId: values.tenderId,
  queries: values.queries.map((query) => ({
    pageNo: query.pageNo,
    clauseNo: query.clauseNo,
    queryType: query.queryType,
    currentStatement: query.currentStatement,
    requestedStatement: query.requestedStatement,
  })),
  clients: values.clients.map((client) => ({
    org: client.org,
    name: client.name,
    email: client.email,
    phone: client.phone || '', // Ensure phone is always a string
  })),
});

export const mapFormToUpdatePayload = (id: number, values: SubmitQueriesFormValues) => ({
  id,
  queries: values.queries.map((query) => ({
    pageNo: query.pageNo,
    clauseNo: query.clauseNo,
    queryType: query.queryType,
    currentStatement: query.currentStatement,
    requestedStatement: query.requestedStatement,
  })),
  clients: values.clients.map((client) => ({
    org: client.org,
    name: client.name,
    email: client.email,
    phone: client.phone || '', // Ensure phone is always a string
  })),
});
