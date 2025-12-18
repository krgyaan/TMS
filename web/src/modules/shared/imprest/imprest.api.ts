// src/modules/imprest/imprest.api.ts
import api from "@/lib/axios";
import type { ImprestRow, ImprestVoucherRow, ImprestVoucherView } from "./imprest.types";

/* ===================== IMPREST ===================== */

// ---------- GET MY IMPRESTS ----------
export const getMyImprests = async (): Promise<ImprestRow[]> => {
    const res = await api.get("/employee-imprest");
    return res.data;
};

// ---------- GET USER IMPRESTS ----------
export const getUserImprests = async (userId: number): Promise<ImprestRow[]> => {
    const res = await api.get(`/employee-imprest/user/${userId}`);
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

/* ---------- STATUS TOGGLES (Laravel parity) ---------- */

// APPROVE (buttonstatus)
export const approveImprest = async (id: number) => {
    const res = await api.post(`/employee-imprest/${id}/approve`);
    return res.data;
};

// TALLY (tallystatus)
export const tallyImprest = async (id: number) => {
    const res = await api.post(`/employee-imprest/${id}/tally`);
    return res.data;
};

// PROOF (proofstatus)
export const proofImprest = async (id: number) => {
    const res = await api.post(`/employee-imprest/${id}/proof-approve`);
    return res.data;
};

// ---------- ACCOUNT REMARK ----------
export const addImprestRemark = async (id: number, remark: string) => {
    const res = await api.post(`/employee-imprest/${id}/remark`, {
        remark,
    });
    return res.data;
};

/* ---------- UPLOAD PROOFS ---------- */
export const uploadImprestProofs = async (id: number, files: File[]) => {
    const form = new FormData();
    files.forEach(file => form.append("invoice_proof[]", file));

    const res = await api.post(`/employee-imprest/${id}/upload`, form, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return res.data;
};

/* ===================== VOUCHERS ===================== */

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
    const res = await api.post(`/accounts/imprest/voucher/${id}/account-approve`, body);
    return res.data;
};

// ---------- ADMIN APPROVE ----------
export const adminApproveVoucher = async (payload: { id: number; remark?: string; approve: boolean }) => {
    const { id, ...body } = payload;
    const res = await api.post(`/accounts/imprest/voucher/${id}/admin-approve`, body);
    return res.data;
};
