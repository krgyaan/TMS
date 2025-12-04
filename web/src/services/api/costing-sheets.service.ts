import axiosInstance from '@/lib/axios';

export type CostingSheetDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    dueDate: Date | null;
    gstValues: number;
};

export const costingSheetsService = {
    getAll: async (): Promise<CostingSheetDashboardRow[]> => {
        const response = await axiosInstance.get<CostingSheetDashboardRow[]>('/costing-sheets');
        return response.data;
    },
};
