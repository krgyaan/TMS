import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { RoleName } from "@/common/constants/roles.constant";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";

// Master data writes (create/update/delete) are restricted to Admin, Super User
// and an explicit allowlist of user ids. Read requests are always allowed.
export const MASTER_WRITE_ALLOWED_USER_IDS: readonly number[] = [7];

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class MasterWriteGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request & { user?: ValidatedUser }>();

        if (SAFE_METHODS.has(request.method.toUpperCase())) {
            return true;
        }

        const user = request.user;

        if (!user) {
            throw new ForbiddenException("Not authenticated");
        }

        if (user.role === RoleName.ADMIN || user.role === RoleName.SUPER_USER || MASTER_WRITE_ALLOWED_USER_IDS.includes(user.sub)) {
            return true;
        }

        throw new ForbiddenException("Master data changes are restricted to authorized users");
    }
}
