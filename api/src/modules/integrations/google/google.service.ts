import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { google, oauth2_v2 } from 'googleapis';
import { and, eq } from 'drizzle-orm';
import googleConfig, { type GoogleConfig } from '../../../config/google.config';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
  oauthAccounts,
  type OauthAccount,
} from '../../../db/oauth-accounts.schema';

type CredentialPayload = {
  access_token: string;
  refresh_token?: string | null;
  expiry_date?: number;
  scope?: string;
};

type GoogleTokenPayload = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope?: string;
};

const normalizeCredentials = (
  credentials: CredentialPayload,
): GoogleTokenPayload => {
  const expiresAt =
    typeof credentials.expiry_date === 'number'
      ? new Date(credentials.expiry_date)
      : null;

  return {
    accessToken: credentials.access_token,
    refreshToken:
      typeof credentials.refresh_token === 'string'
        ? credentials.refresh_token
        : null,
    expiresAt,
    scope: credentials.scope,
  };
};

export type GoogleConnection = {
  id: number;
  userId: number;
  provider: string;
  providerUserId: string;
  providerEmail: string | null;
  avatar: string | null;
  expiresAt: Date | null;
  scopes: string[];
  createdAt: Date;
  updatedAt: Date;
  hasRefreshToken: boolean;
};

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);

  constructor(
    @Inject(googleConfig.KEY) private readonly config: GoogleConfig,
    @Inject(DRIZZLE) private readonly db: DbInstance,
  ) {}

  private createClient() {
    return new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri,
    );
  }

  createAuthUrl(userId: number): { url: string } {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException(
        'A valid userId is required to initiate Google OAuth',
      );
    }
    return this.createAuthUrlWithState(String(userId));
  }

  createAuthUrlWithState(state: string): { url: string } {
    const client = this.createClient();
    const url = client.generateAuthUrl({
      access_type: 'offline',
      include_granted_scopes: true,
      prompt: 'consent',
      scope: this.config.scopes,
      state,
    });
    return { url };
  }

  async exchangeCode(code: string): Promise<{
    tokens: GoogleTokenPayload;
    profile: oauth2_v2.Schema$Userinfo;
  }> {
    const client = this.createClient();
    const { tokens: rawTokens } = await client.getToken(code);
    if (!rawTokens || typeof rawTokens !== 'object') {
      throw new BadRequestException('Google did not return an access token');
    }

    const raw = rawTokens as CredentialPayload;
    if (typeof raw.access_token !== 'string' || raw.access_token.length === 0) {
      throw new BadRequestException('Google did not return an access token');
    }

    const tokens = normalizeCredentials(raw);
    client.setCredentials(rawTokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data: profile } = await oauth2.userinfo.get();
    if (!profile || !profile.id) {
      throw new BadRequestException(
        'Unable to read Google profile information',
      );
    }

    return { tokens, profile };
  }

  async upsertConnection(
    userId: number,
    tokens: GoogleTokenPayload,
    profile: oauth2_v2.Schema$Userinfo,
  ): Promise<GoogleConnection> {
    if (!profile.id) {
      throw new BadRequestException('Google profile is missing an identifier');
    }

    const expiresAt = tokens.expiresAt;
    const scopes = tokens.scope ?? this.config.scopes.join(' ');
    const now = new Date();

    const existing = await this.db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.userId, userId),
          eq(oauthAccounts.provider, 'google'),
        ),
      )
      .limit(1);

    let stored: OauthAccount;

    if (existing.length) {
      const current = existing[0];
      const updated = await this.db
        .update(oauthAccounts)
        .set({
          providerUserId: profile.id,
          providerEmail: profile.email ?? current.providerEmail,
          avatar: profile.picture ?? current.avatar,
          accessToken: tokens.accessToken ?? current.accessToken,
          refreshToken: tokens.refreshToken ?? current.refreshToken,
          expiresAt,
          scopes,
          rawPayload: profile as Record<string, unknown>,
          updatedAt: now,
        })
        .where(eq(oauthAccounts.id, current.id))
        .returning();
      stored = updated[0];
    } else {
      if (!tokens.accessToken) {
        throw new BadRequestException(
          'Google access token missing in response',
        );
      }
      const inserted = await this.db
        .insert(oauthAccounts)
        .values({
          userId,
          provider: 'google',
          providerUserId: profile.id,
          providerEmail: profile.email ?? null,
          avatar: profile.picture ?? null,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
          expiresAt,
          scopes,
          rawPayload: profile as Record<string, unknown>,
        })
        .returning();
      stored = inserted[0];
    }

    this.logger.log(
      `Linked Google account ${profile.email ?? profile.id} to user ${userId}`,
    );

    return this.sanitizeConnection(stored);
  }

  async handleOAuthCallback(params: {
    code: string;
    state?: string;
  }): Promise<GoogleConnection> {
    if (!params.state) {
      throw new BadRequestException('Missing OAuth state parameter');
    }
    const userId = Number(params.state);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('Invalid OAuth state payload');
    }

    const { tokens, profile } = await this.exchangeCode(params.code);
    return this.upsertConnection(userId, tokens, profile);
  }

  async listConnections(userId: number): Promise<GoogleConnection[]> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('A valid userId is required');
    }
    const rows = await this.db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.userId, userId),
          eq(oauthAccounts.provider, 'google'),
        ),
      );
    return rows.map((row) => this.sanitizeConnection(row));
  }

  async disconnect(
    userId: number,
    connectionId: number,
  ): Promise<{ success: true }> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('A valid userId is required');
    }
    if (!Number.isInteger(connectionId) || connectionId <= 0) {
      throw new BadRequestException('A valid connection id is required');
    }

    const existing = await this.db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.id, connectionId),
          eq(oauthAccounts.userId, userId),
        ),
      )
      .limit(1);

    if (!existing.length) {
      throw new NotFoundException('Google connection not found');
    }

    const connection = existing[0];
    const client = this.createClient();
    const tokenToRevoke = connection.refreshToken ?? connection.accessToken;

    try {
      await client.revokeToken(tokenToRevoke);
    } catch (error) {
      this.logger.warn(
        `Failed to revoke Google token for account ${connection.id}: ${(error as Error).message}`,
      );
    }

    await this.db
      .delete(oauthAccounts)
      .where(eq(oauthAccounts.id, connectionId));

    return { success: true };
  }

  buildRedirectUrl(
    status: 'success' | 'error',
    payload?: { userId?: number; connectionId?: number; error?: string },
  ): string {
    const base =
      this.config.successRedirect ??
      'http://localhost:5173/integrations/google/status';
    const url = new URL(base);
    url.searchParams.set('status', status);
    if (status === 'success') {
      if (payload?.userId) {
        url.searchParams.set('userId', String(payload.userId));
      }
      if (payload?.connectionId) {
        url.searchParams.set('connectionId', String(payload.connectionId));
      }
    } else if (status === 'error' && payload?.error) {
      url.searchParams.set('error', payload.error);
    }
    return url.toString();
  }

  private sanitizeConnection(account: OauthAccount): GoogleConnection {
    return {
      id: account.id,
      userId: account.userId,
      provider: account.provider,
      providerUserId: account.providerUserId,
      providerEmail: account.providerEmail ?? null,
      avatar: account.avatar ?? null,
      expiresAt: account.expiresAt ?? null,
      scopes: account.scopes ? account.scopes.split(/\s+/).filter(Boolean) : [],
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      hasRefreshToken: Boolean(account.refreshToken),
    };
  }
}
