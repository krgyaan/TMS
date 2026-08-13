import { z } from "zod";
import { tenderFilesService } from "@/services/api/tender-files.service";

// ============================================
// AMC ENTITY TYPES
// ============================================

export type BillType = "constant" | "variable";

export interface VariableBillItem {
    date?: string;
    label?: string;
    amount?: number;
}

export interface AmcSiteContact {
    id?: number;
    name: string;
    organization?: string | null;
    mobile: string;
    email?: string | null;
}

export interface AmcSite {
    id?: number;
    name: string;
    address: string;
    mapLink?: string | null;
    status?: string;
    contacts: AmcSiteContact[];
}

export interface AmcProduct {
    id?: number;
    itemId: number;
    description?: string | null;
    make?: string | null;
    model?: string | null;
    serialNo?: string | null;
    quantity: number;
}

export interface AmcServiceEngineer {
    id?: number;
    name: string;
    organization?: string | null;
    mobile: string;
    email?: string | null;
}

export interface Amc {
    id: number;
    teamName: string;
    projectId: number;
    createdBy: number | null;
    allocatedTe: number | null;
    serviceFrequency: string;
    amcStartDate: string;
    nextServiceDue: string | null;
    amcEndDate: string;
    billFrequency: string;
    billType: BillType;
    billValue: string | null;
    variableBills: VariableBillItem[] | null;
    amcPoPath: string | null;
    serviceReportPath: string[] | null;
    signedServiceReportPath: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AmcDetail extends Amc {
    sites: AmcSite[];
    products: AmcProduct[];
    serviceEngineers: AmcServiceEngineer[];
    services?: AmcService[];
    bills?: AmcBill[];
}

export interface CreateAmcDto {
    teamName: string;
    projectId: number;
    allocatedTe?: number | null;
    serviceFrequency: string;
    amcStartDate: string;
    nextServiceDue?: string;
    amcEndDate: string;
    billFrequency: string;
    billType: BillType;
    billValue?: string;
    variableBills?: VariableBillItem[];
    amcPoPath?: string | null;
    serviceReportPath?: string[] | null;
    signedServiceReportPath?: string | null;
    sites: AmcSite[];
    products: AmcProduct[];
    serviceEngineers: AmcServiceEngineer[];
}

export type UpdateAmcDto = Partial<CreateAmcDto>;

export const sampleReport = (entries?: string[] | null): string | null =>
    entries?.find(e => e.startsWith("sample:"))?.slice("sample:".length) ?? null;

export const filledReport = (entries?: string[] | null): string | null =>
    entries?.find(e => e.startsWith("filled:"))?.slice("filled:".length) ?? null;

const fileServeUrl = (value?: string | null, legacyDir?: string): string => {
    if (!value) return "";
    if (value.includes("/") || value.includes("\\")) return tenderFilesService.getFileUrl(value);
    return legacyDir ? `/uploads/${legacyDir}/${value}` : "";
};

/** File URL helper for AMC-level documents (PO / service report / signed report) */
export const amcDocUrl = (value?: string | null): string =>
    fileServeUrl(value, "amc");

/** File URL helper for per-service filled/signed reports */
export const serviceFileUrl = (value?: string | null): string =>
    fileServeUrl(value, "amc-services");

/** File URL helper for bill invoices / payment receipts */
export const billFileUrl = (value?: string | null): string =>
    fileServeUrl(value, "amc-billing");

// ============================================
// AMC SERVICES (per-visit schedule) TYPES
// ============================================

export type AmcServiceStatus = "Pending" | "Done";

export interface AmcService {
    id: number;
    amcId: number;
    amcSiteId: number;
    billId: number | null;
    serviceNo: number;
    serviceDueDate: string;
    status: AmcServiceStatus | string;
    serviceCompletedDate: string | null;
    filledReport: string | null;
    signedReport: string | null;
    createdAt: string;
    updatedAt: string;
}

// ── Shared amc info shape returned by both service and billing enrichAll ──────
export interface AmcServiceAmcInfo {
    id: number;
    teamName: string;
    projectName: string | null;
    orgName: string | null;
    orgAcronym: string | null;        // ← added: acronym takes priority over orgName
    allocatedTe?: number | null;
    serviceReportPath: string[] | null;
    signedServiceReportPath: string | null;
    serviceEngineers: AmcServiceEngineer[];
}

export interface AmcServiceDetail extends AmcService {
    amc: AmcServiceAmcInfo | null;
    site: (AmcSite & { contacts: AmcSiteContact[] }) | null;
}

export type ServicePathField = "filled-service-report" | "signed-service-report";

// ============================================
// AMC BILLING (bill rows) TYPES
// ============================================

export type AmcBillStatus =
    | "Pending"
    | "Bill Submitted"
    | "Payment Received"
    | "Follow-up";

export interface AmcBill {
    id: number;
    amcId: number;
    amcSiteId: number;
    billNo: number;
    billDueDate: string;
    status: AmcBillStatus | string;
    invoices: string[];
    paymentReceipts: string[];
    amount: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AmcBillDetail extends AmcBill {
    amc: AmcServiceAmcInfo | null;   // orgAcronym now available here too
    site: (AmcSite & { contacts: AmcSiteContact[] }) | null;
    services: AmcService[];
}

export type BillPathField = "invoice" | "payment-receipt";

export const INVOICE_DEADLINE_HOURS = 48;

// ============================================================
// FORM DEFAULTS
// ============================================================

export const TEAM_OPTIONS = [
    { value: "AC", label: "AC" },
    { value: "DC", label: "DC" },
];

export const BILL_TYPE_OPTIONS = [
    { value: "constant", label: "Constant" },
    { value: "variable", label: "Variable" },
];

export const SERVICE_FREQUENCY_OPTIONS = [
    { value: "Monthly", label: "Monthly" },
    { value: "Quarterly", label: "Quarterly" },
    { value: "Half-Yearly", label: "Half-Yearly" },
    { value: "Yearly", label: "Yearly" },
];

export const BILL_FREQUENCY_OPTIONS = [
    { value: "Monthly", label: "Monthly" },
    { value: "Quarterly", label: "Quarterly" },
    { value: "Half-Yearly", label: "Half-Yearly" },
    { value: "Yearly", label: "Yearly" },
];

export const VARIABLE_BILL_LABELS = ["Q1", "Q2", "Q3", "Q4"];

// ============================================================
// FORM SCHEMA (scalar fields; arrays handled via local state)
// ============================================================

export const AmcFormSchema = z.object({
    teamName: z.string().min(1, { message: "Team Name is required" }),
    projectId: z.coerce.number().min(1, { message: "Please select a Project" }),
    allocatedTe: z.coerce
        .number()
        .min(1, { message: "Please select an Allocated TE" })
        .nullable()
        .optional(),
    serviceFrequency: z.string().min(1, { message: "Service Frequency is required" }),
    amcStartDate: z.string().min(1, { message: "AMC Start Date is required" }),
    amcEndDate: z.string().min(1, { message: "AMC End Date is required" }),
    billFrequency: z.string().min(1, { message: "Bill Frequency is required" }),
    billType: z.preprocess(
        v => {
            const s = typeof v === "string" ? v.trim().toLowerCase() : "";
            return s === "" ? "constant" : s;
        },
        z.enum(["constant", "variable"]),
    ),
    billValue: z.string().optional(),
});

export type AmcFormValues = z.infer<typeof AmcFormSchema>;

export const amcFormDefaultValues: AmcFormValues = {
    teamName: "",
    projectId: 0,
    allocatedTe: null,
    serviceFrequency: "Monthly",
    amcStartDate: "",
    amcEndDate: "",
    billFrequency: "Quarterly",
    billType: "constant",
    billValue: "",
};