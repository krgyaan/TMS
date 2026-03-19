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
// ENUMS
// ============================================

export type WorkflowStage =
  | 'basic_details'
  | 'wo_details'
  | 'wo_acceptance'
  | 'wo_upload'
  | 'completed';

export type WoDetailsStatus =
  | 'draft'
  | 'in_progress'
  | 'completed'
  | 'submitted_for_review';

export type WoAcceptanceStatus =
  | 'pending_review'
  | 'in_review'
  | 'queries_pending'
  | 'awaiting_amendment'
  | 'pending_signatures'
  | 'pending_courier'
  | 'completed';

export type WoAcceptanceDecision =
  | 'pending'
  | 'queries_raised'
  | 'accepted'
  | 'amendment_needed'
  | 'rejected';

export type AmendmentStatus =
  | 'draft'
  | 'submitted'
  | 'tl_approved'
  | 'tl_rejected'
  | 'communicated'
  | 'client_acknowledged'
  | 'resolved'
  | 'rejected_by_client';

export type AmendmentCreatorRole = 'OE' | 'TE' | 'TL';

export type QueryStatus = 'pending' | 'responded' | 'closed' | 'escalated';

export type QueryTo = 'TE' | 'OE' | 'BOTH';

export type DocumentType =
  | 'draftWo'
  | 'acceptedWoSigned'
  | 'finalWo'
  | 'detailedWo'
  | 'sapPo'
  | 'foa';

export type Department = 'EIC' | 'User' | 'C&P' | 'Finance';

export type OeAssignmentType = 'first' | 'siteVisit' | 'docsPrep';

// ============================================
// WO BASIC DETAILS
// ============================================

export interface TmsDocuments {
  completeTenderDocuments?: boolean;
  tenderInfo?: boolean;
  emdInformation?: boolean;
  physicalDocumentsSubmission?: boolean;
  rfqAndQuotation?: boolean;
  documentChecklist?: boolean;
  costingSheet?: boolean;
  result?: boolean;
  [key: string]: boolean | undefined;
}

export interface WoBasicDetail {
  id: number;
  tenderId: number | null;
  enquiryId: number | null;
  woNumber: string | null;
  woDate: string | null;
  projectCode: string | null;
  projectName: string | null;
  currentStage: WorkflowStage | null;
  woValuePreGst: string | null;
  woValueGstAmt: string | null;
  receiptPreGst: string | null;
  budgetPreGst: string | null;
  grossMargin: string | null;
  woDraft: string | null;
  tmsDocuments: TmsDocuments | null;
  oeFirst: number | null;
  oeFirstName: string | null;
  oeFirstAssignedAt: string | null;
  oeFirstAssignedBy: number | null;
  oeSiteVisit: number | null;
  oeSiteVisitName: string | null;
  oeSiteVisitAssignedAt: string | null;
  oeSiteVisitAssignedBy: number | null;
  oeDocsPrep: number | null;
  oeDocsPrepName: string | null;
  oeDocsPrepAssignedAt: string | null;
  oeDocsPrepAssignedBy: number | null;
  isWorkflowPaused: boolean;
  workflowPausedAt: string | null;
  workflowResumedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  updatedBy: number | null;
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
  woDraft?: string;
  tmsDocuments?: TmsDocuments;
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

export interface WoBasicDetailsFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  tenderId?: number;
  enquiryId?: number;
  teamId?: number;
  userId?: number;
  dataScope?: string;
  unallocated?: boolean;
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
  status?: number[];
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

export interface WoBasicDetailsDashboardSummary {
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

// ============================================
// WO CONTACTS
// ============================================

export interface WoContact {
  id: number;
  woBasicDetailId: number;
  organization: string | null;
  departments: Department | null;
  name: string | null;
  designation: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface UpdateWoContactDto {
  organization?: string;
  departments?: Department;
  name?: string;
  designation?: string;
  phone?: string;
  email?: string;
}

export interface CreateBulkWoContactsDto {
  woBasicDetailId: number;
  contacts: Omit<CreateWoContactDto, 'woBasicDetailId'>[];
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
}

export interface ContactsSummary {
  woBasicDetailId: number;
  total: number;
  byDepartment: Record<Department, number>;
}

// ============================================
// WO DETAILS (Wizard Pages 1-7)
// ============================================

export interface TenderDocumentsChecklist {
  completeTenderDocuments: boolean;
  tenderInfo: boolean;
  emdInformation: boolean;
  physicalDocumentsSubmission: boolean;
  rfqAndQuotation: boolean;
  documentChecklist: boolean;
  costingSheet: boolean;
  result: boolean;
}

export interface SiteVisitPerson {
  name: string;
  phone: string;
  email: string;
}

export interface WoDetail {
  id: number;
  woBasicDetailId: number;

