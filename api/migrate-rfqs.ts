import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import { mysqlTable, varchar, bigint, text, timestamp, int, decimal } from 'drizzle-orm/mysql-core';
import { Client } from 'pg';
import { eq } from 'drizzle-orm';
import {
    rfqs,
    rfqItems,
    rfqDocuments,
    rfqResponses,
    rfqResponseItems,
    rfqResponseDocuments,
} from './src/db/rfqs.schema';

const PG_URL = 'postgresql://postgres:gyan@localhost:5432/new_tms';
const MYSQL_URL = 'mysql://root:gyan@localhost:3306/mydb';

const pgClient = new Client({ connectionString: PG_URL });
const mysqlPool = mysql2.createPool(MYSQL_URL);

let db: ReturnType<typeof pgDrizzle>;
let mysqlDb: ReturnType<typeof mysqlDrizzle>;

// Old rfqs table (MySQL)
const mysql_rfqs = mysqlTable('rfqs', {
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

// Old rfq_technicals table (MySQL)
const mysql_rfq_technicals = mysqlTable('rfq_technicals', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    rfq_id: bigint('rfq_id', { mode: 'number' }).notNull(),
    tender_id: bigint('tender_id', { mode: 'number' }),
    name: varchar('name', { length: 255 }),
    file_path: varchar('file_path', { length: 255 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// Old rfq_scopes table (MySQL)
const mysql_rfq_scopes = mysqlTable('rfq_scopes', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    rfq_id: bigint('rfq_id', { mode: 'number' }).notNull(),
    tender_id: bigint('tender_id', { mode: 'number' }),
    name: varchar('name', { length: 255 }),
    file_path: varchar('file_path', { length: 255 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// Old rfq_miis table (MySQL)
const mysql_rfq_miis = mysqlTable('rfq_miis', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    rfq_id: bigint('rfq_id', { mode: 'number' }).notNull(),
    tender_id: bigint('tender_id', { mode: 'number' }),
    name: varchar('name', { length: 255 }),
    file_path: varchar('file_path', { length: 255 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// Old rfq_mafs table (MySQL)
const mysql_rfq_mafs = mysqlTable('rfq_mafs', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    rfq_id: bigint('rfq_id', { mode: 'number' }).notNull(),
    tender_id: bigint('tender_id', { mode: 'number' }),
    name: varchar('name', { length: 255 }),
    file_path: varchar('file_path', { length: 255 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// Old rfq_boqs table (MySQL)
const mysql_rfq_boqs = mysqlTable('rfq_boqs', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    rfq_id: bigint('rfq_id', { mode: 'number' }).notNull(),
    tender_id: bigint('tender_id', { mode: 'number' }),
    name: varchar('name', { length: 255 }),
    file_path: varchar('file_path', { length: 255 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// Old rfq_items table (MySQL)
const mysql_rfq_items = mysqlTable('rfq_items', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    rfq_id: int('rfq_id').notNull(),
    tender_id: int('tender_id'),
    requirement: text('requirement'),
    unit: varchar('unit', { length: 255 }),
    qty: int('qty'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// Old rfq_responses table (MySQL)
const mysql_rfq_responses = mysqlTable('rfq_responses', {
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

// Map old rfqs.id -> new rfqs.id
const rfqIdMap = new Map<number, number>();

// Map old rfq_responses.id -> new rfqResponses.id
const rfqResponseIdMap = new Map<number, number>();

// Map old tender_id (string) -> new tender_id (number)
// This should be populated from tender migration or loaded from DB
const tenderIdMap = new Map<string, number>();

// Default vendor ID for rfq_responses (loaded from DB)
let defaultVendorId: number | null = null;

const parseDecimal = (val: string | number | null | undefined): string | null => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '').trim());
    return isNaN(num) ? null : num.toFixed(2);
};

const parseInteger = (val: string | number | null | undefined): number | null => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'number' ? val : parseInt(String(val).trim(), 10);
    return isNaN(num) ? null : num;
};

const parseDate = (val: string | Date | null | undefined): Date | null => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

const parseDateFromString = (val: string | null | undefined): Date | null => {
    if (!val || val.trim() === '') return null;

    // Try various date formats
    const formats = [
        val, // as-is
        val.replace(/(\d{2})-(\d{2})-(\d{4})/, '$3-$2-$1'), // DD-MM-YYYY to YYYY-MM-DD
        val.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'), // DD/MM/YYYY to YYYY-MM-DD
    ];

    for (const format of formats) {
        const d = new Date(format);
        if (!isNaN(d.getTime())) return d;
    }

    return null;
};

const safeString = (val: string | null | undefined, maxLength?: number): string | null => {
    if (val === null || val === undefined) return null;
    const str = String(val).trim();
    if (str === '') return null;
    return maxLength ? str.substring(0, maxLength) : str;
};

async function loadTenderIdMappings() {
    console.log('Loading tender ID mappings...');

    // Query PostgreSQL for existing tenders to build the mapping
    // This assumes tenders have already been migrated
    const result = await pgClient.query(`
        SELECT id, tender_no FROM tender_infos
    `);

    for (const row of result.rows) {
        // Map by tender_no (string) -> id (number)
        tenderIdMap.set(String(row.tender_no), row.id);
        // Also map by old id if it's numeric
        tenderIdMap.set(String(row.id), row.id);
    }

    console.log(`Loaded ${tenderIdMap.size} tender mappings`);
}

async function loadDefaultVendorId() {
    console.log('Loading default vendor ID...');

    // Query PostgreSQL for first available vendor
    const result = await pgClient.query(`
        SELECT id FROM vendors ORDER BY id LIMIT 1
    `);

    if (result.rows.length > 0) {
        defaultVendorId = result.rows[0].id;
        console.log(`Loaded default vendor ID: ${defaultVendorId}`);
    } else {
        console.warn('No vendors found in database. RFQ responses will be skipped.');
        defaultVendorId = null;
    }
}

async function migrateRfqs() {
    console.log('Migrating rfqs...');
    const rows = await mysqlDb.select().from(mysql_rfqs);
    let count = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const r of rows) {
        try {
            // Parse tender_id - could be string ID or tender number
            const tenderIdStr = String(r.tender_id).trim();
            let tenderId = tenderIdMap.get(tenderIdStr);

            // If not found in map, try parsing as integer
            if (!tenderId) {
                tenderId = parseInteger(tenderIdStr) ?? undefined;
            }

            // Skip RFQ if tenderId cannot be resolved (prevents FK constraint violation)
            if (!tenderId) {
                console.warn(`Skipping RFQ id=${r.id}: No tender found for tender_id="${r.tender_id}"`);
                skippedCount++;
                continue;
            }

            // Parse due_date from string
            const dueDate = parseDateFromString(r.due_date);

            // Build requested vendor from organization/team
            const requestedVendor = safeString(r.organisation, 255);

            const [newRecord] = await db.insert(rfqs).values({
                tenderId: tenderId,
                dueDate: dueDate,
                docList: r.docs_list ?? null,
                requestedVendor: requestedVendor,
                createdAt: parseDate(r.created_at) ?? new Date(),
                updatedAt: parseDate(r.updated_at) ?? new Date(),
            }).returning({ id: rfqs.id });

            rfqIdMap.set(r.id, newRecord.id);

            // Migrate inline item if exists (from old rfqs table)
            if (r.requirements || r.qty || r.unit) {
                await db.insert(rfqItems).values({
                    rfqId: newRecord.id,
                    requirement: r.requirements ?? 'Not specified',
                    unit: safeString(r.unit, 64),
                    qty: parseDecimal(r.qty),
                    createdAt: parseDate(r.created_at) ?? new Date(),
                    updatedAt: parseDate(r.updated_at) ?? new Date(),
                });
            }

            // Migrate inline document references from rfqs table
            // These were stored as file paths in the old table
            const inlineDocuments = [
                { type: 'technical', path: r.techical },
                { type: 'boq', path: r.boq },
                { type: 'scope', path: r.scope },
                { type: 'maf', path: r.maf },
                { type: 'mii', path: r.mii },
            ];

            for (const doc of inlineDocuments) {
                if (doc.path && doc.path.trim() !== '') {
                    await db.insert(rfqDocuments).values({
                        rfqId: newRecord.id,
                        docType: doc.type,
                        path: doc.path,
                        metadata: JSON.stringify({
                            source: 'rfqs_table_inline',
                            originalField: doc.type,
                        }),
                        createdAt: parseDate(r.created_at) ?? new Date(),
                    });
                }
            }

            count++;
        } catch (err) {
            console.error(`Error migrating RFQ id=${r.id}, tender_id="${r.tender_id}":`, err);
            errorCount++;
        }
    }

    console.log(`Migrated ${count} rfqs (${errorCount} errors, ${skippedCount} skipped)`);
}

async function migrateRfqItems() {
    console.log('Migrating rfq_items...');
    const rows = await mysqlDb.select().from(mysql_rfq_items);
    let count = 0;
    let errorCount = 0;

    for (const r of rows) {
        try {
            const newRfqId = rfqIdMap.get(r.rfq_id);

            if (!newRfqId) {
                console.warn(`Skipping rfq_item id=${r.id}: No RFQ found for rfq_id=${r.rfq_id}`);
                continue;
            }

            await db.insert(rfqItems).values({
                rfqId: newRfqId,
                requirement: r.requirement ?? 'Not specified',
                unit: safeString(r.unit, 64),
                qty: parseDecimal(r.qty),
                createdAt: parseDate(r.created_at) ?? new Date(),
                updatedAt: parseDate(r.updated_at) ?? new Date(),
            });

            count++;
        } catch (err) {
            console.error(`Error migrating rfq_item id=${r.id}, rfq_id=${r.rfq_id}:`, err);
            errorCount++;
        }
    }

    console.log(`Migrated ${count} rfq_items (${errorCount} errors)`);
}

// ============================================
// Migration: Document tables -> rfqDocuments (PostgreSQL)
// ============================================

async function migrateRfqTechnicals() {
    console.log('Migrating rfq_technicals...');
    const rows = await mysqlDb.select().from(mysql_rfq_technicals);
    let count = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const r of rows) {
        const newRfqId = rfqIdMap.get(r.rfq_id);
        if (!newRfqId) {
            console.warn(`Skipping rfq_technical id=${r.id}: No RFQ found for rfq_id=${r.rfq_id}`);
            skippedCount++;
            continue;
        }
        if (!r.file_path || r.file_path.trim() === '') {
            console.warn(`Skipping rfq_technical id=${r.id}: Empty file_path`);
            skippedCount++;
            continue;
        }

        try {
            await db.insert(rfqDocuments).values({
                rfqId: newRfqId,
                docType: 'technical',
                path: r.file_path,
                metadata: JSON.stringify({
                    name: r.name,
                    source: 'rfq_technicals',
                    originalId: r.id,
                    tenderId: r.tender_id,
                }),
                createdAt: parseDate(r.created_at) ?? new Date(),
            });
            count++;
        } catch (err) {
            console.error(`Error migrating rfq_technical id=${r.id}, rfq_id=${r.rfq_id}:`, err);
            errorCount++;
        }
    }

    console.log(`Migrated ${count} rfq_technicals (${errorCount} errors, ${skippedCount} skipped)`);
}

async function migrateRfqScopes() {
    console.log('Migrating rfq_scopes...');
    const rows = await mysqlDb.select().from(mysql_rfq_scopes);
    let count = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const r of rows) {
        const newRfqId = rfqIdMap.get(r.rfq_id);
        if (!newRfqId) {
            console.warn(`Skipping rfq_scope id=${r.id}: No RFQ found for rfq_id=${r.rfq_id}`);
            skippedCount++;
            continue;
        }
        if (!r.file_path || r.file_path.trim() === '') {
            console.warn(`Skipping rfq_scope id=${r.id}: Empty file_path`);
            skippedCount++;
            continue;
        }

        try {
            await db.insert(rfqDocuments).values({
                rfqId: newRfqId,
                docType: 'scope',
                path: r.file_path,
                metadata: JSON.stringify({
                    name: r.name,
                    source: 'rfq_scopes',
                    originalId: r.id,
                    tenderId: r.tender_id,
                }),
                createdAt: parseDate(r.created_at) ?? new Date(),
            });
            count++;
        } catch (err) {
            console.error(`Error migrating rfq_scope id=${r.id}, rfq_id=${r.rfq_id}:`, err);
            errorCount++;
        }
    }

    console.log(`Migrated ${count} rfq_scopes (${errorCount} errors, ${skippedCount} skipped)`);
}

async function migrateRfqMiis() {
    console.log('Migrating rfq_miis...');
    const rows = await mysqlDb.select().from(mysql_rfq_miis);
    let count = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const r of rows) {
        const newRfqId = rfqIdMap.get(r.rfq_id);
        if (!newRfqId) {
            console.warn(`Skipping rfq_mii id=${r.id}: No RFQ found for rfq_id=${r.rfq_id}`);
            skippedCount++;
            continue;
        }
        if (!r.file_path || r.file_path.trim() === '') {
            console.warn(`Skipping rfq_mii id=${r.id}: Empty file_path`);
            skippedCount++;
            continue;
        }

        try {
            await db.insert(rfqDocuments).values({
                rfqId: newRfqId,
                docType: 'mii',
                path: r.file_path,
                metadata: JSON.stringify({
                    name: r.name,
                    source: 'rfq_miis',
                    originalId: r.id,
                    tenderId: r.tender_id,
                }),
                createdAt: parseDate(r.created_at) ?? new Date(),
            });
            count++;
        } catch (err) {
            console.error(`Error migrating rfq_mii id=${r.id}, rfq_id=${r.rfq_id}:`, err);
            errorCount++;
        }
    }

    console.log(`Migrated ${count} rfq_miis (${errorCount} errors, ${skippedCount} skipped)`);
}

async function migrateRfqMafs() {
    console.log('Migrating rfq_mafs...');
    const rows = await mysqlDb.select().from(mysql_rfq_mafs);
    let count = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const r of rows) {
        const newRfqId = rfqIdMap.get(r.rfq_id);
        if (!newRfqId) {
            console.warn(`Skipping rfq_maf id=${r.id}: No RFQ found for rfq_id=${r.rfq_id}`);
            skippedCount++;
            continue;
        }
        if (!r.file_path || r.file_path.trim() === '') {
            console.warn(`Skipping rfq_maf id=${r.id}: Empty file_path`);
            skippedCount++;
            continue;
        }

        try {
            await db.insert(rfqDocuments).values({
                rfqId: newRfqId,
                docType: 'maf',
                path: r.file_path,
                metadata: JSON.stringify({
                    name: r.name,
                    source: 'rfq_mafs',
                    originalId: r.id,
                    tenderId: r.tender_id,
                }),
                createdAt: parseDate(r.created_at) ?? new Date(),
            });
            count++;
        } catch (err) {
            console.error(`Error migrating rfq_maf id=${r.id}, rfq_id=${r.rfq_id}:`, err);
            errorCount++;
        }
    }

    console.log(`Migrated ${count} rfq_mafs (${errorCount} errors, ${skippedCount} skipped)`);
}

async function migrateRfqBoqs() {
    console.log('Migrating rfq_boqs...');
    const rows = await mysqlDb.select().from(mysql_rfq_boqs);
    let count = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const r of rows) {
        const newRfqId = rfqIdMap.get(r.rfq_id);
        if (!newRfqId) {
            console.warn(`Skipping rfq_boq id=${r.id}: No RFQ found for rfq_id=${r.rfq_id}`);
            skippedCount++;
            continue;
        }
        if (!r.file_path || r.file_path.trim() === '') {
            console.warn(`Skipping rfq_boq id=${r.id}: Empty file_path`);
            skippedCount++;
            continue;
        }

        try {
            await db.insert(rfqDocuments).values({
                rfqId: newRfqId,
                docType: 'boq',
                path: r.file_path,
                metadata: JSON.stringify({
                    name: r.name,
                    source: 'rfq_boqs',
                    originalId: r.id,
                    tenderId: r.tender_id,
                }),
                createdAt: parseDate(r.created_at) ?? new Date(),
            });
            count++;
        } catch (err) {
            console.error(`Error migrating rfq_boq id=${r.id}, rfq_id=${r.rfq_id}:`, err);
            errorCount++;
        }
    }

    console.log(`Migrated ${count} rfq_boqs (${errorCount} errors, ${skippedCount} skipped)`);
}

// ============================================
// Migration: rfq_responses (MySQL) -> rfqResponses + rfqResponseDocuments (PostgreSQL)
// ============================================

async function migrateRfqResponses() {
    console.log('Migrating rfq_responses...');
    const rows = await mysqlDb.select().from(mysql_rfq_responses);
    let count = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const r of rows) {
        try {
            const newRfqId = rfqIdMap.get(r.rfq_id);

            if (!newRfqId) {
                console.warn(`Skipping rfq_response id=${r.id}: No RFQ found for rfq_id=${r.rfq_id}`);
                skippedCount++;
                continue;
            }

            // Use default vendor ID loaded from database
            if (!defaultVendorId) {
                console.warn(`Skipping rfq_response id=${r.id}: No vendor available in database`);
                skippedCount++;
                continue;
            }

            const [newRecord] = await db.insert(rfqResponses).values({
                rfqId: newRfqId,
                vendorId: defaultVendorId,
                receiptDatetime: parseDate(r.receipt_datetime) ?? new Date(),
                gstPercentage: parseDecimal(r.gst_percentage),
                gstType: r.gst_type ?? null,
                deliveryTime: r.delivery_time ?? null,
                freightType: r.freight_type ?? null,
                notes: null,
                createdAt: parseDate(r.created_at) ?? new Date(),
                updatedAt: parseDate(r.updated_at) ?? new Date(),
            }).returning({ id: rfqResponses.id });

            rfqResponseIdMap.set(r.id, newRecord.id);

            // Migrate response documents
            const responseDocuments = [
                { type: 'quotation', path: r.quotation_document },
                { type: 'maf', path: r.maf_document },
                { type: 'mii', path: r.mii_document },
            ];

            for (const doc of responseDocuments) {
                if (doc.path && doc.path.trim() !== '') {
                    // Truncate path to 255 characters for varchar constraint
                    const truncatedPath = safeString(doc.path, 255);
                    if (truncatedPath && truncatedPath.length < doc.path.length) {
                        console.warn(`Truncating path for rfq_response id=${r.id}, docType=${doc.type}: ${doc.path.length} -> ${truncatedPath.length} chars`);
                    }

                    if (truncatedPath) {
                        await db.insert(rfqResponseDocuments).values({
                            rfqResponseId: newRecord.id,
                            docType: doc.type,
                            path: truncatedPath,
                            metadata: JSON.stringify({
                                source: 'rfq_responses',
                                originalField: doc.type,
                            }),
                            createdAt: parseDate(r.created_at) ?? new Date(),
                        });
                    }
                }
            }

            // Handle technical_documents (text field, might contain multiple paths)
            if (r.technical_documents && r.technical_documents.trim() !== '') {
                // Could be comma-separated, JSON array, or newline-separated
                let techDocs: string[] = [];

                try {
                    const parsed = JSON.parse(r.technical_documents);
                    // Handle both array and single value
                    if (Array.isArray(parsed)) {
                        techDocs = parsed.filter(s => s && typeof s === 'string');
                    } else if (typeof parsed === 'string') {
                        techDocs = [parsed];
                    }
                } catch {
                    // Try comma-separated
                    techDocs = r.technical_documents.split(',').map(s => s.trim()).filter(s => s);
                    // If no commas, try newline-separated
                    if (techDocs.length === 1 && techDocs[0] === r.technical_documents.trim()) {
                        techDocs = r.technical_documents.split('\n').map(s => s.trim()).filter(s => s);
                    }
                }

                // Filter out empty values
                techDocs = techDocs.filter(docPath => docPath && docPath.trim() !== '');

                for (const docPath of techDocs) {
                    // Truncate path to 255 characters for varchar constraint
                    const truncatedPath = safeString(docPath, 255);
                    if (truncatedPath && truncatedPath.length < docPath.length) {
                        console.warn(`Truncating technical_document path for rfq_response id=${r.id}: ${docPath.length} -> ${truncatedPath.length} chars`);
                    }

                    if (truncatedPath) {
                        await db.insert(rfqResponseDocuments).values({
                            rfqResponseId: newRecord.id,
                            docType: 'technical',
                            path: truncatedPath,
                            metadata: JSON.stringify({
                                source: 'rfq_responses_technical_documents',
                            }),
                            createdAt: parseDate(r.created_at) ?? new Date(),
                        });
                    }
                }
            }

            count++;
        } catch (err) {
            console.error(`Error migrating rfq_response id=${r.id}, rfq_id=${r.rfq_id}:`, err);
            errorCount++;
        }
    }

    console.log(`Migrated ${count} rfq_responses (${errorCount} errors, ${skippedCount} skipped)`);
}

// ============================================
// Main Migration Function
// ============================================

async function runMigration() {
    try {
        console.log('='.repeat(60));
        console.log('Starting RFQ Migration: MySQL → PostgreSQL');
        console.log('='.repeat(60));

        console.log('\nConnecting to databases...');
        await pgClient.connect();
        db = pgDrizzle(pgClient as any);
        mysqlDb = mysqlDrizzle(mysqlPool as any);
        console.log('Connected successfully!\n');

        // Step 0: Load tender ID mappings
        console.log('Step 0/10: Loading tender ID mappings...');
        await loadTenderIdMappings();

        // Step 0.5: Load default vendor ID
        console.log('\nStep 0.5/10: Loading default vendor ID...');
        await loadDefaultVendorId();

        // Step 1: Migrate rfqs (main table)
        console.log('\nStep 1/10: Migrating rfqs...');
        await migrateRfqs();

        // Step 2: Migrate rfq_items
        console.log('\nStep 2/10: Migrating rfq_items...');
        await migrateRfqItems();

        // Step 3-7: Migrate document tables
        console.log('\nStep 3/10: Migrating rfq_technicals...');
        await migrateRfqTechnicals();

        console.log('\nStep 4/10: Migrating rfq_scopes...');
        await migrateRfqScopes();

        console.log('\nStep 5/10: Migrating rfq_miis...');
        await migrateRfqMiis();

        console.log('\nStep 6/10: Migrating rfq_mafs...');
        await migrateRfqMafs();

        console.log('\nStep 7/10: Migrating rfq_boqs...');
        await migrateRfqBoqs();

        // Step 8: Migrate rfq_responses
        console.log('\nStep 8/10: Migrating rfq_responses...');
        await migrateRfqResponses();

        // Step 9: Print summary
        console.log('\nStep 9/10: Generating Summary...');

        console.log('\n' + '='.repeat(60));
        console.log('MIGRATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total rfqs migrated: ${rfqIdMap.size}`);
        console.log(`Total rfq_responses migrated: ${rfqResponseIdMap.size}`);
        console.log('='.repeat(60));
        console.log('Migration completed successfully!');
        console.log('='.repeat(60));

    } catch (err) {
        console.error('\nMigration failed:', err);
        throw err;
    } finally {
        console.log('\nClosing database connections...');
        await pgClient.end();
        await mysqlPool.end();
        console.log('Connections closed.');
    }
}

// Run migration
runMigration()
    .then(() => {
        console.log('\nExiting with success code 0');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\nExiting with error code 1');
        console.error(err);
        process.exit(1);
    });



/*
// MySQL
CREATE TABLE rfqs (
id bigint unsigned NOT NULL AUTO_INCREMENT,
tender_id varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
team_name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
organisation varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
location varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
item_name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
techical varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
boq varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
scope varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
maf varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
docs_list text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
mii varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
requirements varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
qty varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
unit varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
due_date varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
PRIMARY KEY (id)
)
CREATE TABLE rfq_technicals (
id bigint unsigned NOT NULL AUTO_INCREMENT,
rfq_id bigint NOT NULL,
tender_id bigint DEFAULT NULL,
name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
file_path varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
PRIMARY KEY (id)
)
CREATE TABLE rfq_scopes (
id bigint unsigned NOT NULL AUTO_INCREMENT,
rfq_id bigint NOT NULL,
tender_id bigint DEFAULT NULL,
name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
file_path varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
PRIMARY KEY (id)
)
CREATE TABLE rfq_miis (
id bigint unsigned NOT NULL AUTO_INCREMENT,
rfq_id bigint NOT NULL,
tender_id bigint DEFAULT NULL,
name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
file_path varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
PRIMARY KEY (id)
)
CREATE TABLE rfq_mafs (
id bigint unsigned NOT NULL AUTO_INCREMENT,
rfq_id bigint NOT NULL,
tender_id bigint DEFAULT NULL,
name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
file_path varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
PRIMARY KEY (id)
)
CREATE TABLE rfq_items (
id bigint unsigned NOT NULL AUTO_INCREMENT,
rfq_id int NOT NULL,
tender_id int DEFAULT NULL,
requirement text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
unit varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
qty int DEFAULT NULL,
created_at timestamp NULL DEFAULT NULL,
updated_at timestamp NULL DEFAULT NULL,
PRIMARY KEY (id)
)
CREATE TABLE rfq_items (
id bigint unsigned NOT NULL AUTO_INCREMENT,
rfq_id int NOT NULL,
tender_id int DEFAULT NULL,
requirement text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
unit varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
qty int DEFAULT NULL,
created_at timestamp NULL DEFAULT NULL,
updated_at timestamp NULL DEFAULT NULL,
PRIMARY KEY (id)
)
CREATE TABLE rfq_boqs (
id bigint unsigned NOT NULL AUTO_INCREMENT,
rfq_id bigint NOT NULL,
tender_id bigint DEFAULT NULL,
name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
file_path varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
PRIMARY KEY (id)
)
CREATE TABLE rfq_responses (
id bigint unsigned NOT NULL AUTO_INCREMENT,
rfq_id bigint unsigned NOT NULL,
receipt_datetime datetime NOT NULL,
gst_percentage decimal(5,2) NOT NULL,
gst_type enum('inclusive','extra') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
delivery_time int NOT NULL,
freight_type enum('inclusive','extra') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
quotation_document varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
technical_documents text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
maf_document varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
mii_document varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
created_at timestamp NULL DEFAULT NULL,
updated_at timestamp NULL DEFAULT NULL,
PRIMARY KEY (id)
)
*/
