import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import { sql } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { urlShorteners } from "@/db/schemas";

const TOKEN_BYTES = 9; // 12-char base64url token (~72 bits entropy)
const MAX_TOKEN_ATTEMPTS = 3;
const DEFAULT_EXPIRES_DAYS = 30;

export interface ShortenUrlOptions {
    purpose?: string;
    expiresAt?: Date;
    createdBy?: number;
}

@Injectable()
export class UrlShortenerService {
    private readonly logger = new Logger(UrlShortenerService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly configService: ConfigService
    ) {}

    private get publicAppUrl(): string {
        return (this.configService.get<string>("app.publicAppUrl") || "http://localhost:5173").replace(/\/+$/, "");
    }

    /**
     * Stores `url` and returns `<PUBLIC_APP_URL>/n/<token>`.
     * The token is a random 12-char base64url string, retried on the
     * (astronomically unlikely) unique-violation collision.
     */
    async shorten(url: string, options: ShortenUrlOptions = {}): Promise<string> {
        const expiresAt = options.expiresAt ?? new Date(Date.now() + DEFAULT_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

        let token: string | null = null;
        for (let attempt = 1; attempt <= MAX_TOKEN_ATTEMPTS; attempt++) {
            token = randomBytes(TOKEN_BYTES).toString("base64url");
            const inserted = await this.db
                .insert(urlShorteners)
                .values({
                    token,
                    url,
                    purpose: options.purpose ?? null,
                    expiresAt,
                    createdBy: options.createdBy ?? null,
                })
                .returning({ id: urlShorteners.id });

            if (inserted.length > 0) break;
            token = null;
        }

        if (!token) {
            throw new Error(`Failed to generate a unique short-link token after ${MAX_TOKEN_ATTEMPTS} attempts`);
        }

        void this.cleanupExpired();
        return `${this.publicAppUrl}/n/${token}`;
    }

    /** Returns the stored URL for `token`, or null when missing/expired. */
    async resolve(token: string): Promise<{ url: string } | null> {
        if (!token) return null;

        const rows = await this.db
            .select({ url: urlShorteners.url, expiresAt: urlShorteners.expiresAt })
            .from(urlShorteners)
            .where(sql`${urlShorteners.token} = ${token}`)
            .limit(1);

        const row = rows[0];
        if (!row) return null;
        if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return null;

        // Best-effort visit tracking; never blocks/fails the resolve.
        void this.db
            .update(urlShorteners)
            .set({ visitCount: sql`${urlShorteners.visitCount} + 1` })
            .where(sql`${urlShorteners.token} = ${token}`)
            .catch(err => this.logger.debug(`Failed to increment visit count for ${token}: ${err}`));

        return { url: row.url };
    }

    /** Throws NotFoundException for missing/expired tokens (controller helper). */
    async resolveOrThrow(token: string): Promise<{ url: string }> {
        const result = await this.resolve(token);
        if (!result) throw new NotFoundException("Link expired or invalid.");
        return result;
    }

    private async cleanupExpired(): Promise<void> {
        try {
            await this.db.delete(urlShorteners).where(sql`${urlShorteners.expiresAt} < now()`);
        } catch (err) {
            this.logger.debug(`Expired short-link cleanup failed: ${err}`);
        }
    }
}
