// ============================================
// AMC BILLING ENTITY TYPES
// ============================================

export interface AmcBillingContact {
    id?: number;
    name: string;
    organization?: string | null;
    mobile: string;
    email?: string | null;
}

export interface AmcBillingSite {
    id: number;
    amcId: number;
    name: string;
    address: string;
    mapLink?: string | null;
    status?: string;
    contacts: AmcBillingContact[];
}

export interface AmcBillingEngineer {
    id?: number;
    amcId: number;
    name: string;
    organization?: string | null;
    mobile: string;
    email?: string | null;
}

export interface AmcBillingAmcInfo {
    id: number;
    teamName: string;
    projectName: string | null;
    signedServiceReportPath: string | null;
    serviceEngineers: AmcBillingEngineer[];
}

export interface AmcBilling {
    id: number;
    amcId: number;
    amcSiteId: number | null;
    serviceDueDate: string | null;
    serviceCompletedDate: string | null;
    notes: string | null;
    status: string;
    invoice: string | null;
    paymentReceipt: string | null;
    createdAt: string;
    updatedAt: string;
    amc: AmcBillingAmcInfo | null;
    site: AmcBillingSite | null;
}

export type BillingPathField = "invoice" | "payment-receipt";

export const billingFileUrl = (name?: string | null) =>
    name ? `/uploads/amc-billing/${name}` : "";

export const INVOICE_DEADLINE_HOURS = 48;
