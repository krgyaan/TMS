import { z } from "zod";

export const ContactSchema = z.object({
    id: z.number().optional(),
    organization: z.string().optional(),
    departments: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    designation: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
});

export const KickoffFormSchema = z.object({
    meetingDate: z.string().min(1, 'Meeting date is required'),
    meetingLink: z.string().url('Invalid URL').optional().or(z.literal('')),
});

export type KickoffFormValues = z.infer<typeof KickoffFormSchema>;
export type ContactValues = z.infer<typeof ContactSchema>;
