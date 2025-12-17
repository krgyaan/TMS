import { z } from "zod";

export const CreateEmployeeImprestSchema = z.object({
    // relations
    userId: z.number().int().optional().nullable(),
    categoryId: z.number().int().optional().nullable(),
    teamId: z.number().int().optional().nullable(),

    // strings
    partyName: z.string().max(255).optional().nullable(),
    projectName: z.string().max(255).optional().nullable(),
    ip: z.string().max(100).optional().nullable(),

    // numeric
    amount: z.number().int().min(1).optional().nullable(),
    strtotime: z.number().int().optional().nullable(),

    // text
    remark: z.string().optional().nullable(),

    // jsonb
    invoiceProof: z.array(z.unknown()).optional(),

    // statuses (DB defaults exist, so optional)
    approvalStatus: z.number().int().optional(),
    tallyStatus: z.number().int().optional(),
    proofStatus: z.number().int().optional(),
    status: z.number().int().optional(),

    approvedDate: z.coerce.date().optional().nullable(),
});

export type CreateEmployeeImprestDto = z.infer<typeof CreateEmployeeImprestSchema>;
