import { z } from "zod";

// ============================================
// AMC ENTITY TYPES
// ============================================

export type BillType = "constant" | "variable";

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
    serviceFrequency: string;
    amcStartDate: string;
    nextServiceDue: string | null;
    amcEndDate: string;
    billFrequency: string;
    billType: BillType;
    billValue: string | null;
    variableBills: Array<{ label?: string; amount?: number }> | null;
    amcPoPath: string | null;
    serviceReportPath: string | null;
    signedServiceReportPath: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AmcDetail extends Amc {
    sites: AmcSite[];
    products: AmcProduct[];
    serviceEngineers: AmcServiceEngineer[];
}

export interface CreateAmcDto {
    teamName: string;
    projectId: number;
    serviceFrequency: string;
    amcStartDate: string;
    nextServiceDue?: string;
    amcEndDate: string;
    billFrequency: string;
    billType: BillType;
    billValue?: string;
    variableBills?: Array<{ label?: string; amount?: number }>;
    amcPoPath?: string | null;
    serviceReportPath?: string | null;
    signedServiceReportPath?: string | null;
    sites: AmcSite[];
    products: AmcProduct[];
    serviceEngineers: AmcServiceEngineer[];
}

export type UpdateAmcDto = Partial<CreateAmcDto>;

export type AmcPathField = "po" | "service-report" | "signed-service-report";

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
    serviceFrequency: z.string().min(1, { message: "Service Frequency is required" }),
    amcStartDate: z.string().min(1, { message: "AMC Start Date is required" }),
    amcEndDate: z.string().min(1, { message: "AMC End Date is required" }),
    billFrequency: z.string().min(1, { message: "Bill Frequency is required" }),
    billType: z.enum(["constant", "variable"]),
    billValue: z.string().optional(),
});

export type AmcFormValues = z.infer<typeof AmcFormSchema>;

export const amcFormDefaultValues: AmcFormValues = {
    teamName: "",
    projectId: 0,
    serviceFrequency: "Monthly",
    amcStartDate: "",
    amcEndDate: "",
    billFrequency: "Quarterly",
    billType: "constant",
    billValue: "",
};