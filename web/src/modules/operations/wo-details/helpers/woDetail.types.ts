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

export type Page1FormValues = z.infer<typeof Page1FormSchema>;
export type Page2FormValues = z.infer<typeof Page2FormSchema>;
export type Page3FormValues = z.infer<typeof Page3FormSchema>;
export type Page4FormValues = z.infer<typeof Page4FormSchema>;
export type Page5FormValues = z.infer<typeof Page5FormSchema>;
export type Page6FormValues = z.infer<typeof Page6FormSchema>;
export type Page7FormValues = z.infer<typeof Page7FormSchema>;

export type PageFormValues =
  | Page1FormValues
  | Page2FormValues
  | Page3FormValues
  | Page4FormValues
  | Page5FormValues
  | Page6FormValues
  | Page7FormValues;

export interface Contact {
  id?: number;
  organization?: string;
  departments?: "EIC" | "User" | "C&P" | "Finance";
  name?: string;
  designation?: string;
  phone?: string;
  email?: string;
}

export interface BOQItem {
  id?: number;
  srNo?: number;
  itemDescription?: string;
  quantity?: string;
  rate?: string;
  amount?: string;
  sortOrder?: number;
}

export interface Address {
  id?: number;
  srNos?: number[] | "all";
  customerName?: string;
  address?: string;
  gst?: string;
}

export interface Amendment {
  id?: number;
  pageNo?: string;
  clauseNo?: string;
  currentStatement?: string;
  correctedStatement?: string;
}

export interface SiteVisitPerson {
  name?: string;
  phone?: string;
  email?: string;
}

export interface WizardState {
  currentPage: number;
  woDetailId: number | null;
  woBasicDetailId: number;
  status: WizardStatus;
}

export type WizardStatus = "draft" | "in_progress" | "wo_details_filled";

export interface ServerFieldError {
  field: string;
  message: string;
}

export interface PageFormProps {
  woDetailId: number | null;
  woBasicDetailId: number;
  tenderId?: number | null;
  onSaveDraft: (data: Record<string, unknown>) => Promise<ServerFieldError[] | void>;
  onSaveDraftOnly: (data: Record<string, unknown>) => Promise<ServerFieldError[] | void>;
  onSkip: () => Promise<void>;
  onBack: () => void;
  isFirstPage: boolean;
  isLastPage: boolean;
  isSaving: boolean;
}

export interface WizardProgress {
  currentPage: number;
  completedPages: number[];
  skippedPages: number[];
  status: WizardStatus;
  lastSavedAt: string;
}

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
  buybackBoqApplicable: string;
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
}

export interface Page7Data {
  oeWoAmendmentNeeded: string;
  amendments: Amendment[];
  oeSignaturePrepared: string;
  courierRequestPrepared: string;
}

export type PageData =
  | Page1Data
  | Page2Data
  | Page3Data
  | Page4Data
  | Page5Data
  | Page6Data
  | Page7Data;

export interface WizardValidationResult {
  isValid: boolean;
  missingRequiredPages: number[];
  incompletePages: number[];
  errors: Record<number, string[]>;
}

export interface WoDetailData {
  id: number;
  woBasicDetailId: number;

  tenderDocumentsChecklist: Record<string, string> | null;
  contacts?: Contact[];

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

  swotStrengths: string | null;
  swotWeaknesses: string | null;
  swotOpportunities: string | null;
  swotThreats: string | null;

  buybackBoqApplicable: string;
  billingBoq?: BOQItem[];
  buybackBoq?: BOQItem[];
  billingAddresses?: Address[];
  shippingAddresses?: Address[];

  siteVisitNeeded: string;
  siteVisitPerson: SiteVisitPerson | null;
  documentsFromTendering: string[] | null;
  documentsNeeded: string[] | null;
  documentsInHouse: string[] | null;

  costingSheetLink: string | null;
  hasDiscrepancies: string;
  discrepancyComments: string | null;

  oeWoAmendmentNeeded: string | null;
  oeSignaturePrepared: string;
  courierRequestPrepared: string;
  amendments?: Amendment[];

  currentPage: number;
  completedPages: number[];
  skippedPages: number[];
  status: WizardStatus;

  createdAt: string;
  updatedAt: string;
}
