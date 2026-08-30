import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE } from "@db/database.module";
import { tenderInfos } from "@/db/schemas";
import { eq } from "drizzle-orm";
import type { DbInstance } from "@/db";
import type { NotificationDomain, NotificationRequest } from "../dto/notification.dto";
import { RecipientResolver } from "@/modules/email/recipient.resolver";

export interface DomainResolution {
    referenceType: string;
    referenceId: number;
    /** Gmail label path — `undefined` for non-tender-linked domains (no labeling). */
    labelPath?: string;
    /** Extra template data merged into the email (e.g. teamName / tenderName). */
    extraData: Record<string, any>;
}

/**
 * A domain strategy maps an inbound notification to the correct
 * `referenceType`/`referenceId`/`labelPath` for email threading + labeling.
 *
 * Only tender-linked domains generate Gmail labels; the remaining domains
 * (courier/followup/operation/amc/crm) intentionally return `labelPath=undefined`
 * so they thread under their own reference but never create Gmail labels.
 */
export interface DomainStrategy {
    readonly domain: NotificationDomain;
    resolve(request: NotificationRequest): Promise<DomainResolution>;
}

@Injectable()
export class TenderDomainStrategy implements DomainStrategy {
    readonly domain: NotificationDomain = "tender";

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly recipientResolver: RecipientResolver
    ) {}

    async resolve(request: NotificationRequest): Promise<DomainResolution> {
        const label = await this.fetchTenderLabel(request.referenceId);
        return {
            referenceType: "tender",
            referenceId: request.referenceId,
            labelPath: label.path,
            extraData: label.data,
        };
    }

    protected async fetchTenderLabel(tenderId: number): Promise<{ path?: string; data: Record<string, any> }> {
        const rows = await this.db.select({ teamId: tenderInfos.team, tenderName: tenderInfos.tenderName }).from(tenderInfos).where(eq(tenderInfos.id, tenderId)).limit(1);

        if (!rows.length) {
            return { data: {} };
        }

        const teamName = this.recipientResolver.getTeamName(rows[0].teamId);
        const tenderName = rows[0].tenderName;

        return {
            path: TenderDomainStrategy.generateTenderLabelPath(teamName, tenderName),
            data: { teamName, tenderName },
        };
    }

    protected static generateTenderLabelPath(teamName: string, tenderName: string): string {
        const sanitize = (str: string) => str.replace(/[/\\:*?"<>|]/g, "-").trim();
        return `Tendering/${sanitize(teamName)}/${sanitize(tenderName)}`;
    }
}

/**
 * Payment requests thread under the tender label when linked to a tender,
 * otherwise under `payment_request` with no label.
 */
@Injectable()
export class PaymentRequestDomainStrategy extends TenderDomainStrategy {
    override readonly domain: NotificationDomain = "payment_request";

    override async resolve(request: NotificationRequest): Promise<DomainResolution> {
        const tenderId = request.tenderId ? Number(request.tenderId) : 0;

        if (tenderId > 0) {
            const label = await this.fetchTenderLabel(tenderId);
            if (label.path) {
                return {
                    referenceType: "tender",
                    referenceId: tenderId,
                    labelPath: label.path,
                    extraData: label.data,
                };
            }
        }

        return {
            referenceType: "payment_request",
            referenceId: request.referenceId,
            labelPath: undefined,
            extraData: {},
        };
    }
}

/** Simplest domain — threads under its own reference, no labeling. */
@Injectable()
export class UndecoratedDomainStrategy implements DomainStrategy {
    constructor(readonly domain: NotificationDomain) {}

    resolve(request: NotificationRequest): Promise<DomainResolution> {
        return Promise.resolve({
            referenceType: this.domain,
            referenceId: request.referenceId,
            labelPath: undefined,
            extraData: {},
        });
    }
}

@Injectable()
export class NotificationsDomainRegistry {
    private readonly logger = new Logger(NotificationsDomainRegistry.name);
    private readonly strategies: Record<NotificationDomain, DomainStrategy>;

    constructor(tender: TenderDomainStrategy, payment: PaymentRequestDomainStrategy) {
        this.strategies = {
            tender,
            payment_request: payment,
            courier: new UndecoratedDomainStrategy("courier"),
            followup: new UndecoratedDomainStrategy("followup"),
            operation: new UndecoratedDomainStrategy("operation"),
            amc: new UndecoratedDomainStrategy("amc"),
            crm: new UndecoratedDomainStrategy("crm"),
        };
    }

    async resolve(request: NotificationRequest): Promise<DomainResolution> {
        const strategy = this.strategies[request.domain];
        if (!strategy) {
            this.logger.error(`No domain strategy registered for "${request.domain}"`);
            return {
                referenceType: request.domain,
                referenceId: request.referenceId,
                labelPath: undefined,
                extraData: {},
            };
        }
        return strategy.resolve(request);
    }
}