  // Page 1: Project Handover
  tenderDocumentsChecklist: TenderDocumentsChecklist | null;
  checklistCompletedAt: string | null;
  checklistIncompleteNotifiedAt: string | null;

  // Page 2: Compliance Obligations
  ldApplicable: boolean;
  maxLd: string | null;
  ldStartDate: string | null;
  maxLdDate: string | null;
  isPbgApplicable: boolean;
  filledBgFormat: string | null;
  pbgBgId: number | null;
  isContractAgreement: boolean;
  contractAgreementFormat: string | null;
  detailedPoApplicable: boolean;
  detailedPoFollowupId: number | null;

  // Page 3: SWOT Analysis
  swotStrengths: string | null;
  swotWeaknesses: string | null;
  swotOpportunities: string | null;
  swotThreats: string | null;
  swotCompletedAt: string | null;

  // Page 4: Billing (BOQ & Addresses in separate tables)

  // Page 5: Project Execution
  siteVisitNeeded: boolean;
  siteVisitPerson: SiteVisitPerson | null;
  documentsFromTendering: string[] | null;
  documentsNeeded: string[] | null;
  documentsInHouse: string[] | null;

  // Page 6: Profitability
  costingSheetLink: string | null;
  hasDiscrepancies: boolean;
  discrepancyComments: string | null;
  discrepancyNotifiedAt: string | null;
  budgetPreGst: string | null;
  budgetSupply: string | null;
  budgetService: string | null;
  budgetFreight: string | null;
  budgetAdmin: string | null;
  budgetBuybackSale: string | null;

  // Page 7: WO Acceptance (OE Step)
  oeWoAmendmentNeeded: boolean | null;
  oeAmendmentSubmittedAt: string | null;
  oeSignaturePrepared: boolean;
  courierRequestPrepared: boolean;
  courierRequestPreparedAt: string | null;

  // Wizard Progress
  currentPage: number;
  completedPages: number[];
  skippedPages: number[];
  startedAt: string | null;
  completedAt: string | null;

  // Status
  status: WoDetailsStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  updatedBy: number | null;
}

export interface WoDetailWithRelations extends WoDetail {
  woBasicDetail?: WoBasicDetail;
  contacts?: WoContact[];
  billingBoq?: WoBillingBoq[];
  buybackBoq?: WoBuybackBoq[];
  billingAddresses?: WoBillingAddress[];
  shippingAddresses?: WoShippingAddress[];
  amendments?: WoAmendment[];
  queries?: WoQuery[];
  documents?: WoDocument[];
  acceptance?: WoAcceptance | null;
}

export interface WoDetailsListResponseDto {
  id: number;
  woBasicDetailId: number;
  projectName: string;
  woNumber: string;
  woDate: string;
  woValuePreGst: string;
  woValueGstAmt: string;
  ldApplicable: boolean;
  isContractAgreement: boolean;
  oeWoAmendmentNeeded: boolean;
  status: WoDetailsStatus;
  woAcceptanceId: number | null;
  woAcceptanceStatus: WoAcceptanceStatus | null;
}

export interface CreateWoDetailDto {
  woBasicDetailId: number;
}

export interface UpdateWoDetailDto {
  // Page 1
  tenderDocumentsChecklist?: TenderDocumentsChecklist;

