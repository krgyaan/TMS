import { Injectable, Logger, Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { google } from 'googleapis';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { oauthAccounts } from '@db/schemas';
import { ConfigService } from '@nestjs/config';

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

interface OAuthToken {
    accessToken: string;
    refreshToken?: string | null;
    expiryDate?: Date | null;
}

interface CachedToken {
    token: OAuthToken;
    expiresAt: number;
}

@Injectable()
export class OAuthTokenService {
    private readonly logger = new Logger(OAuthTokenService.name);
    private tokenCache = new Map<string, CachedToken>();
    private cacheTTL = 5 * 60 * 1000; // 5 minutes
    private oauth2Client: OAuth2Client;

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly configService: ConfigService
    ) {
        this.oauth2Client = new google.auth.OAuth2(
            this.configService.get('GOOGLE_CLIENT_ID'),
            this.configService.get('GOOGLE_CLIENT_SECRET'),
            this.configService.get('GOOGLE_REDIRECT_URI')
        ) as OAuth2Client;
    }

    /**
     * Get valid OAuth token for user (refreshes if needed)
     * Returns null if token is invalid/expired and cannot be refreshed
     */
    async getValidToken(userId: number, provider: string): Promise<OAuthToken | null> {
        const cacheKey = `${userId}:${provider}`;

        // Check in-memory cache first
        const cached = this.tokenCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            this.logger.debug(`[${provider}] Token for user ${userId} found in cache`);
            return cached.token;
        }

        // Fetch from database
        const [account] = await this.db
            .select()
            .from(oauthAccounts)
            .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)))
            .limit(1);

        if (!account) {
            this.logger.warn(`[${provider}] No OAuth account for user ${userId}`);
            return null;
        }

        if (!account.isActive) {
            this.logger.warn(`[${provider}] OAuth account inactive for user ${userId}`);
            return null;
        }

        // Check if token expired with 30-min buffer
        const now = new Date();
        const expiresAt = account.expiresAt ? new Date(account.expiresAt) : null;
        const refreshWindowMs = 30 * 60 * 1000; // 30 minutes
        const isExpired =
            !expiresAt || expiresAt.getTime() - refreshWindowMs < now.getTime();

        if (isExpired && account.refreshToken) {
            this.logger.debug(`[${provider}] Token expired for user ${userId}, refreshing...`);
            const refreshed = await this.refreshToken(account.id);
            if (!refreshed) {
                return null;
            }
            // Cache the refreshed token
            this.tokenCache.set(cacheKey, {
                token: refreshed,
                expiresAt: Date.now() + this.cacheTTL,
            });
            return refreshed;
        }

        const token: OAuthToken = {
            accessToken: account.accessToken,
            refreshToken: account.refreshToken,
            expiryDate: expiresAt,
        };

        // Cache the valid token
        this.tokenCache.set(cacheKey, {
            token,
            expiresAt: Date.now() + this.cacheTTL,
        });

        return token;
    }

    /**
     * Refresh an expired OAuth token
     */
    async refreshToken(oauthAccountId: number): Promise<OAuthToken | null> {
        const [account] = await this.db
            .select()
            .from(oauthAccounts)
            .where(eq(oauthAccounts.id, oauthAccountId))
            .limit(1);

        if (!account || !account.refreshToken) {
            this.logger.error(
                `Cannot refresh token for oauth account ${oauthAccountId}: no refresh token`
            );
            return null;
        }

        try {
            this.oauth2Client.setCredentials({
                refresh_token: account.refreshToken,
            });

            const { credentials } = await this.oauth2Client.refreshAccessToken();

            if (!credentials.access_token) {
                this.logger.error(
                    `Token refresh succeeded but no access_token for oauth account ${oauthAccountId}`
                );
                await this.db
                    .update(oauthAccounts)
                    .set({
                        refreshFailureCount: (account.refreshFailureCount || 0) + 1,
                        updatedAt: new Date(),
                    })
                    .where(eq(oauthAccounts.id, oauthAccountId));
                return null;
            }

            // Update in database
            await this.db
                .update(oauthAccounts)
                .set({
                    accessToken: credentials.access_token,
                    expiresAt: credentials.expiry_date
                        ? new Date(credentials.expiry_date)
                        : null,
                    lastRefreshedAt: new Date(),
                    refreshFailureCount: 0, // Reset counter on success
                    updatedAt: new Date(),
                })
                .where(eq(oauthAccounts.id, oauthAccountId));

            this.logger.log(
                `Refreshed token for oauth account ${oauthAccountId} (user ${account.userId})`
            );

            // Invalidate cache for this account
            const cacheKey = `${account.userId}:${account.provider}`;
            this.tokenCache.delete(cacheKey);

            return {
                accessToken: credentials.access_token,
                refreshToken: account.refreshToken,
                expiryDate: credentials.expiry_date
                    ? new Date(credentials.expiry_date)
                    : null,
            };
        } catch (error) {
            this.logger.error(
                `Token refresh failed for oauth account ${oauthAccountId}:`,
                error instanceof Error ? error.message : String(error)
            );

            // Increment failure counter
            await this.db
                .update(oauthAccounts)
                .set({
                    refreshFailureCount: (account.refreshFailureCount || 0) + 1,
                    updatedAt: new Date(),
                })
                .where(eq(oauthAccounts.id, oauthAccountId));

            // If too many failures, disable the account
            if ((account.refreshFailureCount || 0) >= 5) {
                this.logger.warn(
                    `Disabling oauth account ${oauthAccountId} after 5 failed refresh attempts`
                );
                await this.db
                    .update(oauthAccounts)
                    .set({
                        isActive: false,
                        updatedAt: new Date(),
                    })
                    .where(eq(oauthAccounts.id, oauthAccountId));
            }

            return null;
        }
    }

    /**
     * Store OAuth tokens in database and cache
     */
    async storeTokens(
        userId: number,
        provider: string,
        tokens: {
            access_token: string;
            refresh_token?: string;
            expiry_date?: number;
        },
        profile: { id: string; email?: string; picture?: string }
    ): Promise<void> {
        const expiresAt = tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : null;

        // Upsert OAuth account
        const existing = await this.db
            .select()
            .from(oauthAccounts)
            .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)))
            .limit(1);

        if (existing.length > 0) {
            // Update existing
            await this.db
                .update(oauthAccounts)
                .set({
                    providerUserId: profile.id,
                    providerEmail: profile.email,
                    avatar: profile.picture,
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token || existing[0].refreshToken,
                    expiresAt,
                    lastRefreshedAt: new Date(),
                    refreshFailureCount: 0,
                    isActive: true,
                    updatedAt: new Date(),
                })
                .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)));
        } else {
            // Insert new
            await this.db.insert(oauthAccounts).values({
                userId,
                provider,
                providerUserId: profile.id,
                providerEmail: profile.email,
                avatar: profile.picture,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt,
                lastRefreshedAt: new Date(),
                refreshFailureCount: 0,
                isActive: true,
            });
        }

        // Invalidate cache
        const cacheKey = `${userId}:${provider}`;
        this.tokenCache.delete(cacheKey);

        this.logger.log(`Stored OAuth tokens for user ${userId} (${provider})`);
    }

    /**
     * Clear token cache for testing/debugging
     */
    clearCache(): void {
        this.tokenCache.clear();
        this.logger.debug('Cleared OAuth token cache');
    }
}
