import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import {
    mysqlTable,
    varchar,
    bigint as mysqlBigint,
    text,
    timestamp as mysqlTimestamp,
    int,
    time,
} from 'drizzle-orm/mysql-core';
import { Client } from 'pg';

import {
    tenderDocumentChecklists,
    bidSubmissions,
    tenderCostingSheets,
    tenderQueries,
    tenderQueryItems,
    type BidDocuments,
} from '@db/schemas/tendering';
import { sql } from 'drizzle-orm';

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

const mysqlTenderDocumentChecklists = mysqlTable('document_checklists', {
    id: mysqlBigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    tender_id: mysqlBigint('tender_id', { mode: 'number' }).notNull(),
    document_name: varchar('document_name', { length: 255 }),
    document_path: varchar('document_path', { length: 255 }),
    created_at: mysqlTimestamp('created_at'),
    updated_at: mysqlTimestamp('updated_at'),
});

const mysqlBidSubmissions = mysqlTable('bid_submissions', {
    id: mysqlBigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    tender_id: mysqlBigint('tender_id', { mode: 'number' }).notNull(),
    bid_submissions_date: mysqlTimestamp('bid_submissions_date'),
    submitted_bid_documents: text('submitted_bid_documents'),
    proof_of_submission: varchar('proof_of_submission', { length: 255 }),
    final_bidding_price: text('final_bidding_price'),
    status: varchar('status', { length: 50 }),
    reason_for_missing: text('reason_for_missing'),
    not_repeat_reason: text('not_repeat_reason'),
    tms_improvements: text('tms_improvements'),
    created_at: mysqlTimestamp('created_at'),
    updated_at: mysqlTimestamp('updated_at'),
});

const mysqlGoogleApiKeys = mysqlTable('tbl_googleapikeys', {
    id: mysqlBigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    staffid: varchar('staffid', { length: 255 }),
    tenderid: varchar('tenderid', { length: 255 }),
    driveid: varchar('driveid', { length: 255 }),
    title: varchar('title', { length: 255 }),
    description: varchar('description', { length: 255 }),
    type: varchar('type', { length: 255 }),
    final_price: varchar('final_price', { length: 255 }),
    budget: varchar('budget', { length: 255 }),
    oem: varchar('oem', { length: 255 }),
    receipt: varchar('receipt', { length: 255 }),
    gross_margin: varchar('gross_margin', { length: 255 }),
    remarks: varchar('remarks', { length: 255 }),
    created_at: mysqlTimestamp('created_at'),
    updated_at: mysqlTimestamp('updated_at'),
});

const mysqlTenderInfos = mysqlTable('tender_infos', {
    id: int('id').primaryKey().autoincrement(),
    costing_status: varchar('costing_status', { length: 50 }),
    costing_remarks: varchar('costing_remarks', { length: 500 }),
});

const mysqlTqReceiveds = mysqlTable('tq_receiveds', {
    id: mysqlBigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    tender_id: mysqlBigint('tender_id', { mode: 'number' }),
    tq_type: text('tq_type'),
    description: text('description'),
    tq_submission_date: varchar('tq_submission_date', { length: 255 }),
    tq_submission_time: time('tq_submission_time'),
    tq_document: varchar('tq_document', { length: 255 }),
    status: varchar('status', { length: 10 }),
    ip: varchar('ip', { length: 255 }),
    strtotime: varchar('strtotime', { length: 255 }),
    created_at: mysqlTimestamp('created_at'),
    updated_at: mysqlTimestamp('updated_at'),
});

const mysqlTqReplieds = mysqlTable('tq_replieds', {
    id: mysqlBigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    tender_id: mysqlBigint('tender_id', { mode: 'number' }),
    tq_submission_date: varchar('tq_submission_date', { length: 255 }),
    tq_submission_time: time('tq_submission_time'),
    tq_document: varchar('tq_document', { length: 255 }),
    proof_submission: varchar('proof_submission', { length: 255 }),
    status: varchar('status', { length: 10 }),
    ip: varchar('ip', { length: 255 }),
    strtotime: varchar('strtotime', { length: 255 }),
    created_at: mysqlTimestamp('created_at'),
    updated_at: mysqlTimestamp('updated_at'),
});

