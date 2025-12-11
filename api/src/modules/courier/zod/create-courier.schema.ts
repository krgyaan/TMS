import { z } from "zod";
import { createZodDto } from "nestjs-zod";

export const CreateCourierSchema = z.object({
    to_org: z.string().min(1, "Organization name is required"),
    to_name: z.string().min(1, "Recipient name is required"),
    to_addr: z.string().min(1, "Address is required"),
    to_pin: z.string().min(1, "Pin code is required"),
    to_mobile: z.string().min(1, "Mobile number is required"),
    emp_from: z.number().int().positive("Please select an employee"),
    del_date: z.string().min(1, "Expected delivery date is required"),
    urgency: z.number().int().min(1).max(2, "Please select dispatch urgency"),
});

export class CreateCourierDto extends createZodDto(CreateCourierSchema) {}
export type CreateCourierInput = z.infer<typeof CreateCourierSchema>;
