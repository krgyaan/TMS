import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import { mysqlTable, varchar, bigint, text, decimal, timestamp, datetime } from 'drizzle-orm/mysql-core';
import { eq } from 'drizzle-orm';
import { Client } from 'pg';
import {
    paymentRequests,
    paymentInstruments,
    instrumentDdDetails,
    instrumentTransferDetails,
} from './src/db/emds.schema';

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

const parseAmount = (val: string | number | null): string => {
    if (!val) return '0.00';
    const num = typeof val === 'number' ? val : parseFloat(val.replace(/,/g, '').trim());
    return isNaN(num) ? '0.00' : num.toFixed(2);
};

const parseDate = (val: string | Date | null): Date | null => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

const mapStatus = (status: string | null): 'Pending' | 'Requested' | 'Approved' | 'Issued' | 'Dispatched' | 'Received' | 'Returned' | 'Cancelled' | 'Refunded' | 'Encashed' | 'Extended' => {
    if (!status) return 'Pending';
    const s = status.toLowerCase();
    if (s.includes('cancel')) return 'Cancelled';
    if (s.includes('refund')) return 'Refunded';
    if (s.includes('return')) return 'Returned';
    if (s.includes('complete') || s.includes('done') || s.includes('paid')) return 'Issued';
    if (s.includes('approve')) return 'Approved';
    if (s.includes('request')) return 'Requested';
    if (s.includes('dispatch')) return 'Dispatched';
    if (s.includes('receive')) return 'Received';
    return 'Pending';
};

const derivePaymentMethod = (netbanking: string | null, debitCard: string | null): string => {
    if (netbanking && netbanking.toLowerCase() === 'yes') return 'Netbanking';
    if (debitCard && debitCard.toLowerCase() === 'yes') return 'Debit Card';
    return 'Other';
};

// Find existing paymentRequest by legacyEmdId
async function findRequestByLegacyEmdId(legacyEmdId: number): Promise<number | null> {
    const result = await db
        .select({ id: paymentRequests.id })
        .from(paymentRequests)
        .where(eq(paymentRequests.legacyEmdId, legacyEmdId))
        .limit(1);

    return result.length > 0 ? result[0].id : null;
}

// ==================== Migration Functions ====================

async function migratePOPTenderFeeInstruments() {
    console.log('Migrating POP Tender Fee Instruments...');
    const rows = await mysqlDb.select().from(pop_tender_fees);

    let migrated = 0;
    let skipped = 0;

    for (const r of rows) {
        // Find existing paymentRequest using legacyEmdId
        const requestId = r.emd_id ? await findRequestByLegacyEmdId(Number(r.emd_id)) : null;

        if (!requestId) {
            console.warn(`  ⚠️ No paymentRequest found for emd_id=${r.emd_id}, skipping POP tender fee id=${r.id}`);
            skipped++;
            continue;
        }

        // Update the purpose to 'Tender Fee' if needed
        await db.update(paymentRequests)
            .set({ purpose: 'Tender Fee' })
            .where(eq(paymentRequests.id, requestId));

        // Insert payment instrument
        const [instrument] = await db.insert(paymentInstruments).values({
            requestId,
            instrumentType: 'Portal Payment',
            amount: parseAmount(r.amount),
            status: mapStatus(r.status),
            utr: r.utr || null,
            rejectionReason: r.reason || null,
            remarks: r.utr_msg || r.remark || null,
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
        });

        migrated++;
    }

    console.log(`  ✅ Migrated: ${migrated}, ⚠️ Skipped: ${skipped}`);
}

async function migrateDDTenderFeeInstruments() {
    console.log('Migrating DD Tender Fee Instruments...');
    const rows = await mysqlDb.select().from(dd_tender_fees);

    let migrated = 0;
    let skipped = 0;

    for (const r of rows) {
        const requestId = r.emd_id ? await findRequestByLegacyEmdId(Number(r.emd_id)) : null;

        if (!requestId) {
            console.warn(`  ⚠️ No paymentRequest found for emd_id=${r.emd_id}, skipping DD tender fee id=${r.id}`);
            skipped++;
            continue;
        }

        // Update the purpose to 'Tender Fee'
        await db.update(paymentRequests)
            .set({ purpose: 'Tender Fee' })
            .where(eq(paymentRequests.id, requestId));

        // Insert payment instrument
        const [instrument] = await db.insert(paymentInstruments).values({
            requestId,
            instrumentType: 'DD',
            amount: parseAmount(r.dd_amount),
            favouring: r.in_favour_of || null,
            payableAt: r.dd_payable_at || null,
            status: mapStatus(r.status),
            courierAddress: r.courier_address || null,
            courierDeadline: r.dd_needed_in ? parseInt(r.dd_needed_in) || null : null,
            rejectionReason: r.reason || null,
            remarks: r.utr_msg || r.remark || null,
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
        });

        migrated++;
    }

    console.log(`  ✅ Migrated: ${migrated}, ⚠️ Skipped: ${skipped}`);
}

async function migrateBTTenderFeeInstruments() {
    console.log('Migrating BT Tender Fee Instruments...');
    const rows = await mysqlDb.select().from(bt_tender_fees);

    let migrated = 0;
    let skipped = 0;

    for (const r of rows) {
        const requestId = r.emd_id ? await findRequestByLegacyEmdId(Number(r.emd_id)) : null;

        if (!requestId) {
            console.warn(`  ⚠️ No paymentRequest found for emd_id=${r.emd_id}, skipping BT tender fee id=${r.id}`);
            skipped++;
            continue;
        }

        // Update the purpose to 'Tender Fee'
        await db.update(paymentRequests)
            .set({ purpose: 'Tender Fee' })
            .where(eq(paymentRequests.id, requestId));

        // Insert payment instrument
        const [instrument] = await db.insert(paymentInstruments).values({
            requestId,
            instrumentType: 'Bank Transfer',
            amount: parseAmount(r.amount),
            status: mapStatus(r.status),
            utr: r.utr || null,
            rejectionReason: r.reason || null,
            remarks: r.utr_msg || r.remark || null,
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
        });

        migrated++;
    }

    console.log(`  ✅ Migrated: ${migrated}, ⚠️ Skipped: ${skipped}`);
}

// ==================== Main Runner ====================

async function runTenderFeeInstrumentMigration() {
    console.log('=========================================');
    console.log('Starting Tender Fee INSTRUMENTS Migration');
    console.log('(Using existing paymentRequests via legacyEmdId)');
    console.log('=========================================\n');

    await migratePOPTenderFeeInstruments();
    await migrateDDTenderFeeInstruments();
    await migrateBTTenderFeeInstruments();

    console.log('\n=========================================');
    console.log('Tender Fee Instruments migration completed!');
    console.log('=========================================');

    await pgClient.end();
    await mysqlPool.end();
    process.exit(0);
}

runTenderFeeInstrumentMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
