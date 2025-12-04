import {
    createContext,
    useContext,
    useMemo,
    useState,
    useCallback,
    type ReactNode,
} from 'react';
import { useCurrentUser } from '@/hooks/api/useAuth';
import type { AuthUser, DataScope, RoleName } from '@/types/auth.types';
import { getStoredActiveTeamId, setStoredActiveTeamId } from '@/lib/auth';

// ==================== Types ====================

interface AuthContextValue {
    // User state
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    // Role info
    role: string | null;
    roleId: number | null;
    dataScope: DataScope;
    canSwitchTeams: boolean;

    // Team info
    teamId: number | null;
    activeTeamId: number | null;
    setActiveTeamId: (teamId: number | null) => void;
    effectiveTeamId: number | null;

    // Permissions
    permissions: string[];
    hasPermission: (module: string, action: string) => boolean;
    canCreate: (module: string) => boolean;
    canRead: (module: string) => boolean;
    canUpdate: (module: string) => boolean;
    canDelete: (module: string) => boolean;
    canApprove: (module: string) => boolean;

    // Role checks
    hasRole: (roleName: string) => boolean;
    hasMinRole: (roleName: RoleName) => boolean;
    isAdmin: boolean;
    isSuperUser: boolean;
    isTeamLeader: boolean;
}

// ==================== Constants ====================

const ROLE_HIERARCHY: Record<string, number> = {
    'Field': 1,
    'Engineer': 2,
    'Executive': 3,
    'Coordinator': 4,
    'Team Leader': 5,
    'Admin': 6,
    'Super User': 7,
};

// ==================== Context ====================

const AuthContext = createContext<AuthContextValue | null>(null);

// ==================== Provider ====================

export function AuthProvider({ children }: { children: ReactNode }) {
    const { data: user, isLoading } = useCurrentUser();

    // Active team selection (for admins)
    const [activeTeamId, setActiveTeamIdState] = useState<number | null>(
        getStoredActiveTeamId()
    );

    // Persist team selection
    const setActiveTeamId = useCallback((teamId: number | null) => {
        setActiveTeamIdState(teamId);
        setStoredActiveTeamId(teamId);
    }, []);

    // Memoized context value
    const value = useMemo<AuthContextValue>(() => {
        // Extract role info
        const role = user?.role?.name ?? null;
        const roleId = user?.role?.id ?? null;
        const dataScope = (user?.role?.dataScope ?? 'self') as DataScope;
        const canSwitchTeams = user?.role?.canSwitchTeams ?? false;
        const permissions = user?.permissions ?? [];

        // Extract team info
        const teamId = user?.team?.id ?? user?.profile?.primaryTeamId ?? null;

        // Calculate effective team ID
        const effectiveTeamId = canSwitchTeams ? activeTeamId : teamId;

        // Role checks
        const isSuperUser = role === 'Super User';
        const isAdmin = role === 'Admin';
        const isTeamLeader = role === 'Team Leader';

        // Permission checker
        const hasPermission = (module: string, action: string): boolean => {
            // Super User and Admin have all permissions
            if (isSuperUser || isAdmin) return true;
            return permissions.includes(`${module}:${action}`);
        };

        return {
            // User state
            user: user ?? null,
            isLoading,
            isAuthenticated: !!user,

            // Role info
            role,
            roleId,
            dataScope,
            canSwitchTeams,

            // Team info
            teamId,
            activeTeamId,
            setActiveTeamId,
            effectiveTeamId,

            // Permissions
            permissions,
            hasPermission,
            canCreate: (module) => hasPermission(module, 'create'),
            canRead: (module) => hasPermission(module, 'read'),
            canUpdate: (module) => hasPermission(module, 'update'),
            canDelete: (module) => hasPermission(module, 'delete'),
            canApprove: (module) => hasPermission(module, 'approve'),

            // Role checks
            hasRole: (roleName) => role === roleName,
            hasMinRole: (requiredRole: RoleName) => {
                if (!role) return false;
                const userLevel = ROLE_HIERARCHY[role] ?? 0;
                const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 999;
                return userLevel >= requiredLevel;
            },
            isSuperUser,
            isAdmin,
            isTeamLeader,
        };
    }, [user, isLoading, activeTeamId, setActiveTeamId]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ==================== Hook ====================

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
