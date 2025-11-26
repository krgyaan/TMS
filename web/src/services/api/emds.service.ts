import { BaseApiService } from './base.service';

type PaymentRequestFilters = {
    status?: string;
};

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

    async create(tenderId: number, data: CreatePaymentRequestDto) {
        return this.post<any[], CreatePaymentRequestDto>(`/tenders/${tenderId}`, data);
    }

    async getAll(filters?: PaymentRequestFilters) {
        const params = new URLSearchParams();
        if (filters?.status) {
            params.append('status', filters.status);
        }
        const query = params.toString();
        return this.get<any[]>(query ? `?${query}` : '');
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
