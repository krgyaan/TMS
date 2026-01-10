import { Injectable } from '@nestjs/common';

@Injectable()
export class DemandDraftService {
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
            ddCreationDate: new Date().toISOString(),
            ddNo: `DD${String(i + 1).padStart(6, '0')}`,
            beneficiaryName: `Beneficiary ${i + 1}`,
            ddAmount: (i + 1) * 25000,
            tenderName: `Tender ${i + 1}`,
            tenderNo: `TNDR${String(i + 1).padStart(4, '0')}`,
            bidValidity: new Date().toISOString(),
            tenderStatus: 'Active',
            member: `Member ${i + 1}`,
            expiry: new Date().toISOString(),
            ddStatus: tab || 'pending',
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
            pending: 4,
            created: 3,
            rejected: 2,
            returned: 1,
            cancelled: 1,
            total: 11,
        };
    }
}
