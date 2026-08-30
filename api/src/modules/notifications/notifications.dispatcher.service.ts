import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DRIZZLE } from "@db/database.module";
import { GmailClient } from "@/modules/email/gmail.client";
import { users } from "@/db/schemas";
import { eq } from "drizzle-orm";
import type { DbInstance } from "@/db";
import type { NotificationRequest, NotificationResult, RecipientSource } from "./dto/notification.dto";
import { NotificationsDomainRegistry } from "./domain/domain.registry";
import { EmailNotificationChannel } from "./channels/email.channel";
import { WhatsappNotificationChannel } from "./channels/whatsapp.channel";

/**
 * Global notification dispatcher. Additive — existing per-module
 * `*-notification.service.ts` methods (courier/followup/payment-requests, etc.)
 * are intentionally left untouched.
 *
 * Responsibilities:
 *  - Resolve the correct domain reference + label via the strategy registry.
 *  - Apply a dev-mode override (Dev) forcing From+To to a single test user.
 *  - Apply the FALLBACK_MAIL_USER_ID fallback for senders lacking OAuth.
 *  - Route to the email (or future whatsapp) transport.
 */
@Injectable()
export class NotificationsDispatcher {
    private readonly logger = new Logger(NotificationsDispatcher.name);
    private readonly devOverrideUserId: number;

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly config: ConfigService,
        private readonly gmail: GmailClient,
        private readonly domainRegistry: NotificationsDomainRegistry,
        private readonly emailChannel: EmailNotificationChannel,
        private readonly whatsappChannel: WhatsappNotificationChannel
    ) {
        const raw = Number(process.env.DEV_OVERRIDE_USER_ID ?? 13);
        this.devOverrideUserId = Number.isInteger(raw) && raw > 0 ? raw : 13;
    }

    private get isDev(): boolean {
        const env = this.config.get<string>("NODE_ENV");
        return env === "development" || process.env.NODE_ENV === "development";
    }

    async send(request: NotificationRequest): Promise<NotificationResult> {
        const original = this.debugClone(request);

        if (this.isDev) {
            await this.applyDevOverride(request, original);
        }

        if (request.channel !== "email") {
            return this.whatsappChannel.send(request);
        }

        const resolution = await this.domainRegistry.resolve(request);

        const effectiveUserId = await this.resolveEffectiveSender(request.fromUserId);

        let finalRequest: NotificationRequest;
        if (effectiveUserId !== request.fromUserId) {
            finalRequest = {
                ...request,
                fromUserId: effectiveUserId,
                data: {
                    ...request.data,
                    _senderFallback: {
                        originalFromUserId: request.fromUserId,
                        fallbackToUserId: effectiveUserId,
                    },
                },
            };
        } else {
            finalRequest = request;
        }

        return this.emailChannel.send(finalRequest, resolution);
    }

    /**
     * Dev mode: force From + To to the configured dev user (default 13) so that
     * neither mail nor future WhatsApp broadcasts leak to real users. The
     * original recipients are preserved on the logged template data for audits.
     */
    private async applyDevOverride(request: NotificationRequest, original: DebugSnapshot): Promise<void> {
        const devUser = await this.devUser();
        if (!devUser?.email) {
            this.logger.warn(`[DEV OVERRIDE] user ${this.devOverrideUserId} has no email — skipping dev override`);
            return;
        }

        this.logger.warn("[DEV OVERRIDE] Redirecting users mail to dev user", {
            originalFromUserId: original.fromUserId,
            originalTo: original.to,
            devUserId: this.devOverrideUserId,
            devEmail: devUser.email,
        });

        request.fromUserId = this.devOverrideUserId;
        request.to = [{ type: "emails", emails: [devUser.email] }];
        request.cc = [];
        request.data = {
            ...request.data,
            _devOverride: {
                originalFromUserId: original.fromUserId,
                originalTo: original.to,
                originalCc: original.cc,
                originalWhatsapp: original.whatsapp,
                at: new Date().toISOString(),
            },
        };
    }

    /**
     * Fall back to FALLBACK_MAIL_USER_ID when the requested sender has no valid
     * OAuth, mirroring the courier/follow-up pattern.
     */
    private async resolveEffectiveSender(fromUserId: number): Promise<number> {
        if (await this.gmail.hasValidOAuth(fromUserId)) {
            return fromUserId;
        }

        const fallbackStr = process.env.FALLBACK_MAIL_USER_ID;
        const fallbackUserId = fallbackStr ? Number(fallbackStr) : NaN;
        if (Number.isInteger(fallbackUserId) && fallbackUserId > 0) {
            this.logger.warn(`Sender ${fromUserId} lacks valid OAuth — falling back to FALLBACK_MAIL_USER_ID=${fallbackUserId}`);
            return fallbackUserId;
        }

        return fromUserId;
    }

    private async devUser(): Promise<{ email: string } | null> {
        const rows = await this.db.select({ email: users.email }).from(users).where(eq(users.id, this.devOverrideUserId)).limit(1);
        return rows[0] ?? null;
    }

    private debugClone(value: NotificationRequest): DebugSnapshot {
        return {
            fromUserId: value.fromUserId,
            to: value.to ? (JSON.parse(JSON.stringify(value.to)) as RecipientSource[]) : undefined,
            cc: value.cc ? (JSON.parse(JSON.stringify(value.cc)) as RecipientSource[]) : undefined,
            whatsapp: value.whatsapp ? (JSON.parse(JSON.stringify(value.whatsapp)) as NotificationRequest["whatsapp"]) : undefined,
        };
    }
}

interface DebugSnapshot {
    fromUserId?: number;
    to?: RecipientSource[];
    cc?: RecipientSource[];
    whatsapp?: NotificationRequest["whatsapp"];
}
