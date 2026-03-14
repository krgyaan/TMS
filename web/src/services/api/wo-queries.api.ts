import { BaseApiService } from './base.service';
import type {
  WoQuery,
  WoQueryWithOverdue,
  CreateWoQueryDto,
  CreateBulkWoQueriesDto,
  RespondToQueryDto,
  CloseQueryDto,
  UpdateQueryStatusDto,
  WoQueriesFilters,
  QueriesDashboardSummary,
  ResponseTimeStatistics,
  UserQueryStatistics,
  SlaStatus,
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
    if (filters.search) params.set('search', filters.search);
    if (filters.woDetailId) params.set('woDetailId', String(filters.woDetailId));
    if (filters.status) params.set('status', filters.status);
    if (filters.queryTo) params.set('queryTo', filters.queryTo);
    if (filters.queryBy) params.set('queryBy', String(filters.queryBy));
    if (filters.respondedBy) params.set('respondedBy', String(filters.respondedBy));
    if (filters.queryRaisedFrom) params.set('queryRaisedFrom', filters.queryRaisedFrom);
    if (filters.queryRaisedTo) params.set('queryRaisedTo', filters.queryRaisedTo);
    if (filters.respondedFrom) params.set('respondedFrom', filters.respondedFrom);
    if (filters.respondedTo) params.set('respondedTo', filters.respondedTo);

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  // CRUD Operations
  async getAll(filters?: WoQueriesFilters): Promise<PaginatedResult<WoQuery>> {
    return this.get<PaginatedResult<WoQuery>>(this.buildQueryString(filters));
  }

  async getAllPending(): Promise<{ count: number; data: WoQueryWithOverdue[] }> {
    return this.get<{ count: number; data: WoQueryWithOverdue[] }>('/pending');
  }

  async getAllOverdue(): Promise<{ count: number; overdueThresholdHours: number; data: WoQueryWithOverdue[] }> {
    return this.get<{ count: number; overdueThresholdHours: number; data: WoQueryWithOverdue[] }>('/overdue');
  }

  async getById(id: number): Promise<WoQueryWithOverdue> {
    return this.get<WoQueryWithOverdue>(`/${id}`);
  }

  async getByWoDetailId(woDetailId: number): Promise<WoQuery[]> {
    return this.get<WoQuery[]>(`/by-wo-detail/${woDetailId}`);
  }

  async getPendingByWoDetail(woDetailId: number): Promise<{ count: number; data: WoQueryWithOverdue[] }> {
    return this.get<{ count: number; data: WoQueryWithOverdue[] }>(`/by-wo-detail/${woDetailId}/pending`);
  }

  async getByUser(userId: number, type: 'raised' | 'received' = 'raised'): Promise<WoQuery[]> {
    return this.get<WoQuery[]>(`/by-user/${userId}?type=${type}`);
  }

  async create(data: CreateWoQueryDto): Promise<WoQuery> {
    return this.post<WoQuery>('', data);
  }

  async createBulk(data: CreateBulkWoQueriesDto): Promise<{ created: number; data: WoQuery[] }> {
    return this.post<{ created: number; data: WoQuery[] }>('/bulk', data);
  }

  async respond(id: number, data: RespondToQueryDto): Promise<WoQuery & { responseTimeHours: number; withinSla: boolean }> {
    return this.post<WoQuery & { responseTimeHours: number; withinSla: boolean }>(`/${id}/respond`, data);
  }

  async close(id: number, data?: CloseQueryDto): Promise<WoQuery> {
    return this.post<WoQuery>(`/${id}/close`, data || {});
  }

  async updateStatus(id: number, data: UpdateQueryStatusDto): Promise<WoQuery> {
    return this.patch<WoQuery>(`/${id}/status`, data);
  }

  async reopen(id: number): Promise<WoQuery & { message: string }> {
    return this.post<WoQuery & { message: string }>(`/${id}/reopen`, {});
  }

  async remove(id: number): Promise<void> {
    return this.delete(`/${id}`);
  }

  // Dashboard/Statistics
  async getDashboardSummary(): Promise<QueriesDashboardSummary> {
    return this.get<QueriesDashboardSummary>('/dashboard/summary');
  }

  async getResponseTimeStatistics(): Promise<ResponseTimeStatistics> {
    return this.get<ResponseTimeStatistics>('/dashboard/response-times');
  }

  async getUserQueryStatistics(userId: number): Promise<UserQueryStatistics> {
    return this.get<UserQueryStatistics>(`/dashboard/by-user/${userId}`);
  }

  async getSlaStatus(woDetailId: number): Promise<SlaStatus> {
    return this.get<SlaStatus>(`/sla/${woDetailId}`);
  }
}

export const woQueriesService = new WoQueriesService();
