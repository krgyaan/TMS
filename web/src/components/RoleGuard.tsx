import { Navigate, useLocation } from "react-router-dom";
import { useCurrentUser } from "@/hooks/api/useAuth";
import type { RoleName, DataScope } from "@/types/auth.types";

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles?: RoleName[];
    requiredDataScope?: DataScope;
    fallback?: React.ReactNode;
    redirectTo?: string;
}

// Role hierarchy for comparison
const ROLE_HIERARCHY: Record<RoleName, number> = {
    'Field': 1,
    'Engineer': 2,
    'Executive': 3,
    'Coordinator': 4,
    'Team Leader': 5,
    'Admin': 6,
    'Super User': 7,
};

export function RoleGuard({
    children,
    allowedRoles,
    requiredDataScope,
    fallback,
    redirectTo = "/",
}: RoleGuardProps) {
    const location = useLocation();
    const { data: user, isLoading } = useCurrentUser();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    const userRole = user.role?.name as RoleName | undefined;
    const userDataScope = user.role?.dataScope;

    // Check role requirement
    if (allowedRoles && allowedRoles.length > 0) {
        if (!userRole) {
            return fallback ?? <Navigate to={redirectTo} replace />;
        }

        // Check if user role is in allowed roles or has higher privilege
        const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
        const hasAccess = allowedRoles.some((role) => {
            const requiredLevel = ROLE_HIERARCHY[role] ?? 999;
            return userRole === role || userLevel >= requiredLevel;
        });

        if (!hasAccess) {
            return fallback ?? <Navigate to={redirectTo} replace />;
        }
    }

    // Check data scope requirement
    if (requiredDataScope && userDataScope) {
        const scopeHierarchy: Record<DataScope, number> = {
            'self': 1,
            'team': 2,
            'all': 3,
        };

        const userScopeLevel = scopeHierarchy[userDataScope] ?? 0;
        const requiredScopeLevel = scopeHierarchy[requiredDataScope] ?? 999;

        if (userScopeLevel < requiredScopeLevel) {
            return fallback ?? <Navigate to={redirectTo} replace />;
        }
    }

    return <>{children}</>;
}

// Convenience wrapper for admin-only routes
export function AdminOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
    return (
        <RoleGuard allowedRoles={['Admin', 'Super User']} fallback={fallback}>
            {children}
        </RoleGuard>
    );
}

// Convenience wrapper for team leader and above
export function TeamLeaderOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
    return (
        <RoleGuard allowedRoles={['Team Leader', 'Coordinator', 'Admin', 'Super User']} fallback={fallback}>
            {children}
        </RoleGuard>
    );
}
