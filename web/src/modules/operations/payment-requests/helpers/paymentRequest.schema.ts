import { z } from "zod";

export const paymentAgainstOptions = [
    { value: "upload_invoice", label: "Upload Purchase Invoice" },
    { value: "new_pi", label: "New PI" },
    { value: "po", label: "PO" },
    { value: "others", label: "Others" },
] as const;

export const paymentRequestFormSchema = z.object({
    selectedBeneficiaryId: z.string().default(""),
    partyName: z.string().min(1, "Party name is required"),
    accountNumber: z.string().min(1, "Account number is required"),
    bankName: z.string().default(""),
    ifsc: z.string().min(1, "IFSC is required"),
    amount: z.number().nullable().refine(v => v !== null && v >= 0, "Amount must be >= 0"),
    paymentAgainst: z.string().min(1, "Payment against is required"),
    uploadedInvoiceFile: z.array(z.string()).default([]),
    poFile: z.array(z.string()).default([]),
    remark: z.string().default(""),

    pi_category: z.string().default(""),
    pi_partyName: z.string().default(""),
    pi_valuePreGst: z.number().nullable().default(null),
    pi_gstAmount: z.number().nullable().default(null),
    pi_invoiceDate: z.string().default(""),
    pi_invoiceFile: z.array(z.string()).default([]),
}).superRefine((data, ctx) => {
    if (data.paymentAgainst === "new_pi") {
        if (!data.pi_category) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pi_category"], message: "Category is required" });
        if (!data.pi_partyName) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pi_partyName"], message: "Party name is required" });
        if (data.pi_valuePreGst === null || data.pi_valuePreGst < 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pi_valuePreGst"], message: "Value must be >= 0" });
        if (data.pi_gstAmount === null || data.pi_gstAmount < 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pi_gstAmount"], message: "GST amount must be >= 0" });
        if (!data.pi_invoiceDate) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pi_invoiceDate"], message: "Invoice date is required" });
    }
});

export type PaymentRequestFormValues = z.infer<typeof paymentRequestFormSchema>;
