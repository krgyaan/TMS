import { z } from "zod";

// ============================================================================
// Helper Schemas
// ============================================================================

const optionalString = z
    .union([z.string(), z.undefined()])
    .transform(v => {
        if (typeof v !== "string") return undefined;
        const trimmed = v.trim();
        return trimmed.length ? trimmed : undefined;
    });

const optionalNumber = (
    schema: z.ZodNumber = z.coerce.number()
) =>
    z
        .union([schema, z.undefined(), z.literal("")])
        .transform(v => {
            if (v === "" || v === undefined) return undefined;
            const num = typeof v === "number" ? v : Number(v);
            return Number.isNaN(num) ? undefined : num;
        });

// ============================================================================
// Instrument Detail Schemas
// ============================================================================

const ddDetails = z.object({
    ddAmount: optionalNumber(z.coerce.number().min(0)),
    ddFavouring: optionalString,
    ddPayableAt: optionalString,
    ddDeliverBy: optionalString,
    ddPurpose: optionalString,
    ddCourierAddress: optionalString,
    ddCourierHours: optionalNumber(z.coerce.number().min(0)),
    ddDate: optionalString,
    ddRemarks: optionalString,
});

const fdrDetails = z.object({
    fdrAmount: optionalNumber(z.coerce.number().min(0)),
    fdrFavouring: optionalString,
    fdrExpiryDate: optionalString,
    fdrDeliverBy: optionalString,
    fdrPurpose: optionalString,
    fdrCourierAddress: optionalString,
    fdrCourierHours: optionalNumber(z.coerce.number().min(0)),
    fdrDate: optionalString,
});

const bgDetails = z.object({
    bgAmount: optionalNumber(z.coerce.number().min(0)),
    bgNeededIn: optionalString,
    bgPurpose: optionalString,
    bgFavouring: optionalString,
    bgAddress: optionalString,
    bgExpiryDate: optionalString,
    bgClaimPeriod: optionalString,
    bgStampValue: optionalNumber(z.coerce.number().min(0)),
    bgFormatFiles: z.array(z.string()).optional(),
    bgPoFiles: z.array(z.string()).optional(),
    bgClientUserEmail: z.string().email().optional().or(z.literal("")),
    bgClientCpEmail: z.string().email().optional().or(z.literal("")),
    bgClientFinanceEmail: z.string().email().optional().or(z.literal("")),
    bgCourierAddress: optionalString,
    bgCourierDays: optionalNumber(z.coerce.number().min(1).max(10)),
    bgBank: optionalString,
    bgBankAccountName: optionalString,
    bgBankAccountNo: optionalString,
    bgBankIfsc: optionalString,
});

const chequeDetails = z.object({
    chequeAmount: optionalNumber(z.coerce.number().min(0)),
    chequeFavouring: optionalString,
    chequeDate: optionalString,
    chequeNeededIn: optionalString,
    chequePurpose: optionalString,
    chequeAccount: optionalString,
});

const bankTransferDetails = z.object({
    btAmount: optionalNumber(z.coerce.number().min(0)),
    btPurpose: optionalString,
    btAccountName: optionalString,
    btAccountNo: optionalString,
    btIfsc: optionalString,
});

const portalDetails = z.object({
    portalAmount: optionalNumber(z.coerce.number().min(0)),
    portalPurpose: optionalString,
    portalName: optionalString,
    portalNetBanking: z.enum(["YES", "NO"]).optional(),
    portalDebitCard: z.enum(["YES", "NO"]).optional(),
});

// ============================================================================
// Payment Section Schemas
// ============================================================================

const emdSection = z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("DD"), details: ddDetails }),
    z.object({ mode: z.literal("FDR"), details: fdrDetails }),
    z.object({ mode: z.literal("BG"), details: bgDetails }),
    z.object({ mode: z.literal("CHEQUE"), details: chequeDetails }),
    z.object({ mode: z.literal("BANK_TRANSFER"), details: bankTransferDetails }),
    z.object({ mode: z.literal("BT"), details: bankTransferDetails }),
    z.object({ mode: z.literal("PORTAL"), details: portalDetails }),
    z.object({ mode: z.literal("POP"), details: portalDetails }),
]).optional();

const tenderFeeSection = z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("PORTAL"), details: portalDetails }),
    z.object({ mode: z.literal("POP"), details: portalDetails }),
    z.object({ mode: z.literal("BANK_TRANSFER"), details: bankTransferDetails }),
    z.object({ mode: z.literal("BT"), details: bankTransferDetails }),
    z.object({ mode: z.literal("DD"), details: ddDetails }),
]).optional();

