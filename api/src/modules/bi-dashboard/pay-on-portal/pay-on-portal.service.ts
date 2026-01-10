import { Injectable } from '@nestjs/common';

@Injectable()
export class PayOnPortalService {
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
            teamMember: `Member ${i + 1}`,
            utrNo: `UTR${String(i + 1).padStart(6, '0')}`,
            portalName: `Portal ${i + 1}`,
            tenderName: `Tender ${i + 1}`,
            tenderNo: `TNDR${String(i + 1).padStart(4, '0')}`,
            bidValidity: new Date().toISOString(),
            tenderStatus: 'Active',
            amount: (i + 1) * 10000,
            popStatus: tab || 'pending',
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
            pending: 5,
            accepted: 3,
            rejected: 2,
            returned: 1,
            settled: 4,
            total: 15,
        };
    }
}
