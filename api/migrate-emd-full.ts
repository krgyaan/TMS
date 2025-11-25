// migrate-emd-full.ts
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import { mysqlTable, varchar, bigint, text, date, timestamp, decimal } from 'drizzle-orm/mysql-core';
import { Client } from 'pg';
import {
    paymentRequests,
    paymentInstruments,
    instrumentDdDetails,
    instrumentFdrDetails,
    instrumentBgDetails,
    instrumentChequeDetails,
    instrumentTransferDetails,
} from './src/db/emds.schema';

const PG_URL = 'postgresql://postgres:gyan@localhost:5432/new_tms';
const MYSQL_URL = 'mysql://root:gyan@localhost:3306/mydb';

const pgClient = new Client({ connectionString: PG_URL });
pgClient.connect();
const db = pgDrizzle(pgClient);

const mysqlPool = mysql2.createPool(MYSQL_URL);
const mysqlDb = mysqlDrizzle(mysqlPool);

// Temporary MySQL table definitions (minimal)
const emds = mysqlTable('emds', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    type: varchar('type', { length: 50 }),
    tender_id: bigint('tender_id', { mode: 'number' }),
    tender_no: varchar('tender_no', { length: 500 }),
    project_name: varchar('project_name', { length: 255 }),
    due_date: timestamp('due_date'),
    requested_by: varchar('requested_by', { length: 200 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const emd_fdrs = mysqlTable('emd_fdrs', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    fdr_amt: varchar('fdr_amt', { length: 255 }),
    amount: varchar('amount', { length: 200 }),
    fdr_favour: varchar('fdr_favour', { length: 255 }),
    fdr_payable: varchar('fdr_payable', { length: 255 }),
    fdr_expiry: varchar('fdr_expiry', { length: 255 }),
    fdr_date: date('fdr_date'),
    status: varchar('status', { length: 100 }),
    utr: varchar('utr', { length: 200 }),
    docket_no: varchar('docket_no', { length: 200 }),
    courier_add: varchar('courier_add', { length: 255 }),
    courier_deadline: varchar('courier_deadline', { length: 20 }),
    generated_fdr: varchar('generated_fdr', { length: 500 }),
    fdrcancel_pdf: varchar('fdrcancel_pdf', { length: 500 }),
    docket_slip: varchar('docket_slip', { length: 255 }),
    covering_letter: varchar('covering_letter', { length: 500 }),
    remarks: text('remarks'),
    fdr_remark: text('fdr_remark'),
    action: varchar('action', { length: 50 }),
    fdr_no: varchar('fdr_no', { length: 200 }),
    fdr_source: varchar('fdr_source', { length: 200 }),
    fdr_purpose: varchar('fdr_purpose', { length: 500 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const emd_demand_drafts = mysqlTable('emd_demand_drafts', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    dd_amt: varchar('dd_amt', { length: 255 }),
    amount: varchar('amount', { length: 200 }),
    dd_favour: varchar('dd_favour', { length: 255 }),
    dd_payable: varchar('dd_payable', { length: 255 }),
    dd_date: date('dd_date'),
    status: varchar('status', { length: 100 }),
    utr: varchar('utr', { length: 200 }),
    docket_no: varchar('docket_no', { length: 200 }),
    courier_add: varchar('courier_add', { length: 255 }),
    generated_dd: varchar('generated_dd', { length: 500 }),
    ddcancel_pdf: varchar('ddcancel_pdf', { length: 500 }),
    docket_slip: varchar('docket_slip', { length: 255 }),
    remarks: varchar('remarks', { length: 200 }),
    action: varchar('action', { length: 50 }),
    dd_no: varchar('dd_no', { length: 200 }),
    req_no: varchar('req_no', { length: 200 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const emd_bgs = mysqlTable('emd_bgs', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    bg_amt: varchar('bg_amt', { length: 255 }),
    new_bg_amt: decimal('new_bg_amt', { precision: 20, scale: 2 }),
    bg_favour: varchar('bg_favour', { length: 255 }),
    bg_expiry: date('bg_expiry'),
    new_bg_expiry: date('new_bg_expiry'),
    bg_date: date('bg_date'),
    bg_validity: date('bg_validity'),
    claim_expiry: date('claim_expiry'),
    new_bg_claim: date('new_bg_claim'),
    docket_no: varchar('docket_no', { length: 255 }),
    docket_slip: varchar('docket_slip', { length: 255 }),
    reason_req: text('reason_req'),
    cancel_remark: text('cancel_remark'),
    generated_pdfs: text('generated_pdfs'),
    request_extension_pdf: varchar('request_extension_pdf', { length: 255 }),
    request_cancellation_pdf: varchar('request_cancellation_pdf', { length: 255 }),
    action: varchar('action', { length: 50 }),
    status: varchar('bg_req', { length: 255 }),
    bg_no: varchar('bg_no', { length: 255 }),
    bg_address: varchar('bg_address', { length: 255 }),
    bg_bank_name: varchar('bg_bank_name', { length: 255 }),
    new_bg_bank_name: varchar('new_bg_bank_name', { length: 255 }),
    bg_cont_percent: varchar('bg_cont_percent', { length: 255 }),
    bg_fdr_percent: varchar('bg_fdr_percent', { length: 255 }),
    bg_stamp: varchar('bg_stamp', { length: 255 }),
    new_stamp_charge_deducted: decimal('new_stamp_charge_deducted', { precision: 10, scale: 2 }),
    stamp_charge_deducted: varchar('stamp_charge_deducted', { length: 200 }),
    sfms_charge_deducted: varchar('sfms_charge_deducted', { length: 200 }),
    other_charge_deducted: varchar('other_charge_deducted', { length: 255 }),
    ext_letter: varchar('ext_letter', { length: 255 }),
    prefilled_signed_bg: text('prefilled_signed_bg'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const emd_cheques = mysqlTable('emd_cheques', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    cheque_amt: varchar('cheque_amt', { length: 255 }),
    amount: varchar('amount', { length: 200 }),
    cheque_favour: varchar('cheque_favour', { length: 255 }),
    cheque_date: varchar('cheque_date', { length: 255 }),
    status: varchar('status', { length: 200 }),
    utr: varchar('utr', { length: 200 }),
    reason: varchar('reason', { length: 200 }),
    stop_reason_text: text('stop_reason_text'),
    generated_pdfs: text('generated_pdfs'),
    action: varchar('action', { length: 50 }),
    cheq_no: varchar('cheq_no', { length: 200 }),
    cheque_bank: varchar('cheque_bank', { length: 255 }),
    cheq_img: varchar('cheq_img', { length: 200 }),
    cancelled_img: varchar('cancelled_img', { length: 200 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const bank_transfers = mysqlTable('bank_transfers', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    bt_amount: varchar('bt_amount', { length: 200 }),
    status: varchar('status', { length: 200 }),
    utr: varchar('utr', { length: 200 }),
    utr_num: varchar('utr_num', { length: 200 }),
    bt_acc_name: varchar('bt_acc_name', { length: 255 }),
    bt_acc: varchar('bt_acc', { length: 255 }),
    bt_ifsc: varchar('bt_ifsc', { length: 255 }),
    date_time: timestamp('date_time'),
    transfer_date: date('transfer_date'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const pay_on_portals = mysqlTable('pay_on_portals', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    amount: varchar('amount', { length: 255 }),
    status: varchar('status', { length: 255 }),
    utr: varchar('utr', { length: 200 }),
    utr_num: varchar('utr_num', { length: 200 }),
    portal: varchar('portal', { length: 255 }),
    is_netbanking: varchar('is_netbanking', { length: 255 }),
    is_debit: varchar('is_debit', { length: 255 }),
    date_time: timestamp('date_time'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// Mapping: old emd_id → new payment_requests.id
const emdToRequestMap = new Map<number, number>();

const parseAmount = (val: string | null): string => {
    if (!val) return '0.00';
    const num = parseFloat(val.replace(/,/g, '').trim());
    return isNaN(num) ? '0.00' : num.toFixed(2);
};

const parseDate = (val: string | Date | null): Date | null => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

const parseDateToString = (val: string | Date | null): string | null => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
};

const mapStatus = (status: string | null): 'Pending' | 'Requested' | 'Approved' | 'Issued' | 'Dispatched' | 'Received' | 'Returned' | 'Cancelled' | 'Refunded' | 'Encashed' | 'Extended' => {
    if (!status) return 'Pending';
    const s = status.toLowerCase();
    if (s.includes('cancel')) return 'Cancelled';
    if (s.includes('refund')) return 'Refunded';
    if (s.includes('return')) return 'Returned';
    if (s.includes('encash')) return 'Encashed';
    if (s.includes('extend')) return 'Extended';
    return 'Issued';
};

async function migratePaymentRequests() {
    console.log('Migrating payment_requests...');
    const rows = await mysqlDb.select().from(emds);

    for (const r of rows) {
        const newId = await db.insert(paymentRequests).values({
            tenderId: Number(r.tender_id || 0),
            type: (r.type as 'TMS' | 'Other Than TMS' | 'Old Entries' | 'Other Than Tender') || 'TMS',
            tenderNo: r.tender_no || 'NA',
            projectName: r.project_name || null,
            purpose: 'EMD',
            amountRequired: parseAmount(r.amount),
            dueDate: parseDate(r.due_date),
            requestedBy: r.requested_by || null,
            legacyEmdId: Number(r.id),
            status: 'Pending',
            createdAt: parseDate(r.created_at) || new Date(),
            updatedAt: parseDate(r.updated_at) || new Date(),
        }).returning({ id: paymentRequests.id });

        emdToRequestMap.set(Number(r.id), newId[0].id);
    }
    console.log(`Migrated ${emdToRequestMap.size} payment requests`);
}

async function migrateFDRs() {
    console.log('Migrating FDRs...');
    const rows = await mysqlDb.select().from(emd_fdrs);
    for (const r of rows) {
        const requestId = emdToRequestMap.get(r.emd_id);
        if (!requestId) continue;

        const instId = await db.insert(paymentInstruments).values({
            requestId,
            instrumentType: 'FDR',
            amount: parseAmount(r.fdr_amt || r.amount),
            favouring: r.fdr_favour || r.fdr_payable,
            payableAt: r.fdr_payable,
            issueDate: parseDateToString(r.fdr_date),
            expiryDate: parseDateToString(r.fdr_expiry),
            status: mapStatus(r.status),
            utr: r.utr || r.utr_num,
            docketNo: r.docket_no,
            courierAddress: r.courier_add || r.courier_address,
            courierDeadline: r.courier_deadline ? Number(r.courier_deadline) : null,
            generatedPdf: r.generated_fdr,
            cancelPdf: r.fdrcancel_pdf,
            docketSlip: r.docket_slip,
            coveringLetter: r.covering_letter,
            rejectionReason: r.remarks || r.fdr_remark,
            action: r.action ? Number(r.action) : null,
            extraPdfPaths: r.generated_pdfs ? r.generated_pdfs : null,
            createdAt: parseDate(r.created_at) || new Date(),
            updatedAt: parseDate(r.updated_at) || new Date(),
        }).returning({ id: paymentInstruments.id });

        await db.insert(instrumentFdrDetails).values({
            instrumentId: instId[0].id,
            fdrNo: r.fdr_no,
            fdrDate: parseDateToString(r.fdr_date),
            fdrSource: r.fdr_source,
            fdrPurpose: r.fdr_purpose,
        });
    }
}

async function migrateDDs() {
    console.log('Migrating Demand Drafts...');
    const rows = await mysqlDb.select().from(emd_demand_drafts);
    for (const r of rows) {
        const requestId = emdToRequestMap.get(r.emd_id);
        if (!requestId) continue;

        const instId = await db.insert(paymentInstruments).values({
            requestId,
            instrumentType: 'DD',
            amount: parseAmount(r.dd_amt || r.amount),
            favouring: r.dd_favour,
            payableAt: r.dd_payable,
            issueDate: parseDateToString(r.dd_date),
            status: mapStatus(r.status),
            utr: r.utr || r.utr_num,
            docketNo: r.docket_no,
            courierAddress: r.courier_add,
            generatedPdf: r.generated_dd,
            cancelPdf: r.ddcancel_pdf,
            docketSlip: r.docket_slip,
            rejectionReason: r.remarks,
            action: r.action ? Number(r.action) : null,
            createdAt: parseDate(r.created_at) || new Date(),
            updatedAt: parseDate(r.updated_at) || new Date(),
        }).returning({ id: paymentInstruments.id });

        await db.insert(instrumentDdDetails).values({
            instrumentId: instId[0].id,
            ddNo: r.dd_no,
            ddDate: parseDateToString(r.dd_date),
            bankName: r.bank_name || null,
            reqNo: r.req_no,
        });
    }
}

async function migrateBGs() {
    console.log('Migrating BGs...');
    const rows = await mysqlDb.select().from(emd_bgs);
    for (const r of rows) {
        const requestId = emdToRequestMap.get(r.emd_id);
        if (!requestId) continue;

        const instId = await db.insert(paymentInstruments).values({
            requestId,
            instrumentType: 'BG',
            amount: parseAmount(r.new_bg_amt || r.bg_amt),
            favouring: r.bg_favour,
            issueDate: parseDateToString(r.bg_date),
            expiryDate: parseDateToString(r.new_bg_expiry || r.bg_expiry),
            validityDate: parseDateToString(r.bg_validity || r.new_bg_expiry),
            claimExpiryDate: parseDateToString(r.claim_expiry || r.new_bg_claim),
            status: mapStatus(r.status || (r.new_bg_amt ? 'Extended' : 'Issued')),
            docketNo: r.docket_no,
            docketSlip: r.docket_slip,
            rejectionReason: r.reason_req || r.cancel_remark,
            extraPdfPaths: r.generated_pdfs ? r.generated_pdfs : null,
            extensionRequestPdf: r.request_extension_pdf,
            cancellationRequestPdf: r.request_cancellation_pdf,
            action: r.action ? Number(r.action) : null,
            createdAt: parseDate(r.created_at) || new Date(),
            updatedAt: parseDate(r.updated_at) || new Date(),
        }).returning({ id: paymentInstruments.id });

        await db.insert(instrumentBgDetails).values({
            instrumentId: instId[0].id,
            bgNo: r.bg_no,
            bgDate: parseDateToString(r.bg_date),
            validityDate: parseDateToString(r.bg_validity || r.new_bg_expiry),
            claimExpiryDate: parseDateToString(r.claim_expiry || r.new_bg_claim),
            beneficiaryName: r.bg_favour,
            beneficiaryAddress: r.bg_address,
            bankName: r.new_bg_bank_name || r.bg_bank_name,
            cashMarginPercent: parseAmount(r.bg_cont_percent),
            fdrMarginPercent: parseAmount(r.bg_fdr_percent),
            stampCharges: parseAmount(r.bg_stamp || r.new_stamp_charge_deducted),
            sfmsCharges: null,
            stampChargesDeducted: parseAmount(r.new_stamp_charge_deducted || r.stamp_charge_deducted),
            sfmsChargesDeducted: parseAmount(r.sfms_charge_deducted),
            otherChargesDeducted: parseAmount(r.other_charge_deducted),
            extendedAmount: parseAmount(r.new_bg_amt),
            extendedValidityDate: parseDateToString(r.new_bg_expiry),
            extendedClaimExpiryDate: parseDateToString(r.new_bg_claim),
            extendedBankName: r.new_bg_bank_name,
            extensionLetterPath: r.ext_letter,
            cancellationLetterPath: r.cancellation_letter_path || null,
            prefilledSignedBg: r.prefilled_signed_bg,
        });
    }
}

async function migrateCheques() {
    console.log('Migrating Cheques...');
    const rows = await mysqlDb.select().from(emd_cheques);
    for (const r of rows) {
        const requestId = emdToRequestMap.get(r.emd_id);
        if (!requestId) continue;

        const instId = await db.insert(paymentInstruments).values({
            requestId,
            instrumentType: 'Cheque',
            amount: parseAmount(r.cheque_amt || r.amount),
            favouring: r.cheque_favour,
            issueDate: parseDateToString(r.cheque_date),
            status: mapStatus(r.status),
            utr: r.utr || r.utr_num,
            rejectionReason: r.reason || r.stop_reason_text,
            generatedPdf: r.generated_pdfs,
            action: r.action ? Number(r.action) : null,
            createdAt: parseDate(r.created_at) || new Date(),
            updatedAt: parseDate(r.updated_at) || new Date(),
        }).returning({ id: paymentInstruments.id });

        await db.insert(instrumentChequeDetails).values({
            instrumentId: instId[0].id,
            chequeNo: r.cheq_no,
            chequeDate: parseDateToString(r.cheque_date),
            bankName: r.cheque_bank,
            chequeImagePath: r.cheq_img,
            cancelledImagePath: r.cancelled_img,
        });
    }
}

async function migrateBankTransfers() {
    console.log('Migrating Bank Transfers...');
    const rows = await mysqlDb.select().from(bank_transfers);
    for (const r of rows) {
        const requestId = emdToRequestMap.get(r.emd_id);
        if (!requestId) continue;

        const instId = await db.insert(paymentInstruments).values({
            requestId,
            instrumentType: 'Bank Transfer',
            amount: parseAmount(r.bt_amount),
            status: mapStatus(r.status),
            utr: r.utr || r.utr_num,
            createdAt: parseDate(r.created_at) || new Date(),
            updatedAt: parseDate(r.updated_at) || new Date(),
        }).returning({ id: paymentInstruments.id });

        await db.insert(instrumentTransferDetails).values({
            instrumentId: instId[0].id,
            accountName: r.bt_acc_name,
            accountNumber: r.bt_acc,
            ifsc: r.bt_ifsc,
            transactionId: r.utr || r.utr_num,
            transactionDate: parseDate(r.date_time || r.transfer_date),
        });
    }
}

async function migratePortalPayments() {
    console.log('Migrating Portal Payments...');
    const rows = await mysqlDb.select().from(pay_on_portals);
    for (const r of rows) {
        const requestId = emdToRequestMap.get(r.emd_id);
        if (!requestId) continue;

        const instId = await db.insert(paymentInstruments).values({
            requestId,
            instrumentType: 'Portal Payment',
            amount: parseAmount(r.amount),
            status: mapStatus(r.status),
            utr: r.utr || r.utr_num,
            createdAt: parseDate(r.created_at) || new Date(),
            updatedAt: parseDate(r.updated_at) || new Date(),
        }).returning({ id: paymentInstruments.id });

        await db.insert(instrumentTransferDetails).values({
            instrumentId: instId[0].id,
            portalName: r.portal,
            paymentMethod: r.is_netbanking ? 'Netbanking' : r.is_debit ? 'Debit Card' : 'Other',
            transactionId: r.utr || r.utr_num,
            transactionDate: parseDate(r.date_time),
        });
    }
}

async function runMigration() {
    console.log('Starting full EMD migration...');
    await migratePaymentRequests();
    await Promise.all([
        migrateFDRs(),
        migrateDDs(),
        migrateBGs(),
        migrateCheques(),
        migrateBankTransfers(),
        migratePortalPayments(),
    ]);
    console.log('Migration completed successfully!');
    process.exit(0);
}

runMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
