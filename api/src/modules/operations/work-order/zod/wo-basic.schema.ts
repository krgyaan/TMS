import { z } from "zod";

export const CreateWoBasicDetailSchema = z.object({
    tenderNameId: z.coerce.number({
        required_error: "Tender ID is required",
        invalid_type_error: "Tender ID must be a number",
    }),

    number: z.string().min(1).optional(),

    // ❗ date-only string
    date: z.string().optional(),

    parGst: z.string().optional(),
    parAmt: z.string().optional(),

    costingReceipt: z.string().optional(),
    costingBudget: z.string().optional(),
    costingGrossMargin: z.string().optional(),

    enquiryId: z.coerce.number().optional(),
    enquiryName: z.string().optional(),

    image: z.any().optional(),
});

/* 🔑 UPDATE = same required tenderNameId, rest optional */
export const UpdateWoBasicDetailSchema = CreateWoBasicDetailSchema.partial({
    number: true,
    date: true,
    parGst: true,
    parAmt: true,
    costingReceipt: true,
    costingBudget: true,
    costingGrossMargin: true,
    enquiryId: true,
    enquiryName: true,
    image: true,
});

export type CreateWoBasicDetailDto = z.infer<typeof CreateWoBasicDetailSchema>;
export type UpdateWoBasicDetailDto = z.infer<typeof UpdateWoBasicDetailSchema>;
