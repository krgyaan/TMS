import { BaseApiService } from './base.service';
import type { FinancialYear, CreateFinancialYearDto, UpdateFinancialYearDto } from '@/types/api.types';

class FinancialYearService extends BaseApiService {
    constructor() {
        super('/financial-year');
    }

    async getAll(): Promise<FinancialYear[]> {
        return this.get<FinancialYear[]>('');
    }

    async getById(id: number): Promise<FinancialYear> {
        return this.get<FinancialYear>(`/${id}`);
    }

    async create(data: CreateFinancialYearDto): Promise<FinancialYear> {
        return this.post<FinancialYear>('', data);
    }

    async update(id: number, data: UpdateFinancialYearDto): Promise<FinancialYear> {
        return this.patch<FinancialYear>(`/${id}`, data);
    }
}

export const financialYearService = new FinancialYearService();
