import { z } from "zod";
import { createZodDto } from "nestjs-zod";

export const CreateCourierSchema = z.object({
    toOrg: z.string().min(1, "Organization name is required").max(255),
    toName: z.string().min(1, "Recipient name is required").max(255),
    toAddr: z.string().min(1, "Address is required"),
    toPin: z.string().min(1, "Pin code is required").max(255),
    toMobile: z.string().min(1, "Mobile number is required").max(255),

    empFrom: z.coerce.number().int().positive("Please select an employee"),

    delDate: z
        .string()
        .min(1, "Expected delivery date is required")
        .refine(v => !isNaN(Date.parse(v)), "Invalid date"),

    urgency: z.coerce.number().int().min(1).max(2),
});

export class CreateCourierDto extends createZodDto(CreateCourierSchema) {}
export type CreateCourierInput = z.infer<typeof CreateCourierSchema>;
