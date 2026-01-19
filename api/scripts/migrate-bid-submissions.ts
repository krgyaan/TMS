import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import {
    mysqlTable,
    varchar,
    bigint,
    text,
    timestamp,
} from 'drizzle-orm/mysql-core';
import { Client } from 'pg';
import { sql } from 'drizzle-orm';
import { bidSubmissions } from '@db/schemas/tendering';

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
// MYSQL SCHEMA DEFINITION
// ============================================================================

const mysqlBidSubmissions = mysqlTable('bid_submissions', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    tender_id: bigint('tender_id', { mode: 'number' }).notNull(),
    bid_submissions_date: timestamp('bid_submissions_date'),
    submitted_bid_documents: text('submitted_bid_documents'),
    proof_of_submission: varchar('proof_of_submission', { length: 255 }),
    final_bidding_price: text('final_bidding_price'),
    status: varchar('status', { length: 50 }).notNull().default('Submission Pending'),
    reason_for_missing: text('reason_for_missing'),
    not_repeat_reason: text('not_repeat_reason'),
    tms_improvements: text('tms_improvements'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// ============================================================================
// TYPES
// ============================================================================

interface BidSubmissionDocuments {
    finalPriceSs?: string;
    submittedDocs?: string[];
    submissionProof?: string;
}

interface MigrationStats {
    bidSubmissions: { success: number; errors: number };
}

interface MigrationContext {
    pgDb: ReturnType<typeof pgDrizzle>;
    mysqlDb: ReturnType<typeof mysqlDrizzle>;
    stats: MigrationStats;
}

// ============================================================================
// UTILITY FUNCTIONS (PARSERS)
// ============================================================================

const Parsers = {
    decimal(val: string | number | null | undefined): string | null {
        if (val === null || val === undefined || val === '') return null;
        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '').trim());
        return isNaN(num) ? null : num.toFixed(2);
    },

    date(val: string | Date | null | undefined): Date | null {
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
};

// ============================================================================
// DATA TRANSFORMER
// ============================================================================

class BidSubmissionTransformer {
    private static readonly VALID_STATUSES = [
        'Submission Pending',
        'Bid Submitted',
        'Tender Missed',
    ] as const;

    transform(row: typeof mysqlBidSubmissions.$inferSelect) {
        return {
            // ✅ Preserve original ID
            id: row.id,
            tenderId: Number(row.tender_id),

            // Status with fallback
            status: this.parseStatus(row.status),

            // Date/time
            submissionDatetime: Parsers.date(row.bid_submissions_date),

            // Price
            finalBiddingPrice: Parsers.decimal(row.final_bidding_price),

            // Documents (JSONB)
            documents: this.buildDocuments(row),

            // Not available in MySQL
            submittedBy: null,

            // Text fields
            reasonForMissing: row.reason_for_missing ?? null,
            preventionMeasures: row.not_repeat_reason ?? null, // ← Mapped field
            tmsImprovements: row.tms_improvements ?? null,

            // Timestamps
            createdAt: Parsers.date(row.created_at) ?? new Date(),
            updatedAt: Parsers.date(row.updated_at) ?? new Date(),
        };
    }

    private parseStatus(
        status: string | null
    ): 'Submission Pending' | 'Bid Submitted' | 'Tender Missed' {
        if (
            status &&
            BidSubmissionTransformer.VALID_STATUSES.includes(
                status as (typeof BidSubmissionTransformer.VALID_STATUSES)[number]
            )
        ) {
            return status as 'Submission Pending' | 'Bid Submitted' | 'Tender Missed';
        }
        return 'Submission Pending'; // Default for empty/invalid
    }

    private buildDocuments(
        row: typeof mysqlBidSubmissions.$inferSelect
    ): BidSubmissionDocuments | null {
        const docs: BidSubmissionDocuments = {};

        // submitted_bid_documents → submittedDocs (wrapped in array with path prefix)
        if (row.submitted_bid_documents?.trim()) {
            const filename = row.submitted_bid_documents.trim();
            docs.submittedDocs = [`bid-submitted-docs\\${filename}`];
        }

        // proof_of_submission → submissionProof (with path prefix)
        if (row.proof_of_submission?.trim()) {
            const filename = row.proof_of_submission.trim();
            docs.submissionProof = `bid-submission-proof\\${filename}`;
        }

        // finalPriceSs - not available in MySQL source
        // Will be added by future operations in new system

        return Object.keys(docs).length > 0 ? docs : null;
    }
}

// ============================================================================
// MIGRATOR
// ============================================================================

class BidSubmissionMigrator {
    private transformer = new BidSubmissionTransformer();

    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating bid_submissions...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlBidSubmissions);
        console.log(`  Found ${rows.length} records to migrate`);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(
        row: typeof mysqlBidSubmissions.$inferSelect
    ): Promise<void> {
        try {
            const data = this.transformer.transform(row);

            // ✅ Insert with preserved ID
            await this.ctx.pgDb.insert(bidSubmissions).values(data as any);
            this.ctx.stats.bidSubmissions.success++;
        } catch (err) {
            console.error(`Error migrating bid_submissions id=${row.id}:`, err);
            this.ctx.stats.bidSubmissions.errors++;
        }
    }

    private logStats(): void {
        const { success, errors } = this.ctx.stats.bidSubmissions;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors}`);
    }
}

// ============================================================================
// SEQUENCE RESETTER
// ============================================================================

class SequenceResetter {
    constructor(private ctx: MigrationContext) { }

    async reset(): Promise<void> {
        console.log('Resetting PostgreSQL sequence...');

        try {
            await this.ctx.pgDb.execute(sql`
                SELECT setval(
                    pg_get_serial_sequence('bid_submissions', 'id'),
                    COALESCE((SELECT MAX(id) FROM bid_submissions), 1),
                    true
                )
            `);
            console.log('  ✓ bid_submissions sequence reset');
        } catch (err) {
            console.error('  ✗ Error resetting sequence:', err);
        }
    }
}

// ============================================================================
// MIGRATION ORCHESTRATOR
// ============================================================================

class BidSubmissionMigrationOrchestrator {
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
        console.log('  BID SUBMISSIONS MIGRATION: MySQL → PostgreSQL');
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
                bidSubmissions: { success: 0, errors: 0 },
            },
        };
    }

    private async executeMigration(): Promise<void> {
        const steps = [
            {
                name: 'Migrate bid_submissions',
                fn: () => new BidSubmissionMigrator(this.ctx).migrate(),
            },
            {
                name: 'Reset PostgreSQL sequence',
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
        const { stats } = this.ctx;

        console.log('═'.repeat(60));
        console.log('  MIGRATION SUMMARY');
        console.log('═'.repeat(60));
        console.log('');
        console.log('  Table                    Success    Errors');
        console.log('  ─────────────────────────────────────────────');
        console.log(`  bid_submissions          ${this.pad(stats.bidSubmissions.success)}       ${stats.bidSubmissions.errors}`);
        console.log('  ─────────────────────────────────────────────');
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
    const orchestrator = new BidSubmissionMigrationOrchestrator(config);
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
