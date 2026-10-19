import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import authConfig, { type AuthConfig } from "@/config/auth.config";

export const PUBLIC_NOTIFY_PURPOSE = "wa-notify";

const DEFAULT_PUBLIC_LINK_EXPIRES_IN = "30d";
const DEFAULT_PUBLIC_LINK_EXPIRES_SECONDS = 30 * 24 * 60 * 60;
const UNIT_SECONDS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };

export type PublicNotifyEntityType = "pr" | "po" | "vwo" | "tender" | "wobd";

export interface BuildPublicLinkOptions {
    type: PublicNotifyEntityType;
    id: number;
    event?: string;
}

export interface PublicNotifyClaims {
    t: PublicNotifyEntityType;
    id: number;
    ev?: string;
    purpose: string;
}

/**
 * Signs and verifies stateless public notification links.
 *
 * Future notification builders should call `buildUrl()` and append the
 * result as a `Details: <url>` line to their WhatsApp/email message, e.g.
 *
 *   const url = await this.publicLink.buildUrl({ type: 'po', id, event: 'PO Approved' });
 *
 * The public page at `<PUBLIC_APP_URL>/notify/<token>` fetches
 * `GET /api/v1/public-notifications/<token>` which verifies the token here.
 */
@Injectable()
export class PublicLinkService {
    private readonly logger = new Logger(PublicLinkService.name);

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        @Inject(authConfig.KEY) private readonly authConfig: AuthConfig
    ) {}

    private get publicAppUrl(): string {
        return (this.configService.get<string>("app.publicAppUrl") || "http://localhost:5173").replace(/\/+$/, "");
    }

    private get publicLinkExpiresInSeconds(): number {
        const raw = (this.configService.get<string>("app.publicLinkExpiresIn") || DEFAULT_PUBLIC_LINK_EXPIRES_IN).trim();
        const match = /^(\d+)([smhdw])$/.exec(raw);
        if (!match) {
            this.logger.warn(`Invalid PUBLIC_LINK_EXPIRES_IN "${raw}" — falling back to ${DEFAULT_PUBLIC_LINK_EXPIRES_IN}`);
            return DEFAULT_PUBLIC_LINK_EXPIRES_SECONDS;
        }
        return Number(match[1]) * UNIT_SECONDS[match[2]];
    }

    async sign(options: BuildPublicLinkOptions): Promise<string> {
        const payload: PublicNotifyClaims = {
            t: options.type,
            id: options.id,
            ...(options.event ? { ev: options.event } : {}),
            purpose: PUBLIC_NOTIFY_PURPOSE,
        };

        return this.jwtService.signAsync(payload, {
            secret: this.authConfig.stateSecret,
            expiresIn: this.publicLinkExpiresInSeconds,
        });
    }

    async buildUrl(options: BuildPublicLinkOptions): Promise<string> {
        const token = await this.sign(options);
        return `${this.publicAppUrl}/notify/${token}`;
    }

    async verify(token: string): Promise<PublicNotifyClaims> {
        try {
            const claims = await this.jwtService.verifyAsync<PublicNotifyClaims>(token, {
                secret: this.authConfig.stateSecret,
            });

            if (claims.purpose !== PUBLIC_NOTIFY_PURPOSE || !claims.t || !claims.id) {
                throw new BadRequestException("This notification link is not valid.");
            }

            return claims;
        } catch (err) {
            if (err instanceof BadRequestException) {
                throw err;
            }
            this.logger.debug(`Public notification link verification failed: ${err}`);
            throw new BadRequestException("This notification link has expired or is not valid.");
        }
    }
}
