import { z } from "zod";

export const CreateEmployeeImprestSchema = z.object({
    userId: z.coerce.number().int().optional().nullable(),
    categoryId: z.coerce.number().int().optional().nullable(),
    teamId: z.coerce.number().int().optional().nullable(),
    partyName: z.string().max(255).optional().nullable(),
    projectName: z.string().max(255).optional().nullable(),
    amount: z.coerce.number().int().min(1),
    remark: z.string().optional().nullable(),
    invoiceProof: z.array(z.unknown()).optional(),
    approvalStatus: z.coerce.number().int().optional(),
    tallyStatus: z.coerce.number().int().optional(),
    proofStatus: z.coerce.number().int().optional(),
    status: z.coerce.number().int().optional(),
    dateOfExpense: z.coerce.date(),
    approvedDate: z.coerce.date().optional().nullable(),
    transferToId: z.coerce.number().int().optional(),
    insurance: z.string().optional().nullable(),
});

export type CreateEmployeeImprestDto = z.infer<typeof CreateEmployeeImprestSchema>;
