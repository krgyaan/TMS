export interface ImprestStatsDto {
    amountSpent: number;
    amountApproved: number;
    amountReceived: number;
    amountLeft: number;

    voucherInfo: {
        totalVouchers: number;
        accountsApproved: number;
        adminApproved: number;
    };
}

export interface EmployeeImprestSummaryDto {
    userId: number;
    userName: string;

    // Totals for the data table
    amountSpent: number;
    amountApproved: number;
    amountReceived: number;
    amountLeft: number;

    voucherInfo: {
        totalVouchers: number;
        accountsApproved: number;
        adminApproved: number;
    };

    // Segregated for summary cards
    current: ImprestStatsDto;
    previous: ImprestStatsDto;
}
