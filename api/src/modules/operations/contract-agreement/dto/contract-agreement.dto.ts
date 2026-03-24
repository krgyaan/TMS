import { z } from 'zod';

export const SaveContractAgreementSchema = z.object({
    woDetailId: z.number(),
    // VE Signed Contract Agreement
    veSigned: z.string().max(500),
    veSignedDate: z.date(),
    // Client and VE Signed Contract Agreement
    clientAndVeSigned: z.string().max(500),
    clientAndVeSignedDate: z.date(),
});

export type SaveContractAgreementDto = z.infer<typeof SaveContractAgreementSchema>;

export interface ContractAgreementDashboardRow {
    id: number | null;
    woDetailId: number | null;
    projectName: string | null;
    woNumber: string | null;
    woDate: Date | null;
    woValuePreGst: number | null;
    woValueGstAmt: number | null;
    woStatus: string | null;
    veSigned: string | null;
    veSignedDate: Date | null;
    clientAndVeSigned: string | null;
    clientAndVeSignedDate: Date | null;
    teamMemberName: string | null;
}
