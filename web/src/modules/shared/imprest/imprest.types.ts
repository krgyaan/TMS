// src/modules/imprest/imprest.types.ts

export interface ImprestProof {
    url: string;
    type: "image" | "pdf" | "doc" | string;
    name: string;
}

export interface ImprestRow {
    id: number;
    created_at: string;
    party_name: string | null;
    project_name: string | null;
    amount: number;
    category: string | null;
    team_id?: number | null;
    remark?: string | null;
    approval_status: number;
    invoice_proof?: ImprestProof[];
}
