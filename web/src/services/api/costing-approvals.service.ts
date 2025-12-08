import axiosInstance from '@/lib/axios';
import type { TenderCostingSheet } from '@/types/api.types';

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

export const costingApprovalsService = {
    getAll: async (): Promise<CostingApprovalDashboardRow[]> => {
        const response = await axiosInstance.get<CostingApprovalDashboardRow[]>('/costing-approvals');
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
