import { z } from 'zod';

export const CreateTenderSchema = z.object({
    team: z.coerce.number().int().positive(),
    tenderNo: z.string().min(1),
    tenderName: z.string().min(1),
    organization: z.coerce.number().int().positive().optional(),
    gstValues: z.string().default("0"),
    tenderFees: z.string().default("0"),
    emd: z.string().default("0"),
    teamMember: z.coerce.number().int().positive().nullable().optional(),
    dueDate: z.string(),
    location: z.coerce.number().int().positive().optional(),
    website: z.coerce.number().int().positive().optional(),
    item: z.coerce.number().int().positive(),
    status: z.coerce.number().int().default(1),
    remarks: z.string().max(200).optional(),
    documents: z.string().nullable().optional(),
});

export type CreateTenderDto = z.infer<typeof CreateTenderSchema>;
