import axiosInstance from '@/lib/axios';
import type { PhysicalDocs, PhysicalDocsDashboardRow, CreatePhysicalDocsDto, UpdatePhysicalDocsDto } from '@/types/api.types';

export const physicalDocsService = {
    getAll: async (): Promise<PhysicalDocsDashboardRow[]> => {
        const response = await axiosInstance.get<PhysicalDocsDashboardRow[]>('/physical-docs');
        return response.data;
    },

    getById: async (id: number): Promise<PhysicalDocs | null> => {
        const response = await axiosInstance.get<PhysicalDocs>(`/physical-docs/${id}`);
        return response.data;
    },

    getByTenderId: async (tenderId: number): Promise<PhysicalDocs | null> => {
        const response = await axiosInstance.get<PhysicalDocs>(`/physical-docs/by-tender/${tenderId}`);
        return response.data;
    },

    create: async (data: CreatePhysicalDocsDto): Promise<PhysicalDocs> => {
        const response = await axiosInstance.post<PhysicalDocs>(`/physical-docs`, data);
        return response.data;
    },

    update: async (id: number, data: UpdatePhysicalDocsDto): Promise<PhysicalDocs> => {
        const response = await axiosInstance.patch<PhysicalDocs>(`/physical-docs/${id}`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await axiosInstance.delete(`/physical-docs/${id}`);
    },
};
