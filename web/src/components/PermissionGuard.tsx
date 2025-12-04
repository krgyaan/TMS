import { useAuth } from '@/contexts/AuthContext';
import type { ReactNode } from 'react';

interface PermissionGuardProps {
    module: string;
    action: string;
    children: ReactNode;
    fallback?: ReactNode;
}

export function PermissionGuard({
    module,
    action,
    children,
    fallback = null,
}: PermissionGuardProps) {
    const { hasPermission } = useAuth();

    if (!hasPermission(module, action)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

// Convenience components
export function CanCreate({ module, children, fallback }: Omit<PermissionGuardProps, 'action'>) {
    return <PermissionGuard module={module} action="create" fallback={fallback}>{children}</PermissionGuard>;
}

export function CanUpdate({ module, children, fallback }: Omit<PermissionGuardProps, 'action'>) {
    return <PermissionGuard module={module} action="update" fallback={fallback}>{children}</PermissionGuard>;
}

export function CanDelete({ module, children, fallback }: Omit<PermissionGuardProps, 'action'>) {
    return <PermissionGuard module={module} action="delete" fallback={fallback}>{children}</PermissionGuard>;
}
