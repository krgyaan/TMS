import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";

// Vendor merging rewrites references across tendering, RFQ, costing, PO and VWO
// tables — restricted to an explicit allowlist of user ids (not a role check).
export const MERGE_ALLOWED_USER_IDS: readonly number[] = [13];

@Injectable()
export class MergeVendorsGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request & { user?: ValidatedUser }>();
        const user = request.user;

        if (!user || !MERGE_ALLOWED_USER_IDS.includes(user.sub)) {
            throw new ForbiddenException("Vendor merge is not allowed for this user");
        }

        return true;
    }
}
