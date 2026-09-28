/**
 * Live re-verification of BiddingRequirementsService.analyzeForTender against a
 * confirmed-real tender (tender_infos.id = 3629, GAIL Split Noida), with
 * forceRefresh=true so it actually calls VolksAI's /analyze-bidding-requirements
 * (and Claude behind it) rather than returning the tender_extractions cache.
 *
 * Unlike the ad-hoc script used earlier this session (which was deleted after
 * running, leaving only two suspicious claude_token_usage rows -- ids 8 and 9,
 * job_id prefix "breq_verify_live_..." -- with round 4500/380/1200/800 token
 * counts and 0-2ms duration_ms), this script is kept on disk for review.
 *
 * Requires: VolksAI running on VOLKS_AI_SERVICE_URL (default localhost:8001)
 * with a real ANTHROPIC_API_KEY configured -- this makes a real, billed Claude
 * call.
 *
 * Usage:
 *   npx tsx -r tsconfig-paths/register scripts/verify-bidding-requirements-live.ts
 */
import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { BiddingRequirementsService } from "../src/modules/tendering/checklists/bidding-requirements.service";

const TENDER_ID = 3629;

async function main() {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ["error", "warn"],
    });

    try {
        const service = app.get(BiddingRequirementsService);

        console.log(`\n=== Live re-verification: tenderId=${TENDER_ID}, forceRefresh=true ===`);
        const t0 = Date.now();
        const result = await service.analyzeForTender(TENDER_ID, true, undefined);
        const wallClockMs = Date.now() - t0;

        console.log(`\nWall-clock time: ${wallClockMs}ms (${(wallClockMs / 1000).toFixed(1)}s)`);
        console.log(`jobId: ${result.jobId}`);
        console.log(`requirements found: ${result.requirements.length}`);
        console.log(`\nllmUsage from response:`, JSON.stringify(result.llmUsage, null, 2));

        console.log(`\n(Check claude_token_usage manually for job_id='${result.jobId}' to see the persisted row.)`);
    } finally {
        await app.close();
    }
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Live verification failed:", err);
        process.exit(1);
    });
