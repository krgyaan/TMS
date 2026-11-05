import { Inject, Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { sql } from "drizzle-orm";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { FixedExpensesService } from "@/modules/accounts/fixed-expenses/fixed-expenses.service";

/** Advisory lock key so concurrent rollover runs cannot create duplicate cycles. */
const HISTORY_ROLLOVER_CRON_LOCK = "fixed-expense-history-rollover-cron";

/**
 * Starts the next payment cycle for fixed expenses whose current workflow row
 * reached "Payment Done": inserts a new history row with the next due date
 * (derived from payment_frequency) and status "Awaited Maker". The maker-request
 * cron then creates that cycle's request.
 *
 * Runs daily at 05:00 server time, before the 06:00 maker-request cron, so a
 * rolled-over expense gets its new request on the same day. A Postgres advisory
 * lock serialises overlapping runs (ScheduleModule is registered from several
 * modules, so the same @Cron can be mounted more than once).
 */
@Injectable()
export class FixedExpenseHistoryRolloverScheduler {
    constructor(
        private readonly fixedExpensesService: FixedExpensesService,
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
    ) {}

    @Cron("* * * * *")
    async handlePaidFixedExpenses() {
        this.logger.info("Cron tick at fixedExpenseHistoryRollover", { timestamp: new Date() });

        try {
            await this.db.transaction(async tx => {
                const { rows } = await tx.execute(sql`SELECT pg_try_advisory_xact_lock(hashtext(${HISTORY_ROLLOVER_CRON_LOCK})::bigint) AS locked`);

                if (!rows?.[0]?.locked) {
                    this.logger.info("Fixed expense history rollover skipped — another run is in progress");
                    return;
                }

                const result = await this.fixedExpensesService.rolloverPaidFixedExpenses();

                this.logger.info("Fixed expense history rollover processed", {
                    rolled: result.rolled,
                    failedCount: result.failed.length,
                });

                for (const failure of result.failed) {
                    this.logger.error(`Failed to roll over fixed expense #${failure.id}`, { error: failure.error });
                }
            });
        } catch (error: unknown) {
            this.logger.error("Error rolling over paid fixed expenses", {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}
