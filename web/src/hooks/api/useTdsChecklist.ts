import { useQuery } from '@tanstack/react-query';
import { tdsChecklistApi } from '@/services/api/tds-checklist.api';
import type { ChecklistListParams } from '@/services/api/tds-checklist.api';

export const TDS_CHECKLIST_KEYS = {
    all: ['tdsChecklists'] as const,
    lists: () => [...TDS_CHECKLIST_KEYS.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...TDS_CHECKLIST_KEYS.lists(), { filters }] as const,
};

export const useTdsChecklists = (
    pagination: { page: number; limit: number; search?: string; year?: number; month?: number } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const params: ChecklistListParams = {
        page: pagination.page,
        limit: pagination.limit,
        search: pagination.search,
        year: pagination.year,
        month: pagination.month,
        sortBy: sort?.sortBy,
        sortOrder: sort?.sortOrder,
    };

    return useQuery({
        queryKey: TDS_CHECKLIST_KEYS.list({ ...params }),
        queryFn: () => tdsChecklistApi.getAll(params),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    });
};