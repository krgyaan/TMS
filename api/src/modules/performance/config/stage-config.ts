import { StageConfig } from "./stage-config.type";

type StageGateFields = { rfqRequired?: string | null; emdRequired?: string | null; physicalDocsRequired?: string | null };

const normalized = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "");

//OLD  KEYS : SINCE GYAN FUCKED THE ENTIRE THING UP WITH MIGRATIONS AND USING AI FOR LITERALLY EVERYTHING
export const STAGE_CONFIG: StageConfig[] = [
    {
        stageKey: "tender_info_sheet",
        timerName: "tender_info_sheet",
        type: "timer",
        isApplicable: () => true,
        resolveDeadline: tender => tender.dueDate,
        tlStage: false,
    },
    {
        stageKey: "tender_approval",
        timerName: "tender_approval",
        type: "timer",
        isApplicable: () => true,
        resolveDeadline: tender => tender.dueDate,
        tlStage: true,
    },
    {
        stageKey: "rfq_sent",
        timerName: "rfq_sent",
        type: "timer",
        isApplicable: (tender: StageGateFields) => !["no", ""].includes(normalized(tender.rfqRequired)),
        resolveDeadline: tender => tender.dueDate,
        tlStage: false,
    },
    {
        stageKey: "emd_requested",
        timerName: "emd_requested",
        type: "timer",
        isApplicable: (tender: StageGateFields) => !["no", "exempt", ""].includes(normalized(tender.emdRequired)),
        resolveDeadline: tender => tender.dueDate,
        tlStage: false,
    },
    {
        stageKey: "physical_docs",
        timerName: "physical_docs",
        type: "timer",
        isApplicable: (tender: StageGateFields) => !["no", ""].includes(normalized(tender.physicalDocsRequired)),
        resolveDeadline: tender => tender.dueDate,
        tlStage: false,
    },
    {
        stageKey: "document_checklist",
        timerName: "document_checklist",
        type: "timer",
        isApplicable: () => true,
        resolveDeadline: tender => tender.dueDate,
        tlStage: false,
    },
    {
        stageKey: "costing_sheets",
        timerName: "costing_sheets",
        type: "timer",
        isApplicable: () => true,
        resolveDeadline: tender => tender.dueDate,
        tlStage: false,
    },
    {
        stageKey: "costing_sheet_approval",
        timerName: "costing_sheet_approval",
        type: "timer",
        isApplicable: () => true,
        resolveDeadline: tender => tender.dueDate,
        tlStage: true,
    },
    {
        stageKey: "bid_submission",
        timerName: "bid_submission",
        type: "timer",
        isApplicable: () => true,
        resolveDeadline: tender => tender.dueDate,
        tlStage: false,
    },
    {
        stageKey: "tq",
        type: "existence",
        isApplicable: tender => Boolean(tender.currentStatusCode >= 17),
        resolveDeadline: () => null,
        tlStage: false,
    },

    {
        stageKey: "ra",
        type: "existence",
        isApplicable: tender => Boolean(tender.reverseAuctionId),
        resolveDeadline: () => null,
        tlStage: false,
    },

    {
        stageKey: "result",
        type: "existence",
        isApplicable: tender => Boolean(tender.currentStatusCode >= 17),
        resolveDeadline: () => null,
        tlStage: false,
    },
];
