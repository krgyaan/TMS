import "dotenv/config";
import { parseTallyEnv } from "../src/config/tally.config";
import { createDb, createPool } from "../src/db";
import { TallyClient, type TallyLogger } from "../src/modules/integrations/tally/client/tally.client";
import { TallyLedgersService } from "../src/modules/integrations/tally/ledgers/tally-ledgers.service";
import { createNodeTallyRequester } from "../src/modules/integrations/tally/transport/tally-http.transport";
import { RateLimiter } from "../src/modules/integrations/tally/transport/rate-limiter";

const consoleLogger: TallyLogger = {
    info: (message, meta) => console.log(`[info] ${message}`, meta ?? ""),
    warn: (message, meta) => console.warn(`[warn] ${message}`, meta ?? ""),
    error: (message, meta) => console.error(`[error] ${message}`, meta ?? ""),
};

async function main(): Promise<void> {
    const config = parseTallyEnv(process.env);
    const company = config.company;

    if (!config.enabled || !company) {
        console.error("Tally must be enabled with TALLY_COMPANY set to sync ledgers.");
        process.exitCode = 1;

        return;
    }

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error("DATABASE_URL is not set.");
        process.exitCode = 1;

        return;
    }

    const limiter = new RateLimiter({ rps: config.rateLimitRps, maxConcurrency: config.maxConcurrency });
    const send = createNodeTallyRequester({ ca: config.caCertificate ?? undefined });
    const client = new TallyClient(config, request => limiter.schedule(() => send(request)), consoleLogger);
    const pool = createPool(databaseUrl);
    const db = createDb(pool);

    try {
        const service = new TallyLedgersService(db, client);
        const summary = await service.sync(company);

        console.log(JSON.stringify({ company, ...summary }, null, 2));

        if (summary.conflicts.length > 0) {
            console.error(`${summary.conflicts.length} ledger conflict(s) were not applied. Resolve them before relying on the ledger master.`);
            process.exitCode = 1;
        }
    } finally {
        await pool.end();
    }
}

void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
