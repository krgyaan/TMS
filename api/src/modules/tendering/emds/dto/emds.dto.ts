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
    fdrFavouring: optionalString,
    fdrExpiryDate: optionalString,
    fdrDeliverBy: optionalString,
    fdrPurpose: optionalString,
    fdrCourierAddress: optionalString,
    fdrCourierHours: optionalNumber(z.coerce.number().min(0)),
    fdrDate: optionalString,
});

const bgDetails = z.object({
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
});

const bankTransferDetails = z.object({
    btPurpose: optionalString,
    btAccountName: optionalString,
    btAccountNo: optionalString,
    btIfsc: optionalString,
});

const portalDetails = z.object({
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
    z.object({ mode: z.literal("CHEQUE"), details: ddDetails }),
    z.object({ mode: z.literal("BANK_TRANSFER"), details: bankTransferDetails }),
    z.object({ mode: z.literal("PORTAL"), details: portalDetails }),
]).optional();

const tenderFeeSection = z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("PORTAL"), details: portalDetails }),
    z.object({ mode: z.literal("BANK_TRANSFER"), details: bankTransferDetails }),
    z.object({ mode: z.literal("DD"), details: ddDetails }),
]).optional();

const processingFeeSection = z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("PORTAL"), details: portalDetails }),
    z.object({ mode: z.literal("BANK_TRANSFER"), details: bankTransferDetails }),
    z.object({ mode: z.literal("DD"), details: ddDetails }),
]).optional();

// ============================================================================
// Create/Update Payment Request Schemas
// ============================================================================

export const CreatePaymentRequestSchema = z.object({
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
        "sent",
        "approved",
        "rejected",
        "returned",
        "all",
    ]).optional().default("all"),
    userId: z.coerce.number().optional(),
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
    teamMemberName: string | null;
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

export interface DashboardResponse {
    data: DashboardRow[];
    counts: DashboardCounts;
}