// ============================================================================
// TYPES
// ============================================================================

interface MigrationStats {
    documentChecklists: { success: number; errors: number; skipped: number };
    bidSubmissions: { success: number; errors: number; skipped: number };
    costingSheets: { success: number; errors: number; skipped: number };
    tenderQueries: { success: number; errors: number; skipped: number };
    tenderQueryItems: { success: number; errors: number };
    tqRepliesMatched: { success: number; errors: number; unmatched: number };
}

interface TenderInfoCache {
    costingStatus: string | null;
    costingRemarks: string | null;
}

interface TqReceivedRecord {
    id: number;
    tenderId: number;
    createdAt: Date;
    isReplied: boolean;
}

interface MigrationContext {
    pgDb: ReturnType<typeof pgDrizzle>;
    mysqlDb: ReturnType<typeof mysqlDrizzle>;
    tenderIds: Set<number>;
    tenderInfoCache: Map<number, TenderInfoCache>;
    tqReceivedMap: Map<number, TqReceivedRecord[]>; // tender_id -> received records
    stats: MigrationStats;
    queryItemIdCounter: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const Parsers = {
    decimal(val: string | number | null | undefined): string | null {
        if (val === null || val === undefined || val === '') return null;
        const cleaned = String(val).replace(/,/g, '').trim();
        const num = parseFloat(cleaned);
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

    dateTime(dateVal: string | Date | null, timeVal: string | null): Date | null {
        if (!dateVal) return null;

        let dateStr: string;
        if (typeof dateVal === 'string') {
            // Handle different date formats
            dateStr = dateVal.includes('T') ? dateVal.split('T')[0] : dateVal;
        } else {
            dateStr = dateVal.toISOString().split('T')[0];
        }

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

    parseJsonArray(val: string | null | undefined): string[] {
        if (!val || val.trim() === '') return [];
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
                return parsed.map(v => String(v).trim());
            }
        } catch {
            // Not valid JSON
        }
        return [];
    },

    buildGoogleSheetUrl(driveid: string | null): string | null {
        if (!driveid) return null;
        const trimmed = driveid.trim();

        // Already a full URL
        if (trimmed.startsWith('http')) {
            return trimmed;
        }

        // Just the ID, construct URL
        return `https://docs.google.com/spreadsheets/d/${trimmed}/edit`;
    },

    getFirstOemId(oem: string | null): number | null {
        if (!oem || oem.trim() === '') return null;
        const ids = oem.split(',').map(s => s.trim()).filter(s => s.length > 0);
        if (ids.length === 0) return null;
        const firstId = parseInt(ids[0], 10);
        return isNaN(firstId) ? null : firstId;
    },

    mapCostingStatus(status: string | null): 'Pending' | 'Submitted' | 'Approved' | 'Rejected/Redo' {
        if (!status) return 'Pending';
        if (status === 'Approved') return 'Approved';
        if (status === 'Rejected/Redo') return 'Rejected/Redo';
        return 'Pending';
    },

    mapBidStatus(status: string | null): 'Submission Pending' | 'Bid Submitted' | 'Tender Missed' {
        if (!status || status === '' || status === 'Submission Pending') {
            return 'Submission Pending';
        }
        if (status === 'Bid Submitted') return 'Bid Submitted';
        if (status === 'Tender Missed') return 'Tender Missed';
        return 'Submission Pending';
    },
    getAllOemIds(oem: string | null): number[] | null {
        if (!oem || oem.trim() === '') return null;

        const ids = oem
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .map(s => parseInt(s, 10))
            .filter(n => !isNaN(n));

        return ids.length > 0 ? ids : null;
    },
};

// ============================================================================
// CACHE LOADERS
// ============================================================================

class TenderInfoCacheLoader {
    constructor(private ctx: MigrationContext) { }

