// src/api/courier.api.ts
import api from "@/lib/axios";
import type { Courier, CreateCourierInput, UpdateCourierInput, UpdateStatusInput, UpdateDispatchInput, CourierDashboardData } from "@/types/courier.types";

const ENDPOINT = "/couriers";

export const courierApi = {
    // Get all couriers for logged-in user
    getMyCouriers: async (): Promise<Courier[]> => {
        const response = await api.get(ENDPOINT);
        return response.data;
    },

    // Get all couriers (admin)
    getAll: async (): Promise<Courier[]> => {
        const response = await api.get(`${ENDPOINT}/all`);
        return response.data;
    },

    // Get dashboard data (grouped by status)
    getDashboardData: async (): Promise<CourierDashboardData> => {
        const response = await api.get(`${ENDPOINT}/dashboard`);
        return response.data;
    },

    // Get couriers by status
    getByStatus: async (status: number): Promise<Courier[]> => {
        const response = await api.get(`${ENDPOINT}/status/${status}`);
        return response.data;
    },

    // Get single courier
    getById: async (id: number): Promise<Courier> => {
        const response = await api.get(`${ENDPOINT}/${id}`);
        return response.data;
    },

    // Create courier
    create: async (data: CreateCourierInput): Promise<Courier> => {
        const response = await api.post(ENDPOINT, data);
        return response.data;
    },

    // Update courier
    update: async (id: number, data: UpdateCourierInput): Promise<Courier> => {
        const response = await api.put(`${ENDPOINT}/${id}`, data);
        return response.data;
    },

    // Update status
    updateStatus: async (id: number, data: UpdateStatusInput): Promise<Courier> => {
        const response = await api.patch(`${ENDPOINT}/${id}/status`, data);
        return response.data;
    },

    // Update dispatch info
    updateDispatch: async (id: number, data: UpdateDispatchInput): Promise<Courier> => {
        const response = await api.patch(`${ENDPOINT}/${id}/dispatch`, data);
        return response.data;
    },

    // Delete courier
    delete: async (id: number): Promise<{ success: boolean }> => {
        const response = await api.delete(`${ENDPOINT}/${id}`);
        return response.data;
    },

    // Upload documents
    uploadDocs: async (id: number, files: File[]): Promise<Courier> => {
        const formData = new FormData();
        files.forEach(file => formData.append("courier_docs[]", file));

        const response = await api.post(`${ENDPOINT}/${id}/upload`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    // Upload delivery POD
    uploadDeliveryPod: async (id: number, file: File): Promise<Courier> => {
        const formData = new FormData();
        formData.append("delivery_pod", file);

        const response = await api.post(`${ENDPOINT}/${id}/upload-pod`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },
};
