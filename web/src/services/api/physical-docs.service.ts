import { BaseApiService } from './base.service';
import type {
    PhysicalDocs,
    PhysicalDocsDashboardRow,
    CreatePhysicalDocsDto,
    UpdatePhysicalDocsDto,
    PaginatedResult,
    PhysicalDocsListParams,
    PhysicalDocsDashboardCounts,
} from '@/types/api.types';

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
        }

        const queryString = search.toString();
        return this.get<PaginatedResult<PhysicalDocsDashboardRow>>(queryString ? `?${queryString}` : '');
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

    async getDashboardCounts(): Promise<PhysicalDocsDashboardCounts> {
        return this.get<PhysicalDocsDashboardCounts>('/dashboard/counts');
    }
}

export const physicalDocsService = new PhysicalDocsService();
