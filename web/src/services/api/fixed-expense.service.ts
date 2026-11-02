import { BaseApiService } from './base.service';
import type {
    CreateFixedExpenseDto,
    FixedExpenseListParams,
    FixedExpenseListRow,
    FixedExpenseResponse,
    UpdateFixedExpenseDto,
} from '@/modules/accounts/fixed-expenses/helpers/fixedExpense.types';
import type { PaginatedResult } from '@/types/api.types';

class FixedExpenseApiService extends BaseApiService {
    constructor() {
        super('/fixed-expenses');
    }

    async getAll(params?: FixedExpenseListParams): Promise<PaginatedResult<FixedExpenseListRow>> {
        const search = new URLSearchParams();
        if (params?.page) search.set('page', String(params.page));
        if (params?.limit) search.set('limit', String(params.limit));
        if (params?.search) search.set('search', params.search);
        if (params?.type) search.set('type', params.type);
        if (params?.paymentFrequency) search.set('paymentFrequency', params.paymentFrequency);
        if (params?.paymentMode) search.set('paymentMode', params.paymentMode);
        if (params?.amountType) search.set('amountType', params.amountType);
        if (params?.deleteStatus !== undefined) {
            search.set('deleteStatus', String(params.deleteStatus));
        }
        if (params?.sortBy) search.set('sortBy', params.sortBy);
        if (params?.sortOrder) search.set('sortOrder', params.sortOrder);

        const queryString = search.toString();
        return this.get<PaginatedResult<FixedExpenseListRow>>(queryString ? `?${queryString}` : '');
    }

    async getById(id: number): Promise<FixedExpenseResponse> {
        return this.get<FixedExpenseResponse>(`/${id}`);
    }

    async create(data: CreateFixedExpenseDto): Promise<FixedExpenseResponse> {
        return this.post<FixedExpenseResponse>('', data);
    }

    async update(id: number, data: UpdateFixedExpenseDto): Promise<FixedExpenseResponse> {
        return this.patch<FixedExpenseResponse>(`/${id}`, data);
    }

    async archive(id: number, deleteStatus: boolean): Promise<FixedExpenseResponse> {
        return this.patch<FixedExpenseResponse>(`/${id}/archive`, { deleteStatus });
    }

    async remove(id: number): Promise<void> {
        await this.delete<void>(`/${id}`);
    }
}

export const fixedExpenseService = new FixedExpenseApiService();
