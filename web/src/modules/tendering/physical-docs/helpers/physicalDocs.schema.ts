import { z } from 'zod';

export const PhysicalDocsFormSchema = z.object({
    tenderId: z.number().min(1, 'Tender ID is required'),
    courierNo: z.coerce.number().min(1, 'Courier number is required'),
    submittedDocs: z.array(z.string()).min(1, 'At least one document must be selected'),
    physicalDocsPersons: z.array(z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.email('Invalid email address').or(z.literal('')),
        phone: z.string().min(10, 'Phone number must be at least 10 digits').or(z.literal('')),
    })).min(1, 'At least one person must be added'),
});

export type PhysicalDocsFormValues = z.infer<typeof PhysicalDocsFormSchema>;
