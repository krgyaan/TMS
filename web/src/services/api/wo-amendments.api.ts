import { BaseApiService } from './base.service';
import type {
  WoAmendment,
  CreateWoAmendmentDto,
  UpdateWoAmendmentDto,
  CreateBulkWoAmendmentsDto,
  WoAmendmentsFilters,
  PaginatedResult,
} from '@/modules/operations/types/wo.types';

class WoAmendmentsService extends BaseApiService {
  constructor() {
    super('/wo-amendments');
  }

  private buildQueryString(filters?: WoAmendmentsFilters): string {
    if (!filters) return '';

    const params = new URLSearchParams();

    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters.woDetailId) params.set('woDetailId', String(filters.woDetailId));
    if (filters.status) params.set('status', filters.status);
    if (filters.createdByRole) params.set('createdByRole', filters.createdByRole);
    if (filters.tlApproved !== undefined) params.set('tlApproved', String(filters.tlApproved));

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  // CRUD Operations
  async getAll(filters?: WoAmendmentsFilters): Promise<PaginatedResult<WoAmendment>> {
    return this.get<PaginatedResult<WoAmendment>>(this.buildQueryString(filters));
  }

  async getById(id: number): Promise<WoAmendment> {
    return this.get<WoAmendment>(`/${id}`);
  }

  async getByWoDetailId(woDetailId: number): Promise<WoAmendment[]> {
    return this.get<WoAmendment[]>(`/by-wo-detail/${woDetailId}`);
  }

  async getByClause(woDetailId: number, clauseNo: string): Promise<WoAmendment[]> {
    return this.get<WoAmendment[]>(`/by-wo-detail/${woDetailId}/clause/${encodeURIComponent(clauseNo)}`);
  }

  async create(data: CreateWoAmendmentDto): Promise<WoAmendment> {
    return this.post<WoAmendment>('', data);
  }

  async createBulk(data: CreateBulkWoAmendmentsDto): Promise<{ count: number; amendments: WoAmendment[] }> {
    return this.post<{ count: number; amendments: WoAmendment[] }>('/bulk', data);
  }

  async update(id: number, data: UpdateWoAmendmentDto): Promise<WoAmendment> {
    return this.patch<WoAmendment>(`/${id}`, data);
  }

  async remove(id: number): Promise<void> {
    return this.delete(`/${id}`);
  }

  async removeAllByWoDetail(woDetailId: number): Promise<{ count: number }> {
    return this.delete<{ count: number }>(`/by-wo-detail/${woDetailId}`);
  }

  // TL Review Actions
  async approveAmendment(id: number, remarks?: string): Promise<WoAmendment> {
    return this.post<WoAmendment>(`/${id}/approve`, { remarks });
  }

  async rejectAmendment(id: number, remarks: string): Promise<WoAmendment> {
    return this.post<WoAmendment>(`/${id}/reject`, { remarks });
  }

  // Client Communication
  async markCommunicated(id: number): Promise<WoAmendment> {
    return this.post<WoAmendment>(`/${id}/communicated`);
  }

  async recordClientResponse(id: number, response: string, proof?: string): Promise<WoAmendment> {
    return this.post<WoAmendment>(`/${id}/client-response`, { response, proof });
  }

  async markResolved(id: number): Promise<WoAmendment> {
    return this.post<WoAmendment>(`/${id}/resolve`);
  }

  // Summary/Statistics
  async getAmendmentsSummary(woDetailId: number): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    communicated: number;
    resolved: number;
  }> {
    return this.get(`/by-wo-detail/${woDetailId}/summary`);
  }

  async getTopClausesStatistics(): Promise<Array<{ clauseNo: string; count: number }>> {
    return this.get('/statistics/top-clauses');
  }
}

export const woAmendmentsService = new WoAmendmentsService();
