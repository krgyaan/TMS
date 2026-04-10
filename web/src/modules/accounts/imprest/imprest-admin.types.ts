export interface EmployeeImprestSummary {
    userId: number;
    userName: string;

    amountReceived: number;
    amountSpent: number;
    amountApproved: number;
    amountLeft: number;
}

export interface CreateImprestCreditPayload {
    userId: number;
    txnDate: string;
    teamMemberName: string;
    amount: number;
    projectName?: string;
}
