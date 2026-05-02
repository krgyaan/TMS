export const TENDER_KPI_BUCKETS = ["ALLOCATED", "APPROVED", "REJECTED", "PENDING", "BID", "MISSED", "DISQUALIFIED", "RESULT_AWAITED", "LOST", "WON"] as const;

export type TenderKpiBucket = (typeof TENDER_KPI_BUCKETS)[number];
