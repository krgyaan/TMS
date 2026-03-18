import { BaseApiService } from './base.service';
import type {
  WoDocument,
  CreateWoDocumentDto,
  UpdateWoDocumentDto,
  WoDocumentsFilters,
  DocumentType,
  PaginatedResult,
} from '@/modules/operations/types/wo.types';

class WoDocumentsService extends BaseApiService {
  constructor() {
    super('/wo-documents');
  }

  private buildQueryString(filters?: WoDocumentsFilters): string {
    if (!filters) return '';

    const params = new URLSearchParams();

    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters.woDetailId) params.set('woDetailId', String(filters.woDetailId));
    if (filters.type) params.set('type', filters.type);

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  // CRUD Operations
  async getAll(filters?: WoDocumentsFilters): Promise<PaginatedResult<WoDocument>> {
    return this.get<PaginatedResult<WoDocument>>(this.buildQueryString(filters));
  }

  async getById(id: number): Promise<WoDocument> {
    return this.get<WoDocument>(`/${id}`);
  }

  async getByWoDetailId(woDetailId: number): Promise<WoDocument[]> {
    return this.get<WoDocument[]>(`/by-wo-detail/${woDetailId}`);
  }

  async getByType(woDetailId: number, type: DocumentType): Promise<WoDocument[]> {
    return this.get<WoDocument[]>(`/by-wo-detail/${woDetailId}/type/${type}`);
  }

  async getLatestByType(woDetailId: number, type: DocumentType): Promise<WoDocument | null> {
    return this.get<WoDocument | null>(`/by-wo-detail/${woDetailId}/type/${type}/latest`);
  }

  async getVersionHistory(woDetailId: number, type: DocumentType): Promise<WoDocument[]> {
    return this.get<WoDocument[]>(`/by-wo-detail/${woDetailId}/type/${type}/versions`);
  }

  async upload(data: CreateWoDocumentDto): Promise<WoDocument> {
    return this.post<WoDocument>('', data);
  }

  async uploadBulk(data: { woDetailId: number; documents: Omit<CreateWoDocumentDto, 'woDetailId'>[] }): Promise<{ count: number; documents: WoDocument[] }> {
    return this.post<{ count: number; documents: WoDocument[] }>('/bulk', data);
  }

  async update(id: number, data: UpdateWoDocumentDto): Promise<WoDocument> {
    return this.patch<WoDocument>(`/${id}`, data);
  }

  async replace(id: number, data: { filePath: string }): Promise<WoDocument> {
    return this.post<WoDocument>(`/${id}/replace`, data);
  }

  async remove(id: number): Promise<void> {
    return this.delete(`/${id}`);
  }

  async removeAllByWoDetail(woDetailId: number): Promise<{ count: number }> {
    return this.delete<{ count: number }>(`/by-wo-detail/${woDetailId}`);
  }

  async removeByType(woDetailId: number, type: DocumentType): Promise<{ count: number }> {
    return this.delete<{ count: number }>(`/by-wo-detail/${woDetailId}/type/${type}`);
  }

  // Utility
  async getDocumentsSummary(woDetailId: number): Promise<{
    total: number;
    byType: Record<string, number>;
  }> {
    return this.get(`/by-wo-detail/${woDetailId}/summary`);
  }

  async checkDocumentExists(woDetailId: number, type: DocumentType): Promise<{ exists: boolean; latestVersion?: number }> {
    return this.get(`/by-wo-detail/${woDetailId}/type/${type}/exists`);
  }

  async getOverviewStatistics(): Promise<{
    totalDocuments: number;
    byType: Record<string, number>;
    recentUploads: WoDocument[];
  }> {
    return this.get('/statistics/overview');
  }
}

export const woDocumentsService = new WoDocumentsService();
