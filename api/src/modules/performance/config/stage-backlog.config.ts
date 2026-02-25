import { TenderInfo } from "@db/schemas/tendering/tenders.schema";
import { TenderKpiBucket } from "../tender-executive-performance/zod/tender-buckets.type";

// =======================================================
// STAGE BACKLOG – KPI RANK (LOCAL)
// =======================================================

export const STAGE_BACKLOG_KPI_RANK: Record<TenderKpiBucket, number> = {
    ALLOCATED: 1,
    PENDING: 1,
    APPROVED: 2,
    BID: 3,
    RESULT_AWAITED: 4,
    WON: 5,
    LOST: 5,
    DISQUALIFIED: 5,
    MISSED: 0,
    REJECTED: 0,
};

// =======================================================
// STAGE BACKLOG CONFIG (ISOLATED FROM STAGE MATRIX)
// =======================================================

export const STAGE_BACKLOG_CONFIG = [
    {
        stageKey: "tender_info_sheet",
        label: "Tender Info Sheet",
        autoCompleteAfter: "APPROVED" as TenderKpiBucket,
    },
    {
        stageKey: "tender_approval",
        label: "Tender Approval",
        autoCompleteAfter: "APPROVED" as TenderKpiBucket,
    },
    {
        stageKey: "rfq",
        label: "RFQ",
        autoCompleteAfter: "BID" as TenderKpiBucket,
    },
    {
        stageKey: "emd_request",
        label: "EMD Request",
        autoCompleteAfter: "BID" as TenderKpiBucket,
    },
    {
        stageKey: "physical_docs",
        label: "Physical Docs",
        autoCompleteAfter: "BID" as TenderKpiBucket,
    },
    {
        stageKey: "document_checklist",
        label: "Document Checklist",
        autoCompleteAfter: "BID" as TenderKpiBucket,
    },
    {
        stageKey: "costing_sheet",
        label: "Costing Sheet",
        autoCompleteAfter: "BID" as TenderKpiBucket,
    },
    {
        stageKey: "bid_submission",
        label: "Bid Submission",
        autoCompleteAfter: "RESULT_AWAITED" as TenderKpiBucket,
    },
    {
        stageKey: "tq",
        label: "TQ",
        autoCompleteAfter: "RESULT_AWAITED" as TenderKpiBucket,
    },
    {
        stageKey: "ra",
        label: "RA",
        autoCompleteAfter: "RESULT_AWAITED" as TenderKpiBucket,
    },
    {
        stageKey: "result",
        label: "Result",
        autoCompleteAfter: "WON" as TenderKpiBucket,
    },
];
