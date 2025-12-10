import axiosInstance from '@/lib/axios';
import type { TenderCostingSheet, PaginatedResult } from '@/types/api.types';

export type CostingApprovalDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMember: number | null;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    dueDate: Date | null;
    emdAmount: string | null;
    gstValues: number;
    costingStatus: 'Pending' | 'Approved' | 'Rejected/Redo';
    submittedFinalPrice: string | null;
    submittedBudgetPrice: string | null;
    googleSheetUrl: string | null;
    costingSheetId: number | null;
};

export type ApproveCostingDto = {
    finalPrice: string;
    receiptPrice: string;
    budgetPrice: string;
    grossMargin: string;
    oemVendorIds: number[];
    tlRemarks: string;
};

export type RejectCostingDto = {
    rejectionReason: string;
};

export type CostingApprovalListParams = {
    costingStatus?: 'Pending' | 'Approved' | 'Rejected/Redo';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export const costingApprovalsService = {
    getAll: async (params?: CostingApprovalListParams): Promise<PaginatedResult<CostingApprovalDashboardRow>> => {
        const searchParams = new URLSearchParams();

        if (params?.costingStatus) {
            searchParams.set('costingStatus', params.costingStatus);
        }
        if (params?.page) {
            searchParams.set('page', String(params.page));
        }
        if (params?.limit) {
            searchParams.set('limit', String(params.limit));
        }
        if (params?.sortBy) {
            searchParams.set('sortBy', params.sortBy);
        }
        if (params?.sortOrder) {
            searchParams.set('sortOrder', params.sortOrder);
        }

        const queryString = searchParams.toString();
        const url = queryString ? `/costing-approvals?${queryString}` : '/costing-approvals';
        const response = await axiosInstance.get<PaginatedResult<CostingApprovalDashboardRow>>(url);
        return response.data;
    },

    getById: async (id: number): Promise<TenderCostingSheet> => {
        const response = await axiosInstance.get<TenderCostingSheet>(`/costing-approvals/${id}`);
        return response.data;
    },

    approve: async (id: number, data: ApproveCostingDto): Promise<TenderCostingSheet> => {
        const response = await axiosInstance.post<TenderCostingSheet>(
            `/costing-approvals/${id}/approve`,
            data
        );
        return response.data;
    },

    reject: async (id: number, data: RejectCostingDto): Promise<TenderCostingSheet> => {
        const response = await axiosInstance.post<TenderCostingSheet>(
            `/costing-approvals/${id}/reject`,
            data
        );
        return response.data;
    },

    updateApproved: async (id: number, data: ApproveCostingDto): Promise<TenderCostingSheet> => {
        const response = await axiosInstance.patch<TenderCostingSheet>(
            `/costing-approvals/${id}`,
            data
        );
        return response.data;
    },
};
