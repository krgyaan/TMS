import { z } from "zod";

export const ContractAgreementFormSchema = z.object({
    woDetailId: z.number().min(1, 'Wo detail id is required'),
    veSigned: z.string().optional(),
    veSignedDate: z.date().optional(),
    clientAndVeSigned: z.string().optional(),
    clientAndVeSignedDate: z.date().optional(),
});

export type ContractAgreementFormValues = z.infer<typeof ContractAgreementFormSchema>;
