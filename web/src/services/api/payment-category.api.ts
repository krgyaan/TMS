import { BaseApiService } from './base.service';

export type PaymentCategoryStatus = 'active' | 'inactive';

export interface PaymentCategory {
    id: number;
    purpose: string;
    category: string;
    subCategory: string | null;
    status: PaymentCategoryStatus;
    createdBy: number;
    createdAt: string;
    updatedAt: string;
}

export interface PaymentCategoryListParams {
    purpose?: string;
    status?: PaymentCategoryStatus;
    q?: string;
}

export interface CreatePaymentCategoryDto {
    purpose?: string;
    category: string;
    subCategory?: string | null;
    status?: PaymentCategoryStatus;
}

class PaymentCategoryApiService extends BaseApiService {
    constructor() {
        super('/payment-categories');
    }

    async getAll(params?: PaymentCategoryListParams): Promise<PaymentCategory[]> {
        const search = new URLSearchParams();
        if (params?.purpose) search.set('purpose', params.purpose);
        if (params?.status) search.set('status', params.status);
        if (params?.q) search.set('q', params.q);

        const queryString = search.toString();
        return this.get<PaymentCategory[]>(queryString ? `?${queryString}` : '');
    }

    async getById(id: number): Promise<PaymentCategory> {
        return this.get<PaymentCategory>(`/${id}`);
    }

    async create(data: CreatePaymentCategoryDto): Promise<PaymentCategory> {
        return this.post<PaymentCategory>('', data);
    }
}

export const paymentCategoryService = new PaymentCategoryApiService();
