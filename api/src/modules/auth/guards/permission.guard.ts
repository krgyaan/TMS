import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { PermissionService } from '@/modules/auth/services/permission.service';
import { RoleName } from '@/common/constants/roles.constant';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSION_MODE_KEY = 'permissionMode';

export type PermissionRequirement = {
    module: string;
    action: string;
};

@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private permissionService: PermissionService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermissions = this.reflector.getAllAndOverride<
            PermissionRequirement[]
        >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user as ValidatedUser;

        if (!user) {
            throw new ForbiddenException('Not authenticated');
        }

        if (user.role === RoleName.SUPER_USER || user.role === RoleName.ADMIN) {
            return true;
        }

        const mode = this.reflector.getAllAndOverride<'all' | 'any'>(
            PERMISSION_MODE_KEY,
            [context.getHandler(), context.getClass()]
        ) ?? 'all';

        const context_ = {
            userId: user.sub,
            roleId: user.roleId,
            roleName: user.role,
            teamId: user.teamId,
            dataScope: user.dataScope,
        };

        if (mode === 'any') {
            const hasAny = await this.permissionService.hasAnyPermission(
                context_,
                requiredPermissions
            );
            if (!hasAny) {
                throw new ForbiddenException(
                    `Missing required permission. Required one of: ${requiredPermissions
                        .map((p) => `${p.module}:${p.action}`)
                        .join(', ')}`
                );
            }
        } else {
            for (const perm of requiredPermissions) {
                const has = await this.permissionService.hasPermission(context_, perm);
                if (!has) {
                    throw new ForbiddenException(
                        `Missing required permission: ${perm.module}:${perm.action}`
                    );
                }
            }
        }

        return true;
    }
}
