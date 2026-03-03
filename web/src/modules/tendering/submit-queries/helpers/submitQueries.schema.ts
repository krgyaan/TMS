import { z } from 'zod';

// Schema for client contacts
const ClientContactSchema = z.object({
  org: z.string().min(1),
  name: z.string().min(1),
  email: z.email(),
  phone: z.string(),
});


// Schema for query list items
const QueryListItemSchema = z.object({
  pageNo: z.string().min(1),
  clauseNo: z.string().min(1),
  queryType: z.enum(['technical', 'commercial', 'bec', 'price_bid']),
  currentStatement: z.string().min(1),
  requestedStatement: z.string().min(1),
});

// Main form schema
export const SubmitQueriesFormSchema = z.object({
  tenderId: z.number().int().positive({ message: "Tender ID is required" }),
  clients: z.array(ClientContactSchema).min(1, { message: "At least one client contact is required" }),
  queries: z.array(QueryListItemSchema).min(1, { message: "At least one query is required" }),
});

export type SubmitQueriesFormValues = z.infer<typeof SubmitQueriesFormSchema>;
export type ClientContact = z.infer<typeof ClientContactSchema>;
export type QueryListItem = z.infer<typeof QueryListItemSchema>;
