import { z } from 'zod';

export const ClientSchema = z.object({
  org: z.string().min(1, 'Organization is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email address'),
  phone: z.string().optional(),
});

export const RequestExtensionFormSchema = z.object({
    tenderId: z.number().int().positive({ message: "Tender ID is required" }),
    days: z.number().int().positive({ message: "Days must be a positive integer" }),
    reason: z.string().min(1, { message: "Reason is required" }),
    clients: z.array(ClientSchema).min(1, { message: "At least one client is required" }),
});

export type RequestExtensionFormValues = z.infer<typeof RequestExtensionFormSchema>;
export type ClientFormValues = z.infer<typeof ClientSchema>;
