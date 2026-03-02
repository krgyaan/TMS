import type { TenderClient } from '@/types/api.types';
import type { RequestExtensionFormValues } from './requestExtension.schema';
import type { Client, RequestExtensionListRow, RequestExtensionResponse } from './requestExtension.types';
// Build default values (for create mode)
export const buildDefaultValues = (tenderId?: number): RequestExtensionFormValues => {
    return {
        tenderId: tenderId || 0,
        days: 0,
        reason: '',
        clients: [],
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
  response: RequestExtensionResponse | RequestExtensionListRow
): RequestExtensionFormValues => ({
  tenderId: response.tenderId,
  days: response.days,
  reason: response.reason,
  clients: response.clients.map((client) => ({
    org: client.org,
    name: client.name,
    email: client.email,
    phone: client.phone || '', // Ensure phone is always a string
  })),
});

export const mapFormToCreatePayload = (values: RequestExtensionFormValues) => ({
  tenderId: values.tenderId,
  days: values.days,
  reason: values.reason,
  clients: values.clients.map((client) => ({
    org: client.org,
    name: client.name,
    email: client.email,
    phone: client.phone || '', // Ensure phone is always a string
  })),
});

export const mapFormToUpdatePayload = (id: number, values: RequestExtensionFormValues) => ({
  id,
  days: values.days,
  reason: values.reason,
  clients: values.clients.map((client) => ({
    org: client.org,
    name: client.name,
    email: client.email,
    phone: client.phone || '', // Ensure phone is always a string
  })),
});
