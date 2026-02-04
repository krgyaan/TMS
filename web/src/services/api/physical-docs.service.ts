import { BaseApiService } from './base.service';
import type {
    PhysicalDocs,
    PhysicalDocsDashboardRow,
    CreatePhysicalDocsDto,
    UpdatePhysicalDocsDto,
    PhysicalDocsListParams,
    PhysicalDocsDashboardCounts,
} from '@/modules/tendering/physical-docs/helpers/physicalDocs.types';
import type { PaginatedResult } from '@/types/api.types';

class PhysicalDocsService extends BaseApiService {
    constructor() {
        super('/physical-docs');
    }

    async getAll(params?: PhysicalDocsListParams): Promise<PaginatedResult<PhysicalDocsDashboardRow>> {
        const search = new URLSearchParams();

        if (params) {
            if (params.physicalDocsSent !== undefined) {
                search.set('physicalDocsSent', String(params.physicalDocsSent));
            }
            if (params.page) {
                search.set('page', String(params.page));
            }
            if (params.limit) {
                search.set('limit', String(params.limit));
            }
            if (params.sortBy) {
                search.set('sortBy', params.sortBy);
            }
            if (params.sortOrder) {
                search.set('sortOrder', params.sortOrder);
            }
            if (params.search) {
                search.set('search', params.search);
            }
        }

        const queryString = search.toString();
        return this.get<PaginatedResult<PhysicalDocsDashboardRow>>(queryString ? `?${queryString}` : '');
    }

    async getDashboard(
        tab?: 'pending' | 'sent' | 'tender-dnb',
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string }
    ): Promise<PaginatedResult<PhysicalDocsDashboardRow>> {
        const search = new URLSearchParams();

        if (tab) {
            search.set('tab', tab);
        }
        if (filters?.page) {
            search.set('page', String(filters.page));
        }
        if (filters?.limit) {
            search.set('limit', String(filters.limit));
        }
        if (filters?.sortBy) {
            search.set('sortBy', filters.sortBy);
        }
        if (filters?.sortOrder) {
            search.set('sortOrder', filters.sortOrder);
        }
        if (filters?.search) {
            search.set('search', filters.search);
        }

        const queryString = search.toString();
        return this.get<PaginatedResult<PhysicalDocsDashboardRow>>(`/dashboard${queryString ? `?${queryString}` : ''}`);
    }

    async getById(id: number): Promise<PhysicalDocs | null> {
        return this.get<PhysicalDocs>(`/${id}`);
    }

    async getByTenderId(tenderId: number): Promise<PhysicalDocs | null> {
        return this.get<PhysicalDocs>(`/by-tender/${tenderId}`);
    }

    async create(data: CreatePhysicalDocsDto): Promise<PhysicalDocs> {
        return this.post<PhysicalDocs>('', data);
    }

    async update(id: number, data: UpdatePhysicalDocsDto): Promise<PhysicalDocs> {
        return this.patch<PhysicalDocs>(`/${id}`, data);
    }

    async remove(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }

    async getDashboardCounts(teamId?: number): Promise<PhysicalDocsDashboardCounts> {
        const params = new URLSearchParams();
        if (teamId !== undefined && teamId !== null) {
            params.append('teamId', teamId.toString());
        }
        const query = params.toString();
        return this.get<PhysicalDocsDashboardCounts>(query ? `/dashboard/counts?${query}` : '/dashboard/counts');
    }
}

export const physicalDocsService = new PhysicalDocsService();
