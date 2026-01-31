import { StageConfig } from "./stage-config.type";

export const STAGE_CONFIG: StageConfig[] = [
    {
        stageKey: "tender_info_sheet",
        timerName: "tender_info",
        type: "timer",
        isApplicable: () => true,
        resolveDeadline: tender => tender.dueDate,
        tlStage: false,
    },

    {
        stageKey: "rfq",
        timerName: "rfq_sent",
        type: "timer",
        isApplicable: tender => Boolean(tender.rfqTo),
        resolveDeadline: tender => tender.dueDate,
        tlStage: false,
    },

    {
        stageKey: "emd_request",
        timerName: "emd_requested",
        type: "timer",
        isApplicable: tender => Number(tender.emd) > 0,
        resolveDeadline: tender => tender.dueDate,
        tlStage: false,
    },

    {
        stageKey: "physical_docs",
        timerName: "physical_docs",
        type: "timer",
        isApplicable: () => true,
        resolveDeadline: tender => tender.dueDate,
        tlStage: false,
    },

    {
        stageKey: "costing_sheet",
        timerName: "costing_sheets",
        type: "timer",
        isApplicable: () => true,
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
        stageKey: "bid_submission",
        timerName: "bid_submission",
        type: "timer",
        isApplicable: () => true,
        resolveDeadline: tender => tender.dueDate,
        tlStage: false,
    },

    //============= TL - STAGES =================
    {
        stageKey: "tender_approval",
        timerName: "tender_approval",
        type: "timer",
        isApplicable: () => true,
        resolveDeadline: tender => tender.dueDate,
        tlStage: true,
    },

    {
        stageKey: "costing_sheet_approval",
        timerName: "costing_approval",
        type: "timer",
        isApplicable: () => true,
        resolveDeadline: tender => tender.dueDate,
        tlStage: true,
    },
    // ============================================

    // ===== NON-TIMER STAGES =====

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

//OLD  KEYS : SINCE GYAN FUCKED THE ENTIRE THING UP WITH MIGRATIONS AND USING AI FOR LITERALLY EVERYTHING
// export const STAGE_CONFIG: StageConfig[] = [
//     {
//         stageKey: "tender_info_sheet",
//         timerName: "tender_info_sheet",
//         type: "timer",
//         isApplicable: () => true,
//         resolveDeadline: tender => tender.dueDate,
//         tlStage: false,
//     },

//     {
//         stageKey: "rfq",
//         timerName: "rfq",
//         type: "timer",
//         isApplicable: tender => Boolean(tender.rfqTo),
//         resolveDeadline: tender => tender.dueDate,
//         tlStage: false,
//     },

//     {
//         stageKey: "emd_request",
//         timerName: "emd_request",
//         type: "timer",
//         isApplicable: tender => Number(tender.emd) > 0,
//         resolveDeadline: tender => tender.dueDate,
//         tlStage: false,
//     },

//     {
//         stageKey: "physical_docs",
//         timerName: "physical_docs",
//         type: "timer",
//         isApplicable: () => true,
//         resolveDeadline: tender => tender.dueDate,
//         tlStage: false,
//     },

//     {
//         stageKey: "costing_sheet",
//         timerName: "costing_sheet",
//         type: "timer",
//         isApplicable: () => true,
//         resolveDeadline: tender => tender.dueDate,
//         tlStage: false,
//     },

//     {
//         stageKey: "document_checklist",
//         timerName: "document_checklist",
//         type: "timer",
//         isApplicable: () => true,
//         resolveDeadline: tender => tender.dueDate,
//         tlStage: false,
//     },

//     {
//         stageKey: "bid_submission",
//         timerName: "bid_submission",
//         type: "timer",
//         isApplicable: () => true,
//         resolveDeadline: tender => tender.dueDate,
//         tlStage: false,
//     },

//     //============= TL - STAGES =================
//     {
//         stageKey: "tender_approval",
//         timerName: "tender_approval",
//         type: "timer",
//         isApplicable: () => true,
//         resolveDeadline: tender => tender.dueDate,
//         tlStage: true,
//     },

//     {
//         stageKey: "costing_sheet_approval",
//         timerName: "costing_sheet_approval",
//         type: "timer",
//         isApplicable: () => true,
//         resolveDeadline: tender => tender.dueDate,
//         tlStage: true,
//     },
//     // ============================================

//     // ===== NON-TIMER STAGES =====

//     {
//         stageKey: "tq",
//         type: "existence",
//         isApplicable: tender => Boolean(tender.currentStatusCode >= 17),
//         resolveDeadline: () => null,
//         tlStage: false,
//     },

//     {
//         stageKey: "ra",
//         type: "existence",
//         isApplicable: tender => Boolean(tender.reverseAuctionId),
//         resolveDeadline: () => null,
//         tlStage: false,
//     },

//     {
//         stageKey: "result",
//         type: "existence",
//         isApplicable: tender => Boolean(tender.currentStatusCode >= 17),
//         resolveDeadline: () => null,
//         tlStage: false,
//     },
// ];
