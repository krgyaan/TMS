import { BaseApiService } from './base.service';
import type {
  WoQuery,
  CreateWoQueryDto,
  CreateBulkWoQueriesDto,
  RespondToQueryDto,
  WoQueriesFilters,
  PaginatedResult,
} from '@/modules/operations/types/wo.types';

class WoQueriesService extends BaseApiService {
  constructor() {
    super('/wo-queries');
  }

  private buildQueryString(filters?: WoQueriesFilters): string {
    if (!filters) return '';

    const params = new URLSearchParams();

    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters.woDetailsId) params.set('woDetailsId', String(filters.woDetailsId));
    if (filters.status) params.set('status', filters.status);
    if (filters.queryBy) params.set('queryBy', String(filters.queryBy));
    if (filters.queryTo) params.set('queryTo', filters.queryTo);

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  // CRUD Operations
  async getAll(filters?: WoQueriesFilters): Promise<PaginatedResult<WoQuery>> {
    return this.get<PaginatedResult<WoQuery>>(this.buildQueryString(filters));
  }

  async getById(id: number): Promise<WoQuery> {
    return this.get<WoQuery>(`/${id}`);
  }

  async getByWoDetailId(woDetailId: number): Promise<WoQuery[]> {
    return this.get<WoQuery[]>(`/by-wo-detail/${woDetailId}`);
  }

  async getPendingByWoDetail(woDetailId: number): Promise<WoQuery[]> {
    return this.get<WoQuery[]>(`/by-wo-detail/${woDetailId}/pending`);
  }

  async getByUser(userId: number, type: 'raised' | 'received' = 'raised'): Promise<WoQuery[]> {
    return this.get<WoQuery[]>(`/by-user/${userId}?type=${type}`);
  }

  async getAllPending(): Promise<WoQuery[]> {
    return this.get<WoQuery[]>('/pending');
  }

  async getAllOverdue(): Promise<WoQuery[]> {
    return this.get<WoQuery[]>('/overdue');
  }

  async create(data: CreateWoQueryDto): Promise<WoQuery> {
    return this.post<WoQuery>('', data);
  }

  async createBulk(data: CreateBulkWoQueriesDto): Promise<{ count: number; queries: WoQuery[] }> {
    return this.post<{ count: number; queries: WoQuery[] }>('/bulk', data);
  }

  async respond(id: number, data: RespondToQueryDto): Promise<WoQuery & { withinSla: boolean; responseTimeHours: number }> {
    return this.post<WoQuery & { withinSla: boolean; responseTimeHours: number }>(`/${id}/respond`, data);
  }

  async close(id: number, remarks?: string): Promise<WoQuery> {
    return this.post<WoQuery>(`/${id}/close`, { remarks });
  }

  async reopen(id: number): Promise<WoQuery> {
    return this.post<WoQuery>(`/${id}/reopen`);
  }

  async updateStatus(id: number, status: string): Promise<WoQuery> {
    return this.patch<WoQuery>(`/${id}/status`, { status });
  }

  async remove(id: number): Promise<void> {
    return this.delete(`/${id}`);
  }

  // Statistics
  async getDashboardSummary(): Promise<{
    total: number;
    pending: number;
    responded: number;
    closed: number;
    overdue: number;
  }> {
    return this.get('/statistics/summary');
  }

  async getResponseTimeStatistics(): Promise<{
    averageResponseTimeHours: number;
    withinSlaPercentage: number;
    byMonth: Array<{ month: string; avgHours: number; count: number }>;
  }> {
    return this.get('/statistics/response-time');
  }

  async getUserQueryStatistics(userId: number): Promise<{
    raised: number;
    received: number;
    pending: number;
    avgResponseTime: number;
  }> {
    return this.get(`/statistics/user/${userId}`);
  }

  async getSlaStatus(woDetailId: number): Promise<{
    totalQueries: number;
    respondedWithinSla: number;
    overdueQueries: number;
    slaCompliancePercentage: number;
  }> {
    return this.get(`/by-wo-detail/${woDetailId}/sla-status`);
  }
}

export const woQueriesService = new WoQueriesService();
