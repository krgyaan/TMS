import { useQuery } from '@tanstack/react-query';
import { costingSheetsService, type CostingSheetDashboardRow } from '@/services/api/costing-sheets.service';

export const costingSheetsKey = {
    all: ['costing-sheets'] as const,
    lists: () => [...costingSheetsKey.all, 'list'] as const,
    list: (filters?: any) => [...costingSheetsKey.lists(), { filters }] as const,
};

export const useCostingSheets = () => {
    return useQuery({
        queryKey: costingSheetsKey.lists(),
        queryFn: () => costingSheetsService.getAll(),
    });
};

export type { CostingSheetDashboardRow };
