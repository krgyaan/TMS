import { useQuery } from '@tanstack/react-query';
import { gstChecklistApi } from '@/services/api/gst-checklist.api';
import type { ChecklistListParams } from '@/services/api/tds-checklist.api';

export const GST_CHECKLIST_KEYS = {
    all: ['gstChecklists'] as const,
    lists: () => [...GST_CHECKLIST_KEYS.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...GST_CHECKLIST_KEYS.lists(), { filters }] as const,
};

export const useGstChecklists = (
    pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const params: ChecklistListParams = {
        page: pagination.page,
        limit: pagination.limit,
        search: pagination.search,
        sortBy: sort?.sortBy,
        sortOrder: sort?.sortOrder,
    };

    return useQuery({
        queryKey: GST_CHECKLIST_KEYS.list({ ...params }),
        queryFn: () => gstChecklistApi.getAll(params),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    });
};