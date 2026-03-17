// src/features/wo-details/helpers/constants.ts

export const WIZARD_PAGES = [
  {
    pageNum: 1,
    title: "Project Handover",
    description: "Client details and tender document checklist",
    canSkip: true,
  },
  {
    pageNum: 2,
    title: "Compliance Obligations",
    description: "LD, PBG, Contract Agreement, and Detailed PO settings",
    canSkip: true,
  },
  {
    pageNum: 3,
    title: "SWOT Analysis",
    description: "Strengths, Weaknesses, Opportunities, and Threats",
    canSkip: true,
  },
  {
    pageNum: 4,
    title: "Billing",
    description: "BOQ items and billing/shipping addresses",
    canSkip: true,
  },
  {
    pageNum: 5,
    title: "Project Execution",
    description: "Site visit and document requirements",
    canSkip: true,
  },
  {
    pageNum: 6,
    title: "Profitability",
    description: "Costing sheet review and budget breakdown",
    canSkip: true,
  },
  {
    pageNum: 7,
    title: "WO Acceptance",
    description: "Amendment review and final acceptance",
    canSkip: false,
  },
] as const;

export const DEPARTMENTS = ["EIC", "User", "C&P", "Finance"] as const;

export const TENDER_CHECKLIST_ITEMS = [
  { key: "completeTenderDocuments", label: "Complete Tender Documents" },
  { key: "tenderInfo", label: "Tender Info" },
  { key: "emdInformation", label: "EMD Information" },
  { key: "physicalDocumentsSubmission", label: "Physical Documents Submission" },
  { key: "rfqAndQuotation", label: "RFQ and Quotation" },
  { key: "documentChecklist", label: "Document Checklist" },
  { key: "costingSheet", label: "Costing Sheet" },
  { key: "result", label: "Result" },
] as const;
