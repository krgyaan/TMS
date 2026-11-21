import "dotenv/config";
import { parseTallyEnv } from "../src/config/tally.config";
import { TallyClient, type TallyLogger } from "../src/modules/integrations/tally/client/tally.client";
import { createNodeTallyRequester, type TallyRequester } from "../src/modules/integrations/tally/transport/tally-http.transport";
import { RateLimiter } from "../src/modules/integrations/tally/transport/rate-limiter";

const consoleLogger: TallyLogger = {
    info: (message, meta) => console.log(`[info] ${message}`, meta ?? ""),
    warn: (message, meta) => console.warn(`[warn] ${message}`, meta ?? ""),
    error: (message, meta) => console.error(`[error] ${message}`, meta ?? ""),
};

async function main(): Promise<void> {
    const config = parseTallyEnv(process.env);

    if (!config.enabled) {
        console.error("Tally integration is disabled. Set TALLY_ENABLED=true and the required TALLY_* variables.");
        process.exitCode = 1;

        return;
    }

    const limiter = new RateLimiter({ rps: config.rateLimitRps, maxConcurrency: config.maxConcurrency });
    const send = createNodeTallyRequester({ ca: config.caCertificate ?? undefined });
    const requester: TallyRequester = request => limiter.schedule(() => send(request));
    const client = new TallyClient(config, requester, consoleLogger);

    const liveness = await client.checkLiveness();
    const health = await client.health();

    console.log(
        JSON.stringify(
            {
                enabled: health.enabled,
                serverRunning: liveness.running,
                reachable: health.reachable,
                companyOpen: health.companyOpen,
                companyMatches: health.companyMatches,
                latencyMs: health.latencyMs,
                companies: health.companies,
                error: health.error,
            },
            null,
            2
        )
    );

    if (!health.reachable || !health.companyOpen || !health.companyMatches) {
        process.exitCode = 1;

        return;
    }

    const groups = await client.exportMasters("group");
    const ledgers = await client.exportMasters("ledger");
    const costCentres = await client.exportMasters("costCentre");

    console.log(
        JSON.stringify(
            {
                masters: {
                    groups: groups.length,
                    ledgers: ledgers.length,
                    costCentres: costCentres.length,
                },
            },
            null,
            2
        )
    );
}

void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
