import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import {
    mysqlTable,
    varchar,
    bigint,
    text,
    date,
    timestamp,
    decimal,
    int,
    longtext,
} from 'drizzle-orm/mysql-core';
import { Client } from 'pg';
import { sql } from 'drizzle-orm';
import { reverseAuctions } from '@db/schemas/tendering/reverse-auction.schema';
import { tenderResults } from '@db/schemas/tendering/tender-result.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface DatabaseConfig {
    postgres: string;
    mysql: string;
}

const config: DatabaseConfig = {
    postgres: process.env.PG_URL || 'postgresql://postgres:gyan@localhost:5432/new_tms',
    mysql: process.env.MYSQL_URL || 'mysql://root:gyan@localhost:3306/mydb',
};

// ============================================================================
// MYSQL SCHEMA DEFINITIONS (OLD TABLES)
// ============================================================================

const mysqlRaMgmts = mysqlTable('ra_mgmts', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    tender_no: varchar('tender_no', { length: 255 }).notNull(), // Actually stores tender_id!
    bid_submission_date: date('bid_submission_date'),
    status: varchar('status', { length: 50 }).notNull().default('Under Evaluation'),
    technically_qualified: varchar('technically_qualified', { length: 10 }),
    disqualification_reason: text('disqualification_reason'),
    qualified_parties: longtext('qualified_parties'),
    start_time: timestamp('start_time'),
    end_time: timestamp('end_time'),
    start_price: decimal('start_price', { precision: 15, scale: 2 }),
    close_price: decimal('close_price', { precision: 15, scale: 2 }),
    close_time: timestamp('close_time'),
    result: varchar('result', { length: 200 }),
    ve_start_of_ra: varchar('ve_start_of_ra', { length: 10 }),
    screenshot_qualified_parties: text('screenshot_qualified_parties'),
    screenshot_decrements: text('screenshot_decrements'),
    final_result_screenshot: text('final_result_screenshot'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlTenderResults = mysqlTable('tender_results', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    tender_id: bigint('tender_id', { mode: 'number' }).notNull(),
    technically_qualified: varchar('technically_qualified', { length: 255 }),
    disqualification_reason: text('disqualification_reason'),
    qualified_parties_count: varchar('qualified_parties_count', { length: 25 }),
    qualified_parties_names: text('qualified_parties_names'),
    result: varchar('result', { length: 255 }),
    l1_price: decimal('l1_price', { precision: 15, scale: 2 }),
    l2_price: decimal('l2_price', { precision: 15, scale: 2 }),
    our_price: decimal('our_price', { precision: 15, scale: 2 }),
    qualified_parties_screenshot: varchar('qualified_parties_screenshot', { length: 255 }),
    final_result: varchar('final_result', { length: 255 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// ============================================================================
// TYPES
// ============================================================================

interface TenderInfo {
    id: number;
    tenderNo: string;
}

interface MigrationStats {
    reverseAuctions: { success: number; errors: number; skipped: number };
    tenderResults: { success: number; errors: number; skipped: number };
}

interface MigrationContext {
    pgDb: ReturnType<typeof pgDrizzle>;
    mysqlDb: ReturnType<typeof mysqlDrizzle>;
    // Map tender ID -> tender info (id and actual tenderNo)
    tenderInfoMap: Map<number, TenderInfo>;
    // Track reverse auction: tenderId -> reverseAuctionId
    reverseAuctionMap: Map<number, number>;
    stats: MigrationStats;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const Parsers = {
    decimal(val: string | number | null | undefined): string | null {
        if (val === null || val === undefined || val === '') return null;
        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '').trim());
        return isNaN(num) ? null : num.toFixed(2);
    },

    integer(val: string | number | null | undefined): number | null {
        if (val === null || val === undefined || val === '') return null;
        const num = typeof val === 'number' ? val : parseInt(String(val).trim(), 10);
        return isNaN(num) ? null : num;
    },

    date(val: string | Date | null | undefined): Date | null {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    },

    timestamp(val: string | Date | null | undefined): Date | null {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    },

    string(val: string | null | undefined, maxLength?: number): string | null {
        if (val === null || val === undefined) return null;
        const str = String(val).trim();
        if (str === '') return null;
        return maxLength ? str.substring(0, maxLength) : str;
    },

    toStringArray(val: string | null | undefined): string[] | null {
        if (val == null || val.trim() === '') return null;

        const trimmed = val.trim();

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                const arr = parsed
                    .map((v: unknown) => (v == null ? '' : String(v).trim()))
                    .filter((v: string) => v.length > 0);
                return arr.length > 0 ? arr : null;
            }
            if (typeof parsed === 'object' && parsed !== null) {
                const values = Object.values(parsed)
                    .map((v: unknown) => (v == null ? '' : String(v).trim()))
                    .filter((v: string) => v.length > 0);
                return values.length > 0 ? values : null;
            }
        } catch {
            // Not JSON
        }

        const arr = trimmed
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        return arr.length > 0 ? arr : null;
    },

    getArrayCount(arr: string[] | null): string | null {
        if (arr === null) return null;
        if (arr.length === 1 && arr[0].toLowerCase() === 'not known') return 'not known';
        return arr.length.toString();
    },

    deriveTenderResultStatus(
        result: string | null,
        technicallyQualified: string | null,
        hasRaLink: boolean
    ): string {
        if (technicallyQualified?.toLowerCase() === 'no') {
            return 'Disqualified';
        }
        if (result) {
            const resultLower = result.toLowerCase();
            if (resultLower === 'won') return 'Won';
            if (resultLower === 'lost') return 'Lost';
            if (resultLower.includes('h1') || resultLower.includes('elimination')) {
                return 'Lost - H1 Elimination';
            }
        }
        if (hasRaLink) {
            return 'RA Scheduled';
        }
        return 'Under Evaluation';
    },

    mapRaResult(result: string | null): string | null {
        if (!result) return null;
        const resultLower = result.toLowerCase().trim();

        if (resultLower === 'won') return 'Won';
        if (resultLower === 'lost') return 'Lost';
        if (resultLower.includes('h1') || resultLower.includes('elimination')) {
            return 'H1 Elimination';
        }
        return result;
    },

    normalizeYesNo(val: string | null | undefined): string | null {
        if (!val) return null;
        const normalized = val.trim().toLowerCase();
        if (normalized === 'yes' || normalized === 'y' || normalized === '1') return 'Yes';
        if (normalized === 'no' || normalized === 'n' || normalized === '0') return 'No';
        return val.trim();
    },
};

// ============================================================================
// DATA TRANSFORMERS
// ============================================================================

class ReverseAuctionTransformer {
    constructor(private ctx: MigrationContext) { }

    transform(row: typeof mysqlRaMgmts.$inferSelect): {
        data: typeof reverseAuctions.$inferInsert | null;
        tenderId: number | null;
    } {
        // ✅ FIX: tender_no column actually contains tender ID as string
        const tenderId = Parsers.integer(row.tender_no);

        if (!tenderId) {
            console.warn(`  ⚠ Invalid tender_no="${row.tender_no}" (not a number), skipping RA id=${row.id}`);
            return { data: null, tenderId: null };
        }

        // Get tender info from our map
        const tenderInfo = this.ctx.tenderInfoMap.get(tenderId);

        if (!tenderInfo) {
            console.warn(`  ⚠ No tender found for tender_id=${tenderId} (from tender_no="${row.tender_no}"), skipping RA id=${row.id}`);
            return { data: null, tenderId: null };
        }

        // Parse qualified parties
        const qualifiedPartiesNames = Parsers.toStringArray(row.qualified_parties);
        const qualifiedPartiesCount = Parsers.getArrayCount(qualifiedPartiesNames);

        // Derive scheduledAt
        const scheduledAt = this.deriveScheduledAt(row);

        // Derive resultUploadedAt
        const resultUploadedAt = row.result ? (row.updated_at ?? row.created_at) : null;

        return {
            data: {
                // Preserve original ID
                id: row.id,

                // Foreign key - use the actual tender ID
                tenderId: tenderId,

                // ✅ FIX: Use actual tender number from tenderInfos
                tenderNo: tenderInfo.tenderNo,

                // Bid submission
                bidSubmissionDate: Parsers.date(row.bid_submission_date),

                // Status
                status: row.status || 'Under Evaluation',

                // Schedule RA fields
                technicallyQualified: Parsers.normalizeYesNo(row.technically_qualified),
                disqualificationReason: Parsers.string(row.disqualification_reason),
                qualifiedPartiesCount: qualifiedPartiesCount,
                qualifiedPartiesNames: qualifiedPartiesNames,

                // RA Schedule times
                raStartTime: Parsers.timestamp(row.start_time),
                raEndTime: Parsers.timestamp(row.end_time),
                scheduledAt: Parsers.timestamp(scheduledAt),

                // RA Result fields
                raResult: Parsers.mapRaResult(row.result),
                veL1AtStart: Parsers.normalizeYesNo(row.ve_start_of_ra),

                // Pricing
                raStartPrice: Parsers.decimal(row.start_price),
                raClosePrice: Parsers.decimal(row.close_price),
                raCloseTime: Parsers.timestamp(row.close_time),

                // Screenshots
                screenshotQualifiedParties: Parsers.string(row.screenshot_qualified_parties),
                screenshotDecrements: Parsers.string(row.screenshot_decrements),
                finalResultScreenshot: Parsers.string(row.final_result_screenshot),

                // Result uploaded timestamp
                resultUploadedAt: Parsers.timestamp(resultUploadedAt),

                // Timestamps
                createdAt: Parsers.date(row.created_at) ?? new Date(),
                updatedAt: Parsers.date(row.updated_at) ?? new Date(),
            },
            tenderId: tenderId,
        };
    }

    private deriveScheduledAt(row: typeof mysqlRaMgmts.$inferSelect): Date | null {
        const scheduledStatuses = ['RA Scheduled', 'RA Started', 'Won', 'Lost', 'Lost - H1 Elimination'];
        if (scheduledStatuses.includes(row.status)) {
            return row.start_time ?? row.updated_at ?? row.created_at ?? null;
        }
        return null;
    }
}

class TenderResultTransformer {
    constructor(private ctx: MigrationContext) { }

    transform(row: typeof mysqlTenderResults.$inferSelect): typeof tenderResults.$inferInsert | null {
        const tenderId = Number(row.tender_id);

        // Check if tender exists
        if (!this.ctx.tenderInfoMap.has(tenderId)) {
            console.warn(`  ⚠ No tender found for tender_id=${tenderId}, skipping result id=${row.id}`);
            return null;
        }

        // Find linked reverse auction
        const reverseAuctionId = this.ctx.reverseAuctionMap.get(tenderId) ?? null;

        // Parse qualified parties names
        const qualifiedPartiesNames = Parsers.toStringArray(row.qualified_parties_names);

        // Derive status
        const status = Parsers.deriveTenderResultStatus(
            row.result,
            row.technically_qualified,
            reverseAuctionId !== null
        );

        // Derive resultUploadedAt
        const resultUploadedAt = row.result ? (row.updated_at ?? row.created_at) : null;

        return {
            id: row.id,
            tenderId: tenderId,
            reverseAuctionId: reverseAuctionId,
            status: status,
            technicallyQualified: Parsers.normalizeYesNo(row.technically_qualified),
            disqualificationReason: Parsers.string(row.disqualification_reason),
            qualifiedPartiesCount: Parsers.string(row.qualified_parties_count, 50),
            qualifiedPartiesNames: qualifiedPartiesNames,
            result: row.result ? Parsers.string(row.result, 50) : null,
            l1Price: Parsers.decimal(row.l1_price),
            l2Price: Parsers.decimal(row.l2_price),
            ourPrice: Parsers.decimal(row.our_price),
            qualifiedPartiesScreenshot: Parsers.string(row.qualified_parties_screenshot),
            finalResultScreenshot: Parsers.string(row.final_result),
            resultUploadedAt: Parsers.timestamp(resultUploadedAt),
            createdAt: Parsers.date(row.created_at) ?? new Date(),
            updatedAt: Parsers.date(row.updated_at) ?? new Date(),
        };
    }
}

// ============================================================================
// MIGRATORS
// ============================================================================

class ReverseAuctionMigrator {
    private transformer: ReverseAuctionTransformer;

    constructor(private ctx: MigrationContext) {
        this.transformer = new ReverseAuctionTransformer(ctx);
    }

    async migrate(): Promise<void> {
        console.log('Migrating ra_mgmts → reverse_auctions...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlRaMgmts);

        console.log(`  Found ${rows.length} records to migrate`);

        // Debug: Show what we're working with
        console.log('  Sample ra_mgmts.tender_no values:');
        rows.slice(0, 5).forEach((r) => {
            console.log(`    id=${r.id}, tender_no="${r.tender_no}"`);
        });

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlRaMgmts.$inferSelect): Promise<void> {
        try {
            const { data, tenderId } = this.transformer.transform(row);

            if (!data || !tenderId) {
                this.ctx.stats.reverseAuctions.skipped++;
                return;
            }

            await this.ctx.pgDb.insert(reverseAuctions).values(data as any);

            // Store mapping for tender_results linkage
            this.ctx.reverseAuctionMap.set(tenderId, row.id);

            this.ctx.stats.reverseAuctions.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating ra_mgmts id=${row.id}:`, err);
            this.ctx.stats.reverseAuctions.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.reverseAuctions;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⊘ Skipped: ${skipped}`);
    }
}

class TenderResultMigrator {
    private transformer: TenderResultTransformer;

    constructor(private ctx: MigrationContext) {
        this.transformer = new TenderResultTransformer(ctx);
    }

    async migrate(): Promise<void> {
        console.log('Migrating tender_results...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlTenderResults);

        console.log(`  Found ${rows.length} records to migrate`);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlTenderResults.$inferSelect): Promise<void> {
        try {
            const data = this.transformer.transform(row);

            if (!data) {
                this.ctx.stats.tenderResults.skipped++;
                return;
            }

            await this.ctx.pgDb.insert(tenderResults).values(data as any);

            this.ctx.stats.tenderResults.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating tender_results id=${row.id}:`, err);
            this.ctx.stats.tenderResults.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.tenderResults;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⊘ Skipped: ${skipped}`);
    }
}

// ============================================================================
// CACHE LOADERS
// ============================================================================

class TenderInfoCacheLoader {
    constructor(private ctx: MigrationContext) { }

    async load(): Promise<void> {
        console.log('Loading tender info from PostgreSQL...');

        const tenders = await this.ctx.pgDb
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
            })
            .from(tenderInfos);

        for (const tender of tenders) {
            this.ctx.tenderInfoMap.set(tender.id, {
                id: tender.id,
                tenderNo: tender.tenderNo,
            });
        }

        console.log(`  ✓ Loaded ${this.ctx.tenderInfoMap.size} tender records`);

        // Debug: Show some sample mappings
        console.log('  Sample tender mappings:');
        const sampleIds = [483, 604, 679, 697, 727];
        for (const id of sampleIds) {
            const info = this.ctx.tenderInfoMap.get(id);
            if (info) {
                console.log(`    id=${id} → tenderNo="${info.tenderNo}"`);
            } else {
                console.log(`    id=${id} → NOT FOUND`);
            }
        }
    }
}

// ============================================================================
// SEQUENCE RESETTER
// ============================================================================

class SequenceResetter {
    constructor(private ctx: MigrationContext) { }

    async reset(): Promise<void> {
        console.log('Resetting PostgreSQL sequences...');

        const sequences = [
            { table: 'reverse_auctions', column: 'id' },
            { table: 'tender_results', column: 'id' },
        ];

        for (const seq of sequences) {
            try {
                const result = await this.ctx.pgDb.execute(
                    sql`SELECT COALESCE(MAX(id), 0) as max_id FROM ${sql.identifier(seq.table)}`
                );
                const maxId = (result.rows[0] as any)?.max_id || 0;

                await this.ctx.pgDb.execute(
                    sql`SELECT setval(
                        pg_get_serial_sequence(${seq.table}, ${seq.column}),
                        ${maxId + 1},
                        false
                    )`
                );

                console.log(`  ✓ ${seq.table} sequence reset to ${maxId + 1}`);
            } catch (err) {
                console.error(`  ✗ Error resetting ${seq.table} sequence:`, err);
            }
        }
    }
}

// ============================================================================
// DATA VALIDATOR
// ============================================================================

class DataValidator {
    constructor(private ctx: MigrationContext) { }

    async validate(): Promise<void> {
        console.log('Validating migrated data...');

        const raCount = await this.ctx.pgDb.execute(
            sql`SELECT COUNT(*) as count FROM reverse_auctions`
        );
        console.log(`  • reverse_auctions: ${(raCount.rows[0] as any)?.count || 0} records`);

        const trCount = await this.ctx.pgDb.execute(
            sql`SELECT COUNT(*) as count FROM tender_results`
        );
        console.log(`  • tender_results: ${(trCount.rows[0] as any)?.count || 0} records`);

        const linkedCount = await this.ctx.pgDb.execute(
            sql`SELECT COUNT(*) as count FROM tender_results WHERE reverse_auction_id IS NOT NULL`
        );
        console.log(`  • tender_results with RA link: ${(linkedCount.rows[0] as any)?.count || 0} records`);

        // Sample reverse_auctions data
        const raSample = await this.ctx.pgDb.execute(
            sql`SELECT id, tender_id, tender_no, status FROM reverse_auctions LIMIT 5`
        );
        console.log('  • Sample reverse_auctions:');
        for (const row of raSample.rows as any[]) {
            console.log(`    id=${row.id}, tender_id=${row.tender_id}, tender_no="${row.tender_no}", status="${row.status}"`);
        }

        // Status distribution
        const raStatusDist = await this.ctx.pgDb.execute(
            sql`SELECT status, COUNT(*) as count FROM reverse_auctions GROUP BY status`
        );
        console.log('  • reverse_auctions status distribution:');
        for (const row of raStatusDist.rows as any[]) {
            console.log(`    - ${row.status}: ${row.count}`);
        }

        const trStatusDist = await this.ctx.pgDb.execute(
            sql`SELECT status, COUNT(*) as count FROM tender_results GROUP BY status`
        );
        console.log('  • tender_results status distribution:');
        for (const row of trStatusDist.rows as any[]) {
            console.log(`    - ${row.status}: ${row.count}`);
        }
    }
}

// ============================================================================
// MIGRATION ORCHESTRATOR
// ============================================================================

class MigrationOrchestrator {
    private pgClient: Client;
    private mysqlPool: mysql2.Pool;
    private ctx!: MigrationContext;

    constructor(private dbConfig: DatabaseConfig) {
        this.pgClient = new Client({ connectionString: dbConfig.postgres });
        this.mysqlPool = mysql2.createPool(dbConfig.mysql);
    }

    async run(): Promise<void> {
        try {
            this.printHeader();
            await this.connect();
            this.initializeContext();
            await this.executeMigration();
            this.printSummary();
        } finally {
            await this.disconnect();
        }
    }

    private printHeader(): void {
        console.log('\n' + '═'.repeat(70));
        console.log('  RA & TENDER RESULTS MIGRATION: MySQL → PostgreSQL');
        console.log('  (Preserving Original IDs)');
        console.log('═'.repeat(70));
    }

    private async connect(): Promise<void> {
        console.log('\n📡 Connecting to databases...');
        await this.pgClient.connect();
        console.log('  ✓ PostgreSQL connected');
        console.log('  ✓ MySQL pool ready');
    }

    private initializeContext(): void {
        this.ctx = {
            pgDb: pgDrizzle(this.pgClient as any),
            mysqlDb: mysqlDrizzle(this.mysqlPool as any),
            tenderInfoMap: new Map(), // ✅ Changed: Map<id, TenderInfo>
            reverseAuctionMap: new Map(),
            stats: {
                reverseAuctions: { success: 0, errors: 0, skipped: 0 },
                tenderResults: { success: 0, errors: 0, skipped: 0 },
            },
        };
    }

    private async executeMigration(): Promise<void> {
        const steps = [
            {
                name: 'Load tender info mappings',
                fn: () => new TenderInfoCacheLoader(this.ctx).load(),
            },
            {
                name: 'Migrate ra_mgmts → reverse_auctions',
                fn: () => new ReverseAuctionMigrator(this.ctx).migrate(),
            },
            {
                name: 'Migrate tender_results',
                fn: () => new TenderResultMigrator(this.ctx).migrate(),
            },
            {
                name: 'Reset PostgreSQL sequences',
                fn: () => new SequenceResetter(this.ctx).reset(),
            },
            {
                name: 'Validate migrated data',
                fn: () => new DataValidator(this.ctx).validate(),
            },
        ];

        console.log('\n📋 Starting migration...\n');

        for (let i = 0; i < steps.length; i++) {
            console.log(`[${i + 1}/${steps.length}] ${steps[i].name}`);
            await steps[i].fn();
            console.log('');
        }
    }

    private printSummary(): void {
        const { stats, tenderInfoMap, reverseAuctionMap } = this.ctx;

        console.log('═'.repeat(70));
        console.log('  MIGRATION SUMMARY');
        console.log('═'.repeat(70));
        console.log('');
        console.log('  Table                    Success    Errors    Skipped');
        console.log('  ─────────────────────────────────────────────────────────');
        console.log(
            `  reverse_auctions         ${this.pad(stats.reverseAuctions.success)}       ${this.pad(stats.reverseAuctions.errors)}       ${stats.reverseAuctions.skipped}`
        );
        console.log(
            `  tender_results           ${this.pad(stats.tenderResults.success)}       ${this.pad(stats.tenderResults.errors)}       ${stats.tenderResults.skipped}`
        );
        console.log('  ─────────────────────────────────────────────────────────');
        console.log(`  Tender Info Loaded:      ${tenderInfoMap.size}`);
        console.log(`  RA → Tender Links:       ${reverseAuctionMap.size}`);
        console.log('');
        console.log('═'.repeat(70));
        console.log('  ✅ Migration completed successfully!');
        console.log('═'.repeat(70));
    }

    private pad(num: number): string {
        return num.toString().padStart(5);
    }

    private async disconnect(): Promise<void> {
        console.log('\n🔌 Closing connections...');
        await this.pgClient.end();
        await this.mysqlPool.end();
        console.log('  ✓ All connections closed');
    }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main(): Promise<void> {
    const orchestrator = new MigrationOrchestrator(config);
    await orchestrator.run();
}

main()
    .then(() => {
        console.log('\n👋 Exiting with code 0\n');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n❌ Migration failed:', err);
        console.error('\n👋 Exiting with code 1\n');
        process.exit(1);
    });
