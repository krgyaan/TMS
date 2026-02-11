// imprest-admin.api.ts
import api from "@/lib/axios"; // your axios/fetch wrapper
import type { CreateImprestCreditPayload, ImprestPaymentHistoryRow } from "./imprest-admin.types";

export const getEmployeeImprestSummary = async () => {
    console.log("Fetching Employee Imprest Summary...");
    const res = await api.get("/accounts/imprest");
    console.log("Imprest Summary Response:", res.data);
    return res.data;
};

export const getImprestPaymentHistory = async (userId: number): Promise<ImprestPaymentHistoryRow[]> => {
    const { data } = await api.get(`/accounts/imprest/payment-history/${userId}`);
    console.log(`Payment History for User ${userId}:`, data);
    return data;
};

export const deleteImprestPaymentHistory = async (id: number): Promise<{ success: boolean }> => {
    const { data } = await api.delete(`/accounts/imprest/payment-history/${id}`);
    return data;
};

export const createImprestCredit = async (payload: CreateImprestCreditPayload): Promise<{ success: boolean }> => {
    const { data } = await api.post(`/accounts/imprest/credit`, payload);

    console.log("data call made for credit", { data });
    return data;
};
