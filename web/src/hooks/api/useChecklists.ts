import { useQuery } from '@tanstack/react-query';
import { checklistsService, type ChecklistDashboardRow } from '@/services/api/checklists.service';

export const checklistsKey = {
    all: ['checklists'] as const,
    lists: () => [...checklistsKey.all, 'list'] as const,
    list: (filters?: any) => [...checklistsKey.lists(), { filters }] as const,
};

export const useChecklists = () => {
    return useQuery({
        queryKey: checklistsKey.lists(),
        queryFn: () => checklistsService.getAll(),
    });
};

export type { ChecklistDashboardRow };
