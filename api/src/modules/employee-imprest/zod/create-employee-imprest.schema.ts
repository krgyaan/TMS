import { z } from "zod";

export const CreateEmployeeImprestSchema = z.object({
    // relations
    userId: z.coerce.number().int().optional().nullable(),
    categoryId: z.coerce.number().int().optional().nullable(),
    teamId: z.coerce.number().int().optional().nullable(),

    // strings
    partyName: z.string().max(255).optional().nullable(),
    projectName: z.string().max(255).optional().nullable(),
    ip: z.string().max(100).optional().nullable(),

    // numeric
    amount: z.coerce.number().int().min(1),
    strtotime: z.coerce.number().int().optional().nullable(),

    // text
    remark: z.string().optional().nullable(),

    // jsonb
    invoiceProof: z.array(z.unknown()).optional(),

    // statuses
    approvalStatus: z.coerce.number().int().optional(),
    tallyStatus: z.coerce.number().int().optional(),
    proofStatus: z.coerce.number().int().optional(),
    status: z.coerce.number().int().optional(),

    approvedDate: z.coerce.date().optional().nullable(),
});

export type CreateEmployeeImprestDto = z.infer<typeof CreateEmployeeImprestSchema>;
