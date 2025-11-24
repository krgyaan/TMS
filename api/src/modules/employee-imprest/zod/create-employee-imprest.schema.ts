import { z } from 'zod';

export const CreateEmployeeImprestSchema = z.object({
  name_id: z.number(),
  party_name: z.string().optional().nullable(),
  project_name: z.string().optional().nullable(),
  amount: z.number().min(1),
  category: z.string().optional().nullable(),
  team_id: z.number().optional().nullable(),
  remark: z.string().optional().nullable(),
});

export type CreateEmployeeImprestDto = z.infer<
  typeof CreateEmployeeImprestSchema
>;
