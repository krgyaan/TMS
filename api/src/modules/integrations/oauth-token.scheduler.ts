import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { oauthAccounts } from '@db/schemas';
import { lt, eq, isNotNull } from 'drizzle-orm';
import { OAuthTokenService } from './oauth-token.service';

@Injectable()
export class OAuthTokenScheduler {
    private readonly logger = new Logger(OAuthTokenScheduler.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly oauthTokenService: OAuthTokenService
    ) {}

    /**
     * Run every 30 minutes to refresh OAuth tokens that are expiring soon
     * Proactively refreshes tokens with < 30 min until expiry
     */
    @Cron('0 */30 * * * *') // Every 30 minutes
    async refreshExpiringTokens(): Promise<void> {
        try {
            const now = new Date();
            const refreshWindow = 30 * 60 * 1000; // 30 minutes in ms
            const refreshByTime = new Date(now.getTime() + refreshWindow);

            this.logger.debug(
                `[OAuthTokenScheduler] Running token refresh check at ${now.toISOString()}`
            );

            // Find all active OAuth accounts with tokens expiring soon
            const expiringAccounts = await this.db
                .select()
                .from(oauthAccounts)
                .where(
                    lt(oauthAccounts.expiresAt, refreshByTime) &&
                    eq(oauthAccounts.isActive, true) &&
                    isNotNull(oauthAccounts.refreshToken)
                );

            if (expiringAccounts.length === 0) {
                this.logger.debug('[OAuthTokenScheduler] No expiring tokens found');
                return;
            }

            this.logger.log(
                `[OAuthTokenScheduler] Found ${expiringAccounts.length} tokens expiring within 30 minutes`
            );

            const results = {
                success: 0,
                failed: 0,
                errors: [] as { accountId: number; error: string }[],
            };

            // Refresh each expiring token
            for (const account of expiringAccounts) {
                try {
                    const refreshed = await this.oauthTokenService.refreshToken(
                        account.id
                    );

                    if (refreshed) {
                        results.success++;
                        this.logger.log(
                            `[OAuthTokenScheduler] Refreshed token for user ${account.userId} (${account.provider})`
                        );
                    } else {
                        results.failed++;
                        results.errors.push({
                            accountId: account.id,
                            error: 'Refresh returned null',
                        });
                    }
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        accountId: account.id,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    });
                }
            }

            // Log summary
            this.logger.log(
                `[OAuthTokenScheduler] Token refresh completed: ${results.success} succeeded, ${results.failed} failed`
            );

            if (results.errors.length > 0) {
                this.logger.warn(
                    `[OAuthTokenScheduler] Refresh errors: ${JSON.stringify(
                        results.errors
                    )}`
                );
            }
        } catch (error) {
            this.logger.error(
                '[OAuthTokenScheduler] Scheduler error:',
                error instanceof Error ? error.message : String(error)
            );
        }
    }
}
