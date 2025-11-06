import { BaseApiService } from './base.service';
import type { LoanParty, CreateLoanPartyDto, UpdateLoanPartyDto } from '@/types/api.types';

class LoanPartiesService extends BaseApiService {
    constructor() {
        super('/loan-parties');
    }

    async getAll(): Promise<LoanParty[]> {
        return this.get<LoanParty[]>('');
    }

    async getById(id: number): Promise<LoanParty> {
        return this.get<LoanParty>(`/${id}`);
    }

    async create(data: CreateLoanPartyDto): Promise<LoanParty> {
        return this.post<LoanParty>('', data);
    }

    async update(id: number, data: UpdateLoanPartyDto): Promise<LoanParty> {
        return this.patch<LoanParty>(`/${id}`, data);
    }

    // async delete(id: number): Promise<void> {
    //     return this.delete<void>(`/${id}`);
    // }

    // async search(query: string): Promise<LoanParty[]> {
    //     return this.get<LoanParty[]>('/search', { params: { q: query } });
    // }
}

export const loanPartiesService = new LoanPartiesService();
