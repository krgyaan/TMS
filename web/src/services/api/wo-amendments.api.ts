import { BaseApiService } from './base.service';
import type {
  WoAmendment,
  CreateWoAmendmentDto,
  UpdateWoAmendmentDto,
  CreateBulkWoAmendmentsDto,
  WoAmendmentsFilters,
  AmendmentsSummary,
  TopClausesStatistics,
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
    if (filters.search) params.set('search', filters.search);
    if (filters.woDetailId) params.set('woDetailId', String(filters.woDetailId));
    if (filters.pageNo) params.set('pageNo', filters.pageNo);
    if (filters.clauseNo) params.set('clauseNo', filters.clauseNo);
    if (filters.createdAtFrom) params.set('createdAtFrom', filters.createdAtFrom);
    if (filters.createdAtTo) params.set('createdAtTo', filters.createdAtTo);

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
    return this.get<WoAmendment[]>(`/by-clause/${woDetailId}/${clauseNo}`);
  }

  async create(data: CreateWoAmendmentDto): Promise<WoAmendment> {
    return this.post<WoAmendment>('', data);
  }

  async createBulk(data: CreateBulkWoAmendmentsDto): Promise<{ created: number; data: WoAmendment[] }> {
    return this.post<{ created: number; data: WoAmendment[] }>('/bulk', data);
  }

  async update(id: number, data: UpdateWoAmendmentDto): Promise<WoAmendment> {
    return this.patch<WoAmendment>(`/${id}`, data);
  }

  async remove(id: number): Promise<void> {
    return this.delete(`/${id}`);
  }

  async removeAllByWoDetail(woDetailId: number): Promise<void> {
    return this.delete(`/by-wo-detail/${woDetailId}`);
  }

  // Utility Operations
  async getAmendmentsSummary(woDetailId: number): Promise<AmendmentsSummary> {
    return this.get<AmendmentsSummary>(`/summary/${woDetailId}`);
  }

  async getTopClausesStatistics(): Promise<TopClausesStatistics> {
    return this.get<TopClausesStatistics>('/statistics/top-clauses');
  }
}

export const woAmendmentsService = new WoAmendmentsService();
