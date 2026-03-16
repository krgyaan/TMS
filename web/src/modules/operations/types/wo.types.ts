// ============================================
// COMMON TYPES
// ============================================

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export type SortOrder = 'asc' | 'desc';

// ============================================
// WO BASIC DETAILS TYPES
// ============================================

export type WorkflowStage =
  | 'basic_details'
  | 'wo_details'
  | 'wo_acceptance'
  | 'wo_upload'
  | 'completed';

export type OeAssignmentType = 'first' | 'siteVisit' | 'docsPrep';

export interface WoBasicDetail {
  id: number;
  tenderId: number | null;
  enquiryId: number | null;
  woNumber: string | null;
  woDate: string | null;
  projectCode: string;
  projectName: string | null;
  currentStage: WorkflowStage;
  woValuePreGst: string | null;
  woValueGstAmt: string | null;
  receiptPreGst: string | null;
  budgetPreGst: string | null;
  grossMargin: string | null;
  wo_draft: string | null;
  teChecklistConfirmed: boolean | null;
  tmsDocuments: Record<string, boolean> | null;
  oeFirst: number | null;
  oeFirstAssignedAt: string | null;
  oeFirstAssignedBy: number | null;
  oeSiteVisit: number | null;
  oeSiteVisitAssignedAt: string | null;
  oeSiteVisitAssignedBy: number | null;
  oeDocsPrep: number | null;
  oeDocsPrepVisitAssignedAt: string | null;
  oeDocsPrepVisitAssignedBy: number | null;
  isWorkflowPaused: boolean;
  workflowPausedAt: string | null;
  workflowResumedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WoBasicDetailWithRelations extends WoBasicDetail {
  contacts: WoContact[];
  woDetail: WoDetail | null;
}

export interface CreateWoBasicDetailDto {
  tenderId?: number;
  enquiryId?: number;
  woNumber?: string;
  woDate?: string;
  projectCode?: string;
  projectName?: string;
  currentStage?: WorkflowStage;
  woValuePreGst?: string;
  woValueGstAmt?: string;
  receiptPreGst?: string;
  budgetPreGst?: string;
  grossMargin?: string;
  wo_draft?: string;
  teChecklistConfirmed?: boolean;
  tmsDocuments?: Record<string, boolean>;
}

export interface UpdateWoBasicDetailDto extends Partial<Omit<CreateWoBasicDetailDto, 'tenderId' | 'enquiryId'>> {}

export interface AssignOeDto {
  assignmentType: OeAssignmentType;
  oeUserId: number;
  assignedBy?: number;
}

export interface BulkAssignOeDto {
  assignments: Array<{
    assignmentType: OeAssignmentType;
    oeUserId: number;
  }>;
  assignedBy?: number;
}

export interface RemoveOeAssignmentDto {
  assignmentType: OeAssignmentType;
}

export interface PauseWorkflowDto {
  reason?: string;
}

export interface ResumeWorkflowDto {
  editedPoDocument?: string;
  notes?: string;
}

export interface UpdateWorkflowStageDto {
  currentStage: WorkflowStage;
}

export interface WoBasicDetailsFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  search?: string;
  tenderId?: number;
  enquiryId?: number;
  projectCode?: string;
  projectName?: string;
  currentStage?: WorkflowStage;
  oeFirst?: number;
  oeSiteVisit?: number;
  oeDocsPrep?: number;
  isWorkflowPaused?: boolean;
  woDateFrom?: string;
  woDateTo?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
}

export interface OeAssignment {
  oeUserId: number;
  assignedAt: string | null;
  assignedBy: number | null;
}

export interface OeAssignments {
  woBasicDetailId: number;
  assignments: {
    first: OeAssignment | null;
    siteVisit: OeAssignment | null;
    docsPrep: OeAssignment | null;
  };
}

export interface DashboardSummary {
  summary: {
    total: number;
    basicDetails: number;
    woDetails: number;
    woAcceptance: number;
    woUpload: number;
    completed: number;
    paused: number;
  };
  generatedAt: string;
}

export interface WorkflowStatusSummary {
  totalActive: number;
  totalPaused: number;
  avgGrossMargin: string | null;
  totalWoValue: string | null;
  generatedAt: string;
}

// ============================================
// WO DETAILS TYPES
// ============================================

