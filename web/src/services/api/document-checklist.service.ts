import { BaseApiService } from './base.service';
import type {
    DocumentChecklistsDashboardCounts,
    TenderDocumentChecklist,
    TenderDocumentChecklistDashboardRow,
    CreateDocumentChecklistDto,
    UpdateDocumentChecklistDto,
} from '@/modules/tendering/checklists/helpers/documentChecklist.types';
import type { PaginatedResult } from '@/types/api.types';

export type DocumentChecklistListParams = {
    tab?: 'pending' | 'submitted' | 'tender-dnb';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

class DocumentChecklistService extends BaseApiService {
    constructor() {
        super('/document-checklists');
    }

    async getAll(params?: DocumentChecklistListParams, teamId?: number): Promise<PaginatedResult<TenderDocumentChecklistDashboardRow>> {
        const search = new URLSearchParams();

        if (params) {
            if (params.tab) {
                search.set('tab', String(params.tab));
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
        if (teamId !== undefined && teamId !== null) {
            search.set('teamId', String(teamId));
        }

        const queryString = search.toString();
        return this.get<PaginatedResult<TenderDocumentChecklistDashboardRow>>(queryString ? `/dashboard?${queryString}` : '/dashboard');
    }

    async getDashboardCounts(teamId?: number): Promise<DocumentChecklistsDashboardCounts> {
        const search = new URLSearchParams();
        if (teamId !== undefined && teamId !== null) {
            search.set('teamId', String(teamId));
        }
        const queryString = search.toString();
        return this.get<DocumentChecklistsDashboardCounts>(queryString ? `/dashboard/counts?${queryString}` : '/dashboard/counts');
    }

    async getByTenderId(tenderId: number): Promise<TenderDocumentChecklist | null> {
        return this.get<TenderDocumentChecklist>(`/tender/${tenderId}`);
    }

    async create(data: CreateDocumentChecklistDto): Promise<TenderDocumentChecklist> {
        return this.post<TenderDocumentChecklist>('', data);
    }

    async update(data: UpdateDocumentChecklistDto): Promise<TenderDocumentChecklist> {
        const { id, ...updateData } = data;
        return this.patch<TenderDocumentChecklist>(`/${id}`, updateData);
    }
}

export const documentChecklistService =
    new DocumentChecklistService();
