export type HappyCallingStatus = 'pending' | 'done';

export type HappyCallingRow = {
    id: number;
    organization: string | null;
    name: string;
    designation: string | null;
    email: string | null;
    phone: string | null;
    date: string | null;
    status: HappyCallingStatus | null;
    nextFollowupDate: string | null;
    broadcast: number;
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

export type UpdateHappyCallingDto = Partial<{
    organization: string | null;
    name: string;
    designation: string | null;
    email: string | null;
    phone: string | null;
    date: string | null;
    status: HappyCallingStatus | null;
    nextFollowupDate: string | null;
    broadcast: number;
}>;

export type BroadcastRow = {
    id: number;
    name: string;
    createdAt: string;
    updatedAt: string;
};