    async load(): Promise<void> {
        console.log('Pre-loading tender_infos cache (for costing status)...');

        const rows = await this.ctx.mysqlDb.select({
            id: mysqlTenderInfos.id,
            costing_status: mysqlTenderInfos.costing_status,
            costing_remarks: mysqlTenderInfos.costing_remarks,
        }).from(mysqlTenderInfos);

        for (const row of rows) {
            this.ctx.tenderIds.add(row.id);
            this.ctx.tenderInfoCache.set(row.id, {
                costingStatus: row.costing_status ?? null,
                costingRemarks: row.costing_remarks ?? null,
            });
        }

        console.log(`  ✓ Cached: ${this.ctx.tenderInfoCache.size} tender records`);
    }
}

// ============================================================================
// MIGRATORS
// ============================================================================

class DocumentChecklistMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating tender_document_checklists (aggregating to new schema)...');

        const rows = await this.ctx.mysqlDb.select().from(mysqlTenderDocumentChecklists);

        // Group documents by tender_id
        const groupedData = new Map<number, {
            tenderId: number;
            selectedDocuments: string[];
            extraDocuments: { name: string; path: string }[];
            submittedBy: number | null;
            createdAt: Date;
            updatedAt: Date;
        }>();

        console.log(`  Processing ${rows.length} document checklist records...`);

        // First pass: Group all documents by tender
        for (const row of rows) {
            const tenderId = Number(row.tender_id);

            // Validate tender exists
            if (!this.ctx.tenderIds.has(tenderId)) {
                console.warn(`  ⚠ Tender ID ${tenderId} not found, skipping document checklist ${row.id}`);
                this.ctx.stats.documentChecklists.skipped++;
                continue;
            }

            // Initialize tender entry if not exists
            if (!groupedData.has(tenderId)) {
                groupedData.set(tenderId, {
                    tenderId: tenderId,
                    selectedDocuments: [],
                    extraDocuments: [],
                    submittedBy: null,
                    createdAt: Parsers.date(row.created_at) ?? new Date(),
                    updatedAt: Parsers.date(row.updated_at) ?? new Date(),
                });
            }

            const tenderData = groupedData.get(tenderId)!;

            // Add document name to selectedDocuments array
            if (row.document_name && row.document_name.trim() !== '') {
                tenderData.selectedDocuments.push(row.document_name.trim());
            }

            // Add to extraDocuments if document_path exists
            if (row.document_path && row.document_path.trim() !== '') {
                // Extract filename from path
                const pathParts = row.document_path.split('/');
                const filename = pathParts[pathParts.length - 1] || row.document_path;

                tenderData.extraDocuments.push({
                    name: filename,
                    path: row.document_path.trim(),
                });
            }

            // Keep the latest updatedAt
            const rowUpdatedAt = Parsers.date(row.updated_at);
            if (rowUpdatedAt && rowUpdatedAt > tenderData.updatedAt) {
                tenderData.updatedAt = rowUpdatedAt;
            }

            // Keep the earliest createdAt
            const rowCreatedAt = Parsers.date(row.created_at);
            if (rowCreatedAt && rowCreatedAt < tenderData.createdAt) {
                tenderData.createdAt = rowCreatedAt;
            }
        }

        console.log(`  Aggregated into ${groupedData.size} tender entries`);

        // Second pass: Insert aggregated data into PostgreSQL
        for (const [tenderId, data] of groupedData.entries()) {
            await this.insertAggregatedRow(tenderId, data);
        }

