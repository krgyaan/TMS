import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { DataScope } from '@/common/constants/roles.constant';

export const RESOURCE_CONFIG_KEY = 'resourceConfig';

export type ResourceConfig = {
    // Field names in the resource that represent ownership/team
    ownerField?: string;
    teamField?: string;
    createdByField?: string;
    // Service method to fetch the resource (for checking before action)
    fetchMethod?: string;
};

@Injectable()
export class ResourceAccessGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const config = this.reflector.getAllAndOverride<ResourceConfig>(
            RESOURCE_CONFIG_KEY,
            [context.getHandler(), context.getClass()]
        );

        // No resource config = allow (permission check is enough)
        if (!config) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user as ValidatedUser;

        if (!user) {
            throw new ForbiddenException('Not authenticated');
        }

        // ALL scope can access everything
        if (user.dataScope === DataScope.ALL) {
            return true;
        }

        // For resource-level checks, we need the resource ID from params
        // The actual resource check happens in the service layer
        // This guard just attaches context for the service to use
        request.resourceContext = {
            userId: user.sub,
            teamId: user.teamId,
            dataScope: user.dataScope,
            config,
        };

        return true;
    }
}
