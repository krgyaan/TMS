// src/modules/accounts/checklist/checklist.service.ts

import api from "@/lib/axios";
import type {
    Checklist,
    ChecklistIndexData,
    CreateChecklistInput,
    UpdateChecklistInput,
    ResponsibilityRemarkInput,
    AccountabilityRemarkInput,
    GetTasksInput,
    DayResult,
} from "./task-checklist.types";

const ENDPOINT = "/accounts/checklists";

export const checklistApi = {
    // Get index data (all checklists + user tasks)
    getIndexData: async (): Promise<ChecklistIndexData> => {
        const response = await api.get(ENDPOINT);
        console.log("API endpoint called ")
        return response.data;
    },

    // Get all checklists (simple list)
    getAll: async (): Promise<Checklist[]> => {
        const response = await api.get(`${ENDPOINT}/all`);
        return response.data;
    },

    // Get single checklist
    getById: async (id: number): Promise<Checklist> => {
        const response = await api.get(`${ENDPOINT}/${id}`);
        return response.data;
    },

    // Create checklist
    create: async (data: CreateChecklistInput): Promise<Checklist> => {
        const response = await api.post(ENDPOINT, data);
        return response.data;
    },

    // Update checklist
    update: async (id: number, data: UpdateChecklistInput): Promise<Checklist> => {
        const response = await api.put(`${ENDPOINT}/${id}`, data);
        return response.data;
    },

    // Delete checklist
    delete: async (id: number): Promise<{ success: boolean }> => {
        const response = await api.delete(`${ENDPOINT}/${id}`);
        return response.data;
    },

    // Store responsibility remark
    storeResponsibilityRemark: async (id: number, data: ResponsibilityRemarkInput, file?: File): Promise<any> => {
        const formData = new FormData();
        formData.append("respRemark", data.respRemark);
        if (file) {
            formData.append("resp_result_file", file);
        }

        const response = await api.post(`${ENDPOINT}/reports/${id}/responsibility-remark`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    // Store accountability remark
    storeAccountabilityRemark: async (id: number, data: AccountabilityRemarkInput, file?: File): Promise<any> => {
        const formData = new FormData();
        formData.append("accRemark", data.accRemark);
        if (file) {
            formData.append("acc_result_file", file);
        }

        const response = await api.post(`${ENDPOINT}/reports/${id}/accountability-remark`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    // Get tasks for report
    getTasks: async (params: GetTasksInput): Promise<{ [date: string]: DayResult }> => {
        const response = await api.get(`${ENDPOINT}/reports/tasks`, { params });
        return response.data;
    },
};