export interface WoDetail {
  id: number;
  woBasicDetailId: number;
  ldApplicable: boolean;
  maxLd: string | null;
  ldStartDate: string | null;
  maxLdDate: string | null;
  isPbgApplicable: boolean;
  filledBgFormat: string | null;
  isContractAgreement: boolean;
  contractAgreementFormat: string | null;
  budgetPreGst: string | null;
  woAcceptance: boolean;
  woAcceptanceAt: string | null;
  woAmendmentNeeded: boolean;
  followupId: number | null;
  courierId: number | null;
  tlId: number | null;
  tlQueryRaisedAt: string | null;
  tlFinalDecisionAt: string | null;
  status: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WoDetailWithRelations extends WoDetail {
  amendments: WoAmendment[];
  documents: WoDocument[];
  queries: WoQuery[];
  woBasicDetail: WoBasicDetail | null;
}

export interface CreateWoDetailDto {
  woBasicDetailId: number;
  ldApplicable?: boolean;
  maxLd?: string;
  ldStartDate?: string;
  maxLdDate?: string;
  isPbgApplicable?: boolean;
  filledBgFormat?: string;
  isContractAgreement?: boolean;
  contractAgreementFormat?: string;
  budgetPreGst?: string;
  status?: boolean;
}

export interface UpdateWoDetailDto extends Partial<Omit<CreateWoDetailDto, 'woBasicDetailId'>> {}

export interface AcceptWoDto {
  tlId?: number;
  notes?: string;
}

export interface RequestAmendmentDto {
  tlId?: number;
  reason: string;
  amendments: Array<{
    pageNo: string;
    clauseNo: string;
    currentStatement: string;
    correctedStatement: string;
  }>;
  followupRequired?: boolean;
}

export interface WoAcceptanceDecisionDto {
  accepted: boolean;
  tlId?: number;
  notes?: string;
  amendmentReason?: string;
  amendments?: Array<{
    pageNo: string;
    clauseNo: string;
    currentStatement: string;
    correctedStatement: string;
  }>;
}

export interface WoDetailsFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  woBasicDetailId?: number;
  ldApplicable?: boolean;
  isPbgApplicable?: boolean;
  isContractAgreement?: boolean;
  woAcceptance?: boolean;
  woAmendmentNeeded?: boolean;
  status?: boolean;
  tlId?: number;
  ldStartDateFrom?: string;
  ldStartDateTo?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  woAcceptanceAtFrom?: string;
  woAcceptanceAtTo?: string;
}

export interface AcceptanceStatus {
  woDetailId: number;
  isAccepted: boolean;
  acceptedAt: string | null;
  amendmentNeeded: boolean;
  tlId: number | null;
  tlFinalDecisionAt: string | null;
  followupId: number | null;
  courierId: number | null;
}

export interface TimelineEvent {
  event: string;
  timestamp: string | null;
  type: string;
}

export interface WoTimeline {
  woDetailId: number;
  timeline: TimelineEvent[];
  sla: {
    queryDeadline: string;
    isQueryOverdue: boolean;
  };
}

export interface WoDetailsDashboardSummary {
  summary: {
    total: number;
    accepted: number;
    pending: number;
    amendmentNeeded: number;
    active: number;
    ldApplicable: number;
    pbgApplicable: number;
  };
  generatedAt: string;
}

export interface SlaComplianceReport {
  totalRecords: number;
  compliantRecords: number;
  complianceRate: string;
  details: Array<{
    woDetailId: number;
    woBasicDetailId: number;
    createdAt: string;
    queryOnTime: boolean;
    responseOnTime: boolean;
    decisionOnTime: boolean;
    isAccepted: boolean;
    isCompliant: boolean;
  }>;
  generatedAt: string;
}

// ============================================
// WO CONTACTS TYPES
// ============================================

export type Department = 'EIC' | 'User' | 'C&P' | 'Finance';

export interface WoContact {
  id: number;
  woBasicDetailId: number;
  organization: string | null;
  departments: Department | null;
  name: string | null;
  designation: string | null;
  phone: string | null;
  email: string | null;
}

export interface CreateWoContactDto {
  woBasicDetailId: number;
  organization?: string;
  departments?: Department;
  name?: string;
  designation?: string;
  phone?: string;
  email?: string;
}

export interface UpdateWoContactDto extends Partial<Omit<CreateWoContactDto, 'woBasicDetailId'>> {}

export interface CreateBulkWoContactsDto {
  woBasicDetailId: number;
  contacts: Array<Omit<CreateWoContactDto, 'woBasicDetailId'>>;
}

export interface WoContactsFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  search?: string;
  woBasicDetailId?: number;
  organization?: string;
  departments?: Department;
  name?: string;
  email?: string;
}

export interface ContactsSummary {
  woBasicDetailId: number;
  summary: {
    total: number;
    eicCount: number;
    userCount: number;
    cpCount: number;
    financeCount: number;
    withEmail: number;
    withPhone: number;
  };
}

// ============================================
// WO AMENDMENTS TYPES
// ============================================

export interface WoAmendment {
  id: number;
  woDetailId: number;
  pageNo: string;
  clauseNo: string;
  currentStatement: string;
  correctedStatement: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWoAmendmentDto {
  woDetailId: number;
  pageNo: string;
  clauseNo: string;
  currentStatement: string;
  correctedStatement: string;
}

export interface UpdateWoAmendmentDto extends Partial<Omit<CreateWoAmendmentDto, 'woDetailId'>> {}

export interface CreateBulkWoAmendmentsDto {
  woDetailId: number;
  amendments: Array<Omit<CreateWoAmendmentDto, 'woDetailId'>>;
}

export interface WoAmendmentsFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  search?: string;
  woDetailId?: number;
  pageNo?: string;
  clauseNo?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
}

export interface AmendmentsSummary {
  woDetailId: number;
  summary: {
    total: number;
    uniquePages: number;
    uniqueClauses: number;
  };
  byPage: Array<{
    pageNo: string;
    count: number;
  }>;
}

