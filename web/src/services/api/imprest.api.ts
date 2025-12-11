import api from "@/lib/axios";

export type ImprestRow = {
    id: number;
    user_id: number;
    party_name: string;
    project_name: string;
    amount: number;
    category: string;
    team_id: number;
    remark: string;
    invoice_proof: { url: string; name: string; type: string }[] | null;
    approval_status: number;
    tally_status: number;
    proof_status: number;
    status: number;
    approved_date: string | null;
    ip: string | null;
    strtotime: number | null;
    created_at: string;
    updated_at: string;
};

export type CreateImprestDto = {
    party_name: string;
    project_name: string;
    amount: number;
    category: string;
    team_id: number;
    remark: string;
};

export type UpdateImprestDto = Partial<CreateImprestDto>;

export const imprestApi = {
    // GET /employee-imprest - Get logged-in user's imprests
    getMyImprests: async (): Promise<ImprestRow[]> => {
        const response = await api.get("/employee-imprest");
        return response.data;
    },

    // GET /employee-imprest/:id - Get single imprest
    getOne: async (id: number): Promise<ImprestRow> => {
        const response = await api.get(`/employee-imprest/${id}`);
        return response.data;
    },

    // POST /employee-imprest - Create imprest
    create: async (data: CreateImprestDto): Promise<ImprestRow> => {
        const response = await api.post("/employee-imprest", data);
        return response.data;
    },

    // PUT /employee-imprest/:id - Update imprest
    update: async (id: number, data: UpdateImprestDto): Promise<ImprestRow> => {
        const response = await api.put(`/employee-imprest/${id}`, data);
        return response.data;
    },

    // DELETE /employee-imprest/:id - Delete imprest
    delete: async (id: number): Promise<{ success: boolean }> => {
        const response = await api.delete(`/employee-imprest/${id}`);
        return response.data;
    },
};
