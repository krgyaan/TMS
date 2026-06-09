export type ClientDirectoryRow = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    organization: string | null;
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
    email?: string | null;
    phone?: string | null;
    organization?: string | null;
};

export type UpdateClientDirectoryDto = Partial<CreateClientDirectoryDto>;