export interface TopClausesStatistics {
  topClauses: Array<{
    clauseNo: string;
    count: number;
  }>;
  topPages: Array<{
    pageNo: string;
    count: number;
  }>;
  generatedAt: string;
}

// ============================================
// WO DOCUMENTS TYPES
// ============================================

export type DocumentType =
  | 'draftWo'
  | 'acceptedWoSigned'
  | 'finalWo'
  | 'detailedWo'
  | 'sapPo'
  | 'foa';

export interface WoDocument {
  id: number;
  woDetailId: number;
  type: DocumentType;
  version: number;
  filePath: string;
  uploadedAt: string;
}

export interface CreateWoDocumentDto {
  woDetailId: number;
  type: DocumentType;
  version?: number;
  filePath: string;
}

export interface UpdateWoDocumentDto {
  version?: number;
  filePath?: string;
}

export interface CreateBulkWoDocumentsDto {
  woDetailId: number;
  documents: Array<Omit<CreateWoDocumentDto, 'woDetailId'>>;
}

export interface ReplaceDocumentDto {
  filePath: string;
  incrementVersion?: boolean;
}

export interface WoDocumentsFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  woDetailId?: number;
  type?: DocumentType;
  version?: number;
  uploadedFrom?: string;
  uploadedTo?: string;
}

export interface VersionHistory {
  woDetailId: number;
  type: DocumentType;
  totalVersions: number;
  latestVersion: number | null;
  versions: WoDocument[];
}

export interface DocumentsSummary {
  woDetailId: number;
  summary: {
    total: number;
    draftWo: number;
    acceptedWoSigned: number;
    finalWo: number;
    detailedWo: number;
    sapPo: number;
    foa: number;
  };
  latestVersions: Array<{
    type: DocumentType;
    latestVersion: number;
  }>;
}

export interface DocumentsOverviewStatistics {
  overview: {
    totalDocuments: number;
    totalWoDetails: number;
    avgVersionsPerType: string;
  };
  byType: Array<{
    type: DocumentType;
    count: number;
    avgVersion: string;
  }>;
  generatedAt: string;
}

// ============================================
// WO QUERIES TYPES
// ============================================

export type QueryTo = 'TE' | 'OE' | 'BOTH';
export type QueryStatus = 'pending' | 'responded' | 'closed';

export interface WoQuery {
  id: number;
  woDetailId: number;
  queryBy: number;
  queryTo: QueryTo;
  queryText: string;
  queryRaisedAt: string;
  responseText: string | null;
  respondedBy: number | null;
  respondedAt: string | null;
  status: QueryStatus;
  createdAt: string;
}

export interface WoQueryWithOverdue extends WoQuery {
  isOverdue: boolean;
  responseDeadline: string;
  hoursOverdue?: number;
}

export interface CreateWoQueryDto {
  woDetailId: number;
  queryBy: number;
  queryTo: QueryTo;
  queryText: string;
}

export interface CreateBulkWoQueriesDto {
  woDetailId: number;
  queryBy: number;
  queries: Array<{
    queryTo: QueryTo;
    queryText: string;
  }>;
}

export interface RespondToQueryDto {
  responseText: string;
  respondedBy: number;
}

export interface CloseQueryDto {
  closedBy?: number;
  closureNotes?: string;
}

export interface UpdateQueryStatusDto {
  status: QueryStatus;
}

export interface WoQueriesFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  search?: string;
  woDetailId?: number;
  status?: QueryStatus;
  queryTo?: QueryTo;
  queryBy?: number;
  respondedBy?: number;
  queryRaisedFrom?: string;
  queryRaisedTo?: string;
  respondedFrom?: string;
  respondedTo?: string;
}

export interface QueriesDashboardSummary {
  summary: {
    total: number;
    pending: number;
    responded: number;
    closed: number;
    toTe: number;
    toOe: number;
    toBoth: number;
    overdue: number;
  };
  slaThresholds: {
    queryRaiseSlaHours: number;
    responseSlaHours: number;
    finalDecisionSlaHours: number;
  };
  generatedAt: string;
}

export interface ResponseTimeStatistics {
  totalResponded: number;
  avgResponseTimeHours: number | null;
  minResponseTimeHours: number | null;
  maxResponseTimeHours: number | null;
  withinSlaPct: number | null;
  slaTresholdHours: number;
  generatedAt: string;
}

export interface UserQueryStatistics {
  userId: number;
  queriesRaised: {
    total: number;
    pending: number;
    responded: number;
    closed: number;
  };
  queriesAnswered: number;
  generatedAt: string;
}

export interface SlaStatus {
  woDetailId: number;
  totalQueries: number;
  pendingQueries: number;
  overdueQueries: number;
  slaComplianceRate: string;
  slaThresholdHours: number;
  details: Array<{
    queryId: number;
    status: QueryStatus;
    queryRaisedAt: string;
    responseDeadline: string;
    respondedAt: string | null;
    responseTimeHours: number | null;
    withinSla: boolean | null;
    isOverdue: boolean;
  }>;
}
