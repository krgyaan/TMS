import { useMemo } from 'react';
import { useTeamContext, type TeamFilterParams } from '@/contexts/TeamContext';
import { DataScope } from '@/types/auth.types';

/**
 * Hook to get team filter parameters for API calls
 * Automatically includes the right filtering based on user's role
 */
export function useTeamFilter(): TeamFilterParams & {
    queryParams: Record<string, string | number>;
} {
    const { getFilterParams } = useTeamContext();
    const filterParams = getFilterParams();

    // Convert to query params for API calls
    const queryParams = useMemo(() => {
        const params: Record<string, string | number> = {};

        switch (filterParams.dataScope) {
            case DataScope.SELF:
                // Filter by userId for personal data
                if (filterParams.userId) {
                    params.assignedTo = filterParams.userId;
                }
                if (filterParams.teamId) {
                    params.teamId = filterParams.teamId;
                }
                break;

            case DataScope.TEAM:
                // Filter by teamId for team view
                if (filterParams.teamId) {
                    params.teamId = filterParams.teamId;
                }
                break;

            case DataScope.ALL:
                // Only add teamId if specifically selected
                if (filterParams.teamId) {
                    params.teamId = filterParams.teamId;
                }
                // No filter means all data
                break;
        }

        return params;
    }, [filterParams]);

    return {
        ...filterParams,
        queryParams,
    };
}

/**
 * Helper hook to build query key with team filter
 */
export function useTeamQueryKey(baseKey: readonly string[]): readonly (string | number | null)[] {
    const { teamId, userId, dataScope } = useTeamFilter();

    return useMemo(() => {
        // Each element of result must be string | number | null
        return [
            ...baseKey,
            teamId ?? null,
            userId ?? null,
            dataScope ?? null,
        ];
    }, [baseKey, teamId, userId, dataScope]);
}
