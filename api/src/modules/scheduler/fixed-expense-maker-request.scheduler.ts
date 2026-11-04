import { Inject, Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { sql } from "drizzle-orm";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { FixedExpensesService } from "@/modules/accounts/fixed-expenses/fixed-expenses.service";

/** Advisory lock key so concurrent cron runs cannot create duplicate requests. */
const MAKER_REQUEST_CRON_LOCK = "fixed-expense-maker-request-cron";

/**
 * Creates maker requests for fixed expenses that are due within the next
 * three days, so payments are approved before the due date.
 *
 * Runs daily at 06:00 server time. Idempotent: expenses that already have a
 * linked maker request are skipped, and a Postgres advisory lock serialises
 * overlapping runs (ScheduleModule is registered from several modules, so the
 * same @Cron can be mounted more than once; extra runs exit immediately).
 */
@Injectable()
export class FixedExpenseMakerRequestScheduler {
    constructor(
        private readonly fixedExpensesService: FixedExpensesService,
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
    ) {}

    // Daily at 06:00 server time (production schedule).
    @Cron("0 6 * * *")
    async handleUpcomingFixedExpenses() {
        this.logger.info("Cron tick at fixedExpenseMakerRequests", { timestamp: new Date() });

        try {
            await this.db.transaction(async tx => {
                const { rows } = await tx.execute(sql`SELECT pg_try_advisory_xact_lock(hashtext(${MAKER_REQUEST_CRON_LOCK})::bigint) AS locked`);

                // Another run holds the lock: let it finish, create nothing here.
                if (!rows?.[0]?.locked) {
                    this.logger.info("Fixed expense maker requests skipped — another run is in progress");
                    return;
                }

                const result = await this.fixedExpensesService.createMakerRequestsForUpcomingDueDates();

                this.logger.info("Fixed expense maker requests processed", {
                    created: result.created,
                    failedCount: result.failed.length,
                });

                for (const failure of result.failed) {
                    this.logger.error(`Failed to create maker request for fixed expense #${failure.id}`, { error: failure.error });
                }
            });
        } catch (error: unknown) {
            this.logger.error("Error creating maker requests for fixed expenses", {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}
