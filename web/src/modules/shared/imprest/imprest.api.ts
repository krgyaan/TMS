// src/modules/imprest/imprest.api.ts
import api from "@/lib/axios";
import type { ImprestRow, ImprestVoucherRow, ImprestVoucherView } from "./imprest.types";
// ---------- GET LIST ----------
export const getMyImprests = async (): Promise<ImprestRow[]> => {
    const res = await api.get("/employee-imprest");
    console.log(res);
    return res.data;
};
// ---------- GET LIST ----------
export const getUserImprests = async (userId: number): Promise<ImprestRow[]> => {
    const res = await api.get(`/employee-imprest/user/${userId}`);
    console.log(res);
    return res.data;
};

// ---------- CREATE ----------
export interface CreateImprestInput {
    party_name?: string | null;
    project_name?: string | null;
    amount: number;
    category?: string | null;
    team_id?: number | null;
    remark?: string | null;
}

export const createImprest = async (data: CreateImprestInput) => {
    const res = await api.post("/employee-imprest", data);
    return res.data;
};

// ---------- UPDATE ----------
export const updateImprest = async (id: number, data: Partial<ImprestRow>) => {
    const res = await api.patch(`/employee-imprest/${id}`, data);
    return res.data;
};

// ---------- DELETE ----------
export const deleteImprest = async (id: number) => {
    const res = await api.delete(`/employee-imprest/${id}`);
    return res.data;
};

// ---------- UPLOAD PROOFS ----------
export const uploadImprestProofs = async (id: number, files: File[]) => {
    const form = new FormData();
    files.forEach(f => form.append("invoice_proof[]", f));
    console.log("THIS IS A TEST");
    const res = await api.post(`/employee-imprest/${id}/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
};

// ---------- LIST ----------
export const getImprestVouchers = async ({ userId }: { userId?: number }): Promise<ImprestVoucherRow[]> => {
    const url = userId ? `/accounts/imprest/voucher/${userId}` : `/accounts/imprest/voucher`;

    const res = await api.get(url);
    return res.data.data;
};
// ---------- DETAIL ----------
export const getImprestVoucherById = async (id: number): Promise<ImprestVoucherView> => {
    const res = await api.get(`/accounts/imprest/voucher/view/${id}`);
    return res.data;
};

// ---------- ACCOUNT APPROVE ----------
export const accountApproveVoucher = async (payload: { id: number; remark?: string; approve: boolean }) => {
    const { id, ...body } = payload;
    const res = await api.post(`/imprest-vouchers/${id}/account-approve`, body);
    return res.data;
};

// ---------- ADMIN APPROVE ----------
export const adminApproveVoucher = async (payload: { id: number; remark?: string; approve: boolean }) => {
    const { id, ...body } = payload;
    const res = await api.post(`/imprest-vouchers/${id}/admin-approve`, body);
    return res.data;
};
