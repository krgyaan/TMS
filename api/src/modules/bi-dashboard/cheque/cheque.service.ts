import { Injectable } from '@nestjs/common';

@Injectable()
export class ChequeService {
    getDashboardData(
        tab?: string,
        options?: {
            page?: number;
            limit?: number;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
            search?: string;
        },
    ) {
        const page = options?.page || 1;
        const limit = options?.limit || 50;

        // Placeholder data
        const mockData = Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
            id: i + 1,
            date: new Date().toISOString(),
            chequeNo: `CHQ${String(i + 1).padStart(6, '0')}`,
            payeeName: `Payee ${i + 1}`,
            bidValidity: new Date().toISOString(),
            amount: (i + 1) * 20000,
            type: i % 2 === 0 ? 'Security' : 'DD/FDR',
            cheque: `Cheque ${i + 1}`,
            dueDate: new Date().toISOString(),
            expiry: new Date().toISOString(),
            chequeStatus: tab || 'cheque-pending',
        }));

        return {
            data: mockData,
            meta: {
                total: 10,
                page,
                limit,
                totalPages: Math.ceil(10 / limit),
            },
        };
    }

    getDashboardCounts() {
        return {
            'cheque-pending': 3,
            'cheque-payable': 4,
            'cheque-paid-stop': 2,
            'cheque-for-security': 2,
            'cheque-for-dd-fdr': 2,
            rejected: 1,
            cancelled: 1,
            expired: 1,
            total: 16,
        };
    }
}
