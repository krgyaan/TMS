import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { DataScope } from '@/types/auth.types';

export interface TeamFilterParams {
    teamId: number | null;
    userId: number | null;
    dataScope: DataScope;
}

export interface TeamQueryParams {
    teamId?: number;
    userId?: number;
    dataScope?: DataScope;
}

export interface UseTeamFilterResult extends TeamFilterParams {
    queryParams: TeamQueryParams;
    canViewAllTeams: boolean;
    canViewTeam: boolean;
    isFiltered: boolean;
}

export function useTeamFilter(): UseTeamFilterResult {
    const {
        user,
        dataScope,
        teamId: userTeamId,
        activeTeamId,
        canSwitchTeams,
    } = useAuth();

    return useMemo(() => {
        const userId = user?.id ?? null;

        // Determine effective team ID based on role and selection
        let effectiveTeamId: number | null = null;

        if (dataScope === 'all') {
            // Admin/Super User: use selected team (null = all teams)
            effectiveTeamId = activeTeamId;
        } else if (dataScope === 'team') {
            // Team Leader/Coordinator: always their team
            effectiveTeamId = userTeamId;
        } else {
            // Self scope: filter by user, not team
            effectiveTeamId = null;
        }

        // Build query params for API
        const queryParams: TeamQueryParams = {};

        if (dataScope === 'all' && effectiveTeamId !== null) {
            // Admin viewing specific team
            queryParams.teamId = effectiveTeamId;
        } else if (dataScope === 'team' && effectiveTeamId !== null) {
            // Team Leader viewing their team
            queryParams.teamId = effectiveTeamId;
        } else if (dataScope === 'self' && userId !== null) {
            // Executive/Engineer viewing only their data
            queryParams.userId = userId;
        }

        // Always include dataScope for backend reference
        queryParams.dataScope = dataScope;

        return {
            teamId: effectiveTeamId,
            userId,
            dataScope,
            queryParams,
            canViewAllTeams: dataScope === 'all',
            canViewTeam: dataScope === 'team' || dataScope === 'all',
            isFiltered: dataScope !== 'all' || activeTeamId !== null,
        };
    }, [user?.id, dataScope, userTeamId, activeTeamId, canSwitchTeams]);
}

export function useTeamQueryKey(
    baseKey: readonly string[]
): readonly (string | number | null)[] {
    const { teamId, userId, dataScope } = useTeamFilter();

    return useMemo(
        () => [...baseKey, teamId, userId, dataScope] as const,
        [baseKey, teamId, userId, dataScope]
    );
}

export function useResourceAccess() {
    const { user, dataScope, teamId: userTeamId } = useAuth();

    const canAccess = useMemo(() => {
        return (resource: {
            ownerId?: number | null;
            teamId?: number | null;
            createdById?: number | null;
        }): boolean => {
            if (!user) return false;

            // ALL scope can access everything
            if (dataScope === 'all') {
                return true;
            }

            // TEAM scope can access team resources
            if (dataScope === 'team') {
                if (userTeamId && resource.teamId === userTeamId) {
                    return true;
                }
                // Also allow if user owns the resource
                if (resource.ownerId === user.id || resource.createdById === user.id) {
                    return true;
                }
                return false;
            }

            // SELF scope can only access own resources
            if (dataScope === 'self') {
                return (
                    resource.ownerId === user.id || resource.createdById === user.id
                );
            }

            return false;
        };
    }, [user, dataScope, userTeamId]);

    return { canAccess };
}
