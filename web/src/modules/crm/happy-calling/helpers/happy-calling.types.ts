export type HappyCallingStatus = string;

export type HappyCallingRow = {
    id: number;
    cDId: number | null;
    organization: string | null;
    name: string;
    designation: string | null;
    email: string | null;
    phone: string | null;
    status: string | null;
    broadcast: number;
    details: string | null;
    createdBy: number | null;
    createdByName?: string | null;
    createdAt: string;
    updatedAt: string;
};

export type HappyCallingListParams = {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export type CreateHappyCallingDto = {
    cDId?: number | null;
    organization?: string | null;
    name: string;
    designation?: string | null;
    email?: string | null;
    phone?: string | null;
    status?: string | null;
    broadcast?: number;
    details?: string | null;
};

export type UpdateHappyCallingDto = Partial<CreateHappyCallingDto>;

export type BroadcastRow = {
    id: number;
    name: string;
    createdAt: string;
    updatedAt: string;
};