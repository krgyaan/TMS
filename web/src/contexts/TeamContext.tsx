import { createContext, type ReactNode, useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthUser, Team } from '@/types/auth.types';
import type { DataScope } from '@/types/auth.types';
import { canSwitchTeams, getDataScope } from '@/types/auth.types';
import { getStoredActiveTeamId, setStoredActiveTeamId } from '@/lib/auth';
import { useTeams } from '@/hooks/api/useTeams';

interface TeamContextValue {
    // Current user info
    currentUser: AuthUser | null;

    // Team state
    activeTeamId: number | null;
    activeTeam: Team | null;
    userPrimaryTeamId: number | null;

    // Role-based permissions
    userRole: string | null;
    dataScope: DataScope;
    canSwitchTeam: boolean;

    // Available teams (for team switcher)
    availableTeams: Team[];
    isLoadingTeams: boolean;

    // Actions
    setActiveTeam: (teamId: number | null) => void;
    resetToUserTeam: () => void;

    // Filter helpers for API calls
    getFilterParams: () => TeamFilterParams;
}

export interface TeamFilterParams {
    teamId: number | null;
    userId: number | null;
    dataScope: DataScope;
}

const TeamContext = createContext<TeamContextValue | null>(null);

interface TeamProviderProps {
    children: ReactNode;
    user: AuthUser | null;
}

export function TeamProvider({ children, user }: TeamProviderProps) {
    const queryClient = useQueryClient();

    // Get teams for admin/super user
    const { data: teamsData, isLoading: isLoadingTeams } = useTeams({
        enabled: user?.role?.canSwitchTeams ?? false,
    });

    // Derive values from user
    const userRole = user?.role?.name ?? null;
    const userCanSwitchTeam = canSwitchTeams(userRole);
    const userDataScope = getDataScope(userRole);
    const userPrimaryTeamId = user?.team?.id ?? user?.profile?.primaryTeamId ?? null;

    // Active team state
    const [activeTeamId, setActiveTeamIdState] = useState<number | null>(() => {
        // Initialize from localStorage if user can switch teams
        if (userCanSwitchTeam) {
            const stored = getStoredActiveTeamId();
            return stored;
        }
        // Otherwise, use user's primary team
        return userPrimaryTeamId;
    });

    // Sync activeTeamId when user changes
    useEffect(() => {
        if (!user) {
            setActiveTeamIdState(null);
            return;
        }

        if (userCanSwitchTeam) {
            // Admin/Super User: try to restore from localStorage, or use null (all teams)
            const stored = getStoredActiveTeamId();
            setActiveTeamIdState(stored);
        } else {
            // Regular users: always use their primary team
            setActiveTeamIdState(userPrimaryTeamId);
        }
    }, [user?.id, userCanSwitchTeam, userPrimaryTeamId]);

    // Set active team
    const setActiveTeam = useCallback((teamId: number | null) => {
        if (!userCanSwitchTeam) {
            console.warn('User cannot switch teams');
            return;
        }

        setActiveTeamIdState(teamId);
        setStoredActiveTeamId(teamId);

        // Invalidate all queries to refetch with new team filter
        queryClient.invalidateQueries();
    }, [userCanSwitchTeam, queryClient]);

    // Reset to user's primary team
    const resetToUserTeam = useCallback(() => {
        setActiveTeamIdState(userPrimaryTeamId);
        setStoredActiveTeamId(userPrimaryTeamId);
        queryClient.invalidateQueries();
    }, [userPrimaryTeamId, queryClient]);

    // Get active team object
    const activeTeam = useMemo(() => {
        if (!activeTeamId) return null;

        // Check user's team first
        if (user?.team?.id === activeTeamId) {
            return user.team;
        }

        // Check available teams
        return teamsData?.find(t => t.id === activeTeamId) ?? null;
    }, [activeTeamId, user?.team, teamsData]);

    // Available teams for switcher
    const availableTeams = useMemo(() => {
        if (!userCanSwitchTeam) {
            // Non-admin users only see their own team
            return user?.team ? [user.team] : [];
        }
        return teamsData ?? [];
    }, [userCanSwitchTeam, teamsData, user?.team]);

    // Get filter params for API calls
    const getFilterParams = useCallback((): TeamFilterParams => {
        if (!user) {
            return { teamId: null, userId: null, dataScope: DataScope.SELF };
        }

        switch (userDataScope) {
            case DataScope.SELF:
                // Executives, Engineers, Field: filter by their own userId
                return {
                    teamId: userPrimaryTeamId,
                    userId: user.id,
                    dataScope: DataScope.SELF,
                };

            case DataScope.TEAM:
                // Team Leaders, Coordinators: filter by their team
                return {
                    teamId: userPrimaryTeamId,
                    userId: null,
                    dataScope: DataScope.TEAM,
                };

            case DataScope.ALL:
                // Admin, Super User: filter by selected team (or all if null)
                return {
                    teamId: activeTeamId,
                    userId: null,
                    dataScope: DataScope.ALL,
                };

            default:
                return {
                    teamId: userPrimaryTeamId,
                    userId: user.id,
                    dataScope: DataScope.SELF,
                };
        }
    }, [user, userDataScope, userPrimaryTeamId, activeTeamId]);

    const value: TeamContextValue = {
        currentUser: user,
        activeTeamId,
        activeTeam,
        userPrimaryTeamId,
        userRole,
        dataScope: userDataScope,
        canSwitchTeam: userCanSwitchTeam,
        availableTeams,
        isLoadingTeams,
        setActiveTeam,
        resetToUserTeam,
        getFilterParams,
    };

    return (
        <TeamContext.Provider value={value}>
            {children}
        </TeamContext.Provider>
    );
}

export function useTeamContext(): TeamContextValue {
    const context = useContext(TeamContext);
    if (!context) {
        throw new Error('useTeamContext must be used within a TeamProvider');
    }
    return context;
}

// Convenience hook for getting filter params
export function useTeamFilter(): TeamFilterParams {
    const { getFilterParams } = useTeamContext();
    return getFilterParams();
}
