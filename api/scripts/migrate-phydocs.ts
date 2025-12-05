import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import { mysqlTable, varchar, bigint, int, timestamp } from 'drizzle-orm/mysql-core';
import { Client } from 'pg';
import { sql } from 'drizzle-orm';
import { physicalDocs, physicalDocsPersons } from '@db/schemas/tendering/physical-docs.schema';

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

const mysqlPhyDocs = mysqlTable('phy_docs', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    tender_id: varchar('tender_id', { length: 255 }).notNull(),
    courier_no: int('courier_no'),
    submitted_docs: varchar('submitted_docs', { length: 2000 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlPhydocsPeople = mysqlTable('phydocs_people', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    phydoc_id: varchar('phydoc_id', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 255 }).notNull(),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// ============================================================================
// TYPES
// ============================================================================

interface MigrationStats {
    physicalDocs: { success: number; errors: number; skipped: number };
    physicalDocsPersons: { success: number; errors: number; skipped: number };
}

interface MigrationContext {
    pgDb: ReturnType<typeof pgDrizzle>;
    mysqlDb: ReturnType<typeof mysqlDrizzle>;
    phyDocIds: Set<number>; // Track valid phy_docs IDs
    stats: MigrationStats;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const Parsers = {
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

    string(val: string | null | undefined, maxLength?: number): string | null {
        if (val === null || val === undefined) return null;
        const str = String(val).trim();
        if (str === '') return null;
        return maxLength ? str.substring(0, maxLength) : str;
    },

    stringRequired(val: string | null | undefined, defaultVal: string, maxLength?: number): string {
        const parsed = this.string(val, maxLength);
        return parsed ?? defaultVal;
    },
};

// ============================================================================
// DATA TRANSFORMERS
// ============================================================================

class PhysicalDocsTransformer {
    transform(row: typeof mysqlPhyDocs.$inferSelect) {
        const tenderId = Parsers.integer(row.tender_id);

        if (!tenderId) {
            return null; // Skip if tender_id is invalid
        }

        return {
            id: row.id,
            tenderId: tenderId,
            courierNo: row.courier_no ?? 1, // Default to 1 if null
            submittedDocs: Parsers.string(row.submitted_docs, 2000),
            createdAt: Parsers.date(row.created_at) ?? new Date(),
            updatedAt: Parsers.date(row.updated_at) ?? new Date(),
        };
    }
}

class PhysicalDocsPersonsTransformer {
    transform(row: typeof mysqlPhydocsPeople.$inferSelect, validPhyDocIds: Set<number>) {
        const phydocId = Parsers.integer(row.phydoc_id);

        if (!phydocId) {
            return null; // Skip if phydoc_id is invalid
        }

        // Skip if referenced phy_docs doesn't exist
        if (!validPhyDocIds.has(phydocId)) {
            return null;
        }

        return {
            id: row.id,
            physicalDocId: phydocId,
            name: Parsers.stringRequired(row.name, 'Unknown', 255),
            email: Parsers.stringRequired(row.email, 'unknown@example.com', 255),
            phone: Parsers.stringRequired(row.phone, '0000000000', 255),
            createdAt: Parsers.date(row.created_at) ?? new Date(),
            updatedAt: Parsers.date(row.updated_at) ?? new Date(),
        };
    }
}

// ============================================================================
// MIGRATORS
// ============================================================================

class PhysicalDocsMigrator {
    private transformer = new PhysicalDocsTransformer();

    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating phy_docs → physical_docs...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlPhyDocs);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlPhyDocs.$inferSelect): Promise<void> {
        try {
            const data = this.transformer.transform(row);

            if (!data) {
                console.warn(`  ⚠ Skipping phy_docs id=${row.id}: invalid tender_id`);
                this.ctx.stats.physicalDocs.skipped++;
                return;
            }

            await this.ctx.pgDb.insert(physicalDocs).values(data);

            // Track valid IDs for persons migration
            this.ctx.phyDocIds.add(row.id);
            this.ctx.stats.physicalDocs.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating phy_docs id=${row.id}:`, err);
            this.ctx.stats.physicalDocs.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.physicalDocs;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

class PhysicalDocsPersonsMigrator {
    private transformer = new PhysicalDocsPersonsTransformer();

    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating phydocs_people → physical_docs_persons...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlPhydocsPeople);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlPhydocsPeople.$inferSelect): Promise<void> {
        try {
            const data = this.transformer.transform(row, this.ctx.phyDocIds);

            if (!data) {
                console.warn(`  ⚠ Skipping phydocs_people id=${row.id}: invalid/missing phydoc_id=${row.phydoc_id}`);
                this.ctx.stats.physicalDocsPersons.skipped++;
                return;
            }

            await this.ctx.pgDb.insert(physicalDocsPersons).values(data);
            this.ctx.stats.physicalDocsPersons.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating phydocs_people id=${row.id}:`, err);
            this.ctx.stats.physicalDocsPersons.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.physicalDocsPersons;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

// ============================================================================
// SEQUENCE RESETTER
// ============================================================================

class SequenceResetter {
    constructor(private ctx: MigrationContext) { }

    async reset(): Promise<void> {
        console.log('Resetting PostgreSQL sequences...');

        try {
            // Reset physical_docs sequence
            await this.ctx.pgDb.execute(sql`
                SELECT setval(
                    pg_get_serial_sequence('physical_docs', 'id'),
                    COALESCE((SELECT MAX(id) FROM physical_docs), 1),
                    true
                )
            `);
            console.log('  ✓ physical_docs sequence reset');

            // Reset physical_docs_persons sequence
            await this.ctx.pgDb.execute(sql`
                SELECT setval(
                    pg_get_serial_sequence('physical_docs_persons', 'id'),
                    COALESCE((SELECT MAX(id) FROM physical_docs_persons), 1),
                    true
                )
            `);
            console.log('  ✓ physical_docs_persons sequence reset');
        } catch (err) {
            console.error('  ✗ Error resetting sequences:', err);
            throw err;
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
        console.log('\n' + '═'.repeat(60));
        console.log('  PHYSICAL DOCS MIGRATION: MySQL → PostgreSQL');
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
            phyDocIds: new Set(),
            stats: {
                physicalDocs: { success: 0, errors: 0, skipped: 0 },
                physicalDocsPersons: { success: 0, errors: 0, skipped: 0 },
            },
        };
    }

    private async executeMigration(): Promise<void> {
        const steps = [
            {
                name: 'Migrate physical_docs',
                fn: () => new PhysicalDocsMigrator(this.ctx).migrate(),
            },
            {
                name: 'Migrate physical_docs_persons',
                fn: () => new PhysicalDocsPersonsMigrator(this.ctx).migrate(),
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
        const { stats, phyDocIds } = this.ctx;

        console.log('═'.repeat(60));
        console.log('  MIGRATION SUMMARY');
        console.log('═'.repeat(60));
        console.log('');
        console.log('  Table                      Success   Errors   Skipped');
        console.log('  ───────────────────────────────────────────────────────');
        console.log(`  physical_docs              ${this.pad(stats.physicalDocs.success)}      ${this.pad(stats.physicalDocs.errors)}       ${stats.physicalDocs.skipped}`);
        console.log(`  physical_docs_persons      ${this.pad(stats.physicalDocsPersons.success)}      ${this.pad(stats.physicalDocsPersons.errors)}       ${stats.physicalDocsPersons.skipped}`);
        console.log('  ───────────────────────────────────────────────────────');
        console.log(`  Valid PhyDoc IDs tracked:  ${phyDocIds.size}`);
        console.log('');
        console.log('═'.repeat(60));
        console.log('  ✅ Migration completed successfully!');
        console.log('═'.repeat(60));
    }

    private pad(num: number): string {
        return num.toString().padStart(4);
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
