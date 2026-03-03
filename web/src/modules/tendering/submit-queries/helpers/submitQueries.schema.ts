import { z } from 'zod';

// Query type enum
export const QueryTypeEnum = z.enum(['technical', 'commercial', 'bec', 'price_bid']);
export type QueryType = z.infer<typeof QueryTypeEnum>;

// Query list item schema
export const QueryItemSchema = z.object({
    pageNo: z.string().min(1, 'Page number is required'),
    clauseNo: z.string().min(1, 'Clause number is required'),
    queryType: QueryTypeEnum,
    currentStatement: z.string().min(1, 'Current statement is required'),
    requestedStatement: z.string().min(1, 'Requested statement is required'),
});

// Client contact schema
export const ClientContactSchema = z.object({
    org: z.string().min(1, 'Organization is required'),
    name: z.string().min(1, 'Contact name is required'),
    email: z.email('Invalid email address'),
    phone: z.string().optional(),
    ccEmails: z.array(z.email('Invalid CC email')).optional().default([]),
});

// Main form schema
export const SubmitQueryFormSchema = z.object({
    tenderId: z.number().int().positive(),
    queries: z.array(QueryItemSchema).min(1, 'At least one query is required'),
    clientContacts: z.array(ClientContactSchema).min(1, 'At least one client contact is required'),
});

export type SubmitQueryFormValues = z.infer<typeof SubmitQueryFormSchema>;
export type QueryItemValues = z.infer<typeof QueryItemSchema>;
export type ClientContactValues = z.infer<typeof ClientContactSchema>;

// Query type options for select dropdown
export const queryTypeOptions = [
    { value: 'technical', label: 'Technical' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'bec', label: 'BEC' },
    { value: 'price_bid', label: 'Price Bid Format' },
] as const;
