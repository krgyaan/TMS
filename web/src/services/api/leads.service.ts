import { BaseApiService } from './base.service';
import type { 
    Lead,
    LeadWithNames, 
    CreateLeadRequest, 
    UpdateLeadRequest,
    AllocateLeadRequest,
    LeadListParams 
} from '@/modules/crm/leads/helpers/leads.type';
import type { PaginatedResult } from '@/types/api.types';

class LeadsService extends BaseApiService {
    constructor() {
        super('/leads');
    }

    async getAll(params?: LeadListParams): Promise<PaginatedResult<LeadWithNames>> {
        const search = new URLSearchParams();
        if (params) {
            if (params.page)      search.set('page',      String(params.page));
            if (params.limit)     search.set('limit',     String(params.limit));
            if (params.search)    search.set('search',    params.search);
            if (params.priority)  search.set('priority',  params.priority);
            if (params.status)    search.set('status',    params.status);
            if (params.team)      search.set('team',      params.team);      // ✅ ADD THIS
            if (params.sortBy)    search.set('sortBy',    params.sortBy);
            if (params.sortOrder) search.set('sortOrder', params.sortOrder);
        }
        const qs = search.toString();
        return this.get<PaginatedResult<LeadWithNames>>(qs ? `?${qs}` : '');
    }

    async getById(id: number): Promise<LeadWithNames> {
        return this.get<LeadWithNames>(`/${id}`);
    }

    async create(data: CreateLeadRequest): Promise<Lead> {
        return this.post<Lead>('', data);
    }

    async update(id: number, data: UpdateLeadRequest): Promise<Lead> {
        return this.patch<Lead>(`/${id}`, data);
    }

    async allocate(id: number, data: AllocateLeadRequest): Promise<Lead> {
        return this.patch<Lead>(`/${id}/allocate`, data);
    }

    async remove(id: number, reason?: string): Promise<void> {
        return this.patch<void>(`/${id}/disqualify`, { reason: reason ?? null });
    }
}

export const leadsService = new LeadsService();