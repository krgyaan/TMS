// migrate-emd-full.ts
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import { mysqlTable, varchar, bigint, text, date, timestamp, decimal, int } from 'drizzle-orm/mysql-core';
import { Client } from 'pg';
import { eq } from 'drizzle-orm';
import {
    paymentRequests,
    paymentInstruments,
    instrumentDdDetails,
    instrumentFdrDetails,
    instrumentBgDetails,
    instrumentChequeDetails,
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

const mysqlEmds = mysqlTable('emds', {
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

const mysqlEmdFdrs = mysqlTable('emd_fdrs', {
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

const mysqlEmdDemandDrafts = mysqlTable('emd_demand_drafts', {
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

const mysqlEmdBgs = mysqlTable('emd_bgs', {
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

const mysqlEmdCheques = mysqlTable('emd_cheques', {
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

const mysqlBankTransfers = mysqlTable('bank_transfers', {
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

const mysqlPayOnPortals = mysqlTable('pay_on_portals', {
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

// ============================================================================
// TYPES
// ============================================================================

interface MigrationStats {
    paymentRequests: { success: number; errors: number; skipped: number };
    fdrs: { success: number; errors: number; skipped: number };
    dds: { success: number; errors: number; skipped: number };
    bgs: { success: number; errors: number; skipped: number };
    cheques: { success: number; errors: number; skipped: number };
    bankTransfers: { success: number; errors: number; skipped: number };
    portalPayments: { success: number; errors: number; skipped: number };
}

interface MigrationContext {
    pgDb: ReturnType<typeof pgDrizzle>;
    pgClient: Client;
    mysqlDb: ReturnType<typeof mysqlDrizzle>;
    emdIds: Set<number>;
    legacyFdrToInstrumentId: Map<number, number>;
    legacyDdToInstrumentId: Map<number, number>;
    stats: MigrationStats;
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
// STATUS MAPPING - Based on actual MySQL data
// ============================================================================

const StatusMapper = {
    fdr(status: string | null, action: number | null): string {
        // Action-based mapping
        switch (action) {
            case 1: return 'FDR_ACCOUNTS_FORM_SUBMITTED';
            case 3: return 'FDR_COURIER_RETURN_INITIATED';
            case 4: return 'FDR_BANK_RETURN_INITIATED';
            default: return 'FDR_ACCOUNTS_FORM_PENDING';
        }
    },

    dd(status: string | null, action: number | null): string {
        const s = (status || '').toLowerCase().trim();

        // Action-based mapping (priority)
        switch (action) {
            case 1: return 'DD_ACCOUNTS_FORM_SUBMITTED';
            case 4: return 'DD_BANK_RETURN_INITIATED';
            case 6: return 'DD_CANCELLATION_REQUESTED';
            case 7: return 'DD_CANCELLED_AT_BRANCH';
        }

        // Status-based mapping
        if (s === 'accepted') return 'DD_ACCOUNTS_FORM_ACCEPTED';
        if (s === 'rejected') return 'DD_ACCOUNTS_FORM_REJECTED';
        if (s === 'dd requested') return 'DD_ACCOUNTS_FORM_PENDING'; // DD creation requested

        return 'DD_ACCOUNTS_FORM_PENDING';
    },

    bg(status: string | null, action: string | number | null): string {
        const s = (status || '').toLowerCase().trim();
        const actionNum = typeof action === 'number' ? action : parseInt(String(action || ''), 10);

        // Action-based mapping (priority)
        switch (actionNum) {
            case 1: return 'BG_BANK_REQUEST_SUBMITTED';
            case 2: return 'BG_CREATED';
            case 3: return 'BG_FDR_CAPTURED';
            case 4: return 'BG_FOLLOWUP_INITIATED';
            case 5: return 'BG_EXTENSION_REQUESTED';
            case 7: return 'BG_CANCELLATION_REQUESTED';
            case 8: return 'BG_CANCELLATION_CONFIRMED';
            case 9: return 'BG_FDR_CANCELLATION_CONFIRMED';
        }

        // Status-based mapping
        if (s === 'accepted') return 'BG_BANK_REQUEST_ACCEPTED';
        if (s === 'rejected') return 'BG_BANK_REQUEST_REJECTED';

        return 'BG_BANK_REQUEST_PENDING';
    },

    cheque(status: string | null, action: number | null): string {
        const s = (status || '').toLowerCase().trim();

        // Action-based mapping (priority)
        switch (action) {
            case 1: return 'CHEQUE_ACCOUNTS_FORM_SUBMITTED';
            case 2: return 'CHEQUE_STOP_REQUESTED';
            case 3: return 'CHEQUE_BANK_PAYMENT_INITIATED';
            case 4: return 'CHEQUE_DEPOSIT_INITIATED';
            case 5: return 'CHEQUE_CANCELLED';
            case 6: return 'CHEQUE_CANCELLED'; // Additional cancel action
        }

        // Status-based mapping
        if (s === 'accepted') return 'CHEQUE_ACCOUNTS_FORM_ACCEPTED';
        if (s === 'rejected') return 'CHEQUE_ACCOUNTS_FORM_REJECTED';
        if (s === 'dd requested') return 'CHEQUE_ACCOUNTS_FORM_PENDING'; // Linked DD requested
        if (s === 'fdr requested') return 'CHEQUE_ACCOUNTS_FORM_PENDING'; // Linked FDR requested

        return 'CHEQUE_ACCOUNTS_FORM_PENDING';
    },

    bankTransfer(status: string | null, action: number | null): string {
        const s = (status || '').toLowerCase().trim();

        // Action-based mapping (priority)
        switch (action) {
            case 1: return 'BT_ACCOUNTS_FORM_SUBMITTED';
            case 3: return 'BT_RETURN_INITIATED';
        }

        // Status-based mapping
        if (s === 'accepted') return 'BT_ACCOUNTS_FORM_ACCEPTED';
        if (s === 'rejected') return 'BT_ACCOUNTS_FORM_REJECTED';

        return 'BT_ACCOUNTS_FORM_PENDING';
    },

    portal(status: string | null, action: number | null): string {
        const s = (status || '').toLowerCase().trim();

        // Action-based mapping (priority)
        switch (action) {
            case 1: return 'PORTAL_ACCOUNTS_FORM_SUBMITTED';
            case 3: return 'PORTAL_RETURN_INITIATED';
        }

        // Status-based mapping
        if (s === 'accepted') return 'PORTAL_ACCOUNTS_FORM_ACCEPTED';
        if (s === 'rejected') return 'PORTAL_ACCOUNTS_FORM_REJECTED';

        return 'PORTAL_ACCOUNTS_FORM_PENDING';
    },

    /**
     * Get stage number from status string
     */
    getStage(status: string): number {
        // DD Stages (7 stages)
        if (status.startsWith('DD_')) {
            if (status.includes('ACCOUNTS_FORM')) return 1;
            if (status.includes('FOLLOWUP')) return 2;
            if (status.includes('COURIER_RETURN')) return 3;
            if (status.includes('BANK_RETURN')) return 4;
            if (status.includes('PROJECT_SETTLEMENT')) return 5;
            if (status.includes('CANCELLATION') && !status.includes('CANCELLED_AT_BRANCH')) return 6;
            if (status.includes('CANCELLED_AT_BRANCH')) return 7;
        }

        // FDR Stages (4 stages)
        if (status.startsWith('FDR_')) {
            if (status.includes('ACCOUNTS_FORM')) return 1;
            if (status.includes('FOLLOWUP')) return 2;
            if (status.includes('COURIER_RETURN')) return 3;
            if (status.includes('BANK_RETURN')) return 4;
        }

        // BG Stages (9 stages)
        if (status.startsWith('BG_')) {
            if (status.includes('BANK_REQUEST')) return 1;
            if (status.includes('CREATED') || status.includes('CREATION')) return 2;
            if (status.includes('FDR_CAPTURE')) return 3;
            if (status.includes('FOLLOWUP')) return 4;
            if (status.includes('EXTENSION')) return 5;
            if (status.includes('COURIER_RETURN')) return 6;
            if (status.includes('CANCELLATION') && !status.includes('CONFIRMED')) return 7;
            if (status === 'BG_CANCELLATION_CONFIRMED') return 8;
            if (status === 'BG_FDR_CANCELLATION_CONFIRMED') return 9;
        }

        // Cheque Stages (6 stages)
        if (status.startsWith('CHEQUE_')) {
            if (status.includes('ACCOUNTS_FORM')) return 1;
            if (status.includes('FOLLOWUP')) return 2;
            if (status.includes('STOP')) return 3;
            if (status.includes('BANK_PAYMENT')) return 4;
            if (status.includes('DEPOSIT')) return 5;
            if (status.includes('CANCELLED')) return 6;
        }

        // Bank Transfer Stages (4 stages)
        if (status.startsWith('BT_')) {
            if (status.includes('ACCOUNTS_FORM') || status.includes('PAYMENT_COMPLETED')) return 1;
            if (status.includes('FOLLOWUP')) return 2;
            if (status.includes('RETURN')) return 3;
            if (status.includes('SETTLED')) return 4;
        }

        // Portal Stages (4 stages)
        if (status.startsWith('PORTAL_')) {
            if (status.includes('ACCOUNTS_FORM') || status.includes('PAYMENT_COMPLETED')) return 1;
            if (status.includes('FOLLOWUP')) return 2;
            if (status.includes('RETURN')) return 3;
            if (status.includes('SETTLED')) return 4;
        }

        return 1;
    },
};

// ============================================================================
// MIGRATORS
// ============================================================================

class PaymentRequestsMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating payment_requests from emds...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlEmds);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlEmds.$inferSelect): Promise<void> {
        try {
            // ✅ Preserve original ID
            await this.ctx.pgDb.insert(paymentRequests).values({
                id: row.id,
                tenderId: Number(row.tender_id ?? 0),
                type: (row.type as any) ?? 'TMS',
                tenderNo: row.tender_no ?? 'NA',
                projectName: row.project_name ?? null,
                purpose: 'EMD',
                amountRequired: '0.00', // Updated after instruments
                dueDate: Parsers.date(row.due_date),
                requestedBy: row.requested_by ?? null,
                status: 'Pending',
                remarks: null,
                legacyEmdId: row.id,
                createdAt: Parsers.date(row.created_at) ?? new Date(),
                updatedAt: Parsers.date(row.updated_at) ?? new Date(),
            });

            this.ctx.emdIds.add(row.id);
            this.ctx.stats.paymentRequests.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating EMD id=${row.id}:`, err);
            this.ctx.stats.paymentRequests.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.paymentRequests;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

class FdrMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating FDRs...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlEmdFdrs);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlEmdFdrs.$inferSelect): Promise<void> {
        try {
            const emdId = row.emd_id ?? 0;

            if (!this.ctx.emdIds.has(emdId)) {
                console.warn(`  ⚠ Skipping FDR id=${row.id}: EMD ${emdId} not found`);
                this.ctx.stats.fdrs.skipped++;
                return;
            }

            const status = StatusMapper.fdr(row.status, row.action);

            // Insert instrument (auto-generate ID)
            const [instrument] = await this.ctx.pgDb.insert(paymentInstruments).values({
                requestId: emdId, // Uses preserved EMD ID
                instrumentType: 'FDR',
                amount: Parsers.amount(row.fdr_amt ?? row.amount),
                favouring: row.fdr_favour ?? row.fdr_payable ?? null,
                payableAt: row.fdr_payable ?? null,
                issueDate: Parsers.dateString(row.fdr_date),
                expiryDate: Parsers.dateString(row.fdr_expiry),
                status: status,
                currentStage: StatusMapper.getStage(status),
                action: row.action ?? null,
                utr: row.utr ?? null,
                docketNo: row.docket_no ?? null,
                courierAddress: row.courier_add ?? null,
                courierDeadline: row.courier_deadline ?? null,
                generatedPdf: row.generated_fdr ?? null,
                cancelPdf: row.fdrcancel_pdf ?? null,
                docketSlip: row.docket_slip ?? null,
                coveringLetter: row.covering_letter ?? null,
                reqNo: row.req_no ?? null,
                reqReceive: row.req_receive ?? null,
                transferDate: Parsers.dateString(row.transfer_date),
                referenceNo: row.reference_no ?? null,
                creditDate: Parsers.dateString(row.date),
                creditAmount: row.amount ? Parsers.amount(row.amount) : null,
                remarks: row.fdr_remark ?? row.remarks ?? null,
                legacyFdrId: row.id,
                legacyData: { original_status: row.status, original_action: row.action },
                createdAt: Parsers.date(row.created_at) ?? new Date(),
                updatedAt: Parsers.date(row.updated_at) ?? new Date(),
            }).returning({ id: paymentInstruments.id });

            // Track for cheque linking
            this.ctx.legacyFdrToInstrumentId.set(row.id, instrument.id);

            // Insert FDR details
            await this.ctx.pgDb.insert(instrumentFdrDetails).values({
                instrumentId: instrument.id,
                fdrNo: row.fdr_no ?? null,
                fdrDate: Parsers.dateString(row.fdr_date),
                fdrSource: row.fdr_source ?? null,
                fdrPurpose: row.fdr_needs ?? null,
                fdrExpiryDate: Parsers.dateString(row.fdr_expiry),
                fdrNeeds: row.fdr_needs ?? null,
                fdrRemark: row.fdr_remark ?? null,
            });

            this.ctx.stats.fdrs.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating FDR id=${row.id}:`, err);
            this.ctx.stats.fdrs.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.fdrs;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

class DdMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating Demand Drafts...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlEmdDemandDrafts);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlEmdDemandDrafts.$inferSelect): Promise<void> {
        try {
            const emdId = row.emd_id ?? 0;

            if (!this.ctx.emdIds.has(emdId)) {
                console.warn(`  ⚠ Skipping DD id=${row.id}: EMD ${emdId} not found`);
                this.ctx.stats.dds.skipped++;
                return;
            }

            const status = StatusMapper.dd(row.status, row.action);

            const [instrument] = await this.ctx.pgDb.insert(paymentInstruments).values({
                requestId: emdId,
                instrumentType: 'DD',
                amount: Parsers.amount(row.dd_amt ?? row.amount),
                favouring: row.dd_favour ?? null,
                payableAt: row.dd_payable ?? null,
                issueDate: Parsers.dateString(row.dd_date),
                status: status,
                currentStage: StatusMapper.getStage(status),
                action: row.action ?? null,
                utr: row.utr ?? null,
                docketNo: row.docket_no ?? null,
                courierAddress: row.courier_add ?? null,
                courierDeadline: Parsers.integer(row.courier_deadline),
                generatedPdf: row.generated_dd ?? null,
                cancelPdf: row.ddcancel_pdf ?? null,
                docketSlip: row.docket_slip ?? null,
                reqNo: row.req_no ?? null,
                transferDate: Parsers.dateString(row.transfer_date),
                referenceNo: row.reference_no ?? null,
                creditDate: Parsers.dateString(row.date),
                creditAmount: row.amount ? Parsers.amount(row.amount) : null,
                remarks: row.remarks ?? null,
                legacyDdId: row.id,
                legacyData: { original_status: row.status, original_action: row.action },
                createdAt: Parsers.date(row.created_at) ?? new Date(),
                updatedAt: Parsers.date(row.updated_at) ?? new Date(),
            }).returning({ id: paymentInstruments.id });

            // Track for cheque linking
            this.ctx.legacyDdToInstrumentId.set(row.id, instrument.id);

            // Insert DD details
            await this.ctx.pgDb.insert(instrumentDdDetails).values({
                instrumentId: instrument.id,
                ddNo: row.dd_no ?? null,
                ddDate: Parsers.dateString(row.dd_date),
                bankName: null,
                reqNo: row.req_no ?? null,
                ddNeeds: row.dd_needs ?? null,
                ddPurpose: row.dd_purpose ?? null,
                ddRemarks: row.remarks ?? null,
            });

            this.ctx.stats.dds.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating DD id=${row.id}:`, err);
            this.ctx.stats.dds.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.dds;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

class BgMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating BGs...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlEmdBgs);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlEmdBgs.$inferSelect): Promise<void> {
        try {
            const emdId = row.emd_id ?? 0;

            if (!this.ctx.emdIds.has(emdId)) {
                console.warn(`  ⚠ Skipping BG id=${row.id}: EMD ${emdId} not found`);
                this.ctx.stats.bgs.skipped++;
                return;
            }

            const status = StatusMapper.bg(row.status, row.action);

            const [instrument] = await this.ctx.pgDb.insert(paymentInstruments).values({
                requestId: emdId,
                instrumentType: 'BG',
                amount: Parsers.amount(row.bg_amt),
                favouring: row.bg_favour ?? null,
                issueDate: Parsers.dateString(row.bg_date),
                expiryDate: Parsers.dateString(row.bg_expiry),
                validityDate: Parsers.dateString(row.bg_validity ?? row.bg_expiry),
                claimExpiryDate: Parsers.dateString(row.bg_claim ?? row.claim_expiry),
                status: status,
                currentStage: StatusMapper.getStage(status),
                action: Parsers.integer(row.action),
                docketNo: row.docket_no ?? null,
                docketSlip: row.docket_slip ?? null,
                courierAddress: row.bg_courier_addr ?? null,
                courierDeadline: Parsers.integer(row.bg_courier_deadline),
                rejectionReason: row.reason_req ?? null,
                extensionRequestPdf: row.request_extension_pdf ?? null,
                cancellationRequestPdf: row.request_cancellation_pdf ?? null,
                remarks: row.bg2_remark ?? null,
                legacyBgId: row.id,
                legacyData: { original_status: row.status, original_action: row.action },
                createdAt: Parsers.date(row.created_at) ?? new Date(),
                updatedAt: Parsers.date(row.updated_at) ?? new Date(),
            }).returning({ id: paymentInstruments.id });

            // Insert BG details
            await this.ctx.pgDb.insert(instrumentBgDetails).values({
                instrumentId: instrument.id,
                bgNo: row.bg_no ?? null,
                bgDate: Parsers.dateString(row.bg_date),
                validityDate: Parsers.dateString(row.bg_validity ?? row.bg_expiry),
                claimExpiryDate: Parsers.dateString(row.bg_claim ?? row.claim_expiry),
                beneficiaryName: row.bg_favour ?? null,
                beneficiaryAddress: row.bg_address ?? null,
                bankName: row.bg_bank ?? row.bg_bank_name ?? null,
                cashMarginPercent: Parsers.amount(row.bg_cont_percent),
                fdrMarginPercent: Parsers.amount(row.bg_fdr_percent),
                stampCharges: Parsers.amount(row.bg_stamp ?? row.new_stamp_charge_deducted),
                stampChargesDeducted: Parsers.amount(row.stamp_charge_deducted),
                sfmsChargesDeducted: Parsers.amount(row.sfms_charge_deducted),
                otherChargesDeducted: Parsers.amount(row.other_charge_deducted),
                extendedAmount: Parsers.amount(row.new_bg_amt),
                extendedValidityDate: Parsers.dateString(row.new_bg_expiry),
                extendedClaimExpiryDate: row.new_bg_claim ? Parsers.dateString(row.new_bg_claim.toString()) : null,
                extendedBankName: row.new_bg_bank_name ?? null,
                extensionLetterPath: row.ext_letter ?? null,
                prefilledSignedBg: row.prefilled_signed_bg ?? null,
                bgNeeds: row.bg_needs ?? null,
                bgPurpose: row.bg_purpose ?? null,
                bgSoftCopy: row.bg_soft_copy ?? null,
                bgPo: row.bg_po ?? null,
                bgClientUser: row.bg_client_user ?? null,
                bgClientCp: row.bg_client_cp ?? null,
                bgClientFin: row.bg_client_fin ?? null,
                bgBankAcc: row.bg_bank_acc ?? null,
                bgBankIfsc: row.bg_bank_ifsc ?? null,
                courierNo: row.courier_no ?? null,
                approveBg: row.approve_bg ?? null,
                bgFormatTe: row.bg_format_te ?? null,
                bgFormatTl: row.bg_format_tl ?? null,
                sfmsConf: row.sfms_conf ?? null,
                fdrAmt: Parsers.amount(row.fdr_amt),
                fdrPer: Parsers.amount(row.fdr_per),
                fdrCopy: row.fdr_copy ?? null,
                fdrNo: row.fdr_no ?? null,
                fdrValidity: Parsers.dateString(row.fdr_validity),
                fdrRoi: Parsers.amount(row.fdr_roi),
                bgChargeDeducted: Parsers.amount(row.bg_charge_deducted),
                newStampChargeDeducted: Parsers.amount(row.new_stamp_charge_deducted),
                stampCoveringLetter: row.stamp_covering_letter ?? null,
                cancelRemark: row.cancel_remark ?? null,
                cancellConfirm: row.cancell_confirm ?? null,
                bgFdrCancelDate: row.bg_fdr_cancel_date ?? null,
                bgFdrCancelAmount: Parsers.amount(row.bg_fdr_cancel_amount),
                bgFdrCancelRefNo: row.bg_fdr_cancel_ref_no ?? null,
                bg2Remark: row.bg2_remark ?? null,
                reasonReq: row.reason_req ?? null,
            });

            this.ctx.stats.bgs.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating BG id=${row.id}:`, err);
            this.ctx.stats.bgs.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.bgs;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

class ChequeMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating Cheques...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlEmdCheques);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlEmdCheques.$inferSelect): Promise<void> {
        try {
            const emdId = row.emd_id ?? 0;

            if (!this.ctx.emdIds.has(emdId)) {
                console.warn(`  ⚠ Skipping Cheque id=${row.id}: EMD ${emdId} not found`);
                this.ctx.stats.cheques.skipped++;
                return;
            }

            const status = StatusMapper.cheque(row.status, row.action);

            const [instrument] = await this.ctx.pgDb.insert(paymentInstruments).values({
                requestId: emdId,
                instrumentType: 'Cheque',
                amount: Parsers.amount(row.cheque_amt ?? row.amount),
                favouring: row.cheque_favour ?? null,
                issueDate: Parsers.dateString(row.cheque_date),
                status: status,
                currentStage: StatusMapper.getStage(status),
                action: row.action ?? null,
                utr: row.utr ?? null,
                rejectionReason: row.reason ?? row.stop_reason_text ?? null,
                generatedPdf: row.generated_pdfs ?? null,
                remarks: row.remarks ?? null,
                legacyChequeId: row.id,
                legacyData: { original_status: row.status, original_action: row.action },
                createdAt: Parsers.date(row.created_at) ?? new Date(),
                updatedAt: Parsers.date(row.updated_at) ?? new Date(),
            }).returning({ id: paymentInstruments.id });

            // Map linked DD/FDR IDs to new instrument IDs
            let linkedDdId: number | null = null;
            let linkedFdrId: number | null = null;

            if (row.dd_id) {
                linkedDdId = this.ctx.legacyDdToInstrumentId.get(row.dd_id) ?? null;
                if (!linkedDdId) {
                    console.warn(`  ⚠ Cheque id=${row.id}: DD link ${row.dd_id} not found, setting to NULL`);
                }
            }

            if (row.fdr_id) {
                linkedFdrId = this.ctx.legacyFdrToInstrumentId.get(row.fdr_id) ?? null;
                if (!linkedFdrId) {
                    console.warn(`  ⚠ Cheque id=${row.id}: FDR link ${row.fdr_id} not found, setting to NULL`);
                }
            }

            // Insert Cheque details
            await this.ctx.pgDb.insert(instrumentChequeDetails).values({
                instrumentId: instrument.id,
                chequeNo: row.cheque_no ?? null,
                chequeDate: Parsers.dateString(row.cheque_date),
                bankName: row.cheque_bank ?? null,
                chequeImagePath: row.cheque_img ?? null,
                cancelledImagePath: row.cancelled_img ?? null,
                linkedDdId: linkedDdId,
                linkedFdrId: linkedFdrId,
                reqType: row.req_type ?? null,
                chequeNeeds: row.cheque_needs ?? null,
                chequeReason: row.cheque_reason ?? null,
                dueDate: Parsers.dateString(row.duedate),
                transferDate: Parsers.dateString(row.transfer_date),
                btTransferDate: Parsers.dateString(row.bt_transfer_date),
                handover: row.handover ?? null,
                confirmation: row.confirmation ?? null,
                reference: row.reference ?? null,
                stopReasonText: row.stop_reason_text ?? null,
                amount: row.amount ? Parsers.amount(row.amount) : null,
            });

            this.ctx.stats.cheques.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating Cheque id=${row.id}:`, err);
            this.ctx.stats.cheques.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.cheques;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

class BankTransferMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating Bank Transfers...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlBankTransfers);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlBankTransfers.$inferSelect): Promise<void> {
        try {
            const emdId = row.emd_id ?? 0;

            if (!this.ctx.emdIds.has(emdId)) {
                console.warn(`  ⚠ Skipping Bank Transfer id=${row.id}: EMD ${emdId} not found`);
                this.ctx.stats.bankTransfers.skipped++;
                return;
            }

            const status = StatusMapper.bankTransfer(row.status, row.action);

            const [instrument] = await this.ctx.pgDb.insert(paymentInstruments).values({
                requestId: emdId,
                instrumentType: 'Bank Transfer',
                amount: Parsers.amount(row.bt_amount),
                status: status,
                currentStage: StatusMapper.getStage(status),
                action: row.action ?? null,
                utr: row.utr ?? row.utr_num ?? null,
                rejectionReason: row.reason ?? null,
                remarks: row.remarks ?? null,
                legacyBtId: row.id,
                legacyData: { original_status: row.status, original_action: row.action },
                createdAt: Parsers.date(row.created_at) ?? new Date(),
                updatedAt: Parsers.date(row.updated_at) ?? new Date(),
            }).returning({ id: paymentInstruments.id });

            // Insert Transfer details
            await this.ctx.pgDb.insert(instrumentTransferDetails).values({
                instrumentId: instrument.id,
                accountName: row.bt_acc_name ?? null,
                accountNumber: row.bt_acc ?? null,
                ifsc: row.bt_ifsc ?? null,
                transactionId: row.utr ?? row.utr_num ?? null,
                transactionDate: Parsers.date(row.date_time ?? row.transfer_date),
                utrMsg: row.utr_msg ?? null,
                utrNum: row.utr_num ?? null,
                remarks: row.remarks ?? null,
                reason: row.reason ?? null,
                returnTransferDate: Parsers.dateString(row.transfer_date),
                returnUtr: row.utr ?? null,
            });

            this.ctx.stats.bankTransfers.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating Bank Transfer id=${row.id}:`, err);
            this.ctx.stats.bankTransfers.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.bankTransfers;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

class PortalPaymentMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating Portal Payments...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlPayOnPortals);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlPayOnPortals.$inferSelect): Promise<void> {
        try {
            const emdId = row.emd_id ?? 0;

            if (!this.ctx.emdIds.has(emdId)) {
                console.warn(`  ⚠ Skipping Portal Payment id=${row.id}: EMD ${emdId} not found`);
                this.ctx.stats.portalPayments.skipped++;
                return;
            }

            const status = StatusMapper.portal(row.status, row.action);

            const [instrument] = await this.ctx.pgDb.insert(paymentInstruments).values({
                requestId: emdId,
                instrumentType: 'Portal Payment',
                amount: Parsers.amount(row.amount),
                status: status,
                currentStage: StatusMapper.getStage(status),
                action: row.action ?? null,
                utr: row.utr ?? row.utr_num ?? null,
                rejectionReason: row.reason ?? null,
                remarks: row.remarks ?? null,
                legacyPortalId: row.id,
                legacyData: { original_status: row.status, original_action: row.action },
                createdAt: Parsers.date(row.created_at) ?? new Date(),
                updatedAt: Parsers.date(row.updated_at) ?? new Date(),
            }).returning({ id: paymentInstruments.id });

            // Determine payment method
            let paymentMethod = 'Other';
            if (row.is_netbanking === 'yes' || row.is_netbanking === '1') {
                paymentMethod = 'Netbanking';
            } else if (row.is_debit === 'yes' || row.is_debit === '1') {
                paymentMethod = 'Debit Card';
            }

            // Insert Transfer details
            await this.ctx.pgDb.insert(instrumentTransferDetails).values({
                instrumentId: instrument.id,
                portalName: row.portal ?? null,
                paymentMethod: paymentMethod,
                transactionId: row.utr ?? row.utr_num ?? null,
                transactionDate: Parsers.date(row.date_time),
                utrMsg: row.utr_msg ?? null,
                utrNum: row.utr_num ?? null,
                isNetbanking: row.is_netbanking ?? null,
                isDebit: row.is_debit ?? null,
                remarks: row.remarks ?? null,
                reason: row.reason ?? null,
                returnTransferDate: Parsers.dateString(row.transfer_date),
                returnUtr: row.utr ?? null,
            });

            this.ctx.stats.portalPayments.success++;
        } catch (err) {
            console.error(`  ✗ Error migrating Portal Payment id=${row.id}:`, err);
            this.ctx.stats.portalPayments.errors++;
        }
    }

    private logStats(): void {
        const { success, errors, skipped } = this.ctx.stats.portalPayments;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors} | ⚠ Skipped: ${skipped}`);
    }
}

// ============================================================================
// POST-MIGRATION UPDATES
// ============================================================================

class PostMigrationUpdater {
    constructor(private ctx: MigrationContext) { }

    async updateAmounts(): Promise<void> {
        console.log('Updating payment request amounts...');

        const requests = await this.ctx.pgDb.select({ id: paymentRequests.id }).from(paymentRequests);
        let updated = 0;

        for (const req of requests) {
            try {
                const instruments = await this.ctx.pgDb
                    .select({ amount: paymentInstruments.amount })
                    .from(paymentInstruments)
                    .where(eq(paymentInstruments.requestId, req.id));

                const totalAmount = instruments.reduce(
                    (sum, inst) => sum + parseFloat(inst.amount || '0'),
                    0
                );

                await this.ctx.pgDb
                    .update(paymentRequests)
                    .set({ amountRequired: totalAmount.toFixed(2) })
                    .where(eq(paymentRequests.id, req.id));

                updated++;
            } catch (err) {
                console.error(`  ✗ Error updating amount for request ${req.id}:`, err);
            }
        }

        console.log(`  ✓ Updated amounts for ${updated} payment requests`);
    }

    async updateStatuses(): Promise<void> {
        console.log('Updating payment request statuses...');

        const requests = await this.ctx.pgDb.select({ id: paymentRequests.id }).from(paymentRequests);
        let updated = 0;

        for (const req of requests) {
            try {
                const instruments = await this.ctx.pgDb
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

                await this.ctx.pgDb
                    .update(paymentRequests)
                    .set({ status: overallStatus })
                    .where(eq(paymentRequests.id, req.id));

                updated++;
            } catch (err) {
                console.error(`  ✗ Error updating status for request ${req.id}:`, err);
            }
        }

        console.log(`  ✓ Updated statuses for ${updated} payment requests`);
    }
}

// ============================================================================
// SEQUENCE RESETTER
// ============================================================================

class SequenceResetter {
    constructor(private ctx: MigrationContext) { }

    async reset(): Promise<void> {
        console.log('Resetting PostgreSQL sequences...');

        const tables = [
            'payment_requests',
            'payment_instruments',
            'instrument_dd_details',
            'instrument_fdr_details',
            'instrument_bg_details',
            'instrument_cheque_details',
            'instrument_transfer_details',
        ];

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
        console.log('  EMD MIGRATION: MySQL → PostgreSQL');
        console.log('  (Preserving EMD IDs, Auto-generating Instrument IDs)');
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
            pgClient: this.pgClient,
            mysqlDb: mysqlDrizzle(this.mysqlPool as any),
            emdIds: new Set(),
            legacyFdrToInstrumentId: new Map(),
            legacyDdToInstrumentId: new Map(),
            stats: {
                paymentRequests: { success: 0, errors: 0, skipped: 0 },
                fdrs: { success: 0, errors: 0, skipped: 0 },
                dds: { success: 0, errors: 0, skipped: 0 },
                bgs: { success: 0, errors: 0, skipped: 0 },
                cheques: { success: 0, errors: 0, skipped: 0 },
                bankTransfers: { success: 0, errors: 0, skipped: 0 },
                portalPayments: { success: 0, errors: 0, skipped: 0 },
            },
        };
    }

    private async executeMigration(): Promise<void> {
        const steps = [
            { name: 'Migrate payment_requests (EMDs)', fn: () => new PaymentRequestsMigrator(this.ctx).migrate() },
            { name: 'Migrate FDRs', fn: () => new FdrMigrator(this.ctx).migrate() },
            { name: 'Migrate Demand Drafts', fn: () => new DdMigrator(this.ctx).migrate() },
            { name: 'Migrate Bank Guarantees', fn: () => new BgMigrator(this.ctx).migrate() },
            { name: 'Migrate Cheques', fn: () => new ChequeMigrator(this.ctx).migrate() },
            { name: 'Migrate Bank Transfers', fn: () => new BankTransferMigrator(this.ctx).migrate() },
            { name: 'Migrate Portal Payments', fn: () => new PortalPaymentMigrator(this.ctx).migrate() },
            { name: 'Update amounts', fn: () => new PostMigrationUpdater(this.ctx).updateAmounts() },
            { name: 'Update statuses', fn: () => new PostMigrationUpdater(this.ctx).updateStatuses() },
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
        const { stats, emdIds, legacyFdrToInstrumentId, legacyDdToInstrumentId } = this.ctx;

        const totalInstruments =
            stats.fdrs.success +
            stats.dds.success +
            stats.bgs.success +
            stats.cheques.success +
            stats.bankTransfers.success +
            stats.portalPayments.success;

        console.log('═'.repeat(60));
        console.log('  MIGRATION SUMMARY');
        console.log('═'.repeat(60));
        console.log('');
        console.log('  Table                    Success   Errors   Skipped');
        console.log('  ───────────────────────────────────────────────────────');
        console.log(`  payment_requests         ${this.pad(stats.paymentRequests.success)}      ${this.pad(stats.paymentRequests.errors)}       ${stats.paymentRequests.skipped}`);
        console.log(`  FDRs                     ${this.pad(stats.fdrs.success)}      ${this.pad(stats.fdrs.errors)}       ${stats.fdrs.skipped}`);
        console.log(`  Demand Drafts            ${this.pad(stats.dds.success)}      ${this.pad(stats.dds.errors)}       ${stats.dds.skipped}`);
        console.log(`  Bank Guarantees          ${this.pad(stats.bgs.success)}      ${this.pad(stats.bgs.errors)}       ${stats.bgs.skipped}`);
        console.log(`  Cheques                  ${this.pad(stats.cheques.success)}      ${this.pad(stats.cheques.errors)}       ${stats.cheques.skipped}`);
        console.log(`  Bank Transfers           ${this.pad(stats.bankTransfers.success)}      ${this.pad(stats.bankTransfers.errors)}       ${stats.bankTransfers.skipped}`);
        console.log(`  Portal Payments          ${this.pad(stats.portalPayments.success)}      ${this.pad(stats.portalPayments.errors)}       ${stats.portalPayments.skipped}`);
        console.log('  ───────────────────────────────────────────────────────');
        console.log(`  Total Instruments:       ${totalInstruments}`);
        console.log(`  EMD IDs Preserved:       ${emdIds.size}`);
        console.log(`  FDR→Instrument Maps:     ${legacyFdrToInstrumentId.size}`);
        console.log(`  DD→Instrument Maps:      ${legacyDdToInstrumentId.size}`);
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
