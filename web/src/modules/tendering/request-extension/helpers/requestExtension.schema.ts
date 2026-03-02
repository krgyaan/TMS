import { z } from 'zod';

export const RequestExtensionFormSchema = z.object({
    tenderId: z.number().int().positive({ message: "Tender ID is required" }),
    days: z.number().int().positive({ message: "Days must be a positive integer" }),
    reason: z.string().min(1, { message: "Reason is required" }),
    clients: z.array(z.number().int().positive({ message: "Client ID must be a positive integer" })).min(1, { message: "At least one client must be selected" }),
});

export type RequestExtensionFormValues = z.infer<typeof RequestExtensionFormSchema>;