        this.logStats();
    }

    private async insertAggregatedRow(
        tenderId: number,
        data: {
            selectedDocuments: string[];
            extraDocuments: { name: string; path: string }[];
            submittedBy: number | null;
            createdAt: Date;
            updatedAt: Date;
        }
    ): Promise<void> {
        try {
            await this.ctx.pgDb.insert(tenderDocumentChecklists).values({
                tenderId: tenderId,
                selectedDocuments: data.selectedDocuments.length > 0 ? data.selectedDocuments : null,
                extraDocuments: data.extraDocuments.length > 0 ? data.extraDocuments : null,
                submittedBy: data.submittedBy,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
            });

            this.ctx.stats.documentChecklists.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating checklist for tender ${tenderId}:`, err);
            this.ctx.stats.documentChecklists.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.documentChecklists;
        console.log(`  ✓ Migrated: ${success} tenders | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

class BidSubmissionMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating bid_submissions...');

        const rows = await this.ctx.mysqlDb.select().from(mysqlBidSubmissions);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlBidSubmissions.$inferSelect): Promise<void> {
        try {
            const tenderId = Number(row.tender_id);

            // Validate tender exists
            if (!this.ctx.tenderIds.has(tenderId)) {
                console.warn(`  ⚠ Tender ID ${tenderId} not found, skipping bid_submission ${row.id}`);
                this.ctx.stats.bidSubmissions.skipped++;
                return;
            }

            // Build documents JSON
            const documents: BidDocuments = {
                submittedDocs: row.submitted_bid_documents && row.submitted_bid_documents.trim() !== ''
                    ? [row.submitted_bid_documents.trim()]
                    : [],
                submissionProof: Parsers.string(row.proof_of_submission),
                finalPriceSs: Parsers.string(row.final_bidding_price), // This is file path, not numeric
            };

            await this.ctx.pgDb.insert(bidSubmissions).values({
                id: row.id,
                tenderId: tenderId,
                status: Parsers.mapBidStatus(row.status),
                submissionDatetime: Parsers.date(row.bid_submissions_date),
                finalBiddingPrice: null, // We store screenshot path in documents, not price here
                documents: documents,
                submittedBy: null, // Not available in old data
                reasonForMissing: Parsers.string(row.reason_for_missing),
                preventionMeasures: Parsers.string(row.not_repeat_reason),
                tmsImprovements: Parsers.string(row.tms_improvements),
                createdAt: Parsers.date(row.created_at) ?? new Date(),
                updatedAt: Parsers.date(row.updated_at) ?? new Date(),
            });

            this.ctx.stats.bidSubmissions.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating bid_submission id=${row.id}:`, err);
            this.ctx.stats.bidSubmissions.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.bidSubmissions;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

class CostingSheetMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating tender_costing_sheets (from tbl_googleapikeys)...');

        const rows = await this.ctx.mysqlDb.select().from(mysqlGoogleApiKeys);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlGoogleApiKeys.$inferSelect): Promise<void> {
        try {
            const tenderId = Parsers.integer(row.tenderid);

            if (!tenderId) {
                console.warn(`  ⚠ Invalid tender ID for costing sheet ${row.id}, skipping`);
                this.ctx.stats.costingSheets.skipped++;
                return;
            }

            // Validate tender exists
            if (!this.ctx.tenderIds.has(tenderId)) {
                console.warn(`  ⚠ Tender ID ${tenderId} not found, skipping costing sheet ${row.id}`);
                this.ctx.stats.costingSheets.skipped++;
                return;
            }

            // Get costing status from tender_infos cache
            const tenderInfo = this.ctx.tenderInfoCache.get(tenderId);
            const costingStatus = Parsers.mapCostingStatus(tenderInfo?.costingStatus ?? null);

            // Build Google Sheet URL
            const googleSheetUrl = Parsers.buildGoogleSheetUrl(row.driveid);

            // Parse prices
            const finalPrice = Parsers.decimal(row.final_price);
            const budgetPrice = Parsers.decimal(row.budget);
            const receiptPrice = Parsers.decimal(row.receipt);
            const grossMargin = Parsers.decimal(row.gross_margin);

            const oemVendorIds = Parsers.getAllOemIds(row.oem);

            await this.ctx.pgDb.insert(tenderCostingSheets).values({
                id: row.id,
                tenderId: tenderId,
                submittedBy: Parsers.integer(row.staffid),
                approvedBy: costingStatus === 'Approved' ? Parsers.integer(row.staffid) : null,

                // Google Sheet
                googleSheetUrl: googleSheetUrl,
                sheetTitle: Parsers.string(row.title, 255),

                // Submitted Values (same as final for migration)
                submittedFinalPrice: finalPrice,
                submittedReceiptPrice: receiptPrice,
                submittedBudgetPrice: budgetPrice,
                submittedGrossMargin: grossMargin,
                teRemarks: Parsers.string(row.remarks),

                // Approved Values (if approved, copy the same values)
                finalPrice: costingStatus === 'Approved' ? finalPrice : null,
                receiptPrice: costingStatus === 'Approved' ? receiptPrice : null,
                budgetPrice: costingStatus === 'Approved' ? budgetPrice : null,
                grossMargin: costingStatus === 'Approved' ? grossMargin : null,
                oemVendorIds: oemVendorIds,

                // Approval Workflow
                status: costingStatus,
                tlRemarks: tenderInfo?.costingRemarks ?? null,
                rejectionReason: costingStatus === 'Rejected/Redo' ? tenderInfo?.costingRemarks : null,

                // Timestamps
                submittedAt: Parsers.date(row.created_at),
                approvedAt: costingStatus === 'Approved' ? Parsers.date(row.updated_at) : null,
                createdAt: Parsers.date(row.created_at) ?? new Date(),
                updatedAt: Parsers.date(row.updated_at) ?? new Date(),
            });

            this.ctx.stats.costingSheets.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating costing_sheet id=${row.id}:`, err);
            this.ctx.stats.costingSheets.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.costingSheets;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

class TenderQueryMigrator {
    private tqTypeMap: Map<string, number> = new Map();

    constructor(private ctx: MigrationContext) {
        // Pre-populate TQ type mapping based on PG data
        this.tqTypeMap.set('1', 1); // Technical
        this.tqTypeMap.set('2', 2); // Financial
        this.tqTypeMap.set('3', 3); // Commercial
        this.tqTypeMap.set('4', 4); // OEM authorization
        this.tqTypeMap.set('5', 5); // EMD
        this.tqTypeMap.set('6', 6); // POA
    }

    async migrate(): Promise<void> {
        console.log('Migrating TQ data (tq_receiveds → tender_queries + tender_query_items)...');

        // Step 1: Migrate tq_receiveds
        await this.migrateTqReceiveds();

        // Step 2: Match and update with tq_replieds
        await this.matchTqReplieds();
    }

    private async migrateTqReceiveds(): Promise<void> {
        console.log('  [1/2] Processing tq_receiveds...');

        const rows = await this.ctx.mysqlDb.select().from(mysqlTqReceiveds);

        for (const row of rows) {
            await this.migrateReceivedRow(row);
        }

        const { success, errors, skipped } = this.ctx.stats.tenderQueries;
        console.log(`    ✓ Queries: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
        console.log(`    ✓ Query Items: ${this.ctx.stats.tenderQueryItems.success} | ✗ Errors: ${this.ctx.stats.tenderQueryItems.errors}`);
    }

    private async migrateReceivedRow(row: typeof mysqlTqReceiveds.$inferSelect): Promise<void> {
        try {
            const tenderId = Number(row.tender_id);

            if (!tenderId || !this.ctx.tenderIds.has(tenderId)) {
                console.warn(`    ⚠ Tender ID ${row.tender_id} not found, skipping tq_received ${row.id}`);
                this.ctx.stats.tenderQueries.skipped++;
                return;
            }

            // Parse submission deadline
            const submissionDeadline = Parsers.dateTime(row.tq_submission_date, row.tq_submission_time);

            if (!submissionDeadline) {
                console.warn(`    ⚠ Invalid submission deadline for tq_received ${row.id}, using created_at`);
            }

            // Insert tender_query
            await this.ctx.pgDb.insert(tenderQueries).values({
                id: row.id,
                tenderId: tenderId,
                tqSubmissionDeadline: submissionDeadline ?? Parsers.date(row.created_at) ?? new Date(),
                tqDocumentReceived: Parsers.string(row.tq_document, 500),
                receivedBy: null, // Not available in old data
                receivedAt: Parsers.date(row.created_at),
                status: 'Received',
                // Reply fields - will be updated later
                repliedDatetime: null,
                repliedDocument: null,
                proofOfSubmission: null,
                repliedBy: null,
                repliedAt: null,
                // Missed fields - no data to migrate
                missedReason: null,
                preventionMeasures: null,
                tmsImprovements: null,
                createdAt: Parsers.date(row.created_at) ?? new Date(),
                updatedAt: Parsers.date(row.updated_at) ?? new Date(),
            });

            // Track for reply matching
            const receivedRecord: TqReceivedRecord = {
                id: row.id,
                tenderId: tenderId,
                createdAt: Parsers.date(row.created_at) ?? new Date(),
                isReplied: false,
            };

            if (!this.ctx.tqReceivedMap.has(tenderId)) {
                this.ctx.tqReceivedMap.set(tenderId, []);
            }
            this.ctx.tqReceivedMap.get(tenderId)!.push(receivedRecord);

            this.ctx.stats.tenderQueries.success++;

            // Insert tender_query_items from JSON arrays
            await this.migrateQueryItems(row);

        } catch (err) {
            console.error(`    ✗ Error migrating tq_received id=${row.id}:`, err);
            this.ctx.stats.tenderQueries.errors++;
        }
    }

    private async migrateQueryItems(row: typeof mysqlTqReceiveds.$inferSelect): Promise<void> {
        const tqTypes = Parsers.parseJsonArray(row.tq_type);
        const descriptions = Parsers.parseJsonArray(row.description);

        const itemCount = Math.max(tqTypes.length, descriptions.length);

        for (let i = 0; i < itemCount; i++) {
            try {
                const tqTypeStr = tqTypes[i] || '1'; // Default to Technical
                const description = descriptions[i] || '';

                if (!description.trim()) continue; // Skip empty descriptions

                this.ctx.queryItemIdCounter++;

                await this.ctx.pgDb.insert(tenderQueryItems).values({
                    id: this.ctx.queryItemIdCounter,
                    tenderQueryId: row.id,
                    srNo: i + 1,
                    tqTypeId: this.tqTypeMap.get(tqTypeStr) ?? 1,
                    queryDescription: description,
                    response: null,
                    createdAt: Parsers.date(row.created_at) ?? new Date(),
                    updatedAt: Parsers.date(row.updated_at) ?? new Date(),
                });

                this.ctx.stats.tenderQueryItems.success++;
            } catch (err) {
                console.error(`    ✗ Error creating query_item for tq_received ${row.id}, index ${i}:`, err);
                this.ctx.stats.tenderQueryItems.errors++;
            }
        }
    }

    private async matchTqReplieds(): Promise<void> {
        console.log('  [2/2] Matching tq_replieds...');

        const rows = await this.ctx.mysqlDb.select().from(mysqlTqReplieds);

        for (const row of rows) {
            await this.matchReplyRow(row);
        }

        const { success, errors, unmatched } = this.ctx.stats.tqRepliesMatched;
        console.log(`    ✓ Matched: ${success} | ✗ Errors: ${errors} | ⚠ Unmatched: ${unmatched}`);
    }

    private async matchReplyRow(row: typeof mysqlTqReplieds.$inferSelect): Promise<void> {
        try {
            const tenderId = Number(row.tender_id);

            if (!tenderId) {
                this.ctx.stats.tqRepliesMatched.unmatched++;
                return;
            }

            // Find matching tq_received record
            const receivedRecords = this.ctx.tqReceivedMap.get(tenderId);

            if (!receivedRecords || receivedRecords.length === 0) {
                console.warn(`    ⚠ No tq_received found for tender_id ${tenderId}, reply ${row.id} unmatched`);
                this.ctx.stats.tqRepliesMatched.unmatched++;
                return;
            }

            // Find the first unreplied record, or the one with closest created_at before reply
            const replyCreatedAt = Parsers.date(row.created_at) ?? new Date();

            // Sort by created_at
            const sortedRecords = receivedRecords
                .filter(r => !r.isReplied)
                .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

            // Find best match - the received record created before this reply
            let matchedRecord: TqReceivedRecord | null = null;
            for (const record of sortedRecords) {
                if (record.createdAt.getTime() <= replyCreatedAt.getTime()) {
                    matchedRecord = record;
                } else {
                    break;
                }
            }

            // If no match found before reply time, take the first unreplied
            if (!matchedRecord && sortedRecords.length > 0) {
                matchedRecord = sortedRecords[0];
            }

            if (!matchedRecord) {
                console.warn(`    ⚠ All tq_received already replied for tender_id ${tenderId}, reply ${row.id} unmatched`);
                this.ctx.stats.tqRepliesMatched.unmatched++;
                return;
            }

            // Mark as replied
            matchedRecord.isReplied = true;

            // Parse reply datetime
            const repliedDatetime = row.tq_submission_date
                ? Parsers.dateTime(row.tq_submission_date, row.tq_submission_time)
                : Parsers.date(row.created_at);

            // Update the tender_query with reply info
            await this.ctx.pgDb
                .update(tenderQueries)
                .set({
                    status: 'Replied',
                    repliedDatetime: repliedDatetime,
                    repliedDocument: Parsers.string(row.tq_document, 500),
                    proofOfSubmission: Parsers.string(row.proof_submission, 500),
                    repliedAt: Parsers.date(row.created_at),
                    updatedAt: Parsers.date(row.updated_at) ?? new Date(),
                })
                .where(sql`id = ${matchedRecord.id}`);

            this.ctx.stats.tqRepliesMatched.success++;
        } catch (err) {
            console.error(`    ✗ Error matching tq_replied id=${row.id}:`, err);
            this.ctx.stats.tqRepliesMatched.errors++;
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
            { table: 'tender_document_checklists', column: 'id' },
            { table: 'bid_submissions', column: 'id' },
            { table: 'tender_costing_sheets', column: 'id' },
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
        console.log('  TENDER WORKFLOW MIGRATION: MySQL → PostgreSQL');
        console.log('  Tables: document_checklists, bid_submissions, costing_sheets, TQ');
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
            tenderIds: new Set(),
            tenderInfoCache: new Map(),
            tqReceivedMap: new Map(),
            stats: {
                documentChecklists: { success: 0, errors: 0, skipped: 0 },
                bidSubmissions: { success: 0, errors: 0, skipped: 0 },
                costingSheets: { success: 0, errors: 0, skipped: 0 },
                tenderQueries: { success: 0, errors: 0, skipped: 0 },
                tenderQueryItems: { success: 0, errors: 0 },
                tqRepliesMatched: { success: 0, errors: 0, unmatched: 0 },
            },
            queryItemIdCounter: 0,
        };
    }

    private async executeMigration(): Promise<void> {
        const steps = [
            {
                name: 'Load tender_infos cache',
                fn: () => new TenderInfoCacheLoader(this.ctx).load(),
            },
            {
                name: 'Migrate tender_document_checklists',
                fn: () => new DocumentChecklistMigrator(this.ctx).migrate(),
            },
            // {
            //     name: 'Migrate bid_submissions',
            //     fn: () => new BidSubmissionMigrator(this.ctx).migrate(),
            // },
            // {
            //     name: 'Migrate tender_costing_sheets',
            //     fn: () => new CostingSheetMigrator(this.ctx).migrate(),
            // },
            // {
            //     name: 'Migrate TQ (tender_queries + tender_query_items)',
            //     fn: () => new TenderQueryMigrator(this.ctx).migrate(),
            // },
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
        const { stats, tenderIds } = this.ctx;

        console.log('═'.repeat(70));
        console.log('  MIGRATION SUMMARY');
        console.log('═'.repeat(70));
        console.log('');
        console.log('  Table                        Success    Errors    Skipped');
        console.log('  ───────────────────────────────────────────────────────────');
        console.log(`  tender_document_checklists   ${this.pad(stats.documentChecklists.success)}       ${this.pad(stats.documentChecklists.errors)}       ${stats.documentChecklists.skipped}`);
        // console.log(`  bid_submissions              ${this.pad(stats.bidSubmissions.success)}       ${this.pad(stats.bidSubmissions.errors)}       ${stats.bidSubmissions.skipped}`);
        // console.log(`  tender_costing_sheets        ${this.pad(stats.costingSheets.success)}       ${this.pad(stats.costingSheets.errors)}       ${stats.costingSheets.skipped}`);
        // console.log(`  tender_queries               ${this.pad(stats.tenderQueries.success)}       ${this.pad(stats.tenderQueries.errors)}       ${stats.tenderQueries.skipped}`);
        // console.log(`  tender_query_items           ${this.pad(stats.tenderQueryItems.success)}       ${this.pad(stats.tenderQueryItems.errors)}       -`);
        // console.log(`  tq_replies matched           ${this.pad(stats.tqRepliesMatched.success)}       ${this.pad(stats.tqRepliesMatched.errors)}       ${stats.tqRepliesMatched.unmatched}`);
        console.log('  ───────────────────────────────────────────────────────────');
        console.log(`  Tender IDs in scope:         ${tenderIds.size}`);
        console.log('');
        console.log('═'.repeat(70));
        console.log('  ✅ Migration completed!');
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
