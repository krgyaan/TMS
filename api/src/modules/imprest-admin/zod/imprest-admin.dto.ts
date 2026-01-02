export interface EmployeeImprestSummaryDto {
    userId: number;
    userName: string;

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
