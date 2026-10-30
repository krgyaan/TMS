import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";

// PDF retry regenerates invoice/order PDFs — restricted to an explicit allowlist of user ids.
export const PDF_RETRY_ALLOWED_USER_IDS: readonly number[] = [13];

@Injectable()
export class PdfRetryGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request & { user?: ValidatedUser }>();
        const user = request.user;

        if (!user || !PDF_RETRY_ALLOWED_USER_IDS.includes(user.sub)) {
            throw new ForbiddenException("PDF retry is not allowed for this user");
        }

        return true;
    }
}
