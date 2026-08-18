export type ClientDirectoryAddress = {
    personal?: string | null;
    official?: string | null;
};

export type ClientDirectoryRemark = {
    text: string;
    by: string;
    byId: number;
    at: string;
};

export type GiftingTier = 'T0' | 'T1' | 'T2' | 'T3' | 'T4';

export type ClientDirectoryRow = {
    id: number;
    name: string;
    designation: string | null;
    address: ClientDirectoryAddress | null;
    email: string | null;
    phone: string | null;
    organization: string | null;
    giftingTier: GiftingTier | null;
    remarks: ClientDirectoryRemark[] | null;
    createdAt: string;
    updatedAt: string;
};

export type ClientDirectoryListParams = {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export type CreateClientDirectoryDto = {
    name: string;
    designation?: string | null;
    address?: ClientDirectoryAddress | null;
    email?: string | null;
    phone?: string | null;
    organization?: string | null;
    giftingTier?: GiftingTier | null;
    remarks?: string[];
};

export type UpdateClientDirectoryDto = Partial<CreateClientDirectoryDto>;
