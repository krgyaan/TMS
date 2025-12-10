import axiosInstance from '@/lib/axios';
import type { PhysicalDocs, PhysicalDocsDashboardRow, CreatePhysicalDocsDto, UpdatePhysicalDocsDto, PaginatedResult } from '@/types/api.types';

export const physicalDocsService = {
    getAll: async (params?: { physicalDocsSent?: boolean; page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<PaginatedResult<PhysicalDocsDashboardRow>> => {
        const searchParams = new URLSearchParams();

        if (params?.physicalDocsSent !== undefined) {
            searchParams.set('physicalDocsSent', String(params.physicalDocsSent));
        }
        if (params?.page) {
            searchParams.set('page', String(params.page));
        }
        if (params?.limit) {
            searchParams.set('limit', String(params.limit));
        }
        if (params?.sortBy) {
            searchParams.set('sortBy', params.sortBy);
        }
        if (params?.sortOrder) {
            searchParams.set('sortOrder', params.sortOrder);
        }

        const queryString = searchParams.toString();
        const url = queryString ? `/physical-docs?${queryString}` : '/physical-docs';
        const response = await axiosInstance.get<PaginatedResult<PhysicalDocsDashboardRow>>(url);
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
