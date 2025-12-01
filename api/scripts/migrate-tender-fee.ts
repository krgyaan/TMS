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

// Import status constants
import {
    DD_STATUSES,
    BT_STATUSES,
    PORTAL_STATUSES,
} from '../src/modules/tendering/emds/constants/emd-statuses';

const PG_URL = 'postgresql://postgres:gyan@localhost:5432/new_tms';
const MYSQL_URL = 'mysql://root:gyan@localhost:3306/mydb';

const pgClient = new Client({ connectionString: PG_URL });
pgClient.connect();
const db = pgDrizzle(pgClient);

const mysqlPool = mysql2.createPool(MYSQL_URL);
const mysqlDb = mysqlDrizzle(mysqlPool);

// ==================== MySQL Table Definitions ====================

const pop_tender_fees = mysqlTable('pop_tender_fees', {
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

const dd_tender_fees = mysqlTable('dd_tender_fees', {
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

const bt_tender_fees = mysqlTable('bt_tender_fees', {
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

// ==================== Helper Functions ====================

const parseAmount = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined || val === '') return '0.00';
    if (typeof val === 'number') {
        return isNaN(val) ? '0.00' : val.toFixed(2);
    }
    const cleaned = val.toString().replace(/,/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? '0.00' : num.toFixed(2);
};

const parseDate = (val: string | Date | null | undefined): Date | null => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

const parseDateToString = (val: string | Date | null | undefined): string | null => {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
};

const parseCourierDeadline = (val: string | number | null | undefined): number | null => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return val;
    const num = parseInt(val.toString().trim(), 10);
    return isNaN(num) ? null : num;
};

// Status mapping for Portal Payment
const mapPortalStatus = (status: string | null): string => {
    if (!status) return PORTAL_STATUSES.ACCOUNTS_FORM_PENDING;
    const s = status.toLowerCase();

    if (s.includes('reject')) return PORTAL_STATUSES.ACCOUNTS_FORM_REJECTED;
    if (s.includes('accept') || s.includes('approve')) return PORTAL_STATUSES.ACCOUNTS_FORM_ACCEPTED;
    if (s.includes('complete') || s.includes('done') || s.includes('paid')) return PORTAL_STATUSES.PAYMENT_COMPLETED;
    if (s.includes('return')) return PORTAL_STATUSES.RETURN_COMPLETED;
    if (s.includes('request')) return PORTAL_STATUSES.ACCOUNTS_FORM_SUBMITTED;

    return PORTAL_STATUSES.ACCOUNTS_FORM_PENDING;
};

// Status mapping for DD
const mapDdStatus = (status: string | null): string => {
    if (!status) return DD_STATUSES.ACCOUNTS_FORM_PENDING;
    const s = status.toLowerCase();

    if (s.includes('reject')) return DD_STATUSES.ACCOUNTS_FORM_REJECTED;
    if (s.includes('accept') || s.includes('approve')) return DD_STATUSES.ACCOUNTS_FORM_ACCEPTED;
    if (s.includes('complete') || s.includes('done') || s.includes('issue')) return DD_STATUSES.FOLLOWUP_COMPLETED;
    if (s.includes('cancel')) return DD_STATUSES.CANCELLED_AT_BRANCH;
    if (s.includes('return')) return DD_STATUSES.COURIER_RETURN_RECEIVED;
    if (s.includes('request')) return DD_STATUSES.ACCOUNTS_FORM_SUBMITTED;
    if (s.includes('dispatch')) return DD_STATUSES.COURIER_RETURN_DISPATCHED;

    return DD_STATUSES.ACCOUNTS_FORM_PENDING;
};

// Status mapping for Bank Transfer
const mapBtStatus = (status: string | null): string => {
    if (!status) return BT_STATUSES.ACCOUNTS_FORM_PENDING;
    const s = status.toLowerCase();

    if (s.includes('reject')) return BT_STATUSES.ACCOUNTS_FORM_REJECTED;
    if (s.includes('accept') || s.includes('approve')) return BT_STATUSES.ACCOUNTS_FORM_ACCEPTED;
    if (s.includes('complete') || s.includes('done') || s.includes('paid')) return BT_STATUSES.PAYMENT_COMPLETED;
    if (s.includes('return')) return BT_STATUSES.RETURN_COMPLETED;
    if (s.includes('request')) return BT_STATUSES.ACCOUNTS_FORM_SUBMITTED;

    return BT_STATUSES.ACCOUNTS_FORM_PENDING;
};

const derivePaymentMethod = (netbanking: string | null, debitCard: string | null): string => {
    if (netbanking && (netbanking.toLowerCase() === 'yes' || netbanking === '1')) return 'Netbanking';
    if (debitCard && (debitCard.toLowerCase() === 'yes' || debitCard === '1')) return 'Debit Card';
    return 'Other';
};

const getStageFromStatus = (status: string): number => {
    if (status.includes('ACCOUNTS_FORM')) return 1;
    if (status.includes('FOLLOWUP')) return 2;
    if (status.includes('RETURN') || status.includes('COURIER')) return 3;
    if (status.includes('PAYMENT_COMPLETED') || status.includes('SETTLED')) return 4;
    return 1;
};

// ==================== Core Function ====================

/**
 * Find existing payment request by legacyEmdId
 */
async function findRequestByLegacyEmdId(legacyEmdId: number): Promise<{ id: number; purpose: string } | null> {
    const result = await db
        .select({
            id: paymentRequests.id,
            purpose: paymentRequests.purpose
        })
        .from(paymentRequests)
        .where(eq(paymentRequests.legacyEmdId, legacyEmdId))
        .limit(1);

    return result.length > 0 ? { id: result[0].id, purpose: result[0].purpose ?? 'EMD' } : null;
}

/**
 * Update payment request purpose to 'Tender Fee'
 */
async function updateRequestPurpose(requestId: number): Promise<void> {
    await db
        .update(paymentRequests)
        .set({
            purpose: 'Tender Fee',
            updatedAt: new Date()
        })
        .where(eq(paymentRequests.id, requestId));
}

// ==================== Migration Functions ====================

async function migratePOPTenderFees() {
    console.log('\nMigrating POP Tender Fees...');
    const rows = await mysqlDb.select().from(pop_tender_fees);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    const skippedRecords: { id: number; emd_id: number | null; reason: string }[] = [];

    for (const r of rows) {
        try {
            // Find existing payment request using legacyEmdId
            if (!r.emd_id) {
                skippedRecords.push({ id: Number(r.id), emd_id: null, reason: 'emd_id is NULL' });
                skipped++;
                continue;
            }

            const request = await findRequestByLegacyEmdId(Number(r.emd_id));

            if (!request) {
                skippedRecords.push({ id: Number(r.id), emd_id: Number(r.emd_id), reason: 'No payment request found' });
                skipped++;
                continue;
            }

            // Update purpose to 'Tender Fee'
            await updateRequestPurpose(request.id);

            const mappedStatus = mapPortalStatus(r.status);

            // Insert payment instrument
            const [instrument] = await db.insert(paymentInstruments).values({
                requestId: request.id,
                instrumentType: 'Portal Payment',
                amount: parseAmount(r.amount),
                status: mappedStatus,
                currentStage: getStageFromStatus(mappedStatus),
                utr: r.utr || null,
                rejectionReason: r.reason || null,
                remarks: r.remark || null,
                legacyPortalId: Number(r.id),
                legacyData: {
                    source_table: 'pop_tender_fees',
                    original_status: r.status,
                    original_purpose: r.purpose,
                    utr_msg: r.utr_msg,
                    portal_name: r.portal_name,
                },
                createdAt: parseDate(r.created_at) || new Date(),
                updatedAt: parseDate(r.updated_at) || new Date(),
            }).returning({ id: paymentInstruments.id });

            // Insert transfer details
            await db.insert(instrumentTransferDetails).values({
                instrumentId: instrument.id,
                portalName: r.portal_name || null,
                paymentMethod: derivePaymentMethod(r.netbanking_available, r.bank_debit_card),
                transactionId: r.utr || null,
                transactionDate: parseDate(r.due_date_time),
                isNetbanking: r.netbanking_available || null,
                isDebit: r.bank_debit_card || null,
                utrMsg: r.utr_msg || null,
                remarks: r.remark || null,
                reason: r.reason || null,
            });

            migrated++;
        } catch (error) {
            console.error(`  ❌ Error migrating POP tender fee ID ${r.id}:`, error);
            errors++;
        }
    }

    // Log skipped records
    if (skippedRecords.length > 0) {
        console.log(`  ⚠️ Skipped POP records:`);
        skippedRecords.forEach(rec => {
            console.log(`     - ID ${rec.id}: emd_id=${rec.emd_id}, reason: ${rec.reason}`);
        });
    }

    console.log(`  ✅ Migrated: ${migrated}, ⚠️ Skipped: ${skipped}, ❌ Errors: ${errors}`);
    return { migrated, skipped, errors, total: rows.length };
}

async function migrateDDTenderFees() {
    console.log('\nMigrating DD Tender Fees...');
    const rows = await mysqlDb.select().from(dd_tender_fees);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    const skippedRecords: { id: number; emd_id: number | null; reason: string }[] = [];

    for (const r of rows) {
        try {
            // Find existing payment request using legacyEmdId
            if (!r.emd_id) {
                skippedRecords.push({ id: Number(r.id), emd_id: null, reason: 'emd_id is NULL' });
                skipped++;
                continue;
            }

            const request = await findRequestByLegacyEmdId(Number(r.emd_id));

            if (!request) {
                skippedRecords.push({ id: Number(r.id), emd_id: Number(r.emd_id), reason: 'No payment request found' });
                skipped++;
                continue;
            }

            // Update purpose to 'Tender Fee'
            await updateRequestPurpose(request.id);

            const mappedStatus = mapDdStatus(r.status);

            // Insert payment instrument
            const [instrument] = await db.insert(paymentInstruments).values({
                requestId: request.id,
                instrumentType: 'DD',
                amount: parseAmount(r.dd_amount),
                favouring: r.in_favour_of || null,
                payableAt: r.dd_payable_at || null,
                status: mappedStatus,
                currentStage: getStageFromStatus(mappedStatus),
                courierAddress: r.courier_address || null,
                courierDeadline: parseCourierDeadline(r.dd_needed_in),
                rejectionReason: r.reason || null,
                remarks: r.remark || null,
                legacyDdId: Number(r.id),
                legacyData: {
                    source_table: 'dd_tender_fees',
                    original_status: r.status,
                    original_purpose: r.purpose_of_dd,
                    utr_msg: r.utr_msg,
                    delivery_date_time: r.delivery_date_time,
                },
                createdAt: parseDate(r.created_at) || new Date(),
                updatedAt: parseDate(r.updated_at) || new Date(),
            }).returning({ id: paymentInstruments.id });

            // Insert DD details
            await db.insert(instrumentDdDetails).values({
                instrumentId: instrument.id,
                ddNo: r.dd_no || null,
                ddDate: null,
                bankName: null,
                reqNo: null,
                ddNeeds: r.dd_needed_in || null,
                ddPurpose: r.purpose_of_dd || null,
                ddRemarks: r.remark || null,
            });

            migrated++;
        } catch (error) {
            console.error(`  ❌ Error migrating DD tender fee ID ${r.id}:`, error);
            errors++;
        }
    }

    // Log skipped records
    if (skippedRecords.length > 0) {
        console.log(`  ⚠️ Skipped DD records:`);
        skippedRecords.forEach(rec => {
            console.log(`     - ID ${rec.id}: emd_id=${rec.emd_id}, reason: ${rec.reason}`);
        });
    }

    console.log(`  ✅ Migrated: ${migrated}, ⚠️ Skipped: ${skipped}, ❌ Errors: ${errors}`);
    return { migrated, skipped, errors, total: rows.length };
}

async function migrateBTTenderFees() {
    console.log('\nMigrating BT Tender Fees...');
    const rows = await mysqlDb.select().from(bt_tender_fees);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    const skippedRecords: { id: number; emd_id: number | null; reason: string }[] = [];

    for (const r of rows) {
        try {
            // Find existing payment request using legacyEmdId
            if (!r.emd_id) {
                skippedRecords.push({ id: Number(r.id), emd_id: null, reason: 'emd_id is NULL' });
                skipped++;
                continue;
            }

            const request = await findRequestByLegacyEmdId(Number(r.emd_id));

            if (!request) {
                skippedRecords.push({ id: Number(r.id), emd_id: Number(r.emd_id), reason: 'No payment request found' });
                skipped++;
                continue;
            }

            // Update purpose to 'Tender Fee'
            await updateRequestPurpose(request.id);

            const mappedStatus = mapBtStatus(r.status);

            // Insert payment instrument
            const [instrument] = await db.insert(paymentInstruments).values({
                requestId: request.id,
                instrumentType: 'Bank Transfer',
                amount: parseAmount(r.amount),
                status: mappedStatus,
                currentStage: getStageFromStatus(mappedStatus),
                utr: r.utr || null,
                rejectionReason: r.reason || null,
                remarks: r.remark || null,
                legacyBtId: Number(r.id),
                legacyData: {
                    source_table: 'bt_tender_fees',
                    original_status: r.status,
                    original_purpose: r.purpose,
                    utr_msg: r.utr_msg,
                },
                createdAt: parseDate(r.created_at) || new Date(),
                updatedAt: parseDate(r.updated_at) || new Date(),
            }).returning({ id: paymentInstruments.id });

            // Insert transfer details
            await db.insert(instrumentTransferDetails).values({
                instrumentId: instrument.id,
                accountName: r.account_name || null,
                accountNumber: r.account_number || null,
                ifsc: r.ifsc || null,
                transactionId: r.utr || null,
                transactionDate: parseDate(r.due_date),
                utrMsg: r.utr_msg || null,
                remarks: r.remark || null,
                reason: r.reason || null,
            });

            migrated++;
        } catch (error) {
            console.error(`  ❌ Error migrating BT tender fee ID ${r.id}:`, error);
            errors++;
        }
    }

    // Log skipped records
    if (skippedRecords.length > 0) {
        console.log(`  ⚠️ Skipped BT records:`);
        skippedRecords.forEach(rec => {
            console.log(`     - ID ${rec.id}: emd_id=${rec.emd_id}, reason: ${rec.reason}`);
        });
    }

    console.log(`  ✅ Migrated: ${migrated}, ⚠️ Skipped: ${skipped}, ❌ Errors: ${errors}`);
    return { migrated, skipped, errors, total: rows.length };
}

// ==================== Post-Migration Updates ====================

async function updateTenderFeeRequestAmounts() {
    console.log('\nUpdating Tender Fee request amounts...');

    // Get all Tender Fee requests
    const requests = await db
        .select({ id: paymentRequests.id })
        .from(paymentRequests)
        .where(eq(paymentRequests.purpose, 'Tender Fee'));

    let updated = 0;

    for (const req of requests) {
        try {
            const instruments = await db
                .select({ amount: paymentInstruments.amount })
                .from(paymentInstruments)
                .where(eq(paymentInstruments.requestId, req.id));

            const totalAmount = instruments.reduce(
                (sum, inst) => sum + parseFloat(inst.amount || '0'),
                0
            );

            await db
                .update(paymentRequests)
                .set({
                    amountRequired: totalAmount.toFixed(2),
                    updatedAt: new Date(),
                })
                .where(eq(paymentRequests.id, req.id));

            updated++;
        } catch (error) {
            console.error(`  ❌ Failed to update amount for request ${req.id}:`, error);
        }
    }

    console.log(`  ✅ Updated amounts for ${updated} Tender Fee requests`);
}

async function updateTenderFeeRequestStatuses() {
    console.log('\nUpdating Tender Fee request statuses...');

    const requests = await db
        .select({ id: paymentRequests.id })
        .from(paymentRequests)
        .where(eq(paymentRequests.purpose, 'Tender Fee'));

    let updated = 0;

    for (const req of requests) {
        try {
            const instruments = await db
                .select({ status: paymentInstruments.status })
                .from(paymentInstruments)
                .where(eq(paymentInstruments.requestId, req.id));

            if (instruments.length === 0) continue;

            const statuses = instruments.map(i => i.status);
            let overallStatus = 'Pending';

            if (statuses.every(s => s.includes('COMPLETED') || s.includes('RECEIVED') || s.includes('CONFIRMED'))) {
                overallStatus = 'Completed';
            } else if (statuses.some(s => s.includes('REJECTED'))) {
                overallStatus = 'Partially Rejected';
            } else if (statuses.some(s => s.includes('SUBMITTED') || s.includes('INITIATED'))) {
                overallStatus = 'In Progress';
            } else if (statuses.some(s => s.includes('ACCEPTED') || s.includes('APPROVED'))) {
                overallStatus = 'Approved';
            }

            await db
                .update(paymentRequests)
                .set({
                    status: overallStatus,
                    updatedAt: new Date(),
                })
                .where(eq(paymentRequests.id, req.id));

            updated++;
        } catch (error) {
            console.error(`  ❌ Failed to update status for request ${req.id}:`, error);
        }
    }

    console.log(`  ✅ Updated statuses for ${updated} Tender Fee requests`);
}

// ==================== Verification ====================

async function verifyTenderFeeMigration() {
    console.log('\n========================================');
    console.log('TENDER FEE MIGRATION VERIFICATION');
    console.log('========================================\n');

    // Count source records
    const popCount = (await mysqlDb.select().from(pop_tender_fees)).length;
    const ddCount = (await mysqlDb.select().from(dd_tender_fees)).length;
    const btCount = (await mysqlDb.select().from(bt_tender_fees)).length;
    const totalSource = popCount + ddCount + btCount;

    // Count target records - Payment Requests with purpose 'Tender Fee'
    const tenderFeeRequests = await db
        .select({ count: sql<number>`count(*)` })
        .from(paymentRequests)
        .where(eq(paymentRequests.purpose, 'Tender Fee'));

    // Count instruments linked to Tender Fee requests
    const tenderFeeInstruments = await db
        .select({
            type: paymentInstruments.instrumentType,
            count: sql<number>`count(*)`
        })
        .from(paymentInstruments)
        .innerJoin(paymentRequests, eq(paymentInstruments.requestId, paymentRequests.id))
        .where(eq(paymentRequests.purpose, 'Tender Fee'))
        .groupBy(paymentInstruments.instrumentType);

    // Count instruments by source table (using legacyData)
    const popInstruments = await db
        .select({ count: sql<number>`count(*)` })
        .from(paymentInstruments)
        .where(sql`${paymentInstruments.legacyData}->>'source_table' = 'pop_tender_fees'`);

    const ddTfInstruments = await db
        .select({ count: sql<number>`count(*)` })
        .from(paymentInstruments)
        .where(sql`${paymentInstruments.legacyData}->>'source_table' = 'dd_tender_fees'`);

    const btTfInstruments = await db
        .select({ count: sql<number>`count(*)` })
        .from(paymentInstruments)
        .where(sql`${paymentInstruments.legacyData}->>'source_table' = 'bt_tender_fees'`);

    console.log('MySQL Source Counts:');
    console.log('--------------------');
    console.log(`  pop_tender_fees:    ${popCount}`);
    console.log(`  dd_tender_fees:     ${ddCount}`);
    console.log(`  bt_tender_fees:     ${btCount}`);
    console.log(`  Total:              ${totalSource}`);

    console.log('\nPostgreSQL Target Counts:');
    console.log('-------------------------');
    console.log(`  Payment Requests (Tender Fee): ${tenderFeeRequests[0].count}`);
    console.log('  Instruments by Type:');

    let totalInstruments = 0;
    for (const row of tenderFeeInstruments) {
        console.log(`    - ${row.type}: ${row.count}`);
        totalInstruments += Number(row.count);
    }
    console.log(`  Total Instruments:             ${totalInstruments}`);

    console.log('\n  Instruments by Source Table:');
    console.log(`    - pop_tender_fees: ${popInstruments[0].count}`);
    console.log(`    - dd_tender_fees:  ${ddTfInstruments[0].count}`);
    console.log(`    - bt_tender_fees:  ${btTfInstruments[0].count}`);

    // Verification
    console.log('\nVerification Results:');
    console.log('---------------------');

    const checks = [
        {
            name: 'pop_tender_fees → Portal Payment',
            source: popCount,
            target: Number(popInstruments[0].count),
        },
        {
            name: 'dd_tender_fees → DD',
            source: ddCount,
            target: Number(ddTfInstruments[0].count),
        },
        {
            name: 'bt_tender_fees → Bank Transfer',
            source: btCount,
            target: Number(btTfInstruments[0].count),
        },
    ];

    let allPassed = true;
    for (const check of checks) {
        const status = check.source === check.target ? '✅ PASS' : '❌ FAIL';
        const diff = check.target - check.source;
        const diffStr = diff === 0 ? '' : ` (${diff > 0 ? '+' : ''}${diff})`;
        console.log(`  ${check.name}: ${status} - Source: ${check.source}, Target: ${check.target}${diffStr}`);
        if (check.source !== check.target) allPassed = false;
    }

    console.log('\n========================================');
    if (allPassed) {
        console.log('✅ TENDER FEE MIGRATION VERIFICATION PASSED');
    } else {
        console.log('⚠️ TENDER FEE MIGRATION COMPLETED WITH SKIPS');
        console.log('   (Some records skipped due to missing emd_id links)');
    }
    console.log('========================================\n');

    return allPassed;
}

// ==================== Pre-Migration Check ====================

async function preMigrationCheck() {
    console.log('\n--- Pre-Migration Check ---\n');

    // Check if payment requests exist
    const requestCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(paymentRequests);

    console.log(`  Payment Requests in PostgreSQL: ${requestCount[0].count}`);

    if (Number(requestCount[0].count) === 0) {
        console.error('  ❌ ERROR: No payment requests found!');
        console.error('     Please run the EMD migration first.');
        return false;
    }

    // Check source tables
    const popRows = await mysqlDb.select().from(pop_tender_fees);
    const ddRows = await mysqlDb.select().from(dd_tender_fees);
    const btRows = await mysqlDb.select().from(bt_tender_fees);

    console.log(`  MySQL pop_tender_fees: ${popRows.length} records`);
    console.log(`  MySQL dd_tender_fees:  ${ddRows.length} records`);
    console.log(`  MySQL bt_tender_fees:  ${btRows.length} records`);

    // Check how many emd_ids exist in payment_requests
    const allEmdIds = new Set<number>();
    popRows.forEach(r => r.emd_id && allEmdIds.add(Number(r.emd_id)));
    ddRows.forEach(r => r.emd_id && allEmdIds.add(Number(r.emd_id)));
    btRows.forEach(r => r.emd_id && allEmdIds.add(Number(r.emd_id)));

    console.log(`\n  Unique emd_ids in tender fee tables: ${allEmdIds.size}`);

    // Check how many of these exist in payment_requests
    let foundCount = 0;
    let missingEmdIds: number[] = [];

    for (const emdId of allEmdIds) {
        const found = await db
            .select({ id: paymentRequests.id })
            .from(paymentRequests)
            .where(eq(paymentRequests.legacyEmdId, emdId))
            .limit(1);

        if (found.length > 0) {
            foundCount++;
        } else {
            missingEmdIds.push(emdId);
        }
    }

    console.log(`  Found in payment_requests: ${foundCount}/${allEmdIds.size}`);

    if (missingEmdIds.length > 0) {
        console.log(`  ⚠️ Missing emd_ids (will be skipped): ${missingEmdIds.join(', ')}`);
    }

    console.log('\n  ✅ Pre-migration check complete\n');
    return true;
}

// ==================== Main Runner ====================

async function runTenderFeeMigration() {
    const startTime = Date.now();

    console.log('=============================================');
    console.log('TENDER FEE MIGRATION: MySQL → PostgreSQL');
    console.log('Strategy: Option A - Link to Existing Requests');
    console.log('=============================================');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('\nThis migration will:');
    console.log('  1. Find existing payment_requests by legacyEmdId');
    console.log('  2. Update purpose from "EMD" to "Tender Fee"');
    console.log('  3. Add instruments (DD/BT/Portal Payment) to those requests');

    try {
        // Pre-migration check
        const checkPassed = await preMigrationCheck();
        if (!checkPassed) {
            throw new Error('Pre-migration check failed');
        }

        // Step 1: Migrate POP Tender Fees
        console.log('\n--- Step 1/5: POP Tender Fees ---');
        const popResult = await migratePOPTenderFees();

        // Step 2: Migrate DD Tender Fees
        console.log('\n--- Step 2/5: DD Tender Fees ---');
        const ddResult = await migrateDDTenderFees();

        // Step 3: Migrate BT Tender Fees
        console.log('\n--- Step 3/5: BT Tender Fees ---');
        const btResult = await migrateBTTenderFees();

        // Step 4: Update amounts
        console.log('\n--- Step 4/5: Update Amounts ---');
        await updateTenderFeeRequestAmounts();

        // Step 5: Update statuses
        console.log('\n--- Step 5/5: Update Statuses ---');
        await updateTenderFeeRequestStatuses();

        // Verification
        await verifyTenderFeeMigration();

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log('=============================================');
        console.log('MIGRATION SUMMARY');
        console.log('=============================================');
        console.log(`POP Tender Fees: ${popResult.migrated}/${popResult.total} (skipped: ${popResult.skipped})`);
        console.log(`DD Tender Fees:  ${ddResult.migrated}/${ddResult.total} (skipped: ${ddResult.skipped})`);
        console.log(`BT Tender Fees:  ${btResult.migrated}/${btResult.total} (skipped: ${btResult.skipped})`);
        console.log(`\nTotal Migrated:  ${popResult.migrated + ddResult.migrated + btResult.migrated}`);
        console.log(`Total Skipped:   ${popResult.skipped + ddResult.skipped + btResult.skipped}`);
        console.log(`Duration: ${duration} seconds`);
        console.log(`Finished at: ${new Date().toISOString()}`);
        console.log('=============================================\n');

    } catch (error) {
        console.error('\n=============================================');
        console.error('❌ MIGRATION FAILED');
        console.error('=============================================');
        console.error('Error:', error);
        throw error;
    } finally {
        await pgClient.end();
        await mysqlPool.end();
    }
}

// Run the migration
runTenderFeeMigration()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
