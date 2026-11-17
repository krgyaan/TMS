import { ForbiddenException } from "@nestjs/common";

/**
 * Manual mail triggers are only allowed to send real email in production.
 * In development/staging, `MAIL_MODE` must be `sandbox` so `.env` cannot
 * accidentally deliver live mail.
 */
export function assertLiveMailAllowed(): void {
    const isProduction = process.env.NODE_ENV === "production";

    if (!isProduction && process.env.MAIL_MODE !== "sandbox") {
        throw new ForbiddenException(
            "Live mail sending is disabled outside production. Set MAIL_MODE=sandbox in api/.env for development."
        );
    }
}
