import { z } from "zod";

export const paymentAgainstOptions = [
    { value: "po", label: "PO" },
    { value: "vwo", label: "Work Order" },
    { value: "imprest", label: "Imprest" },
] as const;

export const paymentRequestFormSchema = z.object({
    selectedBeneficiaryId: z.string().default(""),
    partyName: z.string().min(1, "Party name is required"),
    accountNumber: z.string().min(1, "Account number is required"),
    bankName: z.string().default(""),
    ifsc: z.string().min(1, "IFSC is required"),
    amount: z.number().nullable().refine(v => v !== null && v >= 0, "Amount must be >= 0"),
    selectedRefId: z.string().default(""),
    paymentAgainst: z.string().min(1, "Payment against is required"),
    poFile: z.array(z.string()).default([]),
    remark: z.string().default(""),
}).superRefine((data, ctx) => {
    if (data.paymentAgainst === "po" || data.paymentAgainst === "vwo") {
        const hasSelection = !!data.selectedRefId;
        const hasPoFile = data.poFile && data.poFile.length > 0;
        if (!hasSelection && !hasPoFile) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["selectedRefId"], message: "Select a PO/VWO or upload a PO file" });
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["poFile"], message: "Upload a PO file or select a PO/VWO" });
        }
    }
    if (data.paymentAgainst === "vwo") {
        if (!data.selectedPoId) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["selectedPoId"], message: "Select a Work Order" });
        }
    }
    if (data.paymentAgainst === "imprest") {
        if (!data.remark?.trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["remark"], message: "Remark is required for Imprest" });
        }
    }
});

export type PaymentRequestFormValues = z.infer<typeof paymentRequestFormSchema>;
