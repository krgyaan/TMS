import axiosInstance from '@/lib/axios';

export type ChecklistDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    dueDate: Date | null;
    gstValues: number;
    checklistSubmitted: boolean;
};

export const checklistsService = {
    getAll: async (): Promise<ChecklistDashboardRow[]> => {
        const response = await axiosInstance.get<ChecklistDashboardRow[]>('/checklists');
        // console.log(response.data);
        return response.data;
    },
};
