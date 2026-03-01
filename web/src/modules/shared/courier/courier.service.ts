// src/api/courier.api.ts
import api from "@/lib/axios";
import type {
    Courier,
    CourierDetails,
    CreateCourierInput,
    UpdateCourierInput,
    UpdateStatusInput,
    UpdateDispatchInput,
    CourierDashboardData,
    CreateDispatchInput,
} from "@/modules/shared/courier/courier.types";

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
        console.log("Fetched dashboard data:", response.data);
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

    getByIdWithDetails: async (id: number): Promise<CourierDetails> => {
        const response = await api.get(`${ENDPOINT}/${id}/details`);
        return response.data;
    },

    // Create courier
    create: async ({ data, files }: { data: CreateCourierInput; files: File[] }): Promise<Courier> => {
        console.log("Sending dto from frontend", { data: data });
        const formData = new FormData();

        // Append form fields
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, String(value));
            }
        });

        // Append files
        files.forEach(file => {
            formData.append("courierDocs[]", file);
        });

        console.log("Sending data from frontend", { data: formData });

        const response = await api.post(ENDPOINT, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        return response.data;
    },

    // Update courier
    update: async (id: number, data: UpdateCourierInput): Promise<Courier> => {
        const response = await api.put(`${ENDPOINT}/${id}`, data);
        return response.data;
    },

    // Update status
    updateStatus: async (id: number, data: UpdateStatusInput): Promise<Courier> => {
        console.log("Updating status with data:", data);
        const response = await api.patch(`${ENDPOINT}/${id}/status`, data, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },

    // Create dispatch info
    createDispatch: async (id: number, data: CreateDispatchInput): Promise<Courier> => {
        console.log("Creating dispatch with data:", data);
        const formData = new FormData();

        formData.append("courierProvider", data.courierProvider);
        formData.append("docketNo", data.docketNo);
        formData.append("pickupDate", data.pickupDate);

        if (data.docketSlip) {
            formData.append("docketSlip", data.docketSlip);
        }

        const response = await api.post(`${ENDPOINT}/${id}/dispatch`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        console.log("Dispatch created, response data:", response.data);

        return response.data;
    },

    // Update dispatch info
    // updateDispatch: async (id: number, data: UpdateDispatchInput): Promise<Courier> => {
    //     const response = await api.patch(`${ENDPOINT}/${id}/dispatch`, data);
    //     return response.data;
    // },

    // Delete courier
    delete: async (id: number): Promise<{ success: boolean }> => {
        const response = await api.delete(`${ENDPOINT}/${id}`);
        return response.data;
    },

    // Upload documents
    uploadDocs: async (id: number, files: File[]): Promise<Courier> => {
        const formData = new FormData();
        files.forEach(file => formData.append("courierDocs[]", file));

        const response = await api.post(`${ENDPOINT}/${id}/upload`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    // Upload delivery POD
    uploadDeliveryPod: async (id: number, file: File): Promise<Courier> => {
        const formData = new FormData();
        formData.append("deliveryPod", file);

        const response = await api.post(`${ENDPOINT}/${id}/upload-pod`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },
};
