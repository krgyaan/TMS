export interface EmployeeImprestSummary {
    userId: number;
    userName: string;

    amountReceived: number;
    amountSpent: number;
    amountApproved: number;
    amountLeft: number;
}

export interface ImprestPaymentHistoryRow {
    id: number;
    userId: number;

    teamMemberName: string;
    date: string; // ISO date
    amount: number;
    projectName: string | null;
}
