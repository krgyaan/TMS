import { BaseApiService } from './base.service';
import type {
    DocumentChecklistsDashboardCounts,
    TenderDocumentChecklist,
    TenderDocumentChecklistDashboardRow,
    CreateDocumentChecklistDto,
    UpdateDocumentChecklistDto,
    PaginatedResult,
} from '@/types/api.types';

export type DocumentChecklistListParams = {
    checklistSubmitted?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

class DocumentChecklistService extends BaseApiService {
    constructor() {
        super('/document-checklists');
    }

    async getAll(params?: DocumentChecklistListParams): Promise<PaginatedResult<TenderDocumentChecklistDashboardRow>> {
        const search = new URLSearchParams();

        if (params) {
            if (params.checklistSubmitted !== undefined) {
                search.set('checklistSubmitted', String(params.checklistSubmitted));
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
        return this.get<PaginatedResult<TenderDocumentChecklistDashboardRow>>(
            queryString ? `?${queryString}` : ''
        );
    }

    async getDashboardCounts(): Promise<DocumentChecklistsDashboardCounts> {
        return this.get<DocumentChecklistsDashboardCounts>('/counts');
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
