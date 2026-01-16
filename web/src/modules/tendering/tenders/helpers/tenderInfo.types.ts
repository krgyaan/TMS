export interface TenderInfo {
    id: number;
    team: number;
    tenderNo: string;
    organization: number | null;
    tenderName: string;
    item: number;
    gstValues: string;
    tenderFees: string;
    emd: string;
    teamMember: number | null;
    dueDate: Date | string;
    remarks: string | null;
    status: number;
    location: number | null;
    website: number | null;
    courierAddress: string | null;
    deleteStatus: number;
    documents: string | null;

    // Tender approval fields
    tlRemarks: string | null;
    rfqTo: string | null;
    tlStatus: number;
    tenderFeeMode: string | null; // ✅ Added
    emdMode: string | null; // ✅ Added
    approvePqrSelection: string | null;
    approveFinanceDocSelection: string | null;
    tenderApprovalStatus: string | null;
    tlRejectionRemarks: string | null;
    oemNotAllowed: string | null;

    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface TenderInfoWithNames extends TenderInfo {
    organizationName?: string | null;
    organizationAcronym?: string | null;
    teamMemberName?: string | null;
    teamMemberUsername?: string | null;
    statusName?: string | null;
    itemName?: string | null;
    locationName?: string | null;
    locationState?: string | null;
    websiteName?: string | null;
    websiteLink?: string | null;
    oemExperience?: string | null;
}

export interface CreateTenderRequest {
    team: number;
    tenderNo: string;
    organization?: number | null;
    tenderName: string;
    item: number;
    gstValues?: string;
    tenderFees?: string;
    emd?: string;
    teamMember?: number | null;
    dueDate: Date | string;
    remarks?: string | null;
    status?: number;
    location?: number | null;
    website?: number | null;
    courierAddress?: string | null;
}

export interface UpdateTenderRequest {
    team?: number;
    tenderNo?: string;
    organization?: number | null;
    tenderName?: string;
    item?: number;
    gstValues?: string;
    tenderFees?: string;
    emd?: string;
    teamMember?: number | null;
    dueDate?: Date | string;
    remarks?: string | null;
    status?: number;
    location?: number | null;
    website?: number | null;
    courierAddress?: string | null;
    tlRemarks?: string | null;
    rfqTo?: string | null;
    tlStatus?: number;
    tenderFeeMode?: string | null;
    emdMode?: string | null;
    approvePqrSelection?: string | null;
    approveFinanceDocSelection?: string | null;
    tenderApprovalStatus?: string | null;
    tlRejectionRemarks?: string | null;
    oemNotAllowed?: string | null;
}

// Import types from other modules for TenderWithRelations
import type { TenderInfoSheetResponse } from "@/modules/tendering/info-sheet/helpers/tenderInfoSheet.types";
import type { TenderApproval } from "@/modules/tendering/tender-approval/helpers/tenderApproval.types";
import type { Rfq } from "@/modules/tendering/rfqs/helpers/rfq.types";
import type { PhysicalDocsDashboardRow } from "@/modules/tendering/physical-docs/helpers/physicalDocs.types";
import type { TenderDocumentChecklistDashboardRow } from "@/modules/tendering/checklists/helpers/documentChecklist.types";
import type { CostingSheetDashboardRow } from "@/modules/tendering/costing-sheets/helpers/costingSheet.types";
import type { BidSubmission } from "@/modules/tendering/bid-submissions/helpers/bidSubmission.types";
import type { TqManagementDashboardRow } from "@/modules/tendering/tq-management/helpers/tqManagement.types";
import type { RaDashboardRow } from "@/modules/tendering/ras/helpers/reverseAuction.types";
import type { ResultDashboardRow } from "@/modules/tendering/results/helpers/tenderResult.types";
import type { EmdDashboardRow } from "@/modules/tendering/emds-tenderfees/helpers/emdTenderFee.types";

export interface TenderWithRelations extends TenderInfo {
    organizationName?: string | null;
    organizationAcronym?: string | null;
    teamMemberName?: string | null;
    teamMemberUsername?: string | null;
    statusName?: string | null;
    itemName?: string | null;
    locationName?: string | null;
    infoSheet?: TenderInfoSheetResponse | null;
    approval?: TenderApproval | null;
    rfq?: Rfq | null;
    physicalDocs?: PhysicalDocsDashboardRow | null;
    checklist?: TenderDocumentChecklistDashboardRow | null;
    costingSheet?: CostingSheetDashboardRow | null;
    bidSubmission?: BidSubmission | null;
    tqManagement?: TqManagementDashboardRow | null;
    ra?: RaDashboardRow | null;
    result?: ResultDashboardRow | null;
    emds?: EmdDashboardRow | null;
    processingFees?: EmdDashboardRow | null;
    emdsTenderFees?: EmdDashboardRow | null;
}

export interface TenderListParams {
    statusIds?: number[];
    category?: string;
    unallocated?: boolean;
    teamId?: number | null;
    assignedTo?: number | null;
    search?: string;
    page?: number;
    limit?: number;
}

export interface TenderInfoDashboardCounts {
    "under-preparation": number;
    "did-not-bid": number;
    "tenders-bid": number;
    "tender-won": number;
    "tender-lost": number;
    total: number;
}

export type TimerStatus = 'RUNNING' | 'PAUSED' | 'OVERDUE' | 'COMPLETED' | 'NOT_STARTED';

export interface TenderTimer {
    hasTimer: boolean;
    stepKey: string | null;
    stepName: string | null;
    remainingSeconds: number;
    status: TimerStatus;
    deadline?: string;
    allocatedHours?: number;
}

export interface TenderWithTimer extends TenderInfoWithNames {
    timer?: {
        remainingSeconds: number;
        status: TimerStatus;
        stepKey: string;
    } | null;
}
