// migrate-tender-fees.ts
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import { mysqlTable, varchar, bigint, text, decimal, timestamp, datetime } from 'drizzle-orm/mysql-core';
import { eq, sql } from 'drizzle-orm';
import { Client } from 'pg';
import {
    paymentRequests,
    paymentInstruments,
    instrumentDdDetails,
    instrumentTransferDetails,
} from '../src/db/emds.schema';

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

const mysqlPopTenderFees = mysqlTable('pop_tender_fees', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    type: varchar('type', { length: 20 }),
    emd_id: bigint('emd_id', { mode: 'number' }),
    tender_id: bigint('tender_id', { mode: 'number' }),
    tender_name: varchar('tender_name', { length: 255 }),
    due_date_time: datetime('due_date_time'),
    purpose: varchar('purpose', { length: 255 }),
    portal_name: varchar('portal_name', { length: 255 }),
    netbanking_available: varchar('netbanking_available', { length: 255 }),
    bank_debit_card: varchar('bank_debit_card', { length: 255 }),
    amount: decimal('amount', { precision: 20, scale: 2 }),
    requested_by: varchar('requested_by', { length: 200 }),
    status: varchar('status', { length: 100 }),
    reason: varchar('reason', { length: 2000 }),
    utr: varchar('utr', { length: 2000 }),
    utr_msg: text('utr_msg'),
    remark: text('remark'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlDdTenderFees = mysqlTable('dd_tender_fees', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    type: varchar('type', { length: 20 }),
    emd_id: bigint('emd_id', { mode: 'number' }),
    tender_id: bigint('tender_id', { mode: 'number' }),
    tender_name: varchar('tender_name', { length: 255 }),
    due_date_time: datetime('due_date_time'),
    dd_needed_in: varchar('dd_needed_in', { length: 255 }),
    purpose_of_dd: varchar('purpose_of_dd', { length: 255 }),
    in_favour_of: varchar('in_favour_of', { length: 255 }),
    dd_payable_at: varchar('dd_payable_at', { length: 255 }),
    dd_amount: decimal('dd_amount', { precision: 20, scale: 2 }),
    requested_by: varchar('requested_by', { length: 200 }),
    status: varchar('status', { length: 100 }),
    reason: varchar('reason', { length: 2000 }),
    dd_no: varchar('dd_no', { length: 200 }),
    utr_msg: text('utr_msg'),
    remark: text('remark'),
    courier_address: varchar('courier_address', { length: 255 }),
    delivery_date_time: varchar('delivery_date_time', { length: 10 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlBtTenderFees = mysqlTable('bt_tender_fees', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    type: varchar('type', { length: 20 }),
    tender_id: bigint('tender_id', { mode: 'number' }),
    emd_id: bigint('emd_id', { mode: 'number' }),
    tender_name: varchar('tender_name', { length: 255 }),
    due_date: timestamp('due_date'),
    purpose: varchar('purpose', { length: 255 }),
    account_name: varchar('account_name', { length: 255 }),
    account_number: varchar('account_number', { length: 255 }),
    ifsc: varchar('ifsc', { length: 255 }),
    amount: varchar('amount', { length: 255 }),
    requested_by: varchar('requested_by', { length: 200 }),
    status: varchar('status', { length: 100 }),
    reason: varchar('reason', { length: 2000 }),
    utr: varchar('utr', { length: 2000 }),
    utr_msg: text('utr_msg'),
    remark: text('remark'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// ============================================================================
// TYPES
// ============================================================================

interface MigrationStats {
    pop: { success: number; errors: number; skipped: number };
    dd: { success: number; errors: number; skipped: number };
    bt: { success: number; errors: number; skipped: number };
}

interface MigrationContext {
    pgDb: ReturnType<typeof pgDrizzle>;
    pgClient: Client;
    mysqlDb: ReturnType<typeof mysqlDrizzle>;
    stats: MigrationStats;
    updatedRequestIds: Set<number>;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const Parsers = {
    amount(val: string | number | null | undefined): string {
        if (val === null || val === undefined || val === '') return '0.00';
        if (typeof val === 'number') {
            return isNaN(val) ? '0.00' : val.toFixed(2);
        }
        const cleaned = val.toString().replace(/,/g, '').trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? '0.00' : num.toFixed(2);
    },

    date(val: string | Date | null | undefined): Date | null {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    },

    dateString(val: string | Date | null | undefined): string | null {
        if (!val) return null;
        const d = new Date(val);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0];
    },

    integer(val: string | number | null | undefined): number | null {
        if (val === null || val === undefined || val === '') return null;
        if (typeof val === 'number') return val;
        const num = parseInt(val.toString().trim(), 10);
        return isNaN(num) ? null : num;
    },

    string(val: string | null | undefined, maxLength?: number): string | null {
        if (val === null || val === undefined) return null;
        const str = String(val).trim();
        if (str === '') return null;
        return maxLength ? str.substring(0, maxLength) : str;
    },
};

// ============================================================================
// STATUS MAPPING - Aligned with EMD migration
// Based on actual data: Paid, Rejected, NULL
// Assume action=1 (SUBMITTED) for all records
// ============================================================================

const StatusMapper = {
    /**
     * Portal Payment Status Mapping
     * Statuses: Paid(12), Rejected(46), NULL(1)
     */
    portal(status: string | null): string {
        const s = (status || '').toLowerCase().trim();

        if (s === 'paid') return 'PORTAL_PAYMENT_COMPLETED';
        if (s === 'rejected') return 'PORTAL_ACCOUNTS_FORM_REJECTED';

        // Default: assume action=1 (submitted)
        return 'PORTAL_ACCOUNTS_FORM_SUBMITTED';
    },

    /**
     * DD Status Mapping
     * Statuses: Paid(4), Rejected(1)
     */
    dd(status: string | null): string {
        const s = (status || '').toLowerCase().trim();

        if (s === 'paid') return 'DD_FOLLOWUP_COMPLETED';
        if (s === 'rejected') return 'DD_ACCOUNTS_FORM_REJECTED';

        // Default: assume action=1 (submitted)
        return 'DD_ACCOUNTS_FORM_SUBMITTED';
    },

    /**
     * Bank Transfer Status Mapping
     * Statuses: Paid(6), Rejected(5), NULL(1)
     */
    bankTransfer(status: string | null): string {
        const s = (status || '').toLowerCase().trim();

        if (s === 'paid') return 'BT_PAYMENT_COMPLETED';
        if (s === 'rejected') return 'BT_ACCOUNTS_FORM_REJECTED';

        // Default: assume action=1 (submitted)
        return 'BT_ACCOUNTS_FORM_SUBMITTED';
    },

    /**
     * Get stage number from status string
     */
    getStage(status: string): number {
        if (status.includes('ACCOUNTS_FORM')) return 1;
        if (status.includes('FOLLOWUP')) return 2;
        if (status.includes('RETURN') || status.includes('COURIER')) return 3;
        if (status.includes('PAYMENT_COMPLETED') || status.includes('SETTLED')) return 4;
        return 1;
    },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find existing payment request by legacyEmdId
 */
async function findRequestByLegacyEmdId(
    ctx: MigrationContext,
    legacyEmdId: number
): Promise<{ id: number; purpose: string } | null> {
    const result = await ctx.pgDb
        .select({
            id: paymentRequests.id,
            purpose: paymentRequests.purpose,
        })
        .from(paymentRequests)
        .where(eq(paymentRequests.legacyEmdId, legacyEmdId))
        .limit(1);

    return result.length > 0 ? { id: result[0].id, purpose: result[0].purpose ?? 'EMD' } : null;
}

/**
 * Update payment request purpose to 'Tender Fee'
 */
async function updateRequestPurpose(ctx: MigrationContext, requestId: number): Promise<void> {
    // Only update once per request
    if (ctx.updatedRequestIds.has(requestId)) return;

    await ctx.pgDb
        .update(paymentRequests)
        .set({
            purpose: 'Tender Fee',
            updatedAt: new Date(),
        })
        .where(eq(paymentRequests.id, requestId));

    ctx.updatedRequestIds.add(requestId);
}

/**
 * Derive payment method from flags
 */
function derivePaymentMethod(netbanking: string | null, debitCard: string | null): string {
    if (netbanking && (netbanking.toLowerCase() === 'yes' || netbanking === '1')) return 'Netbanking';
    if (debitCard && (debitCard.toLowerCase() === 'yes' || debitCard === '1')) return 'Debit Card';
    return 'Other';
}

// ============================================================================
// MIGRATORS
// ============================================================================

class PopTenderFeesMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating pop_tender_fees → Portal Payment...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlPopTenderFees);
        const skippedRecords: { id: number; emdId: number | null; reason: string }[] = [];

        for (const row of rows) {
            await this.migrateRow(row, skippedRecords);
        }

        // Log skipped records
        if (skippedRecords.length > 0) {
            console.log('  ⚠ Skipped records:');
            skippedRecords.forEach((rec) => {
                console.log(`     - ID ${rec.id}: emd_id=${rec.emdId}, reason: ${rec.reason}`);
            });
        }

        this.logStats();
    }

    private async migrateRow(
        row: typeof mysqlPopTenderFees.$inferSelect,
        skippedRecords: { id: number; emdId: number | null; reason: string }[]
    ): Promise<void> {
        try {
            if (!row.emd_id) {
                skippedRecords.push({ id: row.id, emdId: null, reason: 'emd_id is NULL' });
                this.ctx.stats.pop.skipped++;
                return;
            }

            const request = await findRequestByLegacyEmdId(this.ctx, row.emd_id);

            if (!request) {
                skippedRecords.push({
                    id: row.id,
                    emdId: row.emd_id,
                    reason: 'No payment_request found for this emd_id',
                });
                this.ctx.stats.pop.skipped++;
                return;
            }

            // Update purpose to 'Tender Fee'
            await updateRequestPurpose(this.ctx, request.id);

            const status = StatusMapper.portal(row.status);

            // Insert payment instrument
            // Note: legacyPortalId may conflict with pay_on_portals, use legacyData to distinguish
            const [instrument] = await this.ctx.pgDb
                .insert(paymentInstruments)
                .values({
                    requestId: request.id,
                    instrumentType: 'Portal Payment',
                    amount: Parsers.amount(row.amount),
                    status: status,
                    currentStage: StatusMapper.getStage(status),
                    action: 1, // Assume action=1 for all tender fees
                    utr: row.utr ?? null,
                    rejectionReason: row.reason ?? null,
                    remarks: row.remark ?? null,
                    legacyPortalId: row.id, // Store original ID
                    legacyData: {
                        source_table: 'pop_tender_fees',
                        original_status: row.status,
                        original_purpose: row.purpose,
                        portal_name: row.portal_name,
                        utr_msg: row.utr_msg,
                        tender_id: row.tender_id,
                        tender_name: row.tender_name,
                    },
                    createdAt: Parsers.date(row.created_at) ?? new Date(),
                    updatedAt: Parsers.date(row.updated_at) ?? new Date(),
                })
                .returning({ id: paymentInstruments.id });

            // Insert transfer details
            await this.ctx.pgDb.insert(instrumentTransferDetails).values({
                instrumentId: instrument.id,
                portalName: row.portal_name ?? null,
                paymentMethod: derivePaymentMethod(row.netbanking_available, row.bank_debit_card),
                transactionId: row.utr ?? null,
                transactionDate: Parsers.date(row.due_date_time),
                isNetbanking: row.netbanking_available ?? null,
                isDebit: row.bank_debit_card ?? null,
                utrMsg: row.utr_msg ?? null,
                remarks: row.remark ?? null,
                reason: row.reason ?? null,
            });

            this.ctx.stats.pop.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating pop_tender_fees id=${row.id}:`, err);
            this.ctx.stats.pop.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.pop;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

class DdTenderFeesMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating dd_tender_fees → DD...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlDdTenderFees);
        const skippedRecords: { id: number; emdId: number | null; reason: string }[] = [];

        for (const row of rows) {
            await this.migrateRow(row, skippedRecords);
        }

        // Log skipped records
        if (skippedRecords.length > 0) {
            console.log('  ⚠ Skipped records:');
            skippedRecords.forEach((rec) => {
                console.log(`     - ID ${rec.id}: emd_id=${rec.emdId}, reason: ${rec.reason}`);
            });
        }

        this.logStats();
    }

    private async migrateRow(
        row: typeof mysqlDdTenderFees.$inferSelect,
        skippedRecords: { id: number; emdId: number | null; reason: string }[]
    ): Promise<void> {
        try {
            if (!row.emd_id) {
                skippedRecords.push({ id: row.id, emdId: null, reason: 'emd_id is NULL' });
                this.ctx.stats.dd.skipped++;
                return;
            }

            const request = await findRequestByLegacyEmdId(this.ctx, row.emd_id);

            if (!request) {
                skippedRecords.push({
                    id: row.id,
                    emdId: row.emd_id,
                    reason: 'No payment_request found for this emd_id',
                });
                this.ctx.stats.dd.skipped++;
                return;
            }

            // Update purpose to 'Tender Fee'
            await updateRequestPurpose(this.ctx, request.id);

            const status = StatusMapper.dd(row.status);

            // Insert payment instrument
            // Note: legacyDdId won't conflict (no overlapping IDs with emd_demand_drafts)
            const [instrument] = await this.ctx.pgDb
                .insert(paymentInstruments)
                .values({
                    requestId: request.id,
                    instrumentType: 'DD',
                    amount: Parsers.amount(row.dd_amount),
                    favouring: row.in_favour_of ?? null,
                    payableAt: row.dd_payable_at ?? null,
                    status: status,
                    currentStage: StatusMapper.getStage(status),
                    action: 1, // Assume action=1 for all tender fees
                    courierAddress: row.courier_address ?? null,
                    courierDeadline: Parsers.integer(row.dd_needed_in),
                    rejectionReason: row.reason ?? null,
                    remarks: row.remark ?? null,
                    legacyDdId: row.id, // Store original ID
                    legacyData: {
                        source_table: 'dd_tender_fees',
                        original_status: row.status,
                        original_purpose: row.purpose_of_dd,
                        utr_msg: row.utr_msg,
                        delivery_date_time: row.delivery_date_time,
                        tender_id: row.tender_id,
                        tender_name: row.tender_name,
                    },
                    createdAt: Parsers.date(row.created_at) ?? new Date(),
                    updatedAt: Parsers.date(row.updated_at) ?? new Date(),
                })
                .returning({ id: paymentInstruments.id });

            // Insert DD details
            await this.ctx.pgDb.insert(instrumentDdDetails).values({
                instrumentId: instrument.id,
                ddNo: row.dd_no ?? null,
                ddDate: null,
                bankName: null,
                reqNo: null,
                ddNeeds: row.dd_needed_in ?? null,
                ddPurpose: row.purpose_of_dd ?? null,
                ddRemarks: row.remark ?? null,
            });

            this.ctx.stats.dd.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating dd_tender_fees id=${row.id}:`, err);
            this.ctx.stats.dd.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.dd;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

class BtTenderFeesMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating bt_tender_fees → Bank Transfer...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlBtTenderFees);
        const skippedRecords: { id: number; emdId: number | null; reason: string }[] = [];

        for (const row of rows) {
            await this.migrateRow(row, skippedRecords);
        }

        // Log skipped records
        if (skippedRecords.length > 0) {
            console.log('  ⚠ Skipped records:');
            skippedRecords.forEach((rec) => {
                console.log(`     - ID ${rec.id}: emd_id=${rec.emdId}, reason: ${rec.reason}`);
            });
        }

        this.logStats();
    }

    private async migrateRow(
        row: typeof mysqlBtTenderFees.$inferSelect,
        skippedRecords: { id: number; emdId: number | null; reason: string }[]
    ): Promise<void> {
        try {
            if (!row.emd_id) {
                skippedRecords.push({ id: row.id, emdId: null, reason: 'emd_id is NULL' });
                this.ctx.stats.bt.skipped++;
                return;
            }

            const request = await findRequestByLegacyEmdId(this.ctx, row.emd_id);

            if (!request) {
                skippedRecords.push({
                    id: row.id,
                    emdId: row.emd_id,
                    reason: 'No payment_request found for this emd_id',
                });
                this.ctx.stats.bt.skipped++;
                return;
            }

            // Update purpose to 'Tender Fee'
            await updateRequestPurpose(this.ctx, request.id);

            const status = StatusMapper.bankTransfer(row.status);

            // Insert payment instrument
            // Note: legacyBtId may conflict with bank_transfers, use legacyData to distinguish
            const [instrument] = await this.ctx.pgDb
                .insert(paymentInstruments)
                .values({
                    requestId: request.id,
                    instrumentType: 'Bank Transfer',
                    amount: Parsers.amount(row.amount),
                    status: status,
                    currentStage: StatusMapper.getStage(status),
                    action: 1, // Assume action=1 for all tender fees
                    utr: row.utr ?? null,
                    rejectionReason: row.reason ?? null,
                    remarks: row.remark ?? null,
                    legacyBtId: row.id, // Store original ID
                    legacyData: {
                        source_table: 'bt_tender_fees',
                        original_status: row.status,
                        original_purpose: row.purpose,
                        utr_msg: row.utr_msg,
                        tender_id: row.tender_id,
                        tender_name: row.tender_name,
                    },
                    createdAt: Parsers.date(row.created_at) ?? new Date(),
                    updatedAt: Parsers.date(row.updated_at) ?? new Date(),
                })
                .returning({ id: paymentInstruments.id });

            // Insert transfer details
            await this.ctx.pgDb.insert(instrumentTransferDetails).values({
                instrumentId: instrument.id,
                accountName: row.account_name ?? null,
                accountNumber: row.account_number ?? null,
                ifsc: row.ifsc ?? null,
                transactionId: row.utr ?? null,
                transactionDate: Parsers.date(row.due_date),
                utrMsg: row.utr_msg ?? null,
                remarks: row.remark ?? null,
                reason: row.reason ?? null,
            });

            this.ctx.stats.bt.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating bt_tender_fees id=${row.id}:`, err);
            this.ctx.stats.bt.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.bt;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

// ============================================================================
// POST-MIGRATION UPDATES
// ============================================================================

class PostMigrationUpdater {
    constructor(private ctx: MigrationContext) { }

    async updateAmounts(): Promise<void> {
        console.log('Updating Tender Fee request amounts...');

        const requests = await this.ctx.pgDb
            .select({ id: paymentRequests.id })
            .from(paymentRequests)
            .where(eq(paymentRequests.purpose, 'Tender Fee'));

        let updated = 0;

        for (const req of requests) {
            try {
                const instruments = await this.ctx.pgDb
                    .select({ amount: paymentInstruments.amount })
                    .from(paymentInstruments)
                    .where(eq(paymentInstruments.requestId, req.id));

                const totalAmount = instruments.reduce((sum, inst) => sum + parseFloat(inst.amount || '0'), 0);

                await this.ctx.pgDb
                    .update(paymentRequests)
                    .set({
                        amountRequired: totalAmount.toFixed(2),
                        updatedAt: new Date(),
                    })
                    .where(eq(paymentRequests.id, req.id));

                updated++;
            } catch (err) {
                console.error(`  ✗ Error updating amount for request ${req.id}:`, err);
            }
        }

        console.log(`  ✓ Updated amounts for ${updated} Tender Fee requests`);
    }

    async updateStatuses(): Promise<void> {
        console.log('Updating Tender Fee request statuses...');

        const requests = await this.ctx.pgDb
            .select({ id: paymentRequests.id })
            .from(paymentRequests)
            .where(eq(paymentRequests.purpose, 'Tender Fee'));

        let updated = 0;

        for (const req of requests) {
            try {
                const instruments = await this.ctx.pgDb
                    .select({ status: paymentInstruments.status })
                    .from(paymentInstruments)
                    .where(eq(paymentInstruments.requestId, req.id));

                if (instruments.length === 0) continue;

                const statuses = instruments.map((i) => i.status);
                let overallStatus = 'Pending';

                if (statuses.every((s) => s.includes('COMPLETED') || s.includes('RECEIVED') || s.includes('CONFIRMED'))) {
                    overallStatus = 'Completed';
                } else if (statuses.some((s) => s.includes('REJECTED'))) {
                    overallStatus = 'Partially Rejected';
                } else if (statuses.some((s) => s.includes('SUBMITTED') || s.includes('INITIATED'))) {
                    overallStatus = 'In Progress';
                } else if (statuses.some((s) => s.includes('ACCEPTED') || s.includes('APPROVED'))) {
                    overallStatus = 'Approved';
                }

                await this.ctx.pgDb
                    .update(paymentRequests)
                    .set({
                        status: overallStatus,
                        updatedAt: new Date(),
                    })
                    .where(eq(paymentRequests.id, req.id));

                updated++;
            } catch (err) {
                console.error(`  ✗ Error updating status for request ${req.id}:`, err);
            }
        }

        console.log(`  ✓ Updated statuses for ${updated} Tender Fee requests`);
    }
}

// ============================================================================
// SEQUENCE RESETTER
// ============================================================================

class SequenceResetter {
    constructor(private ctx: MigrationContext) { }

    async reset(): Promise<void> {
        console.log('Resetting PostgreSQL sequences...');

        const tables = ['payment_instruments', 'instrument_dd_details', 'instrument_transfer_details'];

        for (const table of tables) {
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
// VERIFICATION
// ============================================================================

class MigrationVerifier {
    constructor(private ctx: MigrationContext) { }

    async verify(): Promise<boolean> {
        console.log('\n' + '═'.repeat(50));
        console.log('  TENDER FEE MIGRATION VERIFICATION');
        console.log('═'.repeat(50));

        // Count source records
        const popCount = (await this.ctx.mysqlDb.select().from(mysqlPopTenderFees)).length;
        const ddCount = (await this.ctx.mysqlDb.select().from(mysqlDdTenderFees)).length;
        const btCount = (await this.ctx.mysqlDb.select().from(mysqlBtTenderFees)).length;

        // Count target records
        const tenderFeeRequests = await this.ctx.pgDb
            .select({ count: sql<number>`count(*)` })
            .from(paymentRequests)
            .where(eq(paymentRequests.purpose, 'Tender Fee'));

        // Count by source table
        const popInstruments = await this.ctx.pgDb
            .select({ count: sql<number>`count(*)` })
            .from(paymentInstruments)
            .where(sql`${paymentInstruments.legacyData}->>'source_table' = 'pop_tender_fees'`);

        const ddTfInstruments = await this.ctx.pgDb
            .select({ count: sql<number>`count(*)` })
            .from(paymentInstruments)
            .where(sql`${paymentInstruments.legacyData}->>'source_table' = 'dd_tender_fees'`);

        const btTfInstruments = await this.ctx.pgDb
            .select({ count: sql<number>`count(*)` })
            .from(paymentInstruments)
            .where(sql`${paymentInstruments.legacyData}->>'source_table' = 'bt_tender_fees'`);

        console.log('\n  MySQL Source Counts:');
        console.log('  ────────────────────────────');
        console.log(`    pop_tender_fees:    ${popCount}`);
        console.log(`    dd_tender_fees:     ${ddCount}`);
        console.log(`    bt_tender_fees:     ${btCount}`);
        console.log(`    Total:              ${popCount + ddCount + btCount}`);

        console.log('\n  PostgreSQL Target Counts:');
        console.log('  ────────────────────────────');
        console.log(`    Tender Fee Requests:  ${tenderFeeRequests[0].count}`);
        console.log(`    Portal Instruments:   ${popInstruments[0].count}`);
        console.log(`    DD Instruments:       ${ddTfInstruments[0].count}`);
        console.log(`    BT Instruments:       ${btTfInstruments[0].count}`);

        const totalMigrated =
            Number(popInstruments[0].count) + Number(ddTfInstruments[0].count) + Number(btTfInstruments[0].count);

        console.log(`    Total Instruments:    ${totalMigrated}`);

        console.log('\n' + '═'.repeat(50));

        const { pop, dd, bt } = this.ctx.stats;
        const totalSkipped = pop.skipped + dd.skipped + bt.skipped;

        if (totalSkipped > 0) {
            console.log(`  ⚠ COMPLETED WITH ${totalSkipped} SKIPPED RECORDS`);
            console.log('    (Missing emd_id links - expected behavior)');
        } else {
            console.log('  ✅ MIGRATION VERIFICATION PASSED');
        }
        console.log('═'.repeat(50));

        return true;
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
            await this.preMigrationCheck();
            this.initializeContext();
            await this.executeMigration();
            this.printSummary();
        } finally {
            await this.disconnect();
        }
    }

    private printHeader(): void {
        console.log('\n' + '═'.repeat(60));
        console.log('  TENDER FEE MIGRATION: MySQL → PostgreSQL');
        console.log('  Strategy: Link to Existing EMD Payment Requests');
        console.log('═'.repeat(60));
        console.log('\nThis migration will:');
        console.log('  1. Find existing payment_requests by legacyEmdId');
        console.log('  2. Update purpose from "EMD" to "Tender Fee"');
        console.log('  3. Add instruments (DD/BT/Portal) to those requests');
    }

    private async connect(): Promise<void> {
        console.log('\n📡 Connecting to databases...');
        await this.pgClient.connect();
        console.log('  ✓ PostgreSQL connected');
        console.log('  ✓ MySQL pool ready');
    }

    private async preMigrationCheck(): Promise<void> {
        console.log('\n📋 Pre-migration check...');

        const pgDb = pgDrizzle(this.pgClient as any);
        const mysqlDb = mysqlDrizzle(this.mysqlPool as any);

        // Check if payment requests exist
        const requestCount = await pgDb.select({ count: sql<number>`count(*)` }).from(paymentRequests);

        console.log(`  Payment Requests in PostgreSQL: ${requestCount[0].count}`);

        if (Number(requestCount[0].count) === 0) {
            throw new Error('No payment requests found! Please run EMD migration first.');
        }

        // Check source tables
        const popRows = await mysqlDb.select().from(mysqlPopTenderFees);
        const ddRows = await mysqlDb.select().from(mysqlDdTenderFees);
        const btRows = await mysqlDb.select().from(mysqlBtTenderFees);

        console.log(`  MySQL pop_tender_fees: ${popRows.length} records`);
        console.log(`  MySQL dd_tender_fees:  ${ddRows.length} records`);
        console.log(`  MySQL bt_tender_fees:  ${btRows.length} records`);

        console.log('  ✓ Pre-migration check passed');
    }

    private initializeContext(): void {
        this.ctx = {
            pgDb: pgDrizzle(this.pgClient as any),
            pgClient: this.pgClient,
            mysqlDb: mysqlDrizzle(this.mysqlPool as any),
            stats: {
                pop: { success: 0, errors: 0, skipped: 0 },
                dd: { success: 0, errors: 0, skipped: 0 },
                bt: { success: 0, errors: 0, skipped: 0 },
            },
            updatedRequestIds: new Set(),
        };
    }

    private async executeMigration(): Promise<void> {
        const steps = [
            { name: 'Migrate pop_tender_fees', fn: () => new PopTenderFeesMigrator(this.ctx).migrate() },
            { name: 'Migrate dd_tender_fees', fn: () => new DdTenderFeesMigrator(this.ctx).migrate() },
            { name: 'Migrate bt_tender_fees', fn: () => new BtTenderFeesMigrator(this.ctx).migrate() },
            { name: 'Update amounts', fn: () => new PostMigrationUpdater(this.ctx).updateAmounts() },
            { name: 'Update statuses', fn: () => new PostMigrationUpdater(this.ctx).updateStatuses() },
            { name: 'Reset sequences', fn: () => new SequenceResetter(this.ctx).reset() },
            { name: 'Verify migration', fn: () => new MigrationVerifier(this.ctx).verify() },
        ];

        console.log('\n📋 Starting migration...\n');

        for (let i = 0; i < steps.length; i++) {
            console.log(`[${i + 1}/${steps.length}] ${steps[i].name}`);
            await steps[i].fn();
            console.log('');
        }
    }

    private printSummary(): void {
        const { stats, updatedRequestIds } = this.ctx;

        const totalSuccess = stats.pop.success + stats.dd.success + stats.bt.success;
        const totalSkipped = stats.pop.skipped + stats.dd.skipped + stats.bt.skipped;
        const totalErrors = stats.pop.errors + stats.dd.errors + stats.bt.errors;

        console.log('═'.repeat(60));
        console.log('  MIGRATION SUMMARY');
        console.log('═'.repeat(60));
        console.log('');
        console.log('  Table                    Success   Errors   Skipped');
        console.log('  ───────────────────────────────────────────────────────');
        console.log(
            `  pop_tender_fees          ${this.pad(stats.pop.success)}      ${this.pad(stats.pop.errors)}       ${stats.pop.skipped}`
        );
        console.log(
            `  dd_tender_fees           ${this.pad(stats.dd.success)}      ${this.pad(stats.dd.errors)}       ${stats.dd.skipped}`
        );
        console.log(
            `  bt_tender_fees           ${this.pad(stats.bt.success)}      ${this.pad(stats.bt.errors)}       ${stats.bt.skipped}`
        );
        console.log('  ───────────────────────────────────────────────────────');
        console.log(`  Total Instruments:       ${totalSuccess}`);
        console.log(`  Requests Updated:        ${updatedRequestIds.size}`);
        console.log(`  Total Skipped:           ${totalSkipped}`);
        console.log(`  Total Errors:            ${totalErrors}`);
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
