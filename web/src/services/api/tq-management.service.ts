import axiosInstance from '@/lib/axios';
import type { TenderQuery } from '@/types/api.types';

export type TqManagementDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    bidSubmissionDate: Date | null;
    tqSubmissionDeadline: Date | null;
    tqStatus: 'TQ awaited' | 'TQ received' | 'TQ replied' | 'TQ missed' | 'No TQ';
    tqId: number | null;
    tqCount: number;
    bidSubmissionId: number | null;
};

export type CreateTqReceivedDto = {
    tenderId: number;
    tqSubmissionDeadline: string;
    tqDocumentReceived: string | null;
    tqItems: Array<{
        tqTypeId: number;
        queryDescription: string;
    }>;
};

export type UpdateTqRepliedDto = {
    repliedDatetime: string;
    repliedDocument: string | null;
    proofOfSubmission: string;
};

export type UpdateTqMissedDto = {
    missedReason: string;
    preventionMeasures: string;
    tmsImprovements: string;
};

export const tqManagementService = {
    getAll: async (): Promise<TqManagementDashboardRow[]> => {
        const response = await axiosInstance.get<TqManagementDashboardRow[]>('/tq-management');
        return response.data;
    },

    getById: async (id: number): Promise<TenderQuery> => {
        const response = await axiosInstance.get<TenderQuery>(`/tq-management/${id}`);
        return response.data;
    },

    getByTenderId: async (tenderId: number): Promise<TenderQuery[]> => {
        const response = await axiosInstance.get<TenderQuery[]>(`/tq-management/tender/${tenderId}`);
        return response.data;
    },

    getTqItems: async (id: number): Promise<any[]> => {
        const response = await axiosInstance.get(`/tq-management/${id}/items`);
        return response.data;
    },

    createTqReceived: async (data: CreateTqReceivedDto): Promise<TenderQuery> => {
        const response = await axiosInstance.post<TenderQuery>('/tq-management/received', data);
        return response.data;
    },

    updateTqReplied: async (id: number, data: UpdateTqRepliedDto): Promise<TenderQuery> => {
        const response = await axiosInstance.patch<TenderQuery>(`/tq-management/${id}/replied`, data);
        return response.data;
    },

    updateTqMissed: async (id: number, data: UpdateTqMissedDto): Promise<TenderQuery> => {
        const response = await axiosInstance.patch<TenderQuery>(`/tq-management/${id}/missed`, data);
        return response.data;
    },

    markAsNoTq: async (tenderId: number): Promise<TenderQuery> => {
        const response = await axiosInstance.post<TenderQuery>('/tq-management/no-tq', { tenderId });
        return response.data;
    },

    updateTqReceived: async (id: number, data: CreateTqReceivedDto): Promise<TenderQuery> => {
        const response = await axiosInstance.patch<TenderQuery>(`/tq-management/${id}/received`, data);
        return response.data;
    },
};
