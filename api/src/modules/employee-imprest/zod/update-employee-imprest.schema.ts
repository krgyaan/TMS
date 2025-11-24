import { z } from 'zod';

export const UpdateEmployeeImprestSchema = z.object({
  party_name: z.string().optional().nullable(),
  project_name: z.string().optional().nullable(),
  amount: z.number().optional(),
  category: z.string().optional().nullable(),
  team_id: z.number().optional().nullable(),
  remark: z.string().optional().nullable(),
  approval_status: z.number().optional(),
  tally_status: z.number().optional(),
  proof_status: z.number().optional(),
  status: z.number().optional(),
});

export type UpdateEmployeeImprestDto = z.infer<
  typeof UpdateEmployeeImprestSchema
>;
