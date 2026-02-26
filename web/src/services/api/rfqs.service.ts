import { BaseApiService } from './base.service';
import type { RfqDashboardFilters, RfqDashboardRow, Rfq, CreateRfqDto, UpdateRfqDto } from '@/modules/tendering/rfqs/helpers/rfq.types';
import type { PaginatedResult } from '@/types/api.types';

class RfqsService extends BaseApiService {
    constructor() {
        super('/rfqs');
    }

    async getDashboard(filters?: RfqDashboardFilters): Promise<PaginatedResult<RfqDashboardRow>> {
        const search = new URLSearchParams();

        if (filters) {
            if (filters.tab) {
                search.set('tab', filters.tab);
            }
            if (filters.page) {
                search.set('page', String(filters.page));
            }
            if (filters.limit) {
                search.set('limit', String(filters.limit));
            }
            if (filters.sortBy) {
                search.set('sortBy', filters.sortBy);
            }
            if (filters.sortOrder) {
                search.set('sortOrder', filters.sortOrder);
            }
            if (filters.search) {
                search.set('search', filters.search);
            }
            if (filters.teamId !== undefined && filters.teamId !== null) {
                search.set('teamId', String(filters.teamId));
            }
        }

        const queryString = search.toString();
        return this.get<PaginatedResult<RfqDashboardRow>>(queryString ? `/dashboard?${queryString}` : '/dashboard');
    }

    async getById(id: number): Promise<Rfq> {
        return this.get<Rfq>(`/${id}`);
    }

    async getByTenderId(tenderId: number): Promise<Rfq[]> {
        return this.get<Rfq[]>(`/by-tender/${tenderId}`);
    }

    async create(data: CreateRfqDto): Promise<Rfq> {
        return this.post<Rfq>('', data);
    }

    async update(id: number, data: UpdateRfqDto): Promise<Rfq> {
        return this.patch<Rfq>(`/${id}`, data);
    }

    async remove(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }

    async getDashboardCounts(teamId?: number): Promise<any> {
        const params = new URLSearchParams();
        if (teamId !== undefined && teamId !== null) {
            params.append('teamId', teamId.toString());
        }
        const query = params.toString();
        return this.get<any>(query ? `/dashboard/counts?${query}` : '/dashboard/counts');
    }


}

export const rfqsService = new RfqsService();
