import type { z } from "zod";
import type {
  Page1FormSchema,
  Page2FormSchema,
  Page3FormSchema,
  Page4FormSchema,
  Page5FormSchema,
  Page6FormSchema,
  Page7FormSchema,
} from "./woDetail.schema";

// Form value types
export type Page1FormValues = z.infer<typeof Page1FormSchema>;
export type Page2FormValues = z.infer<typeof Page2FormSchema>;
export type Page3FormValues = z.infer<typeof Page3FormSchema>;
export type Page4FormValues = z.infer<typeof Page4FormSchema>;
export type Page5FormValues = z.infer<typeof Page5FormSchema>;
export type Page6FormValues = z.infer<typeof Page6FormSchema>;
export type Page7FormValues = z.infer<typeof Page7FormSchema>;

// All page data union type
export type PageFormValues =
  | Page1FormValues
  | Page2FormValues
  | Page3FormValues
  | Page4FormValues
  | Page5FormValues
  | Page6FormValues
  | Page7FormValues;

// Contact type
export interface Contact {
  id?: number;
  organization?: string;
  departments?: "EIC" | "User" | "C&P" | "Finance";
  name: string;
  designation?: string;
  phone?: string;
  email?: string;
}

// BOQ Item type
export interface BOQItem {
  id?: number;
  srNo: number;
  itemDescription: string;
  quantity: string;
  rate: string;
  amount?: string;
  sortOrder?: number;
}

// Address type
export interface Address {
  id?: number;
  srNos: number[] | "all";
  customerName: string;
  address: string;
  gst?: string;
}

// Amendment type
export interface Amendment {
  id?: number;
  pageNo: string;
  clauseNo: string;
  currentStatement: string;
  correctedStatement: string;
}

// Site Visit Person
export interface SiteVisitPerson {
  name: string;
  phone?: string;
  email?: string;
}

// Wizard state
export interface WizardState {
  currentPage: number;
  completedPages: number[];
  skippedPages: number[];
  woDetailId: number | null;
  woBasicDetailId: number;
  status: WizardStatus;
  lastSavedAt?: string;
}

export type WizardStatus = "draft" | "in_progress" | "completed" | "submitted_for_review";

// Page component props
export interface PageFormProps {
  woDetailId: number | null;
  woBasicDetailId: number;
  onSubmit: (data: any) => Promise<void>;
  onSkip: () => Promise<void>;
  onBack: () => void;
  onSaveDraft: (data: any) => Promise<void>;
  isFirstPage: boolean;
  isLastPage: boolean;
  isLoading: boolean;
  isSaving: boolean;
}

// Wizard progress from API
export interface WizardProgress {
  currentPage: number;
  completedPages: number[];
  skippedPages: number[];
  status: WizardStatus;
  lastSavedAt: string;
}

// Page data response types
export interface Page1Data {
  contacts: Contact[];
  tenderDocumentsChecklist: Record<string, string>;
}

export interface Page2Data {
  ldApplicable: string;
  maxLd: string;
  ldStartDate: string;
  maxLdDate: string;
  isPbgApplicable: string;
  filledBgFormat: string;
  pbgBgId?: number;
  isContractAgreement: string;
  contractAgreementFormat: string;
  detailedPoApplicable: string;
  detailedPoFollowupId?: number;
}

export interface Page3Data {
  swotStrengths: string;
  swotWeaknesses: string;
  swotOpportunities: string;
  swotThreats: string;
}

export interface Page4Data {
  billingBoq: BOQItem[];
  buybackBoq: BOQItem[];
  billingAddresses: Address[];
  shippingAddresses: Address[];
}

export interface Page5Data {
  siteVisitNeeded: string;
  siteVisitPerson: SiteVisitPerson;
  documentsFromTendering: string[];
  documentsNeeded: string[];
  documentsInHouse: string[];
}

export interface Page6Data {
  costingSheetLink: string;
  hasDiscrepancies: string;
  discrepancyComments: string;
  budgetPreGst: string;
  budgetSupply: string;
  budgetService: string;
  budgetFreight: string;
  budgetAdmin: string;
  budgetBuybackSale: string;
}

export interface Page7Data {
  oeWoAmendmentNeeded: string;
  amendments: Amendment[];
  oeSignaturePrepared: string;
  courierRequestPrepared: string;
}

// Union type for all page data
export type PageData =
  | Page1Data
  | Page2Data
  | Page3Data
  | Page4Data
  | Page5Data
  | Page6Data
  | Page7Data;

// Validation result
export interface WizardValidationResult {
  isValid: boolean;
  missingRequiredPages: number[];
  incompletePages: number[];
  errors: Record<number, string[]>;
}

// Full WO Detail Data
export interface WoDetailData {
  id: number;
  woBasicDetailId: number;

  // Page 1
  tenderDocumentsChecklist: Record<string, string> | null;
  contacts?: Contact[];

  // Page 2
  ldApplicable: string;
  maxLd: string | null;
  ldStartDate: string | null;
  maxLdDate: string | null;
  isPbgApplicable: string;
  filledBgFormat: string | null;
  pbgBgId: number | null;
  isContractAgreement: string;
  contractAgreementFormat: string | null;
  detailedPoApplicable: string;
  detailedPoFollowupId: number | null;

  // Page 3
  swotStrengths: string | null;
  swotWeaknesses: string | null;
  swotOpportunities: string | null;
  swotThreats: string | null;

  // Page 4
  billingBoq?: BOQItem[];
  buybackBoq?: BOQItem[];
  billingAddresses?: Address[];
  shippingAddresses?: Address[];

  // Page 5
  siteVisitNeeded: string;
  siteVisitPerson: SiteVisitPerson | null;
  documentsFromTendering: string[] | null;
  documentsNeeded: string[] | null;
  documentsInHouse: string[] | null;

  // Page 6
  costingSheetLink: string | null;
  hasDiscrepancies: string;
  discrepancyComments: string | null;
  budgetPreGst: string | null;
  budgetSupply: string | null;
  budgetService: string | null;
  budgetFreight: string | null;
  budgetAdmin: string | null;
  budgetBuybackSale: string | null;

  // Page 7
  oeWoAmendmentNeeded: string | null;
  oeSignaturePrepared: string;
  courierRequestPrepared: string;
  amendments?: Amendment[];

  // Wizard Progress
  currentPage: number;
  completedPages: number[];
  skippedPages: number[];
  status: WizardStatus;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