  // Page 2
  ldApplicable?: boolean;
  maxLd?: string;
  ldStartDate?: string;
  maxLdDate?: string;
  isPbgApplicable?: boolean;
  filledBgFormat?: string;
  pbgBgId?: number;
  isContractAgreement?: boolean;
  contractAgreementFormat?: string;
  detailedPoApplicable?: boolean;
  detailedPoFollowupId?: number;

  // Page 3
  swotStrengths?: string;
  swotWeaknesses?: string;
  swotOpportunities?: string;
  swotThreats?: string;

  // Page 5
  siteVisitNeeded?: boolean;
  siteVisitPerson?: SiteVisitPerson;
  documentsFromTendering?: string[];
  documentsNeeded?: string[];
  documentsInHouse?: string[];

  // Page 6
  costingSheetLink?: string;
  hasDiscrepancies?: boolean;
  discrepancyComments?: string;
  budgetPreGst?: string;
  budgetSupply?: string;
  budgetService?: string;
  budgetFreight?: string;
  budgetAdmin?: string;
  budgetBuybackSale?: string;

  // Page 7
  oeWoAmendmentNeeded?: boolean;
  oeSignaturePrepared?: boolean;
  courierRequestPrepared?: boolean;

  // Wizard
  currentPage?: number;
  status?: WoDetailsStatus;
}

export interface WoDetailsFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  woBasicDetailId?: number;
  status?: WoDetailsStatus;
  ldApplicable?: boolean;
  isPbgApplicable?: boolean;
  isContractAgreement?: boolean;
  siteVisitNeeded?: boolean;
  hasDiscrepancies?: boolean;
  createdAtTo?: string;
  teamId?: number;
  userId?: number;
  dataScope?: string;
  woAcceptance?: boolean;
  woAmendmentNeeded?: boolean;
}

// Wizard-specific types
export interface WizardProgress {
  currentPage: number;
  completedPages: number[];
  skippedPages: number[];
  startedAt: string | null;
  completedAt: string | null;
  status: WoDetailsStatus;
  percentComplete: number;
  canSubmitForReview: boolean;
  blockers: string[];
}

export interface PageMetadata {
  pageNum: number;
  title: string;
  description: string;
  canSkip: boolean;
  isCompleted: boolean;
  isSkipped: boolean;
  isCurrent: boolean;
}

export interface WizardStatus {
  progress: WizardProgress;
  pages: PageMetadata[];
  woDetailId: number;
  woBasicDetailId: number;
}

// ============================================
// WO BILLING BOQ
// ============================================

export interface WoBillingBoq {
  id: number;
  woDetailId: number;
  srNo: number;
  itemDescription: string;
  quantity: string;
  rate: string;
  amount: string | null;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWoBillingBoqDto {
  woDetailId: number;
  srNo: number;
  itemDescription: string;
  quantity: string;
  rate: string;
  sortOrder?: number;
}

export interface UpdateWoBillingBoqDto {
  srNo?: number;
  itemDescription?: string;
  quantity?: string;
  rate?: string;
  sortOrder?: number;
}

export interface CreateBulkWoBillingBoqDto {
  woDetailId: number;
  items: Omit<CreateWoBillingBoqDto, 'woDetailId'>[];
}

// ============================================
// WO BUYBACK BOQ
// ============================================

export interface WoBuybackBoq {
  id: number;
  woDetailId: number;
  srNo: number;
  itemDescription: string;
  quantity: string;
  rate: string;
  amount: string | null;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWoBuybackBoqDto {
  woDetailId: number;
  srNo: number;
  itemDescription: string;
  quantity: string;
  rate: string;
  sortOrder?: number;
}

export interface UpdateWoBuybackBoqDto {
  srNo?: number;
  itemDescription?: string;
  quantity?: string;
  rate?: string;
  sortOrder?: number;
}

export interface CreateBulkWoBuybackBoqDto {
  woDetailId: number;
  items: Omit<CreateWoBuybackBoqDto, 'woDetailId'>[];
}

// ============================================
// WO BILLING ADDRESSES
// ============================================

export type SrNos = number[] | 'all';

export interface WoBillingAddress {
  id: number;
  woDetailId: number;
  srNos: SrNos;
  customerName: string;
  address: string;
  gst: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWoBillingAddressDto {
  woDetailId: number;
  srNos: SrNos;
  customerName: string;
  address: string;
  gst?: string;
}

export interface UpdateWoBillingAddressDto {
  srNos?: SrNos;
  customerName?: string;
  address?: string;
  gst?: string;
}

export interface CreateBulkWoBillingAddressDto {
  woDetailId: number;
  addresses: Omit<CreateWoBillingAddressDto, 'woDetailId'>[];
}

// ============================================
// WO SHIPPING ADDRESSES
// ============================================

export interface WoShippingAddress {
  id: number;
  woDetailId: number;
  srNos: SrNos;
  customerName: string;
  address: string;
  gst: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWoShippingAddressDto {
  woDetailId: number;
  srNos: SrNos;
  customerName: string;
  address: string;
  gst?: string;
}

export interface UpdateWoShippingAddressDto {
  srNos?: SrNos;
  customerName?: string;
  address?: string;
  gst?: string;
}

export interface CreateBulkWoShippingAddressDto {
  woDetailId: number;
  addresses: Omit<CreateWoShippingAddressDto, 'woDetailId'>[];
}

// ============================================
// WO ACCEPTANCE (TL Review)
// ============================================

export interface WoAcceptance {
  id: number;
  woDetailId: number;

