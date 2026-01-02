import { BaseApiService } from './base.service';
import type {
    CreateTenderRequest,
    TenderInfo,
    TenderInfoWithNames,
    UpdateTenderRequest,
    PaginatedResult,
} from '@/types/api.types';

export type TenderListParams = {
    statusIds?: number[];
    category?: string;
    unallocated?: boolean;
    teamId?: number | null;
    assignedTo?: number | null;
    search?: string;
    page?: number;
    limit?: number;
};

class TenderInfosService extends BaseApiService {
    constructor() {
        super('/tenders');
    }

    async getAll(params?: TenderListParams): Promise<PaginatedResult<TenderInfoWithNames>> {
        const search = new URLSearchParams();

        if (params) {
            // Category takes precedence over statusIds
            if (params.category) {
                search.set('category', params.category);
            } else if (params.statusIds?.length) {
                search.set('statusIds', params.statusIds.join(','));
            }
            if (params.unallocated) {
                search.set('unallocated', 'true');
            }
            if (params.teamId !== undefined && params.teamId !== null) {
                search.set('teamId', String(params.teamId));
            }
            if (params.assignedTo !== undefined && params.assignedTo !== null) {
                search.set('assignedTo', String(params.assignedTo));
            }
            if (params.search) {
                search.set('search', params.search);
            }
            if (params.page) {
                search.set('page', String(params.page));
            }
            if (params.limit) {
                search.set('limit', String(params.limit));
            }
        }

        const queryString = search.toString();
        return this.get<PaginatedResult<TenderInfoWithNames>>(queryString ? `?${queryString}` : '');
    }

    async getById(id: number): Promise<TenderInfoWithNames> {
        return this.get<TenderInfoWithNames>(`/${id}`);
    }

    async create(data: CreateTenderRequest): Promise<TenderInfo> {
        return this.post<TenderInfo>('', data);
    }

    async update(id: number, data: UpdateTenderRequest): Promise<TenderInfo> {
        return this.patch<TenderInfo>(`/${id}`, data);
    }

    async remove(id: number): Promise<void> {
        return super.delete<void>(`/${id}`);
    }

    async generateName(params: { organization: number; item: number; location?: number }): Promise<{ tenderName: string }> {
        return this.post<{ tenderName: string }>('/generate-name', params);
    }

    async getDashboardCounts(): Promise<any> {
        return this.get<any>('/dashboard/counts');
    }
}

export const tenderInfosService = new TenderInfosService();
