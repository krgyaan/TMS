import { BaseApiService } from './base.service';
import type {
  WoDocument,
  CreateWoDocumentDto,
  UpdateWoDocumentDto,
  CreateBulkWoDocumentsDto,
  ReplaceDocumentDto,
  WoDocumentsFilters,
  VersionHistory,
  DocumentsSummary,
  DocumentsOverviewStatistics,
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
    if (filters.version) params.set('version', String(filters.version));
    if (filters.uploadedFrom) params.set('uploadedFrom', filters.uploadedFrom);
    if (filters.uploadedTo) params.set('uploadedTo', filters.uploadedTo);

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

  async getByType(woDetailId: number, type: string): Promise<WoDocument[]> {
    return this.get<WoDocument[]>(`/by-type/${woDetailId}/${type}`);
  }

  async getLatestByType(woDetailId: number, type: string): Promise<WoDocument> {
    return this.get<WoDocument>(`/latest/${woDetailId}/${type}`);
  }

  async getVersionHistory(woDetailId: number, type: string): Promise<VersionHistory> {
    return this.get<VersionHistory>(`/versions/${woDetailId}/${type}`);
  }

  async upload(data: CreateWoDocumentDto): Promise<WoDocument> {
    return this.post<WoDocument>('', data);
  }

  async uploadBulk(data: CreateBulkWoDocumentsDto): Promise<{ uploaded: number; data: WoDocument[] }> {
    return this.post<{ uploaded: number; data: WoDocument[] }>('/bulk', data);
  }

  async update(id: number, data: UpdateWoDocumentDto): Promise<WoDocument> {
    return this.patch<WoDocument>(`/${id}`, data);
  }

  async replace(id: number, data: ReplaceDocumentDto): Promise<WoDocument | { previousVersion: WoDocument; newVersion: WoDocument }> {
    return this.post<WoDocument | { previousVersion: WoDocument; newVersion: WoDocument }>(`/${id}/replace`, data);
  }

  async remove(id: number): Promise<void> {
    return this.delete(`/${id}`);
  }

  async removeAllByWoDetail(woDetailId: number): Promise<void> {
    return this.delete(`/by-wo-detail/${woDetailId}`);
  }

  async removeByType(woDetailId: number, type: string): Promise<void> {
    return this.delete(`/by-type/${woDetailId}/${type}`);
  }

  // Utility Operations
  async getDocumentsSummary(woDetailId: number): Promise<DocumentsSummary> {
    return this.get<DocumentsSummary>(`/summary/${woDetailId}`);
  }

  async checkDocumentExists(woDetailId: number, type: string): Promise<{ exists: boolean; latestVersion: number | null }> {
    return this.get<{ exists: boolean; latestVersion: number | null }>(`/check-exists/${woDetailId}/${type}`);
  }

  async getOverviewStatistics(): Promise<DocumentsOverviewStatistics> {
    return this.get<DocumentsOverviewStatistics>('/statistics/overview');
  }
}

export const woDocumentsService = new WoDocumentsService();
