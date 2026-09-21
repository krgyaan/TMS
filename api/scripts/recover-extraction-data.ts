/**
 * Extraction & Claude Usage Recovery Utility
 *
 * Safely parses structured fallback recovery logs and re-persists extraction results
 * and Claude token usage records into PostgreSQL once tables exist.
 *
 * SAFETY GUARANTEES:
 * - Defaults to --dry-run always (read-only inspection).
 * - Requires explicit --apply flag to perform database writes.
 * - Supports filtering by --tender <id>.
 * - Idempotent upserts for tender_extractions.
 *
 * USAGE:
 *   # 1. Dry run inspect from log file:
 *   npx tsx scripts/recover-extraction-data.ts --file /path/to/app.log
 *
 *   # 2. Dry run inspect for specific tender (e.g. 3665):
 *   npx tsx scripts/recover-extraction-data.ts --file /path/to/app.log --tender 3665
 *
 *   # 3. Dry run inspect from raw JSON string:
 *   npx tsx scripts/recover-extraction-data.ts --json '{"tag":"EXTRACTION_FALLBACK_RECOVERY", ...}'
 *
 *   # 4. Apply changes (LOCAL / TEST DB ONLY):
 *   npx tsx scripts/recover-extraction-data.ts --file fallback.log --tender 3665 --apply
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { sql, eq } from "drizzle-orm";
import { createPool, createDb } from "../src/db";
import { tenderExtractions } from "../src/db/schemas/tendering/tender-extractions.schema";
import { claudeTokenUsage } from "../src/db/schemas/shared/claude-token-usage.schema";

interface ExtractionFallbackRecord {
    tag: "EXTRACTION_FALLBACK_RECOVERY";
    tenderId: number;
    jobId?: string | null;
    userId?: number | null;
    failureTimestamp?: string;
    error?: string;
    rawExtraction: {
        fields: Record<string, any>;
        missing_fields?: string[];
        extraction_version?: string;
        processing_time_ms?: number | null;
    };
}

interface ClaudeUsageFallbackRecord {
    tag: "CLAUDE_USAGE_FALLBACK_RECOVERY";
    tenderId?: number | null;
    jobId?: string | null;
    userId?: number | null;
    failureTimestamp?: string;
    error?: string;
    records?: Array<{
        tenderId?: number | null;
        userId?: number | null;
        jobId?: string | null;
        callType: string;
        model: string;
        inputTokens: number;
        outputTokens: number;
        cacheCreationTokens?: number;
        cacheReadTokens?: number;
        totalTokens: number;
        estimatedCostUsd: string | number;
        durationMs?: number | null;
    }>;
    llm_usage?: any;
}

function parseArgs() {
    const args = process.argv.slice(2);
    let filePath: string | null = null;
    let jsonInput: string | null = null;
    let targetTenderId: number | null = null;
    let apply = false;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--file" && args[i + 1]) {
            filePath = args[++i];
        } else if (args[i] === "--json" && args[i + 1]) {
            jsonInput = args[++i];
        } else if (args[i] === "--tender" && args[i + 1]) {
            targetTenderId = parseInt(args[++i], 10);
        } else if (args[i] === "--apply") {
            apply = true;
        } else if (args[i] === "--dry-run") {
            apply = false;
        }
    }

    return { filePath, jsonInput, targetTenderId, isDryRun: !apply };
}

function extractJsonMatchingTag(str: string, tag: string): any {
    const tagIdx = str.indexOf(`"tag":"${tag}"`);
    if (tagIdx === -1) {
        return null;
    }
    const openBrace = str.lastIndexOf("{", tagIdx);
    if (openBrace === -1) return null;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = openBrace; i < str.length; i++) {
        const char = str[i];
        if (escape) {
            escape = false;
            continue;
        }
        if (char === "\\") {
            escape = true;
            continue;
        }
        if (char === '"') {
            inString = !inString;
            continue;
        }
        if (!inString) {
            if (char === "{") {
                depth++;
            } else if (char === "}") {
                depth--;
                if (depth === 0) {
                    const jsonStr = str.substring(openBrace, i + 1);
                    try {
                        return JSON.parse(jsonStr);
                    } catch {
                        return null;
                    }
                }
            }
        }
    }
    return null;
}

function extractPayloadFromJsonString(str: string): any {
    try {
        return JSON.parse(str);
    } catch {
        const ext = extractJsonMatchingTag(str, "EXTRACTION_FALLBACK_RECOVERY");
        if (ext) return ext;
        const usg = extractJsonMatchingTag(str, "CLAUDE_USAGE_FALLBACK_RECOVERY");
        if (usg) return usg;

        // Fallback: Find first '{' and last '}'
        const firstBrace = str.indexOf("{");
        const lastBrace = str.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            try {
                return JSON.parse(str.substring(firstBrace, lastBrace + 1));
            } catch {
                return null;
            }
        }
        return null;
    }
}

export async function runRecovery(options?: {
    filePath?: string | null;
    jsonInput?: string | null;
    targetTenderId?: number | null;
    isDryRun?: boolean;
    dbOverride?: any;
}) {
    const cli = options ? null : parseArgs();
    const filePath = options?.filePath ?? cli?.filePath ?? null;
    const jsonInput = options?.jsonInput ?? cli?.jsonInput ?? null;
    const targetTenderId = options?.targetTenderId ?? cli?.targetTenderId ?? null;
    const isDryRun = options?.isDryRun ?? cli?.isDryRun ?? true;

    console.log("===============================================================");
    console.log("   TENDER DATA RECOVERY UTILITY (Fallback Log Parser)");
    console.log("===============================================================");
    console.log(` Mode:           ${isDryRun ? ">>> DRY-RUN (Read-Only Preview) <<<" : ">>> APPLY (Writing to Database) <<<"}`);
    if (targetTenderId) console.log(` Target Tender:  ${targetTenderId}`);
    if (filePath) console.log(` Log File:       ${filePath}`);
    console.log("---------------------------------------------------------------\n");

    const extractionRecords: ExtractionFallbackRecord[] = [];
    const usageRecords: ClaudeUsageFallbackRecord[] = [];

    // Parse from direct JSON input if provided
    if (jsonInput) {
        let rawContent = jsonInput.trim();
        if (fs.existsSync(rawContent)) {
            rawContent = fs.readFileSync(rawContent, "utf-8");
        }
        const parsed = extractPayloadFromJsonString(rawContent);
        if (parsed) {
            const actualPayload = parsed.fallbackRecoveryPayload || parsed.fallbackUsagePayload || parsed;
            if (actualPayload.tag === "EXTRACTION_FALLBACK_RECOVERY") {
                extractionRecords.push(actualPayload);
            } else if (actualPayload.tag === "CLAUDE_USAGE_FALLBACK_RECOVERY") {
                usageRecords.push(actualPayload);
            }
        }
    }

    // Parse from log file if provided
    if (filePath) {
        if (!fs.existsSync(filePath)) {
            console.error(`ERROR: File not found at '${filePath}'`);
            if (!options) process.exit(1);
            return { extractionRecovered: 0, usageRecovered: 0 };
        }

        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split(/\r?\n/);

        for (const line of lines) {
            if (line.includes("EXTRACTION_FALLBACK_RECOVERY")) {
                const parsed = extractPayloadFromJsonString(line);
                if (parsed) {
                    const rec = parsed.fallbackRecoveryPayload || parsed;
                    if (rec.tag === "EXTRACTION_FALLBACK_RECOVERY") {
                        extractionRecords.push(rec);
                    }
                }
            } else if (line.includes("CLAUDE_USAGE_FALLBACK_RECOVERY")) {
                const parsed = extractPayloadFromJsonString(line);
                if (parsed) {
                    const rec = parsed.fallbackUsagePayload || parsed;
                    if (rec.tag === "CLAUDE_USAGE_FALLBACK_RECOVERY") {
                        usageRecords.push(rec);
                    }
                }
            }
        }
    }

    // Filter by targetTenderId if requested
    const filteredExtractions = targetTenderId
        ? extractionRecords.filter((r) => r.tenderId === targetTenderId)
        : extractionRecords;

    const filteredUsage = targetTenderId
        ? usageRecords.filter((r) => r.tenderId === targetTenderId)
        : usageRecords;

    console.log(`Found ${filteredExtractions.length} extraction record(s) and ${filteredUsage.length} token usage record(s).\n`);

    if (filteredExtractions.length === 0 && filteredUsage.length === 0) {
        console.log("No matching fallback records found to recover.");
        return { extractionRecovered: 0, usageRecovered: 0 };
    }

    let db = options?.dbOverride;
    let pool: any = null;

    if (!db) {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            console.error("DATABASE_URL not set — cannot connect to database.");
            if (!options) process.exit(1);
            return { extractionRecovered: 0, usageRecovered: 0 };
        }
        pool = createPool(dbUrl, 2, process.env.PGSSL === "true");
        db = createDb(pool);
    }

    let extractionCount = 0;
    let usageCount = 0;

    try {
        // Check if tables exist before applying
        if (!isDryRun) {
            const tableCheck = await db.execute(sql`
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                  AND table_name IN ('tender_extractions', 'claude_token_usage')
            `);
            const existingTables = new Set(
                (Array.isArray(tableCheck) ? tableCheck : (tableCheck as any)?.rows || []).map((r: any) => r.table_name),
            );

            if (filteredExtractions.length > 0 && !existingTables.has("tender_extractions")) {
                throw new Error("Target table 'tender_extractions' does not exist in database. Apply migrations first!");
            }
            if (filteredUsage.length > 0 && !existingTables.has("claude_token_usage")) {
                throw new Error("Target table 'claude_token_usage' does not exist in database. Apply migrations first!");
            }
        }

        // Process Extractions
        for (const ext of filteredExtractions) {
            const fieldsCount = Object.keys(ext.rawExtraction?.fields || {}).length;
            console.log(`[EXTRACTION] Tender ${ext.tenderId} (Job: ${ext.jobId || 'N/A'})`);
            console.log(`  - Fields to restore:   ${fieldsCount}`);
            console.log(`  - Missing fields:      ${(ext.rawExtraction?.missing_fields || []).join(', ') || 'none'}`);
            console.log(`  - Version:             ${ext.rawExtraction?.extraction_version || '1.0.0'}`);
            console.log(`  - Original Failure:    ${ext.error || 'N/A'}`);

            if (isDryRun) {
                console.log(`  -> [DRY-RUN] Would UPSERT into tender_extractions table.`);
            } else {
                await db
                    .insert(tenderExtractions)
                    .values({
                        tenderId: ext.tenderId,
                        fields: ext.rawExtraction.fields,
                        missingFields: ext.rawExtraction.missing_fields || [],
                        extractionVersion: ext.rawExtraction.extraction_version || "1.0.0",
                        processingTimeMs: ext.rawExtraction.processing_time_ms || null,
                        userId: ext.userId || null,
                        updatedAt: new Date(),
                    })
                    .onConflictDoUpdate({
                        target: tenderExtractions.tenderId,
                        set: {
                            fields: ext.rawExtraction.fields,
                            missingFields: ext.rawExtraction.missing_fields || [],
                            extractionVersion: ext.rawExtraction.extraction_version || "1.0.0",
                            processingTimeMs: ext.rawExtraction.processing_time_ms || null,
                            userId: ext.userId || null,
                            updatedAt: new Date(),
                        },
                    });
                console.log(`  -> [APPLIED] Successfully UPSERTED into tender_extractions.`);
                extractionCount++;
            }
            console.log("");
        }

        // Process Claude Token Usage
        for (const usg of filteredUsage) {
            const records = usg.records || [];
            console.log(`[CLAUDE USAGE] Tender ${usg.tenderId || 'N/A'} (Job: ${usg.jobId || 'N/A'})`);
            console.log(`  - Records count:       ${records.length}`);
            console.log(`  - Original Failure:    ${usg.error || 'N/A'}`);

            for (const r of records) {
                console.log(`    * Stage: ${r.callType} | Model: ${r.model} | Tokens: ${r.totalTokens} | Cost: $${r.estimatedCostUsd}`);
                if (isDryRun) {
                    console.log(`      -> [DRY-RUN] Would INSERT into claude_token_usage.`);
                } else {
                    await db.insert(claudeTokenUsage).values({
                        tenderId: r.tenderId ?? null,
                        userId: r.userId ?? null,
                        jobId: r.jobId ?? null,
                        callType: r.callType,
                        model: r.model,
                        inputTokens: r.inputTokens,
                        outputTokens: r.outputTokens,
                        cacheCreationTokens: r.cacheCreationTokens ?? 0,
                        cacheReadTokens: r.cacheReadTokens ?? 0,
                        totalTokens: r.totalTokens,
                        estimatedCostUsd: String(r.estimatedCostUsd),
                        durationMs: r.durationMs ?? null,
                    });
                    console.log(`      -> [APPLIED] Successfully INSERTED row.`);
                    usageCount++;
                }
            }
            console.log("");
        }

    } finally {
        if (pool) {
            await pool.end();
        }
    }

    console.log("---------------------------------------------------------------");
    if (isDryRun) {
        console.log(" [COMPLETED DRY-RUN] No database modifications were made.");
        console.log(" To write to database (local test environment only), re-run with '--apply'.");
    } else {
        console.log(` [COMPLETED APPLY] Successfully recovered:`);
        console.log(`   - Extractions:  ${extractionCount}`);
        console.log(`   - Usage Rows:   ${usageCount}`);
    }
    console.log("===============================================================\n");

    return {
        extractionRecovered: isDryRun ? filteredExtractions.length : extractionCount,
        usageRecovered: isDryRun ? filteredUsage.reduce((acc, u) => acc + (u.records?.length || 0), 0) : usageCount,
    };
}

if (require.main === module) {
    runRecovery().catch((err) => {
        console.error("FATAL RECOVERY ERROR:", err);
        process.exit(1);
    });
}
