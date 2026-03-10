import { BaseApiService } from './base.service';
import type {
  WoBasicDetail,
  WoBasicDetailWithRelations,
  CreateWoBasicDetailDto,
  UpdateWoBasicDetailDto,
  AssignOeDto,
  BulkAssignOeDto,
  RemoveOeAssignmentDto,
  PauseWorkflowDto,
  ResumeWorkflowDto,
  UpdateWorkflowStageDto,
  WoBasicDetailsFilters,
  OeAssignments,
  DashboardSummary,
  WorkflowStatusSummary,
  PaginatedResult,
} from '@/modules/operations/types/wo.types';

class WoBasicDetailsService extends BaseApiService {
  constructor() {
    super('/wo-basic-details');
  }

  private buildQueryString(filters?: WoBasicDetailsFilters): string {
    if (!filters) return '';

    const params = new URLSearchParams();

    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters.search) params.set('search', filters.search);
    if (filters.tenderId) params.set('tenderId', String(filters.tenderId));
    if (filters.enquiryId) params.set('enquiryId', String(filters.enquiryId));
    if (filters.projectCode) params.set('projectCode', filters.projectCode);
    if (filters.projectName) params.set('projectName', filters.projectName);
    if (filters.currentStage) params.set('currentStage', filters.currentStage);
    if (filters.oeFirst) params.set('oeFirst', String(filters.oeFirst));
    if (filters.oeSiteVisit) params.set('oeSiteVisit', String(filters.oeSiteVisit));
    if (filters.oeDocsPrep) params.set('oeDocsPrep', String(filters.oeDocsPrep));
    if (filters.isWorkflowPaused !== undefined) {
      params.set('isWorkflowPaused', String(filters.isWorkflowPaused));
    }
    if (filters.woDateFrom) params.set('woDateFrom', filters.woDateFrom);
    if (filters.woDateTo) params.set('woDateTo', filters.woDateTo);
    if (filters.createdAtFrom) params.set('createdAtFrom', filters.createdAtFrom);
    if (filters.createdAtTo) params.set('createdAtTo', filters.createdAtTo);

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  // CRUD Operations
  async getAll(filters?: WoBasicDetailsFilters): Promise<PaginatedResult<WoBasicDetail>> {
    return this.get<PaginatedResult<WoBasicDetail>>(this.buildQueryString(filters));
  }

  async getById(id: number): Promise<WoBasicDetail> {
    return this.get<WoBasicDetail>(`/${id}`);
  }

  async getByIdWithRelations(id: number): Promise<WoBasicDetailWithRelations> {
    return this.get<WoBasicDetailWithRelations>(`/${id}/with-relations`);
  }

  async create(data: CreateWoBasicDetailDto): Promise<WoBasicDetail> {
    return this.post<WoBasicDetail>('', data);
  }

  async update(id: number, data: UpdateWoBasicDetailDto): Promise<WoBasicDetail> {
    return this.patch<WoBasicDetail>(`/${id}`, data);
  }

  async remove(id: number): Promise<void> {
    return this.delete(`/${id}`);
  }

  // OE Assignment Operations
  async assignOe(id: number, data: AssignOeDto): Promise<WoBasicDetail> {
    return this.post<WoBasicDetail>(`/${id}/assign-oe`, data);
  }

  async bulkAssignOe(id: number, data: BulkAssignOeDto): Promise<WoBasicDetail> {
    return this.post<WoBasicDetail>(`/${id}/bulk-assign-oe`, data);
  }

  async removeOeAssignment(id: number, data: RemoveOeAssignmentDto): Promise<WoBasicDetail> {
    return this.delete<WoBasicDetail>(`/${id}/remove-oe-assignment`, { data });
  }

  async getOeAssignments(id: number): Promise<OeAssignments> {
    return this.get<OeAssignments>(`/${id}/oe-assignments`);
  }

  // Workflow Control Operations
  async pauseWorkflow(id: number, data?: PauseWorkflowDto): Promise<WoBasicDetail & { message: string }> {
    return this.post<WoBasicDetail & { message: string }>(`/${id}/pause-workflow`, data || {});
  }

  async resumeWorkflow(id: number, data?: ResumeWorkflowDto): Promise<WoBasicDetail & { message: string }> {
    return this.post<WoBasicDetail & { message: string }>(`/${id}/resume-workflow`, data || {});
  }

  async updateWorkflowStage(id: number, data: UpdateWorkflowStageDto): Promise<WoBasicDetail> {
    return this.patch<WoBasicDetail>(`/${id}/workflow-stage`, data);
  }

  // Utility Operations
  async checkProjectCodeExists(projectCode: string): Promise<{ exists: boolean; projectCode: string }> {
    return this.get<{ exists: boolean; projectCode: string }>(`/check-project-code/${projectCode}`);
  }

  async calculateGrossMargin(id: number): Promise<WoBasicDetail & { calculatedGrossMargin: string }> {
    return this.post<WoBasicDetail & { calculatedGrossMargin: string }>(`/${id}/calculate-gross-margin`, {});
  }

  async getByTenderId(tenderId: number): Promise<WoBasicDetail[]> {
    return this.get<WoBasicDetail[]>(`/by-tender/${tenderId}`);
  }

  async getByEnquiryId(enquiryId: number): Promise<WoBasicDetail[]> {
    return this.get<WoBasicDetail[]>(`/by-enquiry/${enquiryId}`);
  }

  // Dashboard/Reporting
  async getDashboardSummary(): Promise<DashboardSummary> {
    return this.get<DashboardSummary>('/dashboard/summary');
  }

  async getPendingOeAssignments(): Promise<{ count: number; data: WoBasicDetail[] }> {
    return this.get<{ count: number; data: WoBasicDetail[] }>('/dashboard/pending-assignments');
  }

  async getWorkflowStatusSummary(): Promise<WorkflowStatusSummary> {
    return this.get<WorkflowStatusSummary>('/dashboard/workflow-status');
  }
}

export const woBasicDetailsService = new WoBasicDetailsService();
