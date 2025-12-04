// web/src/services/api/tenders.service.ts
import { BaseApiService } from './base.service';
import type {
    CreateTenderInfoDto,
    TenderInfo,
    TenderInfoWithNames,
    UpdateTenderInfoDto,
} from '@/types/api.types';

export type TenderListParams = {
    // Existing filters
    statusIds?: number[];
    unallocated?: boolean;
    // Team-based filters
    teamId?: number | null;
    assignedTo?: number | null; // userId for SELF scope
};

class TenderInfosService extends BaseApiService {
    constructor() {
        super('/tenders');
    }

    async getAll(params?: TenderListParams): Promise<TenderInfoWithNames[]> {
        const search = new URLSearchParams();

        if (params) {
            // Status filter
            if (params.statusIds?.length) {
                search.set('statusIds', params.statusIds.join(','));
            }

            // Unallocated filter
            if (params.unallocated) {
                search.set('unallocated', 'true');
            }

            // Team filter
            if (params.teamId !== undefined && params.teamId !== null) {
                search.set('teamId', String(params.teamId));
            }

            // Assigned user filter (for SELF scope - executives)
            if (params.assignedTo !== undefined && params.assignedTo !== null) {
                search.set('assignedTo', String(params.assignedTo));
            }
        }

        const queryString = search.toString();
        return this.get<TenderInfoWithNames[]>(queryString ? `?${queryString}` : '');
    }

    async getById(id: number): Promise<TenderInfoWithNames> {
        return this.get<TenderInfoWithNames>(`/${id}`);
    }

    async create(data: CreateTenderInfoDto): Promise<TenderInfo> {
        return this.post<TenderInfo>('', data);
    }

    async update(id: number, data: UpdateTenderInfoDto): Promise<TenderInfo> {
        return this.patch<TenderInfo>(`/${id}`, data);
    }

    async remove(id: number): Promise<void> {
        return super.delete<void>(`/${id}`);
    }
}

export const tenderInfosService = new TenderInfosService();
