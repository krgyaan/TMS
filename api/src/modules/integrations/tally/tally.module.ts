import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TallyDisabledError } from "./errors/tally.errors";
import { TALLY_CONFIG, TALLY_RATE_LIMITER, TALLY_REQUESTER } from "./tally.constants";
import { RateLimiter } from "./transport/rate-limiter";
import { createNodeTallyRequester, type TallyRequester } from "./transport/tally-http.transport";
import { TallyClient } from "./client/tally.client";
import { TallyMastersService } from "./masters/tally-masters.service";
import { TallyStatusService } from "./tally-status.service";
import { ImprestVoucherSource } from "./sources/imprest-voucher.source";
import { TallyLedgersController } from "./ledgers/tally-ledgers.controller";
import { TallyLedgersService } from "./ledgers/tally-ledgers.service";
import { TallyUserLedgersService } from "./ledgers/tally-user-ledgers.service";
import type { TallyConfig } from "@/config/tally.config";

/**
 * TallyPrime integration foundation.
 *
 * When TALLY_ENABLED=false the module is inert: every call throws
 * TallyDisabledError and no outbound request is ever made.
 */
@Module({
    imports: [ConfigModule],
    controllers: [TallyLedgersController],
    providers: [
        {
            provide: TALLY_CONFIG,
            inject: [ConfigService],
            useFactory: (config: ConfigService): TallyConfig => {
                const tally = config.get<TallyConfig>("tally");

                if (!tally) {
                    throw new Error("Tally config is not registered; add tallyConfig to ConfigModule.load");
                }

                return tally;
            },
        },
        {
            provide: TALLY_RATE_LIMITER,
            inject: [TALLY_CONFIG],
            useFactory: (config: TallyConfig): RateLimiter => new RateLimiter({ rps: config.rateLimitRps, maxConcurrency: config.maxConcurrency }),
        },
        {
            provide: TALLY_REQUESTER,
            inject: [TALLY_CONFIG, TALLY_RATE_LIMITER],
            useFactory: (config: TallyConfig, limiter: RateLimiter): TallyRequester => {
                if (!config.enabled) {
                    return () => Promise.reject(new TallyDisabledError());
                }

                const send = createNodeTallyRequester({ ca: config.caCertificate ?? undefined });

                return request => limiter.schedule(() => send(request));
            },
        },
        TallyClient,
        TallyMastersService,
        TallyStatusService,
        ImprestVoucherSource,
        TallyLedgersService,
        TallyUserLedgersService,
    ],
    exports: [TallyClient, TallyMastersService, TallyStatusService, ImprestVoucherSource, TallyLedgersService, TallyUserLedgersService],
})
export class TallyModule {}
