import { BaseApiService } from './base.service';
import type {
    DocumentSubmitted,
    CreateDocumentSubmittedDto,
    UpdateDocumentSubmittedDto,
} from '@/types/api.types';

class DocumentsSubmittedService extends BaseApiService {
    constructor() {
        super('/documents-submitted');
    }

    async getAll(): Promise<DocumentSubmitted[]> {
        return this.get<DocumentSubmitted[]>('');
    }

    async getById(id: number): Promise<DocumentSubmitted> {
        return this.get<DocumentSubmitted>(`/${id}`);
    }

    async create(data: CreateDocumentSubmittedDto): Promise<DocumentSubmitted> {
        return this.post<DocumentSubmitted>('', data);
    }

    async update(
        id: number,
        data: UpdateDocumentSubmittedDto,
    ): Promise<DocumentSubmitted> {
        return this.patch<DocumentSubmitted>(`/${id}`, data);
    }

    async delete(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }

    async search(query: string): Promise<DocumentSubmitted[]> {
        return this.get<DocumentSubmitted[]>('/search', { params: { q: query } });
    }
}

export const documentsSubmittedService = new DocumentsSubmittedService();
