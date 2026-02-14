// src/modules/imprest/imprest.api.ts
import api from "@/lib/axios";
import type { EmployeeImprestDashboard, ImprestRow, ImprestVoucherRow, ImprestVoucherView } from "./imprest.types";

/* ===================== IMPREST ===================== */

// ---------- GET MY IMPRESTS ----------
export const getMyImprests = async (): Promise<EmployeeImprestDashboard> => {
    const res = await api.get<EmployeeImprestDashboard>("/employee-imprest");

    console.log("Fetching my imprest dashboard");
    console.log("Dashboard response:", res.data);

    return res.data;
};

// ---------- GET USER IMPRESTS ----------
export const getUserImprests = async (userId: number): Promise<EmployeeImprestDashboard> => {
    const res = await api.get<EmployeeImprestDashboard>(`/employee-imprest/user/${userId}`);

    console.log("Fetching employee dashboard for userId:", userId);
    console.log("Dashboard response:", res.data);

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

export const createImprest = async ({ data, files }: { data: CreateImprestInput; files: File[] }) => {
    const formData = new FormData();

    // Append form fields
    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            formData.append(key, String(value));
        }
    });

    // Append files
    files.forEach(file => {
        formData.append("files", file);
    });

    for (const [key, value] of formData.entries()) {
        console.log("FD:", key, value);
    }

    const res = await api.post("/employee-imprest", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

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
    files.forEach(file => form.append("files", file));
    console.log("Data being sent from the frontend. Uploading proofs for imprest ID:", id, "with files:", files);
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
    const res = await api.get("/accounts/imprest/voucher", {
        params: userId ? { userId } : {},
    });

    // ✅ backend returns an array directly
    return Array.isArray(res.data) ? res.data : [];
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
