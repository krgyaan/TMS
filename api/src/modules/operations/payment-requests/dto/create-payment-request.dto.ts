import { z } from "zod";

export const createPaymentRequestSchema = z.object({
    projectId: z.number(),
    partyName: z.string().min(1, "Party name is required"),
    accountNumber: z.string().min(1, "Account number is required"),
    bankName: z.string().optional(),
    ifsc: z.string().min(1, "IFSC is required"),
    amount: z.number().min(0, "Amount must be >= 0"),
    paymentAgainst: z.string().min(1, "Payment against is required"),
    purchaseInvoiceId: z.number().optional(),
    uploadedInvoiceFile: z.string().optional(),
    poFile: z.string().optional(),
    remark: z.string().optional(),
});

export type CreatePaymentRequestDto = z.infer<typeof createPaymentRequestSchema>;
