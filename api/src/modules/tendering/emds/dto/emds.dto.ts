import { z } from "zod";

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

const emdSection = z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("DD"), details: ddDetails }),
    z.object({ mode: z.literal("FDR"), details: fdrDetails }),
    z.object({ mode: z.literal("BG"), details: bgDetails }),
    z.object({ mode: z.literal("CHEQUE"), details: ddDetails }), // same fields as DD
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

export const CreatePaymentRequestSchema = z.object({
    emd: emdSection,
    tenderFee: tenderFeeSection,
    processingFee: processingFeeSection,
});

export type CreatePaymentRequestDto = z.infer<typeof CreatePaymentRequestSchema>;

export const UpdatePaymentRequestSchema = CreatePaymentRequestSchema;
export type UpdatePaymentRequestDto = z.infer<typeof UpdatePaymentRequestSchema>;

export const UpdateStatusSchema = z.object({
    status: z.enum([
        "Pending",
        "Requested",
        "Approved",
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