  // Query tracking
  queryRaisedAt: string | null;
  queryRespondedAt: string | null;

  // Decision
  finalDecisionAt: string | null;
  decision: WoAcceptanceDecision | null;
  decisionRemarks: string | null;

  // Amendment tracking
  hasAmendmentsToReview: boolean;
  amendmentsReviewedAt: string | null;
  followupId: number | null;
  followupInitiatedAt: string | null;

  // Amended WO
  amendedWoReceivedAt: string | null;
  amendedWoFilePath: string | null;
  reReviewCount: number;

  // Acceptance
  acceptedAt: string | null;

  // OE Digital Signature
  oeSignatureRequired: boolean;
  oeSignedAt: string | null;
  oeSignedBy: number | null;
  oeSignatureFilePath: string | null;

  // TL Digital Signature
  tlSignatureRequired: boolean;
  tlSignedAt: string | null;
  tlSignedBy: number | null;
  tlSignatureFilePath: string | null;

  // Authority Letter
  authorityLetterGenerated: boolean;
  authorityLetterPath: string | null;
  authorityLetterGeneratedAt: string | null;

  // Final Signed WO
  signedWoFilePath: string | null;
  signedWoUploadedAt: string | null;
  signedWoUploadedBy: number | null;

  // Courier
  courierId: number | null;

