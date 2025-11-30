import { BaseApiService } from './base.service';

type DashboardFilters = {
    tab?: 'pending' | 'sent' | 'approved' | 'rejected' | 'returned' | 'all';
    userId?: number;
};

interface DashboardRow {
    id: number | null;
    type: 'request' | 'missing';
    purpose: 'EMD' | 'Tender Fee' | 'Processing Fee';
    amountRequired: string;
    status: string;
    instrumentType: string | null;
    instrumentStatus: string | null;
    createdAt: string | null;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    dueDate: string | null;
    teamMemberId: number | null;
    teamMemberName: string | null;
    requestedBy: string | null;
}

interface DashboardCounts {
    pending: number;
    sent: number;
    approved: number;
    rejected: number;
    returned: number;
    total: number;
}

interface DashboardResponse {
    data: DashboardRow[];
    counts: DashboardCounts;
}

type CreatePaymentRequestDto = {
    emdMode?: string;
    emd?: any;
    tenderFeeMode?: string;
    tenderFee?: any;
    processingFeeMode?: string;
    processingFee?: any;
};

type UpdatePaymentRequestDto = CreatePaymentRequestDto;

type UpdateStatusDto = {
    status: string;
    remarks?: string;
};

class EmdsService extends BaseApiService {
    constructor() {
        super('/emds');
    }

    // Dashboard endpoints
    async getDashboard(filters?: DashboardFilters): Promise<DashboardResponse> {
        const params = new URLSearchParams();
        if (filters?.tab) params.append('tab', filters.tab);
        if (filters?.userId) params.append('userId', filters.userId.toString());
        const query = params.toString();
        return this.get<DashboardResponse>(`/dashboard${query ? `?${query}` : ''}`);
    }

    async getDashboardCounts(): Promise<DashboardCounts> {
        return this.get<DashboardCounts>('/dashboard/counts');
    }

    // Existing endpoints
    async create(tenderId: number, data: CreatePaymentRequestDto) {
        return this.post<any[], CreatePaymentRequestDto>(`/tenders/${tenderId}`, data);
    }

    async getByTenderId(tenderId: number) {
        return this.get<any[]>(`/tenders/${tenderId}`);
    }

    async getById(id: number) {
        return this.get<any>(`/${id}`);
    }

    async update(id: number, data: UpdatePaymentRequestDto) {
        return this.patch<any, UpdatePaymentRequestDto>(`/${id}`, data);
    }

    async updateStatus(id: number, data: UpdateStatusDto) {
        return this.patch<any, UpdateStatusDto>(`/${id}/status`, data);
    }
}

export const emdsService = new EmdsService();
export type { DashboardRow, DashboardCounts, DashboardResponse };
