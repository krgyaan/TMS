import { z } from "zod";

export const UpdateEmployeeImprestSchema = z.object({
    userId: z.coerce.number(),
    categoryId: z.coerce.number().int().optional().nullable(),
    teamId: z.coerce.number().int().optional().nullable(),
    partyName: z.string().max(255).optional().nullable(),
    projectId: z.coerce.number().int().optional().nullable(),
    projectName: z.string().max(255).optional().nullable(),
    amount: z.coerce.number().int().min(1).optional(),
    remark: z.string().optional().nullable(),
    invoiceProof: z.array(z.string()).optional(),
    approvalStatus: z.coerce.number().int().optional(),
    tallyStatus: z.coerce.number().int().optional(),
    proofStatus: z.coerce.number().int().optional(),
    status: z.coerce.number().int().optional(),
    approvedDate: z.coerce.date().optional().nullable(),
    dateOfExpense: z.coerce.date().optional().nullable(),
    insurance: z.string().optional().nullable(),
});

export type UpdateEmployeeImprestDto = z.infer<typeof UpdateEmployeeImprestSchema>;
