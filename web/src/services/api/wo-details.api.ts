import { BaseApiService } from './base.service';
import type {
  WoDetail,
  WoDetailWithRelations,
  CreateWoDetailDto,
  UpdateWoDetailDto,
  AcceptWoDto,
  RequestAmendmentDto,
  WoAcceptanceDecisionDto,
  WoDetailsFilters,
  AcceptanceStatus,
  WoTimeline,
  WoDetailsDashboardSummary,
  SlaComplianceReport,
  PaginatedResult,
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
    if (filters.woBasicDetailId) params.set('woBasicDetailId', String(filters.woBasicDetailId));
    if (filters.ldApplicable !== undefined) params.set('ldApplicable', String(filters.ldApplicable));
    if (filters.isPbgApplicable !== undefined) params.set('isPbgApplicable', String(filters.isPbgApplicable));
    if (filters.isContractAgreement !== undefined) params.set('isContractAgreement', String(filters.isContractAgreement));
    if (filters.woAcceptance !== undefined) params.set('woAcceptance', String(filters.woAcceptance));
    if (filters.woAmendmentNeeded !== undefined) params.set('woAmendmentNeeded', String(filters.woAmendmentNeeded));
    if (filters.status !== undefined) params.set('status', String(filters.status));
    if (filters.tlId) params.set('tlId', String(filters.tlId));
    if (filters.ldStartDateFrom) params.set('ldStartDateFrom', filters.ldStartDateFrom);
    if (filters.ldStartDateTo) params.set('ldStartDateTo', filters.ldStartDateTo);
    if (filters.createdAtFrom) params.set('createdAtFrom', filters.createdAtFrom);
    if (filters.createdAtTo) params.set('createdAtTo', filters.createdAtTo);
    if (filters.woAcceptanceAtFrom) params.set('woAcceptanceAtFrom', filters.woAcceptanceAtFrom);
    if (filters.woAcceptanceAtTo) params.set('woAcceptanceAtTo', filters.woAcceptanceAtTo);

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  // CRUD Operations
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

  // WO Acceptance Workflow
  async acceptWo(id: number, data: AcceptWoDto): Promise<WoDetail & { message: string }> {
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

  // Dashboard/Reporting
  async getDashboardSummary(): Promise<WoDetailsDashboardSummary> {
    return this.get<WoDetailsDashboardSummary>('/dashboard/summary');
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
