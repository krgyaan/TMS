// create-employee-imprest-credit.schema.ts
import { z } from "zod";

export const CreateEmployeeImprestCreditSchema = z.object({
    userId: z.number(),
    txnDate: z.string(),
    teamMemberName: z.string(),
    amount: z.number(),
    projectName: z.string().optional(),
});

export type CreateEmployeeImprestCreditDto = z.infer<typeof CreateEmployeeImprestCreditSchema>;
