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

// Wizard state
export interface WizardState {
  currentPage: number;
  completedPages: number[];
  skippedPages: number[];
  woDetailId: number | null;
  woBasicDetailId: number;
  status: "draft" | "in_progress" | "completed" | "submitted_for_review";
}

// Page component props
export interface PageFormProps {
  woDetailId: number;
  woBasicDetailId: number;
  onSubmit: () => void;
  onSkip: () => void;
  onBack: () => void;
  isFirstPage: boolean;
  isLastPage: boolean;
  isLoading: boolean;
}

export interface WoDetailData {
    id: number;
    woBasicDetailId: number;

    // Page 1
    tenderDocumentsChecklist: Record<string, boolean> | null;
    contacts?: Contact[];

    // Page 2
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
    siteVisitNeeded: boolean;
    siteVisitPerson: { name: string; phone: string; email: string } | null;
    documentsFromTendering: string[] | null;
    documentsNeeded: string[] | null;
    documentsInHouse: string[] | null;

    // Page 6
    costingSheetLink: string | null;
    hasDiscrepancies: boolean;
    discrepancyComments: string | null;
    budgetPreGst: string | null;
    budgetSupply: string | null;
    budgetService: string | null;
    budgetFreight: string | null;
    budgetAdmin: string | null;
    budgetBuybackSale: string | null;

    // Page 7
    oeWoAmendmentNeeded: boolean | null;
    oeSignaturePrepared: boolean;
    courierRequestPrepared: boolean;
    amendments?: Amendment[];

    // Wizard Progress
    currentPage: number;
    completedPages: number[];
    skippedPages: number[];
    status: "draft" | "in_progress" | "completed" | "submitted_for_review";

    // Timestamps
    createdAt: string;
    updatedAt: string;
}
