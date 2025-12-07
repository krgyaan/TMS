import axiosInstance from '@/lib/axios';
import type { TenderDocumentChecklistDashboardRow } from '@/types/api.types';

export type ExtraDocument = {
    name: string;
    path?: string;
};

export type TenderDocumentChecklist = {
    id: number;
    tenderId: number;
    selectedDocuments: string[] | null;
    extraDocuments: ExtraDocument[] | null;
    submittedBy: number | null;
    createdAt: Date;
    updatedAt: Date;
};

export type CreateDocumentChecklistDto = {
    tenderId: number;
    selectedDocuments?: string[];
    extraDocuments?: ExtraDocument[];
};

export type UpdateDocumentChecklistDto = {
    id: number;
    selectedDocuments?: string[];
    extraDocuments?: ExtraDocument[];
};

export const documentChecklistService = {
    getAll: async (): Promise<TenderDocumentChecklistDashboardRow[]> => {
        const response = await axiosInstance.get<TenderDocumentChecklistDashboardRow[]>('/document-checklists');
        return response.data;
    },


    getByTenderId: async (tenderId: number): Promise<TenderDocumentChecklist | null> => {
        const response = await axiosInstance.get<TenderDocumentChecklist>(
            `/document-checklists/tender/${tenderId}`
        );
        return response.data;
    },

    create: async (data: CreateDocumentChecklistDto): Promise<TenderDocumentChecklist> => {
        const response = await axiosInstance.post<TenderDocumentChecklist>('/document-checklists', data);
        return response.data;
    },

    update: async (data: UpdateDocumentChecklistDto): Promise<TenderDocumentChecklist> => {
        const { id, ...updateData } = data;
        const response = await axiosInstance.patch<TenderDocumentChecklist>(
            `/document-checklists/${id}`,
            updateData
        );
        return response.data;
    },
};