  // Status
  status: WoAcceptanceStatus;
  isCompleted: boolean;
  completedAt: string | null;

  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  updatedBy: number | null;
}

export interface CreateWoAcceptanceDto {
  woDetailId: number;
}

export interface WoAcceptanceDecisionDto {
  decision: WoAcceptanceDecision;
  decisionRemarks?: string;
}

export interface SignWoDto {
  signatureFilePath: string;
}

export interface UploadSignedWoDto {
  signedWoFilePath: string;
}

export interface AcceptanceStatusResponse {
  woDetailId: number;
  status: WoAcceptanceStatus;
  decision: WoAcceptanceDecision | null;
  isAccepted: boolean;
  acceptedAt: string | null;
  hasAmendments: boolean;
  pendingSignatures: {
    oe: boolean;
    tl: boolean;
  };
  courierStatus: 'not_required' | 'pending' | 'sent';
}

// ============================================
// WO AMENDMENTS
// ============================================

export interface WoAmendment {
  id: number;
  woDetailId: number;
  createdByRole: AmendmentCreatorRole;
  pageNo: string | null;
  clauseNo: string | null;
  currentStatement: string | null;
  correctedStatement: string | null;
  tlApproved: boolean | null;
  tlRemarks: string | null;
  tlReviewedAt: string | null;
  status: AmendmentStatus;
  communicatedAt: string | null;
  communicatedBy: number | null;
  clientResponse: string | null;
  clientProof: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy: number | null;
}

export interface CreateWoAmendmentDto {
  woDetailId: number;
  createdByRole: AmendmentCreatorRole;
  pageNo?: string;
  clauseNo?: string;
  currentStatement?: string;
  correctedStatement?: string;
}

export interface UpdateWoAmendmentDto {
  pageNo?: string;
  clauseNo?: string;
  currentStatement?: string;
  correctedStatement?: string;
  status?: AmendmentStatus;
}

export interface CreateBulkWoAmendmentsDto {
  woDetailId: number;
  createdByRole: AmendmentCreatorRole;
  amendments: Omit<CreateWoAmendmentDto, 'woDetailId' | 'createdByRole'>[];
}

export interface TlReviewAmendmentDto {
  approved: boolean;
  remarks?: string;
}

export interface RecordClientResponseDto {
  response: string;
  proof?: string;
}

export interface WoAmendmentsFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  woDetailId?: number;
  status?: AmendmentStatus;
  createdByRole?: AmendmentCreatorRole;
  tlApproved?: boolean;
  createdAtFrom?: string;
  createdAtTo?: string;
}

export interface AmendmentsSummary {
  woDetailId: number;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  communicated: number;
  resolved: number;
}

// ============================================
// WO QUERIES
// ============================================

export interface WoQuery {
  id: number;
  woDetailsId: number;
  queryBy: number;
  queryTo: QueryTo;
  queryToUserIds: number[] | null;
  queryText: string;
  queryRaisedAt: string;
  responseText: string | null;
  respondedBy: number | null;
  respondedAt: string | null;
  status: QueryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WoQueryWithSla extends WoQuery {
  isOverdue: boolean;
  responseDeadline: string;
  hoursRemaining: number | null;
}

export interface CreateWoQueryDto {
  woDetailsId: number;
  queryBy: number;
  queryTo: QueryTo;
  queryToUserIds?: number[];
  queryText: string;
}

export interface CreateBulkWoQueriesDto {
  woDetailsId: number;
  queryBy: number;
  queries: Omit<CreateWoQueryDto, 'woDetailsId' | 'queryBy'>[];
}

export interface RespondToQueryDto {
  responseText: string;
  respondedBy: number;
}

export interface CloseQueryDto {
  remarks?: string;
}

export interface WoQueriesFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  woDetailsId?: number;
  status?: QueryStatus;
  queryTo?: QueryTo;
  queryBy?: number;
  respondedBy?: number;
  queryRaisedFrom?: string;
  queryRaisedTo?: string;
}

export interface QueriesSummary {
  woDetailsId: number;
  total: number;
  pending: number;
  responded: number;
  closed: number;
  overdue: number;
}

export interface QuerySlaStatus {
  woDetailsId: number;
  totalQueries: number;
  pendingQueries: number;
  overdueQueries: number;
  slaComplianceRate: number;
  slaThresholdHours: number;
}

// ============================================
// WO DOCUMENTS
// ============================================

export interface WoDocument {
  id: number;
  woDetailId: number | null;
  type: DocumentType | null;
  version: number | null;
  filePath: string | null;
  uploadedAt: string;
  uploadedBy: number | null;
}

export interface CreateWoDocumentDto {
  woDetailId: number;
  type: DocumentType;
  filePath: string;
  version?: number;
}

export interface UpdateWoDocumentDto {
  type?: DocumentType;
  filePath?: string;
  version?: number;
}

export interface CreateBulkWoDocumentsDto {
  woDetailId: number;
  documents: Omit<CreateWoDocumentDto, 'woDetailId'>[];
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

export interface DocumentVersionHistory {
  woDetailId: number;
  type: DocumentType;
  totalVersions: number;
  latestVersion: number | null;
  versions: WoDocument[];
}

export interface DocumentsSummary {
  woDetailId: number;
  total: number;
  byType: Record<DocumentType, number>;
  latestVersions: Array<{
    type: DocumentType;
    version: number;
    filePath: string;
  }>;
}

// ============================================
// DASHBOARD & REPORTS
// ============================================

export interface WoDetailsDashboardSummary {
  summary: {
    pending: number;
    accepted: number;
    amendmentNeeded: number;
  };
  generatedAt: string;
}

export interface AcceptanceDashboardSummary {
  total: number;
  pendingReview: number;
  inReview: number;
  queriesPending: number;
  awaitingAmendment: number;
  pendingSignatures: number;
  pendingCourier: number;
  completed: number;
  generatedAt: string;
}

export interface SlaComplianceReport {
  totalRecords: number;
  compliantRecords: number;
  complianceRate: number;
  avgResponseTimeHours: number;
  details: Array<{
    woDetailId: number;
    woBasicDetailId: number;
    createdAt: string;
    queryOnTime: boolean;
    responseOnTime: boolean;
    decisionOnTime: boolean;
    isCompliant: boolean;
  }>;
  generatedAt: string;
}

export interface TimelineEvent {
  event: string;
  timestamp: string | null;
  type: 'info' | 'success' | 'warning' | 'error';
  actor?: string;
  details?: string;
}

export interface WoTimeline {
  woDetailId: number;
  timeline: TimelineEvent[];
  sla: {
    queryDeadline: string | null;
    responseDeadline: string | null;
    isQueryOverdue: boolean;
    isResponseOverdue: boolean;
  };
}

// ============================================
// PAGE-SPECIFIC DATA TYPES (for Wizard)
// ============================================

export interface Page1Data {
  contacts: WoContact[];
  tenderDocumentsChecklist: TenderDocumentsChecklist | null;
  checklistCompletedAt: string | null;
  checklistIncompleteNotifiedAt: string | null;
  isChecklistComplete: boolean;
  incompleteItems: string[];
}

export interface Page2Data {
  ldApplicable: boolean;
  maxLd: string | null;
  ldStartDate: string | null;
  maxLdDate: string | null;
  isPbgApplicable: boolean;
  filledBgFormat: string | null;
  pbgBgId: number | null;
  isContractAgreement: boolean;
  contractAgreementFormat: string | null;
  detailedPoApplicable: boolean;
  detailedPoFollowupId: number | null;
}

export interface Page3Data {
  swotStrengths: string | null;
  swotWeaknesses: string | null;
  swotOpportunities: string | null;
  swotThreats: string | null;
  swotCompletedAt: string | null;
  hasContent: boolean;
}

export interface Page4Data {
  billingBoq: WoBillingBoq[];
  buybackBoq: WoBuybackBoq[];
  billingAddresses: WoBillingAddress[];
  shippingAddresses: WoShippingAddress[];
  billingTotal: string;
  buybackTotal: string;
}

export interface Page5Data {
  siteVisitNeeded: boolean;
  siteVisitPerson: SiteVisitPerson | null;
  documentsFromTendering: string[] | null;
  documentsNeeded: string[] | null;
  documentsInHouse: string[] | null;
  totalDocuments: number;
}

export interface Page6Data {
  costingSheetLink: string | null;
  hasDiscrepancies: boolean;
  discrepancyComments: string | null;
  discrepancyNotifiedAt: string | null;
  budgetPreGst: string | null;
  budgetSupply: string | null;
  budgetService: string | null;
  budgetFreight: string | null;
  budgetAdmin: string | null;
  budgetBuybackSale: string | null;
  totalBudget: string;
}

export interface Page7Data {
  oeWoAmendmentNeeded: boolean | null;
  oeAmendmentSubmittedAt: string | null;
  oeSignaturePrepared: boolean;
  courierRequestPrepared: boolean;
  courierRequestPreparedAt: string | null;
  amendments: WoAmendment[];
  canSubmitForReview: boolean;
  blockers: string[];
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
