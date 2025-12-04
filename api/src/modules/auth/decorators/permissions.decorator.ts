import { SetMetadata, applyDecorators } from '@nestjs/common';
import {
    PERMISSIONS_KEY,
    PERMISSION_MODE_KEY,
    type PermissionRequirement,
} from '../guards/permission.guard';

/**
 * Require specific permissions to access a route
 *
 * @example
 * @RequirePermissions({ module: 'tenders', action: 'create' })
 *
 * @example Multiple permissions (all required)
 * @RequirePermissions(
 *   { module: 'tenders', action: 'read' },
 *   { module: 'tenders', action: 'update' }
 * )
 */
export const RequirePermissions = (...permissions: PermissionRequirement[]) =>
    SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Require any of the specified permissions
 */
export const RequireAnyPermission = (...permissions: PermissionRequirement[]) =>
    applyDecorators(
        SetMetadata(PERMISSIONS_KEY, permissions),
        SetMetadata(PERMISSION_MODE_KEY, 'any')
    );

// Convenience decorators for common actions
export const CanCreate = (module: string) =>
    RequirePermissions({ module, action: 'create' });

export const CanRead = (module: string) =>
    RequirePermissions({ module, action: 'read' });

export const CanUpdate = (module: string) =>
    RequirePermissions({ module, action: 'update' });

export const CanDelete = (module: string) =>
    RequirePermissions({ module, action: 'delete' });

export const CanApprove = (module: string) =>
    RequirePermissions({ module, action: 'approve' });
