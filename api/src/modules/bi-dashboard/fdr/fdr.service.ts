import { Injectable } from '@nestjs/common';

@Injectable()
export class FdrService {
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
            fdrCreationDate: new Date().toISOString(),
            fdrNo: `FDR${String(i + 1).padStart(6, '0')}`,
            beneficiaryName: `Beneficiary ${i + 1}`,
            fdrAmount: (i + 1) * 100000,
            tenderName: `Tender ${i + 1}`,
            tenderNo: `TNDR${String(i + 1).padStart(4, '0')}`,
            tenderStatus: 'Active',
            member: `Member ${i + 1}`,
            expiry: new Date().toISOString(),
            fdrStatus: tab || 'pending',
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
            pending: 3,
            'pnb-bg-linked': 4,
            'ybl-bg-linked': 3,
            'security-deposit': 2,
            'bond-linked': 2,
            rejected: 1,
            returned: 1,
            cancelled: 1,
            total: 17,
        };
    }
}
