/**
 * useTenderStepStatuses
 *
 * Centralises all lightweight status-checking queries for the Tendering ShowPage
 * timeline. Each query result is used ONLY for "does data exist?" — the actual
 * data rendering is done by each Section component, which calls the same hooks and
 * gets instant cache hits (React Query deduplicates: 1 network request, N subscribers).
 *
 * ShowPages import this hook instead of calling 8-10 individual hooks directly.
 */

import { useTender } from "@/hooks/api/useTenders";
import { useTenderApproval } from "@/hooks/api/useTenderApprovals";
import { usePhysicalDocByTenderId } from "@/hooks/api/usePhysicalDocs";
import { useRfqByTenderId } from "@/hooks/api/useRfqs";
import { usePaymentRequestsByTender } from "@/hooks/api/useEmds";
import { useDocumentChecklistByTender } from "@/hooks/api/useDocumentChecklists";
import { useCostingSheetByTender } from "@/hooks/api/useCostingSheets";
import { useBidSubmissionByTender } from "@/hooks/api/useBidSubmissions";
import { useTenderResultByTenderId } from "@/hooks/api/useTenderResults";
import type { StepStatus } from "@/modules/tendering/components/ShowPageLayout";

function deriveStatus(hasData: boolean, isLoading: boolean): StepStatus {
    if (isLoading) return "loading";
    if (hasData) return "completed";
    return "pending";
}

export interface TenderStepStatus {
    id: string;
    label: string;
    shortLabel: string;
    stepNumber: number;
    hasData: boolean;
    isLoading: boolean;
    status: StepStatus;
}

/** All 8 sections — ShowPage can slice this as needed (e.g. CostingShowPage uses only 7) */
export function useTenderStepStatuses(tenderId: number | null) {
    const { data: tender,         isLoading: l1 } = useTender(tenderId);
    const { data: approval,       isLoading: l2 } = useTenderApproval(tenderId);
    const { data: physicalDoc,    isLoading: l3 } = usePhysicalDocByTenderId(tenderId);
    const { data: rfq,            isLoading: l4 } = useRfqByTenderId(tenderId);
    const { data: paymentReqs,    isLoading: l5 } = usePaymentRequestsByTender(tenderId);
    const { data: checklist,      isLoading: l6 } = useDocumentChecklistByTender(tenderId ?? 0);
    const { data: costingSheet,   isLoading: l7 } = useCostingSheetByTender(tenderId ?? 0);
    const { data: bidSubmission,  isLoading: l8 } = useBidSubmissionByTender(tenderId ?? 0);
    const { data: tenderResult,   isLoading: l9 } = useTenderResultByTenderId(tenderId);

    const steps: TenderStepStatus[] = [
        {
            id: "tender-details",
            label: "Tender Details",
            shortLabel: "Tender Details",
            stepNumber: 1,
            hasData: !!tender,
            isLoading: l1 || l2,
            status: deriveStatus(!!tender, l1 || l2),
        },
        {
            id: "physical-docs",
            label: "Physical Documents",
            shortLabel: "Physical Docs",
            stepNumber: 2,
            hasData: !!physicalDoc,
            isLoading: l3,
            status: deriveStatus(!!physicalDoc, l3),
        },
        {
            id: "rfq",
            label: "RFQ & Responses",
            shortLabel: "RFQ",
            stepNumber: 3,
            hasData: Array.isArray(rfq) && rfq.length > 0,
            isLoading: l4,
            status: deriveStatus(Array.isArray(rfq) && rfq.length > 0, l4),
        },
        {
            id: "emd-fees",
            label: "EMD & Tender Fees",
            shortLabel: "EMD / Fees",
            stepNumber: 4,
            hasData: Array.isArray(paymentReqs) && paymentReqs.length > 0,
            isLoading: l5,
            status: deriveStatus(Array.isArray(paymentReqs) && paymentReqs.length > 0, l5),
        },
        {
            id: "checklist",
            label: "Document Checklist",
            shortLabel: "Checklist",
            stepNumber: 5,
            hasData: !!checklist,
            isLoading: l6,
            status: deriveStatus(!!checklist, l6),
        },
        {
            id: "costing",
            label: "Costing Sheet",
            shortLabel: "Costing",
            stepNumber: 6,
            hasData: !!costingSheet,
            isLoading: l7,
            status: deriveStatus(!!costingSheet, l7),
        },
        {
            id: "bid",
            label: "Bid Submission",
            shortLabel: "Bid",
            stepNumber: 7,
            hasData: !!bidSubmission,
            isLoading: l8,
            status: deriveStatus(!!bidSubmission, l8),
        },
        {
            id: "result",
            label: "Result",
            shortLabel: "Result",
            stepNumber: 8,
            hasData: !!tenderResult,
            isLoading: l9,
            status: deriveStatus(!!tenderResult, l9),
        },
    ];

    return { steps, tender, approval };
}
