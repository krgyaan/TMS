// migrate-emd-full.ts
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import { mysqlTable, varchar, bigint, text, date, timestamp, decimal, int } from 'drizzle-orm/mysql-core';
import { Client } from 'pg';
import { eq, sql } from 'drizzle-orm';
import {
    paymentRequests,
    paymentInstruments,
    instrumentDdDetails,
    instrumentFdrDetails,
    instrumentBgDetails,
    instrumentChequeDetails,
    instrumentTransferDetails,
} from './src/db/emds.schema';

// Import status constants
import {
    DD_STATUSES,
    FDR_STATUSES,
    BG_STATUSES,
    CHEQUE_STATUSES,
    BT_STATUSES,
    PORTAL_STATUSES,
} from './src/modules/tendering/emds/constants/emd-statuses';

// ============================================
// DATABASE CONNECTIONS
// ============================================

const PG_URL = 'postgresql://postgres:gyan@localhost:5432/new_tms';
const MYSQL_URL = 'mysql://root:gyan@localhost:3306/mydb';

const pgClient = new Client({ connectionString: PG_URL });
pgClient.connect();
const db = pgDrizzle(pgClient);

const mysqlPool = mysql2.createPool(MYSQL_URL);
const mysqlDb = mysqlDrizzle(mysqlPool);

