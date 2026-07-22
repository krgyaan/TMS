import { z } from "zod";

export const makerRequestFormSchema = z.object({
    selectedHeading: z.string().default(""),
    categoryId: z.string().default(""),

    amount: z.number().nullable().refine(v => v !== null && v >= 0, "Amount must be >= 0"),

    paymentMode: z.enum(["BANK_TRANSFER", "PORTAL"]).default("BANK_TRANSFER"),

    selectedBeneficiaryId: z.string().default(""),
    partyName: z.string().default(""),
    accountNumber: z.string().default(""),
    ifsc: z.string().default(""),

    portalLink: z.string().default(""),

    billFiles: z.array(z.string()).default([]),
    remark: z.string().default(""),
});

export type MakerRequestFormValues = z.infer<typeof makerRequestFormSchema>;
