export interface ImprestStats {
    amountSpent: number;
    amountApproved: number;
    amountReceived: number;
    amountLeft: number;

    voucherInfo?: {
        totalVouchers: number;
        accountsApproved: number;
        adminApproved: number;
    };
}

export interface PreviousFYStats extends ImprestStats {
    financialYear: string;
    fyStartYear: number;
}

export interface EmployeeImprestSummary {
    userId: number;
    userName: string;

    // Totals
    amountReceived: number;
    amountSpent: number;
    amountApproved: number;
    amountLeft: number;

    voucherInfo?: {
        totalVouchers: number;
        accountsApproved: number;
        adminApproved: number;
    };

    // Segregated
    current: ImprestStats;
    previous: PreviousFYStats[];
}

export interface CreateImprestCreditPayload {
    userId: number;
    txnDate: string;
    teamMemberName: string;
    amount: number;
    projectName?: string;
}
