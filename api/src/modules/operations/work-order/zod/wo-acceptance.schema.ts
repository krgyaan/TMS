// wo-acceptance.dto.ts
import { z } from "zod";

export const CreateWoAcceptanceSchema = z.object({
    basicDetailId: z.number(),

    woYes: z.string(), // "1"

    pageNo: z.string().optional(),
    clauseNo: z.string().optional(),
    currentStatement: z.string().optional(),
    correctedStatement: z.string().optional(),

    acceptedInitiate: z.string().optional(),
    acceptedSigned: z.string().optional(),

    followupFrequency: z.string().optional(),

    status: z.string().optional(),
});

export type CreateWoAcceptanceDto = z.infer<typeof CreateWoAcceptanceSchema>;
export type UpdateWoAcceptanceDto = CreateWoAcceptanceDto;
