export const WIZARD_PAGES = [
  {
    pageNum: 1,
    title: "Project Handover",
    description: "Client details and tender document checklist",
  },
  {
    pageNum: 2,
    title: "Compliance Obligations",
    description: "LD, PBG, Contract Agreement, and Detailed PO settings",
  },
  {
    pageNum: 3,
    title: "SWOT Analysis",
    description: "Strengths, Weaknesses, Opportunities, and Threats",
  },
  {
    pageNum: 4,
    title: "Billing",
    description: "BOQ items and billing/shipping addresses",
  },
  {
    pageNum: 5,
    title: "Project Execution",
    description: "Site visit and document requirements",
  },
  {
    pageNum: 6,
    title: "Profitability",
    description: "Costing sheet review and budget breakdown",
  },
  {
    pageNum: 7,
    title: "WO Acceptance",
    description: "Amendment review and final acceptance",
  },
  {
    pageNum: 8,
    title: "Review & Submit",
    description: "Preview all data and submit for TL review",
  },
] as const;

export const DEPARTMENTS = ["EIC", "User", "C&P", "Finance"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_OPTIONS = DEPARTMENTS.map((dept) => ({
  label: dept,
  value: dept,
}));

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

export const YES_NO_OPTIONS = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
];

export type YesNoValue = "true" | "false";

export const WIZARD_CONFIG = {
  TOTAL_PAGES: 8,
  AUTO_SAVE_DELAY_MS: 4000,
} as const;