const processingFeeSection = z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("PORTAL"), details: portalDetails }),
    z.object({ mode: z.literal("POP"), details: portalDetails }),
    z.object({ mode: z.literal("BANK_TRANSFER"), details: bankTransferDetails }),
    z.object({ mode: z.literal("BT"), details: bankTransferDetails }),
    z.object({ mode: z.literal("DD"), details: ddDetails }),
]).optional();

// ============================================================================
// Create/Update Payment Request Schemas
// ============================================================================

export const CreatePaymentRequestSchema = z.object({
    type: z.enum(["TMS", "Other Than TMS", "Old Entries", "Other Than Tender"]).optional(),
    tenderNo: z.string().optional(),
    tenderName: z.string().optional(),
    dueDate: z.string().optional(),

    emd: emdSection,
    tenderFee: tenderFeeSection,
    processingFee: processingFeeSection,
});

export type CreatePaymentRequestDto = z.infer<typeof CreatePaymentRequestSchema>;

export const UpdatePaymentRequestSchema = CreatePaymentRequestSchema;
export type UpdatePaymentRequestDto = z.infer<typeof UpdatePaymentRequestSchema>;

// ============================================================================
// Status Update Schema
// ============================================================================

export const UpdateStatusSchema = z.object({
    status: z.enum([
        "Pending",
        "Requested",
        "Sent",
        "Approved",
        "Rejected",
        "Issued",
        "Dispatched",
        "Received",
        "Returned",
        "Cancelled",
        "Refunded",
        "Encashed",
        "Extended",
    ]),
    remarks: optionalString,
});

export type UpdateStatusDto = z.infer<typeof UpdateStatusSchema>;

// ============================================================================
// Dashboard Query Schema
// ============================================================================

export const DashboardQuerySchema = z.object({
    tab: z.enum([
        "pending",
        "request-sent",
        "paid",
        "sent",
        "approved",
        "rejected",
        "returned",
        "all",
        "tender-dnb",
    ]).optional().default("all"),
    userId: z.coerce.number().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    search: z.string().optional(),
});

export type DashboardQueryDto = z.infer<typeof DashboardQuerySchema>;

// ============================================================================
// Dashboard Response Types
// ============================================================================

export type PaymentPurpose = "EMD" | "Tender Fee" | "Processing Fee";

export type InstrumentType =
    | "DD"
    | "FDR"
    | "BG"
    | "Cheque"
    | "Bank Transfer"
    | "Portal Payment";

export type DashboardRowType = "request" | "missing";

export interface DashboardRow {
    id: number | null;
    type: DashboardRowType;
    purpose: PaymentPurpose;
    amountRequired: string;
    status: string;
    instrumentType: InstrumentType | null;
    instrumentStatus: string | null;
    createdAt: Date | null;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    dueDate: Date | null;
    teamMemberId: number | null;
    teamMember: string | null;
    requestedBy: string | null;
}

export interface DashboardCounts {
    pending: number;
    sent: number;
    approved: number;
    rejected: number;
    returned: number;
    total: number;
}

export interface PendingTenderRow {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    gstValues: string | null;
    status: number;
    statusName: string | null;
    dueDate: Date | null;
    teamMemberId: number | null;
    teamMember: string | null;
    emd: string | null;
    emdMode: string | null;
    tenderFee: string | null;
    tenderFeeMode: string | null;
    processingFee: string | null;
    processingFeeMode: string | null;
}

export interface PaymentRequestRow {
    id: number;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    purpose: PaymentPurpose;
    amountRequired: string;
    requestType: string | null;
    dueDate: Date | null;
    bidValid: Date | null;
    teamMember: string | null;
    instrumentId: number | null;
    instrumentType: InstrumentType | null;
    instrumentStatus: string | null;
    displayStatus: string;
    createdAt: Date | null;
}

export interface DashboardCounts {
    pending: number;
    sent: number;
    approved: number;
    rejected: number;
    returned: number;
    total: number;
}

export type DashboardTab = 'pending' | 'sent' | 'approved' | 'rejected' | 'returned';

export interface PendingTabResponse {
    data: PendingTenderRow[];
    counts: DashboardCounts;
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface RequestTabResponse {
    data: PaymentRequestRow[];
    counts: DashboardCounts;
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export type DashboardResponse = PendingTabResponse | RequestTabResponse;
