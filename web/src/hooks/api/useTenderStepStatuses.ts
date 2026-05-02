import { useTender } from "@/hooks/api/useTenders";
import { useTenderApproval } from "@/hooks/api/useTenderApprovals";
import { usePhysicalDocByTenderId } from "@/hooks/api/usePhysicalDocs";
import { useRfqByTenderId } from "@/hooks/api/useRfqs";
import { usePaymentRequestsByTender } from "@/hooks/api/useEmds";
import { useDocumentChecklistByTender } from "@/hooks/api/useDocumentChecklists";
import { useCostingSheetByTender } from "@/hooks/api/useCostingSheets";
import { useBidSubmissionByTender } from "@/hooks/api/useBidSubmissions";
import { useTenderResultByTenderId } from "@/hooks/api/useTenderResults";
import { useTqById, useTqByTender } from "@/hooks/api/useTqManagement";
import { useReverseAuctionByTender } from "@/hooks/api/useReverseAuctions";
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

export interface UseTenderStepStatusesOptions {
    tqId?: number | null;
}

export function useTenderStepStatuses(tenderId: number | null, options: UseTenderStepStatusesOptions = {}) {
    const { tqId } = options;

    const { data: tqById, isLoading: l10b } = useTqById(tqId ?? 0);

    const resolvedTenderId = tenderId || (Array.isArray(tqById) ? tqById[0]?.tenderId : tqById?.tenderId) || null;

    const { data: tender, isLoading: l1 } = useTender(resolvedTenderId);
    const { data: approval, isLoading: l2 } = useTenderApproval(resolvedTenderId);
    const { data: physicalDoc, isLoading: l3 } = usePhysicalDocByTenderId(resolvedTenderId);
    const { data: rfq, isLoading: l4 } = useRfqByTenderId(resolvedTenderId);
    const { data: paymentReqs, isLoading: l5 } = usePaymentRequestsByTender(resolvedTenderId);
    const { data: checklist, isLoading: l6 } = useDocumentChecklistByTender(resolvedTenderId ?? 0);
    const { data: costingSheet, isLoading: l7 } = useCostingSheetByTender(resolvedTenderId ?? 0);
    const { data: bidSubmission, isLoading: l8 } = useBidSubmissionByTender(resolvedTenderId ?? 0);
    const { data: tenderResult, isLoading: l9 } = useTenderResultByTenderId(resolvedTenderId);
    const { data: tqByTender, isLoading: l10a } = useTqByTender(resolvedTenderId ?? 0);
    const { data: raData, isLoading: l11 } = useReverseAuctionByTender(resolvedTenderId ?? 0);

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
            id: "tq-management",
            label: "TQ Management",
            shortLabel: "TQ",
            stepNumber: 8,
            hasData: !!tqByTender || !!tqById,
            isLoading: l10a || l10b,
            status: deriveStatus(!!tqByTender || !!tqById, l10a || l10b),
        },
        {
            id: "ra-management",
            label: "RA Management",
            shortLabel: "RA",
            stepNumber: 9,
            hasData: !!raData,
            isLoading: l11,
            status: deriveStatus(!!raData, l11),
        },
        {
            id: "result",
            label: "Result",
            shortLabel: "Result",
            stepNumber: 10,
            hasData: !!tenderResult,
            isLoading: l9,
            status: deriveStatus(!!tenderResult, l9),
        },
    ];

    return { steps, tender, approval, tqData: tqByTender || tqById, raData };
}
