import { Injectable } from '@nestjs/common';

@Injectable()
export class BankGuaranteeService {
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
            bgDate: new Date().toISOString(),
            bgNo: `BG${String(i + 1).padStart(6, '0')}`,
            beneficiaryName: `Beneficiary ${i + 1}`,
            tenderName: `Tender ${i + 1}`,
            tenderNo: `TNDR${String(i + 1).padStart(4, '0')}`,
            bidValidity: new Date().toISOString(),
            amount: (i + 1) * 50000,
            bgExpiryDate: new Date().toISOString(),
            bgClaimPeriod: 90,
            expiryDate: new Date().toISOString(),
            bgChargesPaid: (i + 1) * 1000,
            bgChargesCalculated: (i + 1) * 1200,
            fdrNo: `FDR${String(i + 1).padStart(6, '0')}`,
            fdrValue: (i + 1) * 50000,
            tenderStatus: 'Active',
            expiry: new Date().toISOString(),
            bgStatus: tab || 'new-requests',
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
            'new-requests': 3,
            'live-yes': 5,
            'live-pnb': 4,
            'live-bg-limit': 2,
            cancelled: 1,
            rejected: 1,
            total: 16,
        };
    }
}
