import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { RoleName, hasMinimumRole } from '@/common/constants/roles.constant';

@Injectable()
export class ProfileEditGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const currentUser: ValidatedUser = request.user;
        const targetUserId = Number(request.params.userId);

        if (!currentUser) {
            throw new ForbiddenException('Not authenticated');
        }

        // Can edit own profile
        if (currentUser.sub === targetUserId) {
            return true;
        }

        // Check if user has coordinator+ role (Admin, Super User, or Coordinator)
        const canEdit = hasMinimumRole(
            currentUser.role ?? '',
            RoleName.COORDINATOR
        );

        if (!canEdit) {
            throw new ForbiddenException(
                'You do not have permission to edit this profile'
            );
        }

        return true;
    }
}
