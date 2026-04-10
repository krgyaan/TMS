export const TENDER_KPI_BUCKETS = ["ALLOCATED", "APPROVED", "REJECTED", "PENDING", "BID", "MISSED", "DISQUALIFIED", "RESULT_AWAITED", "LOST", "WON"] as const;

export type TenderOutcomeStatus = "Won" | "Lost" | "Result Awaited" | "Missed" | "Not Bid" | "Disqualified";

export type TenderKpiBucket = (typeof TENDER_KPI_BUCKETS)[number];

export interface TenderMeta {
    id: number;
    tenderNo: string | null;
    tenderName: string | null;
    organizationName: string | null;
    dueDate: Date;
    value: number;
    statusBucket: TenderKpiBucket;
}
