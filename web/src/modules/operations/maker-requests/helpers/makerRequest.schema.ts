import { z } from "zod";

export const makerRequestFormSchema = z.object({
    selectedBeneficiaryId: z.string().default(""),
    partyName: z.string().min(1, "Party name is required"),
    accountNumber: z.string().min(1, "Account number is required"),
    bankName: z.string().default(""),
    ifsc: z.string().min(1, "IFSC is required"),
    amount: z.number().nullable().refine(v => v !== null && v >= 0, "Amount must be >= 0"),
    categoryId: z.string().default(""),
    billFiles: z.array(z.string()).default([]),
    remark: z.string().default(""),
});

export type MakerRequestFormValues = z.infer<typeof makerRequestFormSchema>;
