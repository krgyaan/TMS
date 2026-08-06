import { z } from "zod";

export const paymentAgainstOptions = [
    { value: "po", label: "PO" },
    { value: "vwo", label: "Work Order" }
] as const;

export const paymentRequestFormSchema = z.object({
    selectedBeneficiaryId: z.string().default(""),
    paymentMode: z.enum(["BANK_TRANSFER", "PORTAL"]).default("BANK_TRANSFER"),
    portalLink: z.string().default(""),
    partyName: z.string().default(""),
    accountNumber: z.string().default(""),
    bankName: z.string().default(""),
    ifsc: z.string().default(""),
    amount: z.number().nullable().refine(v => v !== null && v >= 0, "Amount must be >= 0"),
    selectedPoId: z.string().default(""),
    selectedVwoId: z.string().default(""),
    paymentAgainst: z.string().min(1, "Payment against is required"),
    poFile: z.array(z.string()).default([]),
    remark: z.string().default(""),
}).superRefine((data, ctx) => {
    if (data.paymentMode === "BANK_TRANSFER") {
        if (!data.partyName.trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["partyName"], message: "Party name is required" });
        }
        if (!data.accountNumber.trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accountNumber"], message: "Account number is required" });
        }
        if (!data.ifsc.trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ifsc"], message: "IFSC is required" });
        }
    } else {
        if (!data.portalLink.trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["portalLink"], message: "Portal link is required" });
        }
    }
    if (data.paymentAgainst === "po") {
        const hasPoSelection = !!data.selectedPoId;
        const hasPoFile = data.poFile && data.poFile.length > 0;
        if (!hasPoSelection && !hasPoFile) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["selectedPoId"], message: "Select a PO or upload a PO file" });
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["poFile"], message: "Upload a PO file or select a PO" });
        }
    }
    if (data.paymentAgainst === "vwo") {
        if (!data.selectedVwoId) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["selectedVwoId"], message: "Select a Work Order" });
        }
    }
    if (data.paymentAgainst === "imprest") {
        if (!data.remark?.trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["remark"], message: "Remark is required for Imprest" });
        }
    }
});

export type PaymentRequestFormValues = z.infer<typeof paymentRequestFormSchema>;
