import { z } from "zod";

export const UpdateEmployeeImprestSchema = z.object({
    userId: z.number().int().optional().nullable(),
    categoryId: z.number().int().optional().nullable(),
    teamId: z.number().int().optional().nullable(),

    partyName: z.string().max(255).optional().nullable(),
    projectName: z.string().max(255).optional().nullable(),
    ip: z.string().max(100).optional().nullable(),

    amount: z.number().int().min(1).optional().nullable(),
    strtotime: z.number().int().optional().nullable(),

    remark: z.string().optional().nullable(),

    invoiceProof: z.array(z.unknown()).optional(),

    approvalStatus: z.number().int().optional(),
    tallyStatus: z.number().int().optional(),
    proofStatus: z.number().int().optional(),
    status: z.number().int().optional(),

    approvedDate: z.coerce.date().optional().nullable(),
});

export type UpdateEmployeeImprestDto = z.infer<typeof UpdateEmployeeImprestSchema>;
