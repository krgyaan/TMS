// wo-details.dto.ts
import { z } from "zod";

export const CreateWoDetailSchema = z.object({
    basicDetailId: z.number(),

    organization: z.string().optional(),
    departments: z.string().optional(),

    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    designation: z.string().optional(),

    budget: z.coerce.string().optional(),

    maxLd: z.string().optional(),
    ldStartDate: z.string().optional(),
    maxLdDate: z.string().optional(),

    pbgApplicable: z.enum(["0", "1"]).optional(),
    contractAgreementStatus: z.enum(["0", "1"]).optional(),
    ldApplicable: z.enum(["0", "1"]).optional(),

    meetingDateTime: z.coerce.date().optional(),
    googleMeetLink: z.string().optional(),
});

export type CreateWoDetailDto = z.infer<typeof CreateWoDetailSchema>;
export type UpdateWoDetailDto = CreateWoDetailDto;
