import { z } from "zod";

export const paymentAgainstOptions = [
    { value: "upload_invoice", label: "Upload Purchase Invoice" },
    { value: "new_pi", label: "New PI" },
    { value: "po", label: "PO" },
    { value: "others", label: "Others" },
] as const;

export const paymentRequestFormSchema = z.object({
    partyName: z.string().min(1, "Party name is required"),
    accountNumber: z.string().min(1, "Account number is required"),
    accountName: z.string().min(1, "Account name is required"),
    ifsc: z.string().min(1, "IFSC is required"),
    amount: z.number().nullable().refine(v => v !== null && v >= 0, "Amount must be >= 0"),
    paymentAgainst: z.string().min(1, "Payment against is required"),
    purchaseInvoiceId: z.string().default(""),
    uploadedInvoiceFile: z.array(z.string()).default([]),
    poFile: z.array(z.string()).default([]),
    remark: z.string().default(""),
});

export type PaymentRequestFormValues = z.infer<typeof paymentRequestFormSchema>;
