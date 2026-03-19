import { BaseApiService } from './base.service';
import type {
  WoDetail,
  WoDetailWithRelations,
  CreateWoDetailDto,
  UpdateWoDetailDto,
  WoAcceptanceDecisionDto,
  WoDetailsFilters,
  WoTimeline,
  WoDetailsDashboardSummary,
  SlaComplianceReport,
  PaginatedResult,
  RequestAmendmentDto,
  AcceptanceStatus,
} from '@/modules/operations/types/wo.types';

class WoDetailsService extends BaseApiService {
  constructor() {
    super('/wo-details');
  }

  private buildQueryString(filters?: WoDetailsFilters): string {
    if (!filters) return '';

    const params = new URLSearchParams();

    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters.teamId) params.set('teamId', String(filters.teamId));
    if (filters.userId) params.set('userId', String(filters.userId));
    if (filters.dataScope) params.set('dataScope', filters.dataScope);

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  // ============================================
  // CRUD Operations
  // ============================================

  async getAll(filters?: WoDetailsFilters): Promise<PaginatedResult<WoDetail>> {
    return this.get<PaginatedResult<WoDetail>>(this.buildQueryString(filters));
  }

  async getById(id: number): Promise<WoDetail> {
    return this.get<WoDetail>(`/${id}`);
  }

  async getByIdWithRelations(id: number): Promise<WoDetailWithRelations> {
    return this.get<WoDetailWithRelations>(`/${id}/with-relations`);
  }

  async getByWoBasicDetailId(woBasicDetailId: number): Promise<WoDetail> {
    return this.get<WoDetail>(`/by-basic-detail/${woBasicDetailId}`);
  }

  async create(data: CreateWoDetailDto): Promise<WoDetail> {
    return this.post<WoDetail>('', data);
  }

  async update(id: number, data: UpdateWoDetailDto): Promise<WoDetail> {
    return this.patch<WoDetail>(`/${id}`, data);
  }

  async remove(id: number): Promise<void> {
    return this.delete(`/${id}`);
  }

  // ============================================
  // WIZARD OPERATIONS (NEW)
  // ============================================

  /**
   * Get wizard progress for a WO Detail
   */
  async getWizardProgress(id: number): Promise<{
    currentPage: number;
    completedPages: number[];
    skippedPages: number[];
    status: string;
    percentComplete: number;
    canSubmitForReview: boolean;
    blockers: string[];
  }> {
    return this.get(`/${id}/wizard/progress`);
  }

  /**
   * Save page data (draft save)
   */
  async savePage(woDetailId: number, pageNum: number, data: any): Promise<WoDetail> {
    return this.post<WoDetail>(`/${woDetailId}/wizard/pages/${pageNum}/save`, data);
  }

  /**
   * Submit page and proceed to next
   */
  async submitPage(woDetailId: number, pageNum: number, data: any): Promise<WoDetail> {
    return this.post<WoDetail>(`/${woDetailId}/wizard/pages/${pageNum}/submit`, data);
  }

  /**
   * Skip a page
   */
  async skipPage(woDetailId: number, pageNum: number, reason?: string): Promise<WoDetail> {
    return this.post<WoDetail>(`/${woDetailId}/wizard/pages/${pageNum}/skip`, { reason });
  }

  /**
   * Submit entire WO Details for TL review
   */
  async submitForReview(woDetailId: number): Promise<WoDetail & { message: string }> {
    return this.post<WoDetail & { message: string }>(`/${woDetailId}/wizard/submit-for-review`);
  }

  /**
   * Get page data (for editing)
   */
  async getPageData(woDetailId: number, pageNum: number): Promise<any> {
    return this.get(`/${woDetailId}/wizard/pages/${pageNum}`);
  }

  // ============================================
  // WO Acceptance Workflow
  // ============================================

  async acceptWo(id: number, data: {tlId?: number; notes?: string;}): Promise<WoDetail & { message: string }> {
    return this.post<WoDetail & { message: string }>(`/${id}/accept`, data);
  }

  async requestAmendment(id: number, data: RequestAmendmentDto): Promise<WoDetail & { message: string; amendmentsCreated: number }> {
    return this.post<WoDetail & { message: string; amendmentsCreated: number }>(`/${id}/request-amendment`, data);
  }

  async makeAcceptanceDecision(id: number, data: WoAcceptanceDecisionDto): Promise<WoDetail & { message: string }> {
    return this.post<WoDetail & { message: string }>(`/${id}/acceptance-decision`, data);
  }

  async getAcceptanceStatus(id: number): Promise<AcceptanceStatus> {
    return this.get<AcceptanceStatus>(`/${id}/acceptance-status`);
  }

  async getTimeline(id: number): Promise<WoTimeline> {
    return this.get<WoTimeline>(`/${id}/timeline`);
  }

  // ============================================
  // Dashboard/Reporting
  // ============================================

  async getDashboardSummary(teamId?: number): Promise<WoDetailsDashboardSummary> {
    const query = teamId ? `?teamId=${teamId}` : '';
    return this.get<WoDetailsDashboardSummary>(`/dashboard/summary${query}`);
  }

  async getPendingAcceptance(): Promise<{ count: number; data: WoDetail[] }> {
    return this.get<{ count: number; data: WoDetail[] }>('/dashboard/pending-acceptance');
  }

  async getAllPendingQueries(): Promise<{ count: number; data: any[] }> {
    return this.get<{ count: number; data: any[] }>('/dashboard/pending-queries');
  }

  async getAmendmentsSummary(): Promise<any> {
    return this.get<any>('/dashboard/amendments-summary');
  }

  async getSlaComplianceReport(): Promise<SlaComplianceReport> {
    return this.get<SlaComplianceReport>('/dashboard/sla-compliance');
  }
}

export const woDetailsService = new WoDetailsService();
