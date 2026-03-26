import { BaseApiService } from './base.service';
import type { WoDetail, WoDetailWithRelations, CreateWoDetailDto, UpdateWoDetailDto, WoAcceptanceDecisionDto, WoDetailsFilters, WoTimeline, WoDetailsDashboardSummary, SlaComplianceReport, PaginatedResult, RequestAmendmentDto, AcceptanceStatus } from '@/modules/operations/types/wo.types';
import type { WizardProgress, WizardValidationResult, Page1FormValues, Page2FormValues, Page3FormValues, Page4FormValues, Page5FormValues, Page6FormValues, Page7FormValues, Contact } from '@/modules/operations/wo-details/helpers/woDetail.types';

// TYPES
type PageFormValues =
  | Page1FormValues
  | Page2FormValues
  | Page3FormValues
  | Page4FormValues
  | Page5FormValues
  | Page6FormValues
  | Page7FormValues;

interface WizardProgressResponse extends WizardProgress {
  percentComplete: number;
  canSubmitForReview: boolean;
  blockers: string[];
}

interface WizardInitResponse {
  id: number;
  woBasicDetailId: number;
  status: string;
  currentPage: number;
  createdAt: string;
}

interface PageSubmitResponse extends WoDetail {
  message: string;
  nextPage?: number;
}

interface ImportContactsResponse {
  contacts: Contact[];
  importedCount: number;
}

interface CostingSheetData {
  budgetPreGst: string;
  budgetSupply: string;
  budgetService: string;
  budgetFreight: string;
  budgetAdmin: string;
  budgetBuybackSale: string;
  costingSheetLink?: string;
}

interface AmendmentsSummary {
  totalAmendments: number;
  pendingAmendments: number;
  resolvedAmendments: number;
  byClause: Array<{ clause: string; count: number }>;
}

interface PendingQueriesResponse {
  count: number;
  data: Array<{
    id: number;
    woDetailId: number;
    query: string;
    status: string;
    createdAt: string;
  }>;
}

// SERVICE CLASS
class WoDetailsService extends BaseApiService {
  constructor() {
    super('/wo-details');
  }


  // PRIVATE HELPERS
  private buildQueryString(filters?: WoDetailsFilters): string {
    if (!filters) return '';

    const params = new URLSearchParams();

    // Pagination
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));

    // Sorting
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

    // Team/User Scope
    if (filters.teamId) params.set('teamId', String(filters.teamId));
    if (filters.userId) params.set('userId', String(filters.userId));
    if (filters.dataScope) params.set('dataScope', filters.dataScope);

    // Filters
    if (filters.search) params.set('search', filters.search);
    if (filters.woAcceptance !== undefined) params.set('woAcceptance', String(filters.woAcceptance));
    if (filters.woAmendmentNeeded !== undefined) params.set('woAmendmentNeeded', String(filters.woAmendmentNeeded));
    if (filters.ldApplicable !== undefined) params.set('ldApplicable', String(filters.ldApplicable));
    if (filters.status) params.set('status', filters.status);

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  // WIZARD OPERATIONS (ESSENTIAL FOR FORMS)
  async initializeWizard(woBasicDetailId: number): Promise<WizardInitResponse> {
    return this.post<WizardInitResponse>('/initialize', { woBasicDetailId });
  }

  async getWizardProgress(id: number): Promise<WizardProgressResponse> {
    return this.get<WizardProgressResponse>(`/${id}/wizard/progress`);
  }

  async validateWizard(id: number): Promise<WizardValidationResult> {
    return this.get<WizardValidationResult>(`/${id}/wizard/validate`);
  }

  async getPageData<T = PageFormValues>(woDetailId: number, pageNum: number): Promise<T> {
    return this.get<T>(`/${woDetailId}/wizard/pages/${pageNum}`);
  }

  async savePageDraft(woDetailId: number, pageNum: number, data: PageFormValues): Promise<WoDetail> {
    return this.patch<WoDetail>(`/${woDetailId}/wizard/pages/${pageNum}/draft`, data);
  }

  async savePage(woDetailId: number, pageNum: number, data: PageFormValues): Promise<WoDetail> {
    return this.post<WoDetail>(`/${woDetailId}/wizard/pages/${pageNum}/save`, data);
  }

  async submitPage(woDetailId: number, pageNum: number, data: PageFormValues): Promise<PageSubmitResponse> {
    return this.post<PageSubmitResponse>(`/${woDetailId}/wizard/pages/${pageNum}/submit`, data);
  }

  async skipPage(woDetailId: number, pageNum: number, reason?: string): Promise<WoDetail> {
    return this.post<WoDetail>(`/${woDetailId}/wizard/pages/${pageNum}/skip`, { reason });
  }

  async submitForReview(woDetailId: number): Promise<WoDetail & { message: string }> {
    return this.post<WoDetail & { message: string }>(`/${woDetailId}/wizard/submit-for-review`);
  }

  // IMPORT & INTEGRATION METHODS
  async importTenderContacts(woBasicDetailId: number, woDetailId: number): Promise<ImportContactsResponse> {
    return this.post<ImportContactsResponse>(`/${woDetailId}/import-tender-contacts`, {
      woBasicDetailId,
    });
  }

  async getCostingSheetData(woBasicDetailId: number): Promise<CostingSheetData> {
    return this.get<CostingSheetData>(`/costing-sheet/${woBasicDetailId}`);
  }

  // CRUD OPERATIONS
  async getAll(filters?: WoDetailsFilters): Promise<PaginatedResult<WoDetail>> {
    return this.get<PaginatedResult<WoDetail>>(this.buildQueryString(filters));
  }

  async getById(id: number): Promise<WoDetail> {
    return this.get<WoDetail>(`/${id}`);
  }

  async getByIdWithRelations(id: number): Promise<WoDetailWithRelations> {
    return this.get<WoDetailWithRelations>(`/${id}/with-relations`);
  }

  async getByWoBasicDetailId(woBasicDetailId: number): Promise<WoDetail | null> {
    return this.get<WoDetail | null>(`/by-basic-detail/${woBasicDetailId}`);
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

  // ACCEPTANCE WORKFLOW
  async acceptWo(id: number, data: { tlId?: number; notes?: string }): Promise<WoDetail & { message: string }> {
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

  // DASHBOARD & REPORTING
  async getDashboardSummary(teamId?: number): Promise<WoDetailsDashboardSummary> {
    const query = teamId ? `?teamId=${teamId}` : '';
    return this.get<WoDetailsDashboardSummary>(`/dashboard/summary${query}`);
  }

  async getPendingAcceptance(): Promise<{ count: number; data: WoDetail[] }> {
    return this.get<{ count: number; data: WoDetail[] }>('/dashboard/pending-acceptance');
  }

  async getAllPendingQueries(): Promise<PendingQueriesResponse> {
    return this.get<PendingQueriesResponse>('/dashboard/pending-queries');
  }

  async getAmendmentsSummary(): Promise<AmendmentsSummary> {
    return this.get<AmendmentsSummary>('/dashboard/amendments-summary');
  }

  async getSlaComplianceReport(): Promise<SlaComplianceReport> {
    return this.get<SlaComplianceReport>('/dashboard/sla-compliance');
  }
}

// EXPORT SINGLETON INSTANCE
export const woDetailsService = new WoDetailsService();
