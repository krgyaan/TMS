import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";

// SI PDF retry regenerates invoice PDFs — restricted to an explicit allowlist of user ids.
export const SI_PDF_RETRY_ALLOWED_USER_IDS: readonly number[] = [13];

@Injectable()
export class SiPdfRetryGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request & { user?: ValidatedUser }>();
        const user = request.user;

        if (!user || !SI_PDF_RETRY_ALLOWED_USER_IDS.includes(user.sub)) {
            throw new ForbiddenException("Invoice PDF retry is not allowed for this user");
        }

        return true;
    }
}
