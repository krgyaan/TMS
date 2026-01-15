import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import {
    mysqlTable,
    varchar,
    bigint,
    text,
    longtext,
    time,
    timestamp,
} from 'drizzle-orm/mysql-core';
import { Client } from 'pg';
import { sql } from 'drizzle-orm';
import { tenderQueries, tenderQueryItems } from '@db/schemas/tendering';
import { tqTypes } from '@db/schemas/tendering/tq-types.schema'

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
// MYSQL SCHEMA DEFINITIONS
// ============================================================================

const mysqlTqTypes = mysqlTable('tq_types', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    tq_type: varchar('tq_type', { length: 255 }).notNull(),
    ip: varchar('ip', { length: 255 }),
    status: varchar('status', { length: 1 }).notNull().default('1'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlTqReceiveds = mysqlTable('tq_receiveds', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    tender_id: bigint('tender_id', { mode: 'number' }),
    tq_type: longtext('tq_type'),
    description: longtext('description'),
    tq_submission_date: varchar('tq_submission_date', { length: 255 }),
    tq_submission_time: time('tq_submission_time'),
    tq_document: varchar('tq_document', { length: 255 }),
    status: varchar('status', { length: 1 }).notNull().default('1'),
    ip: varchar('ip', { length: 255 }),
    strtotime: varchar('strtotime', { length: 255 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlTqReplieds = mysqlTable('tq_replieds', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    tender_id: bigint('tender_id', { mode: 'number' }),
    tq_submission_date: varchar('tq_submission_date', { length: 255 }),
    tq_submission_time: time('tq_submission_time'),
    tq_document: varchar('tq_document', { length: 255 }),
    proof_submission: varchar('proof_submission', { length: 255 }),
    status: varchar('status', { length: 1 }).notNull().default('1'),
    ip: varchar('ip', { length: 255 }),
    strtotime: varchar('strtotime', { length: 255 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// ============================================================================
// TYPES
// ============================================================================

interface MigrationStats {
    tqTypes: { success: number; errors: number };
    tenderQueries: { success: number; errors: number };
    tenderQueryItems: { success: number; errors: number };
}

interface MigrationContext {
    pgDb: ReturnType<typeof pgDrizzle>;
    mysqlDb: ReturnType<typeof mysqlDrizzle>;
    stats: MigrationStats;
    repliedCache: Map<number, ReplyData[]>; // tender_id → sorted replies
    queryItemIdCounter: number;
}

interface ReplyData {
    id: number;
    tender_id: number;
    tq_submission_date: string | null;
    tq_submission_time: string | null;
    tq_document: string | null;
    proof_submission: string | null;
    updated_at: Date | null;
}

interface ParsedQueryItem {
    tqTypeId: number | null;
    description: string;
}

// ============================================================================
// UTILITY FUNCTIONS (PARSERS)
// ============================================================================

const Parsers = {
    date(val: string | Date | null | undefined): Date | null {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    },

    dateTime(dateVal: string | Date | null, timeVal: string | null): Date | null {
        if (!dateVal) return null;
        const dateStr = typeof dateVal === 'string' ? dateVal : dateVal.toISOString().split('T')[0];
        const timeStr = timeVal || '00:00:00';
        const combined = new Date(`${dateStr}T${timeStr}`);
        return isNaN(combined.getTime()) ? new Date(dateVal) : combined;
    },

    string(val: string | null | undefined, maxLength?: number): string | null {
        if (val === null || val === undefined) return null;
        const str = String(val).trim();
        if (str === '') return null;
        return maxLength ? str.substring(0, maxLength) : str;
    },

    filePath(val: string | null | undefined): string | null {
        if (!val || val.trim() === '') return null;
        const filename = val.trim();
        return `tq-management\\${filename}`;
    },

    parseJsonArray(val: string | null | undefined): string[] {
        if (!val || val.trim() === '') return [];
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
                return parsed.map(item => String(item).trim());
            }
        } catch {
            // Not valid JSON
        }
        return [];
    },

    integer(val: string | null | undefined): number | null {
        if (!val) return null;
        const num = parseInt(val.trim(), 10);
        return isNaN(num) ? null : num;
    },
};

// ============================================================================
// DATA TRANSFORMERS
// ============================================================================

class TqTypeTransformer {
    transform(row: typeof mysqlTqTypes.$inferSelect) {
        return {
            id: row.id,
            name: row.tq_type.trim(),
            status: row.status === '1',
            createdAt: Parsers.date(row.created_at) ?? new Date(),
            updatedAt: Parsers.date(row.updated_at) ?? new Date(),
        };
    }
}

class TenderQueryTransformer {
    transform(
        row: typeof mysqlTqReceiveds.$inferSelect,
        replyData: ReplyData | null
    ) {
        const hasReply = replyData !== null;

        return {
            // ✅ Preserve original ID from tq_receiveds
            id: row.id,
            tenderId: Number(row.tender_id),

            // Received data
            tqSubmissionDeadline: Parsers.dateTime(row.tq_submission_date, row.tq_submission_time),
            tqDocumentReceived: Parsers.filePath(row.tq_document),
            receivedBy: null,
            receivedAt: Parsers.date(row.created_at),

            // Status based on reply existence
            status: hasReply ? 'TQ Replied' : 'TQ awaited',

            // Reply data (from matched tq_replieds)
            repliedDatetime: hasReply
                ? Parsers.dateTime(replyData!.tq_submission_date, replyData!.tq_submission_time)
                : null,
            repliedDocument: hasReply ? Parsers.filePath(replyData!.tq_document) : null,
            proofOfSubmission: hasReply ? Parsers.filePath(replyData!.proof_submission) : null,
            repliedBy: null,
            repliedAt: hasReply ? Parsers.date(replyData!.updated_at) : null,

            // Fields not in MySQL
            missedReason: null,
            preventionMeasures: null,
            tmsImprovements: null,

            // Timestamps
            createdAt: Parsers.date(row.created_at) ?? new Date(),
            updatedAt: Parsers.date(row.updated_at) ?? new Date(),
        };
    }

    parseQueryItems(row: typeof mysqlTqReceiveds.$inferSelect): ParsedQueryItem[] {
        const tqTypeIds = Parsers.parseJsonArray(row.tq_type);
        const descriptions = Parsers.parseJsonArray(row.description);

        const items: ParsedQueryItem[] = [];
        const maxLength = Math.max(tqTypeIds.length, descriptions.length);

        for (let i = 0; i < maxLength; i++) {
            const tqTypeId = tqTypeIds[i] ? Parsers.integer(tqTypeIds[i]) : null;
            const description = descriptions[i] || '';

            // Skip if no description
            if (!description.trim()) continue;

            items.push({
                tqTypeId,
                description: description.trim(),
            });
        }

        return items;
    }
}

// ============================================================================
// CACHE LOADER
// ============================================================================

class TqRepliedCacheLoader {
    constructor(private ctx: MigrationContext) { }

    async load(): Promise<void> {
        console.log('Pre-loading tq_replieds data...');

        const rows = await this.ctx.mysqlDb
            .select()
            .from(mysqlTqReplieds);

        // Filter active records and group by tender_id
        for (const row of rows) {
            // Skip soft-deleted records
            if (row.status !== '1') continue;

            if (row.tender_id === null) continue;

            const tenderId = Number(row.tender_id);
            const replyData: ReplyData = {
                id: row.id,
                tender_id: tenderId,
                tq_submission_date: row.tq_submission_date,
                tq_submission_time: row.tq_submission_time,
                tq_document: row.tq_document,
                proof_submission: row.proof_submission,
                updated_at: row.updated_at,
            };

            if (!this.ctx.repliedCache.has(tenderId)) {
                this.ctx.repliedCache.set(tenderId, []);
            }
            this.ctx.repliedCache.get(tenderId)!.push(replyData);
        }

        // Sort each tender's replies by ID for positional matching
        for (const [tenderId, replies] of this.ctx.repliedCache) {
            replies.sort((a, b) => a.id - b.id);
        }

        console.log(`  ✓ Cached: ${this.ctx.repliedCache.size} tender_ids with replies`);
    }
}

// ============================================================================
// MIGRATORS
// ============================================================================

class TqTypeMigrator {
    private transformer = new TqTypeTransformer();

    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating tq_types...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlTqTypes);
        console.log(`  Found ${rows.length} records to migrate`);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlTqTypes.$inferSelect): Promise<void> {
        try {
            const data = this.transformer.transform(row);
            await this.ctx.pgDb.insert(tqTypes).values(data as any);
            this.ctx.stats.tqTypes.success++;
        } catch (err) {
            console.error(`Error migrating tq_types id=${row.id}:`, err);
            this.ctx.stats.tqTypes.errors++;
        }
    }

    private logStats(): void {
        const { success, errors } = this.ctx.stats.tqTypes;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors}`);
    }
}

class TenderQueryMigrator {
    private transformer = new TenderQueryTransformer();
    private replyUsageIndex: Map<number, number> = new Map(); // tender_id → next reply index

    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating tq_receiveds → tender_queries + tender_query_items...');

        const rows = await this.ctx.mysqlDb
            .select()
            .from(mysqlTqReceiveds);

        // Filter and sort by tender_id, then by id for consistent matching
        const activeRows = rows
            .filter(row => row.status === '1' && row.tender_id !== null)
            .sort((a, b) => {
                if (a.tender_id !== b.tender_id) {
                    return Number(a.tender_id) - Number(b.tender_id);
                }
                return a.id - b.id;
            });

        console.log(`  Found ${activeRows.length} active records to migrate`);

        for (const row of activeRows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlTqReceiveds.$inferSelect): Promise<void> {
        try {
            const tenderId = Number(row.tender_id);

            // Get the next available reply for this tender_id (positional matching)
            const replyData = this.getNextReply(tenderId);

            // Transform and insert tender_queries
            const queryData = this.transformer.transform(row, replyData);
            await this.ctx.pgDb.insert(tenderQueries).values(queryData as any);
            this.ctx.stats.tenderQueries.success++;

            // Parse and insert tender_query_items
            const queryItems = this.transformer.parseQueryItems(row);
            for (let i = 0; i < queryItems.length; i++) {
                await this.insertQueryItem(row.id, i + 1, queryItems[i], row);
            }
        } catch (err) {
            console.error(`Error migrating tq_receiveds id=${row.id}:`, err);
            this.ctx.stats.tenderQueries.errors++;
        }
    }

    private getNextReply(tenderId: number): ReplyData | null {
        const replies = this.ctx.repliedCache.get(tenderId);
        if (!replies || replies.length === 0) return null;

        // Get current index for this tender_id
        const currentIndex = this.replyUsageIndex.get(tenderId) ?? 0;

        if (currentIndex >= replies.length) {
            // No more replies available for this tender_id
            return null;
        }

        // Increment index for next use
        this.replyUsageIndex.set(tenderId, currentIndex + 1);

        return replies[currentIndex];
    }

    private async insertQueryItem(
        tenderQueryId: number,
        srNo: number,
        item: ParsedQueryItem,
        row: typeof mysqlTqReceiveds.$inferSelect
    ): Promise<void> {
        try {
            this.ctx.queryItemIdCounter++;

            await this.ctx.pgDb.insert(tenderQueryItems).values({
                id: this.ctx.queryItemIdCounter,
                tenderQueryId: tenderQueryId,
                srNo: srNo,
                tqTypeId: item.tqTypeId,
                queryDescription: item.description,
                response: null,
                createdAt: Parsers.date(row.created_at) ?? new Date(),
                updatedAt: Parsers.date(row.updated_at) ?? new Date(),
            } as any);

            this.ctx.stats.tenderQueryItems.success++;
        } catch (err) {
            console.error(`Error inserting tender_query_items for query=${tenderQueryId}:`, err);
            this.ctx.stats.tenderQueryItems.errors++;
        }
    }

    private logStats(): void {
        const queries = this.ctx.stats.tenderQueries;
        const items = this.ctx.stats.tenderQueryItems;
        console.log(`  ✓ tender_queries: ${queries.success} migrated | ${queries.errors} errors`);
        console.log(`  ✓ tender_query_items: ${items.success} created | ${items.errors} errors`);
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
            { table: 'tq_types', column: 'id' },
            { table: 'tender_queries', column: 'id' },
            { table: 'tender_query_items', column: 'id' },
        ];

        for (const seq of sequences) {
            try {
                await this.ctx.pgDb.execute(sql`
                    SELECT setval(
                        pg_get_serial_sequence(${seq.table}, ${seq.column}),
                        COALESCE((SELECT MAX(id) FROM ${sql.identifier(seq.table)}), 1),
                        true
                    )
                `);
                console.log(`  ✓ ${seq.table} sequence reset`);
            } catch (err) {
                console.error(`  ✗ Error resetting ${seq.table} sequence:`, err);
            }
        }
    }
}

// ============================================================================
// MIGRATION ORCHESTRATOR
// ============================================================================

class TenderQueryMigrationOrchestrator {
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
        console.log('\n' + '═'.repeat(60));
        console.log('  TENDER QUERIES MIGRATION: MySQL → PostgreSQL');
        console.log('  (Preserving Original IDs)');
        console.log('═'.repeat(60));
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
            stats: {
                tqTypes: { success: 0, errors: 0 },
                tenderQueries: { success: 0, errors: 0 },
                tenderQueryItems: { success: 0, errors: 0 },
            },
            repliedCache: new Map(),
            queryItemIdCounter: 0,
        };
    }

    private async executeMigration(): Promise<void> {
        const steps = [
            {
                name: 'Pre-load tq_replieds cache',
                fn: () => new TqRepliedCacheLoader(this.ctx).load(),
            },
            {
                name: 'Migrate tq_types',
                fn: () => new TqTypeMigrator(this.ctx).migrate(),
            },
            {
                name: 'Migrate tender_queries + tender_query_items',
                fn: () => new TenderQueryMigrator(this.ctx).migrate(),
            },
            {
                name: 'Reset PostgreSQL sequences',
                fn: () => new SequenceResetter(this.ctx).reset(),
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
        const { stats, repliedCache } = this.ctx;

        console.log('═'.repeat(60));
        console.log('  MIGRATION SUMMARY');
        console.log('═'.repeat(60));
        console.log('');
        console.log('  Table                    Success    Errors');
        console.log('  ─────────────────────────────────────────────');
        console.log(`  tq_types                 ${this.pad(stats.tqTypes.success)}       ${stats.tqTypes.errors}`);
        console.log(`  tender_queries           ${this.pad(stats.tenderQueries.success)}       ${stats.tenderQueries.errors}`);
        console.log(`  tender_query_items       ${this.pad(stats.tenderQueryItems.success)}       ${stats.tenderQueryItems.errors}`);
        console.log('  ─────────────────────────────────────────────');
        console.log(`  Replies cached:          ${repliedCache.size} tender_ids`);
        console.log('');
        console.log('═'.repeat(60));
        console.log('  ✅ Migration completed successfully!');
        console.log('═'.repeat(60));
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
    const orchestrator = new TenderQueryMigrationOrchestrator(config);
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
