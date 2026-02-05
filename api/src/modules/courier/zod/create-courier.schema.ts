import { z } from "zod";
import { createZodDto } from "nestjs-zod";

export const CreateCourierSchema = z.object({
    toOrg: z.string().min(1, "Organization name is required").max(255),
    toName: z.string().min(1, "Recipient name is required").max(255),
    toAddr: z.string().min(1, "Address is required"),
    toPin: z.string().min(1, "Pin code is required").max(255),
    toMobile: z.string().min(1, "Mobile number is required").max(255),

    empFrom: z.coerce.number().int().positive("Please select an employee").optional(),

    // keep it, but optional
    delDate: z.coerce.date(),

    urgency: z.coerce.number().int().min(1).max(2),
});

export type CreateCourierDto = z.infer<typeof CreateCourierSchema>;
export type CreateCourierInput = z.infer<typeof CreateCourierSchema>;
