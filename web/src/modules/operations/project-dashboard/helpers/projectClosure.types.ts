export const CLOSURE_DOCUMENT_CATEGORIES: Record<string, string[]> = {
    Photos: ["Site Photos"],
    WorkOrders: ["Work Order", "SAP Work Order"],
    Billing_Docs: ["Purchase Invoices", "Sale Invoices", "Delivery Challans", "E-Way Bills"],
    Certificates: ["Completion Certificates", "Performance Certificates"],
    Compliance: ["GST Returns", "CRAC (GEM)"],
};

export const CLOSURE_DOCUMENTS = Object.values(CLOSURE_DOCUMENT_CATEGORIES).flat();
export const TOTAL_CLOSURE_DOCUMENTS = CLOSURE_DOCUMENTS.length;

export interface ProjectClosureDocumentRow {
    id: number;
    projectId: number;
    category: string;
    documentName: string;
    files: string[];
    uploadedBy: number;
    uploadedByName: string | null;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface AddProjectClosureDocumentDto {
    documentName: string;
    files: string[];
}
