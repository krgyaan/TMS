import { z } from 'zod';

// Schema for client contacts
const ClientContactSchema = z.object({
  org: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
});

// Schema for query list items
const QueryListItemSchema = z.object({
  pageNo: z.string().min(1),
  clauseNo: z.string().min(1),
  queryType: z.enum(['technical', 'commercial', 'bec', 'price_bid']),
  currentStatement: z.string().min(1),
  requestedStatement: z.string().min(1),
});

export const CreateSubmitQueriesSchema = z.object({
  tenderId: z.number().int().positive(),
  clientContacts: z.array(ClientContactSchema).min(1, "At least one client contact is required"),
  queries: z.array(QueryListItemSchema).min(1, "At least one query is required"),
});

export type CreateSubmitQueriesDto = z.infer<typeof CreateSubmitQueriesSchema>;

export const UpdateSubmitQueriesSchema = z.object({
  tenderId: z.number().int().positive().optional(),
  clientContacts: z.array(ClientContactSchema).min(1, "At least one client contact is required").optional(),
  queries: z.array(QueryListItemSchema).min(1, "At least one query is required").optional(),
});

export type UpdateSubmitQueriesDto = z.infer<typeof UpdateSubmitQueriesSchema>;

export type ClientContact = z.infer<typeof ClientContactSchema>;
export type QueryListItem = z.infer<typeof QueryListItemSchema>;