// ============================================
// MYSQL TABLE DEFINITIONS
// ============================================

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
    fdr_favour: varchar('fdr_favour', { length: 255 }),
    fdr_amt: varchar('fdr_amt', { length: 255 }),
    fdr_expiry: varchar('fdr_expiry', { length: 255 }),
    fdr_needs: varchar('fdr_needs', { length: 255 }),
    courier_deadline: int('courier_deadline'),
    courier_add: varchar('courier_add', { length: 255 }),
    fdr_no: varchar('fdr_no', { length: 200 }),
    fdr_date: date('fdr_date'),
    action: int('action'),
    fdr_source: varchar('fdr_source', { length: 200 }),
    fdr_remark: text('fdr_remark'),
    fdr_payable: varchar('fdr_payable', { length: 255 }),
    remarks: text('remarks'),
    status: varchar('status', { length: 100 }),
    generated_fdr: varchar('generated_fdr', { length: 500 }),
    fdrcancel_pdf: varchar('fdrcancel_pdf', { length: 500 }),
    req_receive: varchar('req_receive', { length: 500 }),
    covering_letter: varchar('covering_letter', { length: 500 }),
    req_no: varchar('req_no', { length: 200 }),
    docket_no: varchar('docket_no', { length: 200 }),
    docket_slip: varchar('docket_slip', { length: 255 }),
    transfer_date: date('transfer_date'),
    utr: varchar('utr', { length: 200 }),
    reference_no: varchar('reference_no', { length: 200 }),
    date: date('date'),
    amount: varchar('amount', { length: 200 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const emd_demand_drafts = mysqlTable('emd_demand_drafts', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    dd_favour: varchar('dd_favour', { length: 255 }),
    dd_amt: varchar('dd_amt', { length: 255 }),
    dd_payable: varchar('dd_payable', { length: 255 }),
    dd_needs: varchar('dd_needs', { length: 255 }),
    dd_purpose: varchar('dd_purpose', { length: 255 }),
    courier_add: varchar('courier_add', { length: 255 }),
    courier_deadline: varchar('courier_deadline', { length: 20 }),
    action: int('action'),
    status: varchar('status', { length: 100 }),
    dd_date: date('dd_date'),
    dd_no: varchar('dd_no', { length: 200 }),
    req_no: varchar('req_no', { length: 200 }),
    remarks: varchar('remarks', { length: 200 }),
    generated_dd: varchar('generated_dd', { length: 500 }),
    docket_no: varchar('docket_no', { length: 200 }),
    docket_slip: varchar('docket_slip', { length: 255 }),
    transfer_date: date('transfer_date'),
    utr: varchar('utr', { length: 200 }),
    ddcancel_pdf: varchar('ddcancel_pdf', { length: 500 }),
    date: date('date'),
    amount: varchar('amount', { length: 200 }),
    reference_no: varchar('reference_no', { length: 200 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const emd_bgs = mysqlTable('emd_bgs', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    bg_favour: varchar('bg_favour', { length: 255 }),
    bg_address: varchar('bg_address', { length: 255 }),
    bg_expiry: date('bg_expiry'),
    bg_claim: date('bg_claim'),
    bg_amt: varchar('bg_amt', { length: 255 }),
    bg_bank: varchar('bg_bank', { length: 255 }),
    bg_cont_percent: varchar('bg_cont_percent', { length: 255 }),
    bg_fdr_percent: varchar('bg_fdr_percent', { length: 255 }),
    bg_needs: varchar('bg_needs', { length: 255 }),
    bg_purpose: varchar('bg_purpose', { length: 255 }),
    bg_stamp: varchar('bg_stamp', { length: 255 }),
    bg_courier_addr: varchar('bg_courier_addr', { length: 255 }),
    bg_courier_deadline: varchar('bg_courier_deadline', { length: 20 }),
    bg_soft_copy: varchar('bg_soft_copy', { length: 255 }),
    bg_po: varchar('bg_po', { length: 255 }),
    bg_client_user: varchar('bg_client_user', { length: 255 }),
    bg_client_cp: varchar('bg_client_cp', { length: 255 }),
    bg_client_fin: varchar('bg_client_fin', { length: 255 }),
    bg_bank_name: varchar('bg_bank_name', { length: 255 }),
    bg_bank_acc: varchar('bg_bank_acc', { length: 255 }),
    bg_bank_ifsc: varchar('bg_bank_ifsc', { length: 255 }),
    action: varchar('action', { length: 50 }),
    status: varchar('bg_req', { length: 255 }),
    reason_req: text('reason_req'),
    approve_bg: varchar('approve_bg', { length: 255 }),
    bg_format_te: varchar('bg_format_te', { length: 255 }),
    bg_format_tl: varchar('bg_format_imran', { length: 255 }),
    prefilled_signed_bg: text('prefilled_signed_bg'),
    bg_no: varchar('bg_no', { length: 255 }),
    bg_date: date('bg_date'),
    bg_validity: date('bg_validity'),
    claim_expiry: date('claim_expiry'),
    courier_no: varchar('courier_no', { length: 255 }),
    bg2_remark: text('bg2_remark'),
    sfms_conf: varchar('sfms_conf', { length: 255 }),
    fdr_amt: varchar('fdr_amt', { length: 255 }),
    fdr_per: varchar('fdr_per', { length: 255 }),
    fdr_copy: varchar('fdr_copy', { length: 255 }),
    fdr_no: varchar('fdr_no', { length: 255 }),
    fdr_validity: date('fdr_validity'),
    fdr_roi: varchar('fdr_roi', { length: 255 }),
    bg_charge_deducted: varchar('bg_charge_deducted', { length: 255 }),
    sfms_charge_deducted: varchar('sfms_charge_deducted', { length: 255 }),
    stamp_charge_deducted: varchar('stamp_charge_deducted', { length: 255 }),
    other_charge_deducted: varchar('other_charge_deducted', { length: 255 }),
    new_stamp_charge_deducted: decimal('new_stamp_charge_deducted', { precision: 10, scale: 2 }),
    new_bg_bank_name: varchar('new_bg_bank_name', { length: 255 }),
    new_bg_amt: decimal('new_bg_amt', { precision: 20, scale: 2 }),
    new_bg_expiry: date('new_bg_expiry'),
    new_bg_claim: decimal('new_bg_claim', { precision: 10, scale: 2 }),
    ext_letter: varchar('ext_letter', { length: 255 }),
    request_extension_pdf: varchar('request_extension_pdf', { length: 255 }),
    docket_no: varchar('docket_no', { length: 255 }),
    docket_slip: varchar('docket_slip', { length: 255 }),
    stamp_covering_letter: varchar('stamp_covering_letter', { length: 255 }),
    request_cancellation_pdf: varchar('request_cancellation_pdf', { length: 255 }),
    cancel_remark: text('cancel_remark'),
    cancell_confirm: text('cancell_confirm'),
    bg_fdr_cancel_date: varchar('bg_fdr_cancel_date', { length: 255 }),
    bg_fdr_cancel_amount: varchar('bg_fdr_cancel_amount', { length: 255 }),
    bg_fdr_cancel_ref_no: varchar('bg_fdr_cancel_ref_no', { length: 255 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const emd_cheques = mysqlTable('emd_cheques', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    dd_id: bigint('dd_id', { mode: 'number' }),
    fdr_id: bigint('fdr_id', { mode: 'number' }),
    req_type: varchar('req_type', { length: 255 }),
    cheque_favour: varchar('cheque_favour', { length: 255 }),
    cheque_amt: varchar('cheque_amt', { length: 255 }),
    cheque_date: varchar('cheque_date', { length: 255 }),
    cheque_needs: varchar('cheque_needs', { length: 255 }),
    cheque_reason: varchar('cheque_reason', { length: 255 }),
    cheque_bank: varchar('cheque_bank', { length: 255 }),
    action: int('action'),
    status: varchar('status', { length: 200 }),
    reason: varchar('reason', { length: 200 }),
    cheque_no: varchar('cheq_no', { length: 200 }),
    duedate: date('duedate'),
    handover: varchar('handover', { length: 200 }),
    cheque_img: varchar('cheq_img', { length: 200 }),
    confirmation: varchar('confirmation', { length: 200 }),
    remarks: varchar('remarks', { length: 200 }),
    stop_reason_text: text('stop_reason_text'),
    transfer_date: date('transfer_date'),
    amount: varchar('amount', { length: 200 }),
    utr: varchar('utr', { length: 200 }),
    bt_transfer_date: date('bt_transfer_date'),
    reference: varchar('reference', { length: 200 }),
    cancelled_img: varchar('cancelled_img', { length: 200 }),
    generated_pdfs: text('generated_pdfs'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const bank_transfers = mysqlTable('bank_transfers', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    bt_amount: varchar('bt_amount', { length: 200 }),
    bt_acc_name: varchar('bt_acc_name', { length: 255 }),
    bt_acc: varchar('bt_acc', { length: 255 }),
    bt_ifsc: varchar('bt_ifsc', { length: 255 }),
    action: int('action'),
    status: varchar('status', { length: 200 }),
    reason: text('reason'),
    date_time: timestamp('date_time'),
    utr: varchar('utr', { length: 200 }),
    utr_msg: text('utr_mgs'),
    remarks: varchar('remarks', { length: 200 }),
    transfer_date: date('transfer_date'),
    utr_num: varchar('utr_num', { length: 200 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const pay_on_portals = mysqlTable('pay_on_portals', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    portal: varchar('portal', { length: 255 }),
    is_netbanking: varchar('is_netbanking', { length: 255 }),
    is_debit: varchar('is_debit', { length: 255 }),
    amount: varchar('amount', { length: 255 }),
    action: int('action'),
    status: varchar('status', { length: 255 }),
    date_time: timestamp('date_time'),
    utr_num: varchar('utr_num', { length: 200 }),
    utr_msg: text('utr_mgs'),
    remarks: varchar('remarks', { length: 200 }),
    reason: text('reason'),
    transfer_date: date('transfer_date'),
    utr: varchar('utr', { length: 200 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// ============================================
// MAPPING TABLES
// ============================================

// Mapping: old emd_id → new payment_requests.id
const emdToRequestMap = new Map<number, number>();

// Mapping: old instrument IDs → new instrument IDs (for linked references)
const legacyDdToNewIdMap = new Map<number, number>();
const legacyFdrToNewIdMap = new Map<number, number>();

// ============================================
// HELPER FUNCTIONS
// ============================================

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

const parseAction = (val: string | number | null | undefined): number | null => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return val;
    const num = parseInt(val.toString().trim(), 10);
    return isNaN(num) ? null : num;
};

// ============================================
// STATUS MAPPING FUNCTIONS
// ============================================

type StatusMapping = {
    [key: string]: string;
};

const mapDdStatus = (status: string | null, action: number | null): string => {
    if (!status && !action) return DD_STATUSES.ACCOUNTS_FORM_PENDING;

    const s = (status || '').toLowerCase().trim();
    const statusMap: StatusMapping = {
        'pending': DD_STATUSES.ACCOUNTS_FORM_PENDING,
        'submitted': DD_STATUSES.ACCOUNTS_FORM_SUBMITTED,
        'accepted': DD_STATUSES.ACCOUNTS_FORM_ACCEPTED,
        'approved': DD_STATUSES.ACCOUNTS_FORM_ACCEPTED,
        'rejected': DD_STATUSES.ACCOUNTS_FORM_REJECTED,
        'cancelled': DD_STATUSES.CANCELLED_AT_BRANCH,
        'returned': DD_STATUSES.COURIER_RETURN_RECEIVED,
        'refunded': DD_STATUSES.BANK_RETURN_COMPLETED,
    };

    // Action-based mapping
    if (action) {
        switch (action) {
            case 1: return DD_STATUSES.ACCOUNTS_FORM_SUBMITTED;
            case 3: return DD_STATUSES.COURIER_RETURN_INITIATED;
            case 4: return DD_STATUSES.BANK_RETURN_INITIATED;
            case 6: return DD_STATUSES.CANCELLATION_REQUESTED;
            case 7: return DD_STATUSES.CANCELLED_AT_BRANCH;
        }
    }

    for (const [key, value] of Object.entries(statusMap)) {
        if (s.includes(key)) return value;
    }

    return DD_STATUSES.ACCOUNTS_FORM_PENDING;
};

const mapFdrStatus = (status: string | null, action: number | null): string => {
    if (!status && !action) return FDR_STATUSES.ACCOUNTS_FORM_PENDING;

    const s = (status || '').toLowerCase().trim();
    const statusMap: StatusMapping = {
        'pending': FDR_STATUSES.ACCOUNTS_FORM_PENDING,
        'submitted': FDR_STATUSES.ACCOUNTS_FORM_SUBMITTED,
        'accepted': FDR_STATUSES.ACCOUNTS_FORM_ACCEPTED,
        'approved': FDR_STATUSES.ACCOUNTS_FORM_ACCEPTED,
        'rejected': FDR_STATUSES.ACCOUNTS_FORM_REJECTED,
        'returned': FDR_STATUSES.COURIER_RETURN_RECEIVED,
        'refunded': FDR_STATUSES.BANK_RETURN_COMPLETED,
    };

    if (action) {
        switch (action) {
            case 1: return FDR_STATUSES.ACCOUNTS_FORM_SUBMITTED;
            case 3: return FDR_STATUSES.COURIER_RETURN_INITIATED;
            case 4: return FDR_STATUSES.BANK_RETURN_INITIATED;
        }
    }

    for (const [key, value] of Object.entries(statusMap)) {
        if (s.includes(key)) return value;
    }

    return FDR_STATUSES.ACCOUNTS_FORM_PENDING;
};

const mapBgStatus = (status: string | null, action: number | string | null): string => {
    if (!status && !action) return BG_STATUSES.BANK_REQUEST_PENDING;

    const s = (status || '').toLowerCase().trim();
    const actionNum = parseAction(action);

    const statusMap: StatusMapping = {
        'pending': BG_STATUSES.BANK_REQUEST_PENDING,
        'submitted': BG_STATUSES.BANK_REQUEST_SUBMITTED,
        'accepted': BG_STATUSES.BANK_REQUEST_ACCEPTED,
        'approved': BG_STATUSES.BANK_REQUEST_ACCEPTED,
        'rejected': BG_STATUSES.BANK_REQUEST_REJECTED,
        'created': BG_STATUSES.BG_CREATED,
        'cancelled': BG_STATUSES.BG_CANCELLATION_CONFIRMED,
        'returned': BG_STATUSES.COURIER_RETURN_RECEIVED,
        'extended': BG_STATUSES.EXTENSION_COMPLETED,
    };

    if (actionNum) {
        switch (actionNum) {
            case 1: return BG_STATUSES.BANK_REQUEST_SUBMITTED;
            case 2: return BG_STATUSES.BG_CREATED;
            case 3: return BG_STATUSES.FDR_CAPTURED;
            case 5: return BG_STATUSES.EXTENSION_REQUESTED;
            case 6: return BG_STATUSES.COURIER_RETURN_INITIATED;
            case 7: return BG_STATUSES.CANCELLATION_REQUESTED;
            case 8: return BG_STATUSES.BG_CANCELLATION_CONFIRMED;
            case 9: return BG_STATUSES.FDR_CANCELLATION_CONFIRMED;
        }
    }

    for (const [key, value] of Object.entries(statusMap)) {
        if (s.includes(key)) return value;
    }

    return BG_STATUSES.BANK_REQUEST_PENDING;
};

const mapChequeStatus = (status: string | null, action: number | null): string => {
    if (!status && !action) return CHEQUE_STATUSES.ACCOUNTS_FORM_PENDING;

    const s = (status || '').toLowerCase().trim();
    const statusMap: StatusMapping = {
        'pending': CHEQUE_STATUSES.ACCOUNTS_FORM_PENDING,
        'submitted': CHEQUE_STATUSES.ACCOUNTS_FORM_SUBMITTED,
        'accepted': CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED,
        'approved': CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED,
        'rejected': CHEQUE_STATUSES.ACCOUNTS_FORM_REJECTED,
        'stopped': CHEQUE_STATUSES.STOP_COMPLETED,
        'cancelled': CHEQUE_STATUSES.CANCELLED,
        'deposited': CHEQUE_STATUSES.DEPOSIT_COMPLETED,
    };

    if (action) {
        switch (action) {
            case 1: return CHEQUE_STATUSES.ACCOUNTS_FORM_SUBMITTED;
            case 2: return CHEQUE_STATUSES.STOP_REQUESTED;
            case 3: return CHEQUE_STATUSES.BANK_PAYMENT_INITIATED;
            case 4: return CHEQUE_STATUSES.DEPOSIT_INITIATED;
            case 5: return CHEQUE_STATUSES.CANCELLED;
        }
    }

    for (const [key, value] of Object.entries(statusMap)) {
        if (s.includes(key)) return value;
    }

    return CHEQUE_STATUSES.ACCOUNTS_FORM_PENDING;
};

const mapBtStatus = (status: string | null, action: number | null): string => {
    if (!status && !action) return BT_STATUSES.ACCOUNTS_FORM_PENDING;

    const s = (status || '').toLowerCase().trim();
    const statusMap: StatusMapping = {
        'pending': BT_STATUSES.ACCOUNTS_FORM_PENDING,
        'submitted': BT_STATUSES.ACCOUNTS_FORM_SUBMITTED,
        'accepted': BT_STATUSES.ACCOUNTS_FORM_ACCEPTED,
        'approved': BT_STATUSES.ACCOUNTS_FORM_ACCEPTED,
        'rejected': BT_STATUSES.ACCOUNTS_FORM_REJECTED,
        'completed': BT_STATUSES.PAYMENT_COMPLETED,
        'returned': BT_STATUSES.RETURN_COMPLETED,
        'settled': BT_STATUSES.SETTLED,
    };

    if (action) {
        switch (action) {
            case 1: return BT_STATUSES.ACCOUNTS_FORM_SUBMITTED;
            case 3: return BT_STATUSES.RETURN_INITIATED;
        }
    }

    for (const [key, value] of Object.entries(statusMap)) {
        if (s.includes(key)) return value;
    }

    return BT_STATUSES.ACCOUNTS_FORM_PENDING;
};

const mapPortalStatus = (status: string | null, action: number | null): string => {
    if (!status && !action) return PORTAL_STATUSES.ACCOUNTS_FORM_PENDING;

    const s = (status || '').toLowerCase().trim();
    const statusMap: StatusMapping = {
        'pending': PORTAL_STATUSES.ACCOUNTS_FORM_PENDING,
        'submitted': PORTAL_STATUSES.ACCOUNTS_FORM_SUBMITTED,
        'accepted': PORTAL_STATUSES.ACCOUNTS_FORM_ACCEPTED,
        'approved': PORTAL_STATUSES.ACCOUNTS_FORM_ACCEPTED,
        'rejected': PORTAL_STATUSES.ACCOUNTS_FORM_REJECTED,
        'completed': PORTAL_STATUSES.PAYMENT_COMPLETED,
        'returned': PORTAL_STATUSES.RETURN_COMPLETED,
        'settled': PORTAL_STATUSES.SETTLED,
    };

    if (action) {
        switch (action) {
            case 1: return PORTAL_STATUSES.ACCOUNTS_FORM_SUBMITTED;
            case 3: return PORTAL_STATUSES.RETURN_INITIATED;
        }
    }

    for (const [key, value] of Object.entries(statusMap)) {
        if (s.includes(key)) return value;
    }

    return PORTAL_STATUSES.ACCOUNTS_FORM_PENDING;
};

// Get current stage from status
const getStageFromStatus = (status: string): number => {
    const stagePatterns: [RegExp, number][] = [
        [/ACCOUNTS_FORM/, 1],
        [/FOLLOWUP/, 2],
        [/COURIER_RETURN|STOP/, 3],
        [/BANK_RETURN|BANK_PAYMENT|DEPOSIT/, 4],
        [/PROJECT_SETTLEMENT/, 5],
        [/CANCELLATION/, 6],
        [/CANCELLED_AT_BRANCH|EXTENSION/, 7],
        [/BG_CANCELLATION/, 8],
        [/FDR_CANCELLATION/, 9],
    ];

    for (const [pattern, stage] of stagePatterns) {
        if (pattern.test(status)) return stage;
    }
    return 1;
};

// ============================================
// MIGRATION FUNCTIONS
// ============================================

async function migratePaymentRequests() {
    console.log('Migrating payment_requests from emds...');
    const rows = await mysqlDb.select().from(emds);
    let count = 0;

    for (const r of rows) {
        try {
            const [newRecord] = await db.insert(paymentRequests).values({
                tenderId: Number(r.tender_id ?? 0),
                type: (r.type as 'TMS' | 'Other Than TMS' | 'Old Entries' | 'Other Than Tender') ?? 'TMS',
                tenderNo: r.tender_no ?? 'NA',
                projectName: r.project_name ?? null,
                purpose: 'EMD',
                amountRequired: '0.00', // Will be updated after instruments migration
                dueDate: parseDate(r.due_date),
                requestedBy: r.requested_by ?? null,
                status: 'Pending',
                remarks: null,
                legacyEmdId: Number(r.id),
                createdAt: parseDate(r.created_at) ?? new Date(),
                updatedAt: parseDate(r.updated_at) ?? new Date(),
            }).returning({ id: paymentRequests.id });

            emdToRequestMap.set(Number(r.id ?? 0), newRecord.id);
            count++;
        } catch (error) {
            console.error(`Failed to migrate EMD ID ${r.id}:`, error);
        }
    }

    console.log(`Migrated ${count} payment requests`);
}

async function migrateFDRs() {
    console.log('Migrating FDRs...');
    const rows = await mysqlDb.select().from(emd_fdrs);
    let count = 0;
    let skipped = 0;

    for (const r of rows) {
        const requestId = emdToRequestMap.get(r.emd_id ?? 0);
        if (!requestId) {
            skipped++;
            console.warn(`Skipping FDR ID ${r.id}: No matching EMD found for emd_id ${r.emd_id}`);
            continue;
        }

        try {
            const mappedStatus = mapFdrStatus(r.status, r.action);

            const [instResult] = await db.insert(paymentInstruments).values({
                requestId,
                instrumentType: 'FDR',
                amount: parseAmount(r.fdr_amt ?? r.amount),
                favouring: r.fdr_favour ?? r.fdr_payable ?? null,
                payableAt: r.fdr_payable ?? null,
                issueDate: parseDateToString(r.fdr_date),
                expiryDate: parseDateToString(r.fdr_expiry),
                status: mappedStatus,
                currentStage: getStageFromStatus(mappedStatus),
                utr: r.utr ?? null,
                docketNo: r.docket_no ?? null,
                courierAddress: r.courier_add ?? null,
                courierDeadline: r.courier_deadline ? Number(r.courier_deadline) : null,
                generatedPdf: r.generated_fdr ?? null,
                cancelPdf: r.fdrcancel_pdf ?? null,
                docketSlip: r.docket_slip ?? null,
                coveringLetter: r.covering_letter ?? null,
                rejectionReason: r.remarks ?? null,
                action: r.action ? Number(r.action) : null,
                extraPdfPaths: r.generated_fdr ?? null,
                reqNo: r.req_no ?? null,
                reqReceive: r.req_receive ?? null,
                transferDate: parseDateToString(r.transfer_date),
                referenceNo: r.reference_no ?? null,
                creditDate: parseDateToString(r.date),
                creditAmount: r.amount ? parseAmount(r.amount) : null,
                remarks: r.fdr_remark ?? null,
                legacyFdrId: Number(r.id),
                legacyData: {
                    original_status: r.status,
                    original_action: r.action,
                },
                createdAt: parseDate(r.created_at) ?? new Date(),
                updatedAt: parseDate(r.updated_at) ?? new Date(),
            }).returning({ id: paymentInstruments.id });

            legacyFdrToNewIdMap.set(Number(r.id), instResult.id);

            await db.insert(instrumentFdrDetails).values({
                instrumentId: instResult.id,
                fdrNo: r.fdr_no ?? null,
                fdrDate: parseDateToString(r.fdr_date),
                fdrSource: r.fdr_source ?? null,
                fdrPurpose: r.fdr_needs ?? null,
                fdrExpiryDate: parseDateToString(r.fdr_expiry),
                fdrRemark: r.fdr_remark ?? null,
                fdrNeeds: r.fdr_needs ?? null,
            });

            count++;
        } catch (error) {
            console.error(`Failed to migrate FDR ID ${r.id}:`, error);
        }
    }

    console.log(`Migrated ${count} FDRs, skipped ${skipped}`);
}

async function migrateDDs() {
    console.log('Migrating Demand Drafts...');
    const rows = await mysqlDb.select().from(emd_demand_drafts);
    let count = 0;
    let skipped = 0;

    for (const r of rows) {
        const requestId = emdToRequestMap.get(r.emd_id ?? 0);
        if (!requestId) {
            skipped++;
            console.warn(`Skipping DD ID ${r.id}: No matching EMD found for emd_id ${r.emd_id}`);
            continue;
        }

        try {
            const mappedStatus = mapDdStatus(r.status, r.action);

            const [instResult] = await db.insert(paymentInstruments).values({
                requestId,
                instrumentType: 'DD',
                amount: parseAmount(r.dd_amt ?? r.amount),
                favouring: r.dd_favour ?? null,
                payableAt: r.dd_payable ?? null,
                issueDate: parseDateToString(r.dd_date),
                status: mappedStatus,
                currentStage: getStageFromStatus(mappedStatus),
                utr: r.utr ?? null,
                docketNo: r.docket_no ?? null,
                courierAddress: r.courier_add ?? null,
                courierDeadline: parseCourierDeadline(r.courier_deadline),
                generatedPdf: r.generated_dd ?? null,
                cancelPdf: r.ddcancel_pdf ?? null,
                docketSlip: r.docket_slip ?? null,
                rejectionReason: null,
                action: r.action ? Number(r.action) : null,
                reqNo: r.req_no ?? null,
                transferDate: parseDateToString(r.transfer_date),
                referenceNo: r.reference_no ?? null,
                creditDate: parseDateToString(r.date),
                creditAmount: r.amount ? parseAmount(r.amount) : null,
                remarks: r.remarks ?? null,
                legacyDdId: Number(r.id),
                legacyData: {
                    original_status: r.status,
                    original_action: r.action,
                },
                createdAt: parseDate(r.created_at) ?? new Date(),
                updatedAt: parseDate(r.updated_at) ?? new Date(),
            }).returning({ id: paymentInstruments.id });

            legacyDdToNewIdMap.set(Number(r.id), instResult.id);

            await db.insert(instrumentDdDetails).values({
                instrumentId: instResult.id,
                ddNo: r.dd_no ?? null,
                ddDate: parseDateToString(r.dd_date),
                bankName: null,
                reqNo: r.req_no ?? null,
                ddNeeds: r.dd_needs ?? null,
                ddPurpose: r.dd_purpose ?? null,
                ddRemarks: r.remarks ?? null,
            });

            count++;
        } catch (error) {
            console.error(`Failed to migrate DD ID ${r.id}:`, error);
        }
    }

    console.log(`Migrated ${count} DDs, skipped ${skipped}`);
}

async function migrateBGs() {
    console.log('Migrating BGs...');
    const rows = await mysqlDb.select().from(emd_bgs);
    let count = 0;
    let skipped = 0;

    for (const r of rows) {
        const requestId = emdToRequestMap.get(r.emd_id ?? 0);
        if (!requestId) {
            skipped++;
            console.warn(`Skipping BG ID ${r.id}: No matching EMD found for emd_id ${r.emd_id}`);
            continue;
        }

        try {
            const mappedStatus = mapBgStatus(r.status, r.action);

            const [instResult] = await db.insert(paymentInstruments).values({
                requestId,
                instrumentType: 'BG',
                amount: parseAmount(r.bg_amt),
                favouring: r.bg_favour ?? null,
                issueDate: parseDateToString(r.bg_date),
                expiryDate: parseDateToString(r.bg_expiry),
                validityDate: parseDateToString(r.bg_validity ?? r.bg_expiry),
                claimExpiryDate: parseDateToString(r.bg_claim ?? r.claim_expiry),
                status: mappedStatus,
                currentStage: getStageFromStatus(mappedStatus),
                docketNo: r.docket_no ?? null,
                docketSlip: r.docket_slip ?? null,
                courierAddress: r.bg_courier_addr ?? null,
                courierDeadline: parseCourierDeadline(r.bg_courier_deadline),
                rejectionReason: r.reason_req ?? null,
                extensionRequestPdf: r.request_extension_pdf ?? null,
                cancellationRequestPdf: r.request_cancellation_pdf ?? null,
                action: parseAction(r.action),
                remarks: r.bg2_remark ?? null,
                legacyBgId: Number(r.id),
                legacyData: {
                    original_status: r.status,
                    original_action: r.action,
                },
                createdAt: parseDate(r.created_at) ?? new Date(),
                updatedAt: parseDate(r.updated_at) ?? new Date(),
            }).returning({ id: paymentInstruments.id });

            await db.insert(instrumentBgDetails).values({
                instrumentId: instResult.id,
                bgNo: r.bg_no ?? null,
                bgDate: parseDateToString(r.bg_date),
                validityDate: parseDateToString(r.bg_validity ?? r.bg_expiry),
                claimExpiryDate: parseDateToString(r.bg_claim ?? r.claim_expiry),
                beneficiaryName: r.bg_favour ?? null,
                beneficiaryAddress: r.bg_address ?? null,
                bankName: r.bg_bank ?? r.bg_bank_name ?? null,
                cashMarginPercent: parseAmount(r.bg_cont_percent),
                fdrMarginPercent: parseAmount(r.bg_fdr_percent),
                stampCharges: parseAmount(r.bg_stamp ?? r.new_stamp_charge_deducted),
                sfmsCharges: null,
                stampChargesDeducted: parseAmount(r.stamp_charge_deducted),
                sfmsChargesDeducted: parseAmount(r.sfms_charge_deducted),
                otherChargesDeducted: parseAmount(r.other_charge_deducted),
                extendedAmount: parseAmount(r.new_bg_amt),
                extendedValidityDate: parseDateToString(r.new_bg_expiry),
                extendedClaimExpiryDate: r.new_bg_claim ? parseDateToString(r.new_bg_claim.toString()) : null,
                extendedBankName: r.new_bg_bank_name ?? null,
                extensionLetterPath: r.ext_letter ?? null,
                cancellationLetterPath: null,
                prefilledSignedBg: r.prefilled_signed_bg ?? null,
                bgNeeds: r.bg_needs ?? null,
                bgPurpose: r.bg_purpose ?? null,
                bgSoftCopy: r.bg_soft_copy ?? null,
                bgPo: r.bg_po ?? null,
                bgClientUser: r.bg_client_user ?? null,
                bgClientCp: r.bg_client_cp ?? null,
                bgClientFin: r.bg_client_fin ?? null,
                bgBankAcc: r.bg_bank_acc ?? null,
                bgBankIfsc: r.bg_bank_ifsc ?? null,
                courierNo: r.courier_no ?? null,
                approveBg: r.approve_bg ?? null,
                bgFormatTe: r.bg_format_te ?? null,
                bgFormatTl: r.bg_format_tl ?? null,
                sfmsConf: r.sfms_conf ?? null,
                fdrAmt: parseAmount(r.fdr_amt),
                fdrPer: parseAmount(r.fdr_per),
                fdrCopy: r.fdr_copy ?? null,
                fdrNo: r.fdr_no ?? null,
                fdrValidity: parseDateToString(r.fdr_validity),
                fdrRoi: parseAmount(r.fdr_roi),
                bgChargeDeducted: parseAmount(r.bg_charge_deducted),
                newStampChargeDeducted: parseAmount(r.new_stamp_charge_deducted),
                stampCoveringLetter: r.stamp_covering_letter ?? null,
                cancelRemark: r.cancel_remark ?? null,
                cancellConfirm: r.cancell_confirm ?? null,
                bgFdrCancelDate: r.bg_fdr_cancel_date ?? null,
                bgFdrCancelAmount: parseAmount(r.bg_fdr_cancel_amount),
                bgFdrCancelRefNo: r.bg_fdr_cancel_ref_no ?? null,
                bg2Remark: r.bg2_remark ?? null,
                reasonReq: r.reason_req ?? null,
            });

            count++;
        } catch (error) {
            console.error(`Failed to migrate BG ID ${r.id}:`, error);
        }
    }

    console.log(`Migrated ${count} BGs, skipped ${skipped}`);
}

async function migrateCheques() {
    console.log('Migrating Cheques...');
    const rows = await mysqlDb.select().from(emd_cheques);
    let count = 0;
    let skipped = 0;

    for (const r of rows) {
        const requestId = emdToRequestMap.get(r.emd_id ?? 0);
        if (!requestId) {
            skipped++;
            console.warn(`Skipping Cheque ID ${r.id}: No matching EMD found for emd_id ${r.emd_id}`);
            continue;
        }

        try {
            const mappedStatus = mapChequeStatus(r.status, r.action);

            const [instResult] = await db.insert(paymentInstruments).values({
                requestId,
                instrumentType: 'Cheque',
                amount: parseAmount(r.cheque_amt ?? r.amount),
                favouring: r.cheque_favour ?? null,
                issueDate: parseDateToString(r.cheque_date),
                status: mappedStatus,
                currentStage: getStageFromStatus(mappedStatus),
                utr: r.utr ?? null,
                rejectionReason: r.reason ?? r.stop_reason_text ?? null,
                generatedPdf: r.generated_pdfs ?? null,
                action: r.action ? Number(r.action) : null,
                remarks: r.remarks ?? null,
                legacyChequeId: Number(r.id),
                legacyData: {
                    original_status: r.status,
                    original_action: r.action,
                },
                createdAt: parseDate(r.created_at) ?? new Date(),
                updatedAt: parseDate(r.updated_at) ?? new Date(),
            }).returning({ id: paymentInstruments.id });

            // Map linked DD and FDR to new IDs
            const linkedDdNewId = r.dd_id ? legacyDdToNewIdMap.get(Number(r.dd_id)) : null;
            const linkedFdrNewId = r.fdr_id ? legacyFdrToNewIdMap.get(Number(r.fdr_id)) : null;

            await db.insert(instrumentChequeDetails).values({
                instrumentId: instResult.id,
                chequeNo: r.cheque_no ?? null,
                chequeDate: parseDateToString(r.cheque_date),
                bankName: r.cheque_bank ?? null,
                chequeImagePath: r.cheque_img ?? null,
                cancelledImagePath: r.cancelled_img ?? null,
                linkedDdId: linkedDdNewId ?? (r.dd_id ? Number(r.dd_id) : null),
                linkedFdrId: linkedFdrNewId ?? (r.fdr_id ? Number(r.fdr_id) : null),
                reqType: r.req_type ?? null,
                chequeNeeds: r.cheque_needs ?? null,
                chequeReason: r.cheque_reason ?? null,
                dueDate: parseDateToString(r.duedate),
                transferDate: parseDateToString(r.transfer_date),
                btTransferDate: parseDateToString(r.bt_transfer_date),
                handover: r.handover ?? null,
                confirmation: r.confirmation ?? null,
                reference: r.reference ?? null,
                stopReasonText: r.stop_reason_text ?? null,
                amount: r.amount ? parseAmount(r.amount) : null,
            });

            count++;
        } catch (error) {
            console.error(`Failed to migrate Cheque ID ${r.id}:`, error);
        }
    }

    console.log(`Migrated ${count} Cheques, skipped ${skipped}`);
}

async function migrateBankTransfers() {
    console.log('Migrating Bank Transfers...');
    const rows = await mysqlDb.select().from(bank_transfers);
    let count = 0;
    let skipped = 0;

    for (const r of rows) {
        const requestId = emdToRequestMap.get(r.emd_id ?? 0);
        if (!requestId) {
            skipped++;
            console.warn(`Skipping Bank Transfer ID ${r.id}: No matching EMD found for emd_id ${r.emd_id}`);
            continue;
        }

        try {
            const mappedStatus = mapBtStatus(r.status, r.action);

            const [instResult] = await db.insert(paymentInstruments).values({
                requestId,
                instrumentType: 'Bank Transfer',
                amount: parseAmount(r.bt_amount),
                status: mappedStatus,
                currentStage: getStageFromStatus(mappedStatus),
                utr: r.utr ?? r.utr_num ?? null,
                action: r.action ? Number(r.action) : null,
                remarks: r.remarks ?? null,
                rejectionReason: r.reason ?? null,
                legacyBtId: Number(r.id),
                legacyData: {
                    original_status: r.status,
                    original_action: r.action,
                },
                createdAt: parseDate(r.created_at) ?? new Date(),
                updatedAt: parseDate(r.updated_at) ?? new Date(),
            }).returning({ id: paymentInstruments.id });

            await db.insert(instrumentTransferDetails).values({
                instrumentId: instResult.id,
                accountName: r.bt_acc_name ?? null,
                accountNumber: r.bt_acc ?? null,
                ifsc: r.bt_ifsc ?? null,
                transactionId: r.utr ?? r.utr_num ?? null,
                transactionDate: parseDate(r.date_time ?? r.transfer_date),
                utrMsg: r.utr_msg ?? null,
                utrNum: r.utr_num ?? null,
                remarks: r.remarks ?? null,
                reason: r.reason ?? null,
                returnTransferDate: parseDateToString(r.transfer_date),
                returnUtr: r.utr ?? null,
            });

            count++;
        } catch (error) {
            console.error(`Failed to migrate Bank Transfer ID ${r.id}:`, error);
        }
    }

    console.log(`Migrated ${count} Bank Transfers, skipped ${skipped}`);
}

async function migratePortalPayments() {
    console.log('Migrating Portal Payments...');
    const rows = await mysqlDb.select().from(pay_on_portals);
    let count = 0;
    let skipped = 0;

    for (const r of rows) {
        const requestId = emdToRequestMap.get(r.emd_id ?? 0);
        if (!requestId) {
            skipped++;
            console.warn(`Skipping Portal Payment ID ${r.id}: No matching EMD found for emd_id ${r.emd_id}`);
            continue;
        }

        try {
            const mappedStatus = mapPortalStatus(r.status, r.action);

            const [instResult] = await db.insert(paymentInstruments).values({
                requestId,
                instrumentType: 'Portal Payment',
                amount: parseAmount(r.amount),
                status: mappedStatus,
                currentStage: getStageFromStatus(mappedStatus),
                utr: r.utr ?? r.utr_num ?? null,
                action: r.action ? Number(r.action) : null,
                remarks: r.remarks ?? null,
                rejectionReason: r.reason ?? null,
                legacyPortalId: Number(r.id),
                legacyData: {
                    original_status: r.status,
                    original_action: r.action,
                },
                createdAt: parseDate(r.created_at) ?? new Date(),
                updatedAt: parseDate(r.updated_at) ?? new Date(),
            }).returning({ id: paymentInstruments.id });

            await db.insert(instrumentTransferDetails).values({
                instrumentId: instResult.id,
                portalName: r.portal ?? null,
                paymentMethod: r.is_netbanking === 'yes' || r.is_netbanking === '1' ? 'Netbanking' :
                    r.is_debit === 'yes' || r.is_debit === '1' ? 'Debit Card' : 'Other',
                transactionId: r.utr ?? r.utr_num ?? null,
                transactionDate: parseDate(r.date_time),
                utrMsg: r.utr_msg ?? null,
                utrNum: r.utr_num ?? null,
                isNetbanking: r.is_netbanking ?? null,
                isDebit: r.is_debit ?? null,
                remarks: r.remarks ?? null,
                reason: r.reason ?? null,
                returnTransferDate: parseDateToString(r.transfer_date),
                returnUtr: r.utr ?? null,
            });

            count++;
        } catch (error) {
            console.error(`Failed to migrate Portal Payment ID ${r.id}:`, error);
        }
    }

    console.log(`Migrated ${count} Portal Payments, skipped ${skipped}`);
}

// ============================================
// POST-MIGRATION UPDATES
// ============================================

async function updatePaymentRequestAmounts() {
    console.log('Updating payment request amounts...');

    const requests = await db.select({ id: paymentRequests.id }).from(paymentRequests);
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
                .set({ amountRequired: totalAmount.toFixed(2) })
                .where(eq(paymentRequests.id, req.id));

            updated++;
        } catch (error) {
            console.error(`Failed to update amount for request ${req.id}:`, error);
        }
    }

    console.log(`Updated amounts for ${updated} payment requests`);
}

async function updatePaymentRequestStatuses() {
    console.log('Updating payment request statuses...');

    const requests = await db.select({ id: paymentRequests.id }).from(paymentRequests);
    let updated = 0;

    for (const req of requests) {
        try {
            const instruments = await db
                .select({ status: paymentInstruments.status })
                .from(paymentInstruments)
                .where(eq(paymentInstruments.requestId, req.id));

            if (instruments.length === 0) {
                continue;
            }

            // Determine overall status based on instrument statuses
            let overallStatus = 'Pending';
            const statuses = instruments.map(i => i.status);

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
                .set({ status: overallStatus })
                .where(eq(paymentRequests.id, req.id));

            updated++;
        } catch (error) {
            console.error(`Failed to update status for request ${req.id}:`, error);
        }
    }

    console.log(`Updated statuses for ${updated} payment requests`);
}

async function updateLinkedChequeReferences() {
    console.log('Updating linked cheque references...');

    // Get all cheque details with legacy linked IDs
    const chequeDetails = await db
        .select({
            id: instrumentChequeDetails.id,
            linkedDdId: instrumentChequeDetails.linkedDdId,
            linkedFdrId: instrumentChequeDetails.linkedFdrId,
        })
        .from(instrumentChequeDetails);

    let updated = 0;

    for (const detail of chequeDetails) {
        try {
            const updates: { linkedDdId?: number; linkedFdrId?: number } = {};

            // Check if linkedDdId needs to be updated to new ID
            if (detail.linkedDdId) {
                const newDdId = legacyDdToNewIdMap.get(detail.linkedDdId);
                if (newDdId && newDdId !== detail.linkedDdId) {
                    updates.linkedDdId = newDdId;
                }
            }

            // Check if linkedFdrId needs to be updated to new ID
            if (detail.linkedFdrId) {
                const newFdrId = legacyFdrToNewIdMap.get(detail.linkedFdrId);
                if (newFdrId && newFdrId !== detail.linkedFdrId) {
                    updates.linkedFdrId = newFdrId;
                }
            }

            if (Object.keys(updates).length > 0) {
                await db
                    .update(instrumentChequeDetails)
                    .set(updates)
                    .where(eq(instrumentChequeDetails.id, detail.id));
                updated++;
            }
        } catch (error) {
            console.error(`Failed to update linked references for cheque detail ${detail.id}:`, error);
        }
    }

    console.log(`Updated linked references for ${updated} cheque details`);
}

// ============================================
// VERIFICATION FUNCTIONS
// ============================================

async function verifyMigration() {
    console.log('\n========================================');
    console.log('MIGRATION VERIFICATION');
    console.log('========================================\n');

    // Count records in MySQL
    const mysqlCounts = {
        emds: (await mysqlDb.select().from(emds)).length,
        fdrs: (await mysqlDb.select().from(emd_fdrs)).length,
        dds: (await mysqlDb.select().from(emd_demand_drafts)).length,
        bgs: (await mysqlDb.select().from(emd_bgs)).length,
        cheques: (await mysqlDb.select().from(emd_cheques)).length,
        bankTransfers: (await mysqlDb.select().from(bank_transfers)).length,
        portalPayments: (await mysqlDb.select().from(pay_on_portals)).length,
    };

    // Count records in PostgreSQL
    const pgRequestsCount = await db.select({ count: sql<number>`count(*)` }).from(paymentRequests);
    const pgInstrumentsCount = await db.select({ count: sql<number>`count(*)` }).from(paymentInstruments);

    // Count by instrument type
    const pgFdrCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(paymentInstruments)
        .where(eq(paymentInstruments.instrumentType, 'FDR'));

    const pgDdCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(paymentInstruments)
        .where(eq(paymentInstruments.instrumentType, 'DD'));

    const pgBgCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(paymentInstruments)
        .where(eq(paymentInstruments.instrumentType, 'BG'));

    const pgChequeCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(paymentInstruments)
        .where(eq(paymentInstruments.instrumentType, 'Cheque'));

    const pgBtCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(paymentInstruments)
        .where(eq(paymentInstruments.instrumentType, 'Bank Transfer'));

    const pgPortalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(paymentInstruments)
        .where(eq(paymentInstruments.instrumentType, 'Portal Payment'));

    // Count detail tables
    const pgDdDetailsCount = await db.select({ count: sql<number>`count(*)` }).from(instrumentDdDetails);
    const pgFdrDetailsCount = await db.select({ count: sql<number>`count(*)` }).from(instrumentFdrDetails);
    const pgBgDetailsCount = await db.select({ count: sql<number>`count(*)` }).from(instrumentBgDetails);
    const pgChequeDetailsCount = await db.select({ count: sql<number>`count(*)` }).from(instrumentChequeDetails);
    const pgTransferDetailsCount = await db.select({ count: sql<number>`count(*)` }).from(instrumentTransferDetails);

    console.log('MySQL Source Counts:');
    console.log('--------------------');
    console.log(`  EMDs (payment_requests):  ${mysqlCounts.emds}`);
    console.log(`  FDRs:                     ${mysqlCounts.fdrs}`);
    console.log(`  Demand Drafts:            ${mysqlCounts.dds}`);
    console.log(`  Bank Guarantees:          ${mysqlCounts.bgs}`);
    console.log(`  Cheques:                  ${mysqlCounts.cheques}`);
    console.log(`  Bank Transfers:           ${mysqlCounts.bankTransfers}`);
    console.log(`  Portal Payments:          ${mysqlCounts.portalPayments}`);
    console.log(`  Total Instruments:        ${mysqlCounts.fdrs + mysqlCounts.dds + mysqlCounts.bgs + mysqlCounts.cheques + mysqlCounts.bankTransfers + mysqlCounts.portalPayments}`);

    console.log('\nPostgreSQL Target Counts:');
    console.log('-------------------------');
    console.log(`  Payment Requests:         ${pgRequestsCount[0].count}`);
    console.log(`  Total Instruments:        ${pgInstrumentsCount[0].count}`);
    console.log(`    - FDRs:                 ${pgFdrCount[0].count}`);
    console.log(`    - Demand Drafts:        ${pgDdCount[0].count}`);
    console.log(`    - Bank Guarantees:      ${pgBgCount[0].count}`);
    console.log(`    - Cheques:              ${pgChequeCount[0].count}`);
    console.log(`    - Bank Transfers:       ${pgBtCount[0].count}`);
    console.log(`    - Portal Payments:      ${pgPortalCount[0].count}`);

    console.log('\nDetail Tables:');
    console.log('--------------');
    console.log(`  DD Details:               ${pgDdDetailsCount[0].count}`);
    console.log(`  FDR Details:              ${pgFdrDetailsCount[0].count}`);
    console.log(`  BG Details:               ${pgBgDetailsCount[0].count}`);
    console.log(`  Cheque Details:           ${pgChequeDetailsCount[0].count}`);
    console.log(`  Transfer Details:         ${pgTransferDetailsCount[0].count}`);

    // Verification checks
    console.log('\nVerification Results:');
    console.log('---------------------');

    const checks = [
        {
            name: 'Payment Requests',
            mysql: mysqlCounts.emds,
            pg: Number(pgRequestsCount[0].count),
        },
        {
            name: 'FDRs',
            mysql: mysqlCounts.fdrs,
            pg: Number(pgFdrCount[0].count),
        },
        {
            name: 'Demand Drafts',
            mysql: mysqlCounts.dds,
            pg: Number(pgDdCount[0].count),
        },
        {
            name: 'Bank Guarantees',
            mysql: mysqlCounts.bgs,
            pg: Number(pgBgCount[0].count),
        },
        {
            name: 'Cheques',
            mysql: mysqlCounts.cheques,
            pg: Number(pgChequeCount[0].count),
        },
        {
            name: 'Bank Transfers',
            mysql: mysqlCounts.bankTransfers,
            pg: Number(pgBtCount[0].count),
        },
        {
            name: 'Portal Payments',
            mysql: mysqlCounts.portalPayments,
            pg: Number(pgPortalCount[0].count),
        },
    ];

    let allPassed = true;
    for (const check of checks) {
        const status = check.mysql === check.pg ? '✅ PASS' : '❌ FAIL';
        const diff = check.pg - check.mysql;
        const diffStr = diff === 0 ? '' : ` (${diff > 0 ? '+' : ''}${diff})`;
        console.log(`  ${check.name}: ${status} - MySQL: ${check.mysql}, PG: ${check.pg}${diffStr}`);
        if (check.mysql !== check.pg) {
            allPassed = false;
        }
    }

    // Check for orphaned records
    console.log('\nOrphan Checks:');
    console.log('--------------');

    const orphanedInstruments = await db
        .select({ count: sql<number>`count(*)` })
        .from(paymentInstruments)
        .where(sql`${paymentInstruments.requestId} NOT IN (SELECT id FROM payment_requests)`);

    console.log(`  Instruments without requests: ${orphanedInstruments[0].count}`);

    if (Number(orphanedInstruments[0].count) > 0) {
        allPassed = false;
        console.log('  ❌ WARNING: Found orphaned instruments!');
    } else {
        console.log('  ✅ No orphaned instruments');
    }

    // Check for null amounts
    const nullAmounts = await db
        .select({ count: sql<number>`count(*)` })
        .from(paymentInstruments)
        .where(sql`${paymentInstruments.amount} IS NULL OR ${paymentInstruments.amount} = '0.00'`);

    console.log(`  Instruments with zero/null amount: ${nullAmounts[0].count}`);

    // Summary
    console.log('\n========================================');
    if (allPassed) {
        console.log('✅ MIGRATION VERIFICATION PASSED');
    } else {
        console.log('❌ MIGRATION VERIFICATION FAILED');
        console.log('   Please review the discrepancies above');
    }
    console.log('========================================\n');

    return allPassed;
}

async function generateMigrationReport() {
    console.log('\nGenerating migration report...');

    const report = {
        timestamp: new Date().toISOString(),
        mappings: {
            emdToRequest: Object.fromEntries(emdToRequestMap),
            ddToNewId: Object.fromEntries(legacyDdToNewIdMap),
            fdrToNewId: Object.fromEntries(legacyFdrToNewIdMap),
        },
        statistics: {
            totalRequestsMigrated: emdToRequestMap.size,
            totalDdsMigrated: legacyDdToNewIdMap.size,
            totalFdrsMigrated: legacyFdrToNewIdMap.size,
        },
    };

    // Write report to file
    const fs = await import('fs');
    const reportPath = `./migration-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Migration report saved to: ${reportPath}`);

    return report;
}

// ============================================
// CLEANUP FUNCTIONS (Optional - use with caution)
// ============================================

async function cleanupBeforeMigration() {
    console.log('Cleaning up existing data in PostgreSQL...');

    // Delete in reverse order of dependencies
    await db.delete(instrumentTransferDetails);
    await db.delete(instrumentChequeDetails);
    await db.delete(instrumentBgDetails);
    await db.delete(instrumentFdrDetails);
    await db.delete(instrumentDdDetails);
    await db.delete(paymentInstruments);
    await db.delete(paymentRequests);

    console.log('Cleanup completed');
}

// ============================================
// ROLLBACK FUNCTION (if needed)
// ============================================

async function rollbackMigration() {
    console.log('Rolling back migration...');

    try {
        // Delete all migrated data
        await db.delete(instrumentTransferDetails);
        await db.delete(instrumentChequeDetails);
        await db.delete(instrumentBgDetails);
        await db.delete(instrumentFdrDetails);
        await db.delete(instrumentDdDetails);
        await db.delete(paymentInstruments);
        await db.delete(paymentRequests);

        console.log('Rollback completed successfully');
    } catch (error) {
        console.error('Rollback failed:', error);
        throw error;
    }
}

// ============================================
// MAIN MIGRATION RUNNER
// ============================================

async function runMigration(options: {
    cleanup?: boolean;
    verify?: boolean;
    generateReport?: boolean;
} = {}) {
    const startTime = Date.now();

    console.log('========================================');
    console.log('EMD MIGRATION: MySQL → PostgreSQL');
    console.log('========================================');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('');

    try {
        // Optional cleanup
        if (options.cleanup) {
            await cleanupBeforeMigration();
        }

        // Step 1: Migrate Payment Requests (EMDs)
        console.log('\n--- Step 1/9: Payment Requests ---');
        await migratePaymentRequests();

        // Step 2: Migrate FDRs (must be before cheques for linking)
        console.log('\n--- Step 2/9: FDRs ---');
        await migrateFDRs();

        // Step 3: Migrate DDs (must be before cheques for linking)
        console.log('\n--- Step 3/9: Demand Drafts ---');
        await migrateDDs();

        // Step 4: Migrate BGs
        console.log('\n--- Step 4/9: Bank Guarantees ---');
        await migrateBGs();

        // Step 5: Migrate Cheques (after FDRs and DDs for linking)
        console.log('\n--- Step 5/9: Cheques ---');
        await migrateCheques();

        // Step 6: Migrate Bank Transfers
        console.log('\n--- Step 6/9: Bank Transfers ---');
        await migrateBankTransfers();

        // Step 7: Migrate Portal Payments
        console.log('\n--- Step 7/9: Portal Payments ---');
        await migratePortalPayments();

        // Step 8: Post-migration updates
        console.log('\n--- Step 8/9: Post-Migration Updates ---');
        await updatePaymentRequestAmounts();
        await updatePaymentRequestStatuses();
        await updateLinkedChequeReferences();

        // Step 9: Verification
        if (options.verify !== false) {
            console.log('\n--- Step 9/9: Verification ---');
            await verifyMigration();
        }

        // Generate report
        if (options.generateReport !== false) {
            await generateMigrationReport();
        }

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log('\n========================================');
        console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
        console.log(`Duration: ${duration} seconds`);
        console.log(`Finished at: ${new Date().toISOString()}`);
        console.log('========================================\n');

    } catch (error) {
        console.error('\n========================================');
        console.error('❌ MIGRATION FAILED');
        console.error('========================================');
        console.error('Error:', error);
        console.error('\nYou may need to run rollback if partial migration occurred.');
        throw error;
    }
}

// ============================================
// CLI INTERFACE
// ============================================

async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
EMD Migration Script - MySQL to PostgreSQL

Usage: npx ts-node migrate-emd-full.ts [options]

Options:
  --cleanup       Clean existing data before migration
  --no-verify     Skip verification step
  --no-report     Skip report generation
  --rollback      Rollback previous migration
  --verify-only   Only run verification (no migration)
  --help, -h      Show this help message

Examples:
  npx ts-node migrate-emd-full.ts
  npx ts-node migrate-emd-full.ts --cleanup
  npx ts-node migrate-emd-full.ts --rollback
  npx ts-node migrate-emd-full.ts --verify-only
`);
        process.exit(0);
    }

    if (args.includes('--rollback')) {
        await rollbackMigration();
        process.exit(0);
    }

    if (args.includes('--verify-only')) {
        const passed = await verifyMigration();
        process.exit(passed ? 0 : 1);
    }

    await runMigration({
        cleanup: args.includes('--cleanup'),
        verify: !args.includes('--no-verify'),
        generateReport: !args.includes('--no-report'),
    });

    // Close connections
    await pgClient.end();
    await mysqlPool.end();

    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
