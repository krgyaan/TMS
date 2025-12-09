import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { DataScope } from '@/common/constants/roles.constant';

export const TEAM_KEY = 'requiredTeam';
export const BYPASS_TEAM_CHECK_KEY = 'bypassTeamCheck';

@Injectable()
export class TeamGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // Check if team check should be bypassed (for admin routes)
        const bypassTeamCheck = this.reflector.getAllAndOverride<boolean>(
            BYPASS_TEAM_CHECK_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (bypassTeamCheck) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user as ValidatedUser;

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        // Users with ALL scope can access any team's data
        if (user.dataScope === DataScope.ALL) {
            return true;
        }

        // For TEAM and SELF scope, we need to verify team access
        // The actual filtering happens in the service layer
        // This guard just ensures the user has a valid team assignment
        if (user.dataScope === DataScope.TEAM || user.dataScope === DataScope.SELF) {
            if (!user.teamId) {
                throw new ForbiddenException(
                    'User must be assigned to a team to access this resource',
                );
            }
        }

        // Attach team context to request for use in services
        request.teamContext = {
            userId: user.sub,
            teamId: user.teamId,
            dataScope: user.dataScope,
            canSwitchTeams: user.canSwitchTeams,
        };

        return true;
    }
}
