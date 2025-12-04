import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { ValidatedUser } from '../strategies/jwt.strategy';
import { ROLE_HIERARCHY, type RoleName } from '../../../common/constants/roles.constant';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // No roles required
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user as ValidatedUser;

        if (!user) {
            throw new ForbiddenException('Not authenticated');
        }

        const userRole = user.role;

        if (!userRole) {
            throw new ForbiddenException('User has no assigned role');
        }

        // Direct role match
        if (requiredRoles.includes(userRole)) {
            return true;
        }

        // Hierarchy check
        const userLevel = ROLE_HIERARCHY[userRole as RoleName] ?? 0;

        for (const required of requiredRoles) {
            const requiredLevel = ROLE_HIERARCHY[required as RoleName] ?? 999;
            if (userLevel >= requiredLevel) {
                return true;
            }
        }

        throw new ForbiddenException(
            `Access denied. Required: ${requiredRoles.join(' or ')}. Your role: ${userRole}`
        );
    }
}
