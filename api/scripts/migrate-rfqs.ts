import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import { mysqlTable, varchar, bigint, text, timestamp, int, decimal } from 'drizzle-orm/mysql-core';
import { Client } from 'pg';
import {
    rfqs,
    rfqItems,
    rfqDocuments,
    rfqResponses,
    rfqResponseItems,
    rfqResponseDocuments,
} from '../src/db/rfqs.schema';

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

const mysqlRfqs = mysqlTable('rfqs', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    tender_id: varchar('tender_id', { length: 255 }).notNull(),
    team_name: varchar('team_name', { length: 255 }),
    organisation: varchar('organisation', { length: 255 }),
    location: varchar('location', { length: 255 }),
    item_name: varchar('item_name', { length: 255 }),
    techical: varchar('techical', { length: 255 }),
    boq: varchar('boq', { length: 255 }),
    scope: varchar('scope', { length: 255 }),
    maf: varchar('maf', { length: 255 }),
    docs_list: text('docs_list'),
    mii: varchar('mii', { length: 255 }),
    requirements: varchar('requirements', { length: 255 }),
    qty: varchar('qty', { length: 255 }),
    unit: varchar('unit', { length: 255 }),
    due_date: varchar('due_date', { length: 255 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlRfqItems = mysqlTable('rfq_items', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    rfq_id: int('rfq_id').notNull(),
    tender_id: int('tender_id'),
    requirement: text('requirement'),
    unit: varchar('unit', { length: 255 }),
    qty: int('qty'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlRfqTechnicals = mysqlTable('rfq_technicals', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    rfq_id: bigint('rfq_id', { mode: 'number' }).notNull(),
    tender_id: bigint('tender_id', { mode: 'number' }),
    name: varchar('name', { length: 255 }),
    file_path: varchar('file_path', { length: 255 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlRfqScopes = mysqlTable('rfq_scopes', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    rfq_id: bigint('rfq_id', { mode: 'number' }).notNull(),
    tender_id: bigint('tender_id', { mode: 'number' }),
    name: varchar('name', { length: 255 }),
    file_path: varchar('file_path', { length: 255 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlRfqMiis = mysqlTable('rfq_miis', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    rfq_id: bigint('rfq_id', { mode: 'number' }).notNull(),
    tender_id: bigint('tender_id', { mode: 'number' }),
    name: varchar('name', { length: 255 }),
    file_path: varchar('file_path', { length: 255 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlRfqMafs = mysqlTable('rfq_mafs', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    rfq_id: bigint('rfq_id', { mode: 'number' }).notNull(),
    tender_id: bigint('tender_id', { mode: 'number' }),
    name: varchar('name', { length: 255 }),
    file_path: varchar('file_path', { length: 255 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlRfqBoqs = mysqlTable('rfq_boqs', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    rfq_id: bigint('rfq_id', { mode: 'number' }).notNull(),
    tender_id: bigint('tender_id', { mode: 'number' }),
    name: varchar('name', { length: 255 }),
    file_path: varchar('file_path', { length: 255 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlRfqResponses = mysqlTable('rfq_responses', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    rfq_id: bigint('rfq_id', { mode: 'number' }).notNull(),
    receipt_datetime: timestamp('receipt_datetime').notNull(),
    gst_percentage: decimal('gst_percentage', { precision: 5, scale: 2 }).notNull(),
    gst_type: varchar('gst_type', { length: 20 }).notNull(),
    delivery_time: int('delivery_time').notNull(),
    freight_type: varchar('freight_type', { length: 20 }).notNull(),
    quotation_document: varchar('quotation_document', { length: 255 }),
    technical_documents: text('technical_documents'),
    maf_document: varchar('maf_document', { length: 255 }),
    mii_document: varchar('mii_document', { length: 255 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlQuotationReceiptItems = mysqlTable('quotation_receipt_items', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    quotation_receipt_id: bigint('quotation_receipt_id', { mode: 'number' }).notNull(),
    item_id: bigint('item_id', { mode: 'number' }).notNull(),
    description: text('description'),
    quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
    unit: varchar('unit', { length: 50 }).notNull(),
    unit_price: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// ============================================================================
// TYPES
// ============================================================================

interface MigrationStats {
    rfqs: { success: number; errors: number; skipped: number };
    rfqItems: { success: number; errors: number; skipped: number };
    rfqDocuments: { success: number; errors: number; skipped: number };
    rfqResponses: { success: number; errors: number; skipped: number };
    rfqResponseItems: { success: number; errors: number; skipped: number };
    rfqResponseDocuments: { success: number; errors: number; skipped: number };
}

interface MigrationContext {
    pgDb: ReturnType<typeof pgDrizzle>;
    pgClient: Client;
    mysqlDb: ReturnType<typeof mysqlDrizzle>;
    rfqIds: Set<number>;
    rfqResponseIds: Set<number>;
    defaultVendorId: number | null;
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

    dateFromString(val: string | null | undefined): Date | null {
        if (!val || val.trim() === '') return null;
        const formats = [
            val,
            val.replace(/(\d{2})-(\d{2})-(\d{4})/, '$3-$2-$1'),
            val.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'),
        ];
        for (const format of formats) {
            const d = new Date(format);
            if (!isNaN(d.getTime())) return d;
        }
        return null;
    },

    string(val: string | null | undefined, maxLength?: number): string | null {
        if (val === null || val === undefined) return null;
        const str = String(val).trim();
        if (str === '') return null;
        return maxLength ? str.substring(0, maxLength) : str;
    },

    parseDocumentPaths(val: string | null | undefined): string[] {
        if (!val || val.trim() === '') return [];

        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
                return parsed.filter(s => s && typeof s === 'string' && s.trim() !== '');
            }
            if (typeof parsed === 'string' && parsed.trim() !== '') {
                return [parsed];
            }
        } catch {
            const commaSplit = val.split(',').map(s => s.trim()).filter(s => s !== '');
            if (commaSplit.length > 1 || commaSplit[0] !== val.trim()) {
                return commaSplit;
            }
            const newlineSplit = val.split('\n').map(s => s.trim()).filter(s => s !== '');
            if (newlineSplit.length > 1) {
                return newlineSplit;
            }
            if (val.trim() !== '') {
                return [val.trim()];
            }
        }
        return [];
    },
};

// ============================================================================
// MIGRATORS
// ============================================================================

class RfqsMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating rfqs...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlRfqs);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlRfqs.$inferSelect): Promise<void> {
        try {
            // Direct parse - tender IDs are preserved
            const tenderId = Parsers.integer(row.tender_id);

            if (!tenderId) {
                console.warn(`  ⚠ Skipping RFQ id=${row.id}: invalid tender_id="${row.tender_id}"`);
                this.ctx.stats.rfqs.skipped++;
                return;
            }

            // ✅ Preserve original ID
            await this.ctx.pgDb.insert(rfqs).values({
                id: row.id,
                tenderId: tenderId,
                dueDate: Parsers.dateFromString(row.due_date),
                docList: row.docs_list ?? null,
                requestedVendor: Parsers.string(row.organisation, 255),
                createdAt: Parsers.date(row.created_at) ?? new Date(),
                updatedAt: Parsers.date(row.updated_at) ?? new Date(),
            });

            this.ctx.rfqIds.add(row.id);

            // Migrate inline item if exists
            if (row.requirements || row.qty || row.unit) {
                await this.ctx.pgDb.insert(rfqItems).values({
                    // Auto-generate ID for inline items
                    rfqId: row.id,
                    requirement: row.requirements ?? 'Not specified',
                    unit: Parsers.string(row.unit, 64),
                    qty: Parsers.decimal(row.qty),
                    createdAt: Parsers.date(row.created_at) ?? new Date(),
                    updatedAt: Parsers.date(row.updated_at) ?? new Date(),
                });
            }

            // Migrate inline document references
            const inlineDocs = [
                { type: 'technical', path: row.techical },
                { type: 'boq', path: row.boq },
                { type: 'scope', path: row.scope },
                { type: 'maf', path: row.maf },
                { type: 'mii', path: row.mii },
            ];

            for (const doc of inlineDocs) {
                if (doc.path && doc.path.trim() !== '') {
                    await this.ctx.pgDb.insert(rfqDocuments).values({
                        // Auto-generate ID
                        rfqId: row.id,
                        docType: doc.type,
                        path: doc.path,
                        metadata: { source: 'rfqs_inline', originalField: doc.type },
                        createdAt: Parsers.date(row.created_at) ?? new Date(),
                    });
                    this.ctx.stats.rfqDocuments.success++;
                }
            }

            this.ctx.stats.rfqs.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating RFQ id=${row.id}:`, err);
            this.ctx.stats.rfqs.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.rfqs;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

class RfqItemsMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating rfq_items...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlRfqItems);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlRfqItems.$inferSelect): Promise<void> {
        try {
            if (!this.ctx.rfqIds.has(row.rfq_id)) {
                console.warn(`  ⚠ Skipping rfq_item id=${row.id}: RFQ ${row.rfq_id} not found`);
                this.ctx.stats.rfqItems.skipped++;
                return;
            }

            // ✅ Preserve original ID
            await this.ctx.pgDb.insert(rfqItems).values({
                id: row.id,
                rfqId: row.rfq_id,
                requirement: row.requirement ?? 'Not specified',
                unit: Parsers.string(row.unit, 64),
                qty: Parsers.decimal(row.qty),
                createdAt: Parsers.date(row.created_at) ?? new Date(),
                updatedAt: Parsers.date(row.updated_at) ?? new Date(),
            });

            this.ctx.stats.rfqItems.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating rfq_item id=${row.id}:`, err);
            this.ctx.stats.rfqItems.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.rfqItems;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

class RfqDocumentsMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrateAll(): Promise<void> {
        await this.migrateTable(mysqlRfqTechnicals as any, 'technical', 'rfq_technicals');
        await this.migrateTable(mysqlRfqScopes as any, 'scope', 'rfq_scopes');
        await this.migrateTable(mysqlRfqMiis as any, 'mii', 'rfq_miis');
        await this.migrateTable(mysqlRfqMafs as any, 'maf', 'rfq_mafs');
        await this.migrateTable(mysqlRfqBoqs as any, 'boq', 'rfq_boqs');
    }

    private async migrateTable(
        table: typeof mysqlRfqTechnicals,
        docType: string,
        sourceName: string
    ): Promise<void> {
        console.log(`Migrating ${sourceName}...`);
        const rows = await this.ctx.mysqlDb.select().from(table);
        let success = 0, errors = 0, skipped = 0;

        for (const row of rows) {
            if (!this.ctx.rfqIds.has(row.rfq_id)) {
                skipped++;
                continue;
            }
            if (!row.file_path || row.file_path.trim() === '') {
                skipped++;
                continue;
            }

            try {
                // Auto-generate IDs (merged from multiple tables)
                await this.ctx.pgDb.insert(rfqDocuments).values({
                    rfqId: row.rfq_id,
                    docType: docType,
                    path: row.file_path,
                    metadata: {
                        name: row.name,
                        source: sourceName,
                        originalId: row.id,
                        tenderId: row.tender_id,
                    },
                    createdAt: Parsers.date(row.created_at) ?? new Date(),
                });
                success++;
                this.ctx.stats.rfqDocuments.success++;
            } catch (err) {
                console.error(`  ✗ Error migrating ${sourceName} id=${row.id}:`, err);
                errors++;
                this.ctx.stats.rfqDocuments.errors++;
            }
        }

        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

class RfqResponsesMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating rfq_responses...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlRfqResponses);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlRfqResponses.$inferSelect): Promise<void> {
        try {
            if (!this.ctx.rfqIds.has(row.rfq_id)) {
                console.warn(`  ⚠ Skipping rfq_response id=${row.id}: RFQ ${row.rfq_id} not found`);
                this.ctx.stats.rfqResponses.skipped++;
                return;
            }

            if (!this.ctx.defaultVendorId) {
                console.warn(`  ⚠ Skipping rfq_response id=${row.id}: No vendor available`);
                this.ctx.stats.rfqResponses.skipped++;
                return;
            }

            // ✅ Preserve original ID
            await this.ctx.pgDb.insert(rfqResponses).values({
                id: row.id,
                rfqId: row.rfq_id,
                vendorId: this.ctx.defaultVendorId,
                receiptDatetime: Parsers.date(row.receipt_datetime) ?? new Date(),
                gstPercentage: Parsers.decimal(row.gst_percentage),
                gstType: row.gst_type ?? null,
                deliveryTime: row.delivery_time ?? null,
                freightType: row.freight_type ?? null,
                notes: null,
                createdAt: Parsers.date(row.created_at) ?? new Date(),
                updatedAt: Parsers.date(row.updated_at) ?? new Date(),
            });

            this.ctx.rfqResponseIds.add(row.id);

            // Migrate response documents
            await this.migrateResponseDocuments(row);

            this.ctx.stats.rfqResponses.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating rfq_response id=${row.id}:`, err);
            this.ctx.stats.rfqResponses.errors++;
        }
    }

    private async migrateResponseDocuments(row: typeof mysqlRfqResponses.$inferSelect): Promise<void> {
        const docs = [
            { type: 'quotation', path: row.quotation_document },
            { type: 'maf', path: row.maf_document },
            { type: 'mii', path: row.mii_document },
        ];

        for (const doc of docs) {
            const path = Parsers.string(doc.path, 255);
            if (path) {
                try {
                    // Auto-generate ID
                    await this.ctx.pgDb.insert(rfqResponseDocuments).values({
                        rfqResponseId: row.id,
                        docType: doc.type,
                        path: path,
                        metadata: { source: 'rfq_responses', originalField: doc.type },
                        createdAt: Parsers.date(row.created_at) ?? new Date(),
                    });
                    this.ctx.stats.rfqResponseDocuments.success++;
                } catch (err) {
                    this.ctx.stats.rfqResponseDocuments.errors++;
                }
            }
        }

        // Handle technical_documents (multiple paths)
        const techPaths = Parsers.parseDocumentPaths(row.technical_documents);
        for (const techPath of techPaths) {
            const path = Parsers.string(techPath, 255);
            if (path) {
                try {
                    await this.ctx.pgDb.insert(rfqResponseDocuments).values({
                        rfqResponseId: row.id,
                        docType: 'technical',
                        path: path,
                        metadata: { source: 'rfq_responses_technical_documents' },
                        createdAt: Parsers.date(row.created_at) ?? new Date(),
                    });
                    this.ctx.stats.rfqResponseDocuments.success++;
                } catch (err) {
                    this.ctx.stats.rfqResponseDocuments.errors++;
                }
            }
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.rfqResponses;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

class RfqResponseItemsMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating quotation_receipt_items → rfq_response_items...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlQuotationReceiptItems);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlQuotationReceiptItems.$inferSelect): Promise<void> {
        try {
            // quotation_receipt_id = rfq_responses.id
            if (!this.ctx.rfqResponseIds.has(row.quotation_receipt_id)) {
                console.warn(`  ⚠ Skipping item id=${row.id}: rfq_response ${row.quotation_receipt_id} not found`);
                this.ctx.stats.rfqResponseItems.skipped++;
                return;
            }

            // ✅ Preserve original ID
            await this.ctx.pgDb.insert(rfqResponseItems).values({
                id: row.id,
                rfqResponseId: row.quotation_receipt_id,
                rfqItemId: row.item_id,
                requirement: row.description ?? 'Not specified',
                unit: Parsers.string(row.unit, 64),
                qty: Parsers.decimal(row.quantity),
                unitPrice: Parsers.decimal(row.unit_price),
                totalPrice: Parsers.decimal(row.amount),
                createdAt: Parsers.date(row.created_at) ?? new Date(),
            });

            this.ctx.stats.rfqResponseItems.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating item id=${row.id}:`, err);
            this.ctx.stats.rfqResponseItems.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.rfqResponseItems;
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

        const sequences = [
            'rfqs',
            'rfq_items',
            'rfq_documents',
            'rfq_responses',
            'rfq_response_items',
            'rfq_response_documents',
        ];

        for (const table of sequences) {
            try {
                await this.ctx.pgClient.query(`
                    SELECT setval(
                        pg_get_serial_sequence('${table}', 'id'),
                        COALESCE((SELECT MAX(id) FROM ${table}), 1),
                        true
                    )
                `);
                console.log(`  ✓ ${table} sequence reset`);
            } catch (err) {
                console.error(`  ✗ Error resetting ${table} sequence:`, err);
            }
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
            await this.initializeContext();
            await this.executeMigration();
            this.printSummary();
        } finally {
            await this.disconnect();
        }
    }

    private printHeader(): void {
        console.log('\n' + '═'.repeat(60));
        console.log('  RFQ MIGRATION: MySQL → PostgreSQL');
        console.log('  (Preserving Original IDs)');
        console.log('═'.repeat(60));
    }

    private async connect(): Promise<void> {
        console.log('\n📡 Connecting to databases...');
        await this.pgClient.connect();
        console.log('  ✓ PostgreSQL connected');
        console.log('  ✓ MySQL pool ready');
    }

    private async initializeContext(): Promise<void> {
        // Load default vendor ID
        const vendorResult = await this.pgClient.query(
            'SELECT id FROM vendors ORDER BY id LIMIT 1'
        );
        const defaultVendorId = vendorResult.rows.length > 0 ? vendorResult.rows[0].id : null;

        if (defaultVendorId) {
            console.log(`  ✓ Default vendor ID: ${defaultVendorId}`);
        } else {
            console.warn('  ⚠ No vendors found - rfq_responses will be skipped');
        }

        this.ctx = {
            pgDb: pgDrizzle(this.pgClient as any),
            pgClient: this.pgClient,
            mysqlDb: mysqlDrizzle(this.mysqlPool as any),
            rfqIds: new Set(),
            rfqResponseIds: new Set(),
            defaultVendorId,
            stats: {
                rfqs: { success: 0, errors: 0, skipped: 0 },
                rfqItems: { success: 0, errors: 0, skipped: 0 },
                rfqDocuments: { success: 0, errors: 0, skipped: 0 },
                rfqResponses: { success: 0, errors: 0, skipped: 0 },
                rfqResponseItems: { success: 0, errors: 0, skipped: 0 },
                rfqResponseDocuments: { success: 0, errors: 0, skipped: 0 },
            },
        };
    }

    private async executeMigration(): Promise<void> {
        const steps = [
            { name: 'Migrate rfqs', fn: () => new RfqsMigrator(this.ctx).migrate() },
            { name: 'Migrate rfq_items', fn: () => new RfqItemsMigrator(this.ctx).migrate() },
            { name: 'Migrate rfq_documents', fn: () => new RfqDocumentsMigrator(this.ctx).migrateAll() },
            { name: 'Migrate rfq_responses', fn: () => new RfqResponsesMigrator(this.ctx).migrate() },
            { name: 'Migrate rfq_response_items', fn: () => new RfqResponseItemsMigrator(this.ctx).migrate() },
            { name: 'Reset sequences', fn: () => new SequenceResetter(this.ctx).reset() },
        ];

        console.log('\n📋 Starting migration...\n');

        for (let i = 0; i < steps.length; i++) {
            console.log(`[${i + 1}/${steps.length}] ${steps[i].name}`);
            await steps[i].fn();
            console.log('');
        }
    }

    private printSummary(): void {
        const { stats, rfqIds, rfqResponseIds } = this.ctx;

        console.log('═'.repeat(60));
        console.log('  MIGRATION SUMMARY');
        console.log('═'.repeat(60));
        console.log('');
        console.log('  Table                    Success   Errors   Skipped');
        console.log('  ───────────────────────────────────────────────────────');
        console.log(`  rfqs                     ${this.pad(stats.rfqs.success)}      ${this.pad(stats.rfqs.errors)}       ${stats.rfqs.skipped}`);
        console.log(`  rfq_items                ${this.pad(stats.rfqItems.success)}      ${this.pad(stats.rfqItems.errors)}       ${stats.rfqItems.skipped}`);
        console.log(`  rfq_documents            ${this.pad(stats.rfqDocuments.success)}      ${this.pad(stats.rfqDocuments.errors)}       ${stats.rfqDocuments.skipped}`);
        console.log(`  rfq_responses            ${this.pad(stats.rfqResponses.success)}      ${this.pad(stats.rfqResponses.errors)}       ${stats.rfqResponses.skipped}`);
        console.log(`  rfq_response_items       ${this.pad(stats.rfqResponseItems.success)}      ${this.pad(stats.rfqResponseItems.errors)}       ${stats.rfqResponseItems.skipped}`);
        console.log(`  rfq_response_documents   ${this.pad(stats.rfqResponseDocuments.success)}      ${this.pad(stats.rfqResponseDocuments.errors)}       ${stats.rfqResponseDocuments.skipped}`);
        console.log('  ───────────────────────────────────────────────────────');
        console.log(`  RFQ IDs tracked:         ${rfqIds.size}`);
        console.log(`  Response IDs tracked:    ${rfqResponseIds.size}`);
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
