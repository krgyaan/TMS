import 'dotenv/config';
import mysql from 'mysql2/promise';
import { sql, eq } from 'drizzle-orm';
import { createDb, createPool } from '@/db';
import { stepInstances, timerEvents } from '@/db/schemas/workflow/workflows.schema';
import { tenderInfos } from '@/db/schemas/tendering/tenders.schema';
import { users } from '@/db/schemas/auth/users.schema';
import { paymentRequests } from '@/db/schemas/tendering/emds.schema';
import { couriers } from '@/db/schemas/shared/couriers.schema';

// ============================================
// MAPPINGS
// ============================================

const STAGE_MAPPING: Record<string, { stepKey: string; workflowCode: string; entityType: 'TENDER' | 'COURIER' | 'EMD' | 'SERVICE' | 'OPERATION' }> = {
    // Tendering
    'tender_created': { stepKey: 'tender_info', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'tender_info_sheet': { stepKey: 'tender_info', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'tender_approval': { stepKey: 'tender_approval', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'rfq': { stepKey: 'rfq_sent', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'rfq_received': { stepKey: 'rfq_response', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'physical_docs': { stepKey: 'physical_docs', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'emd_request': { stepKey: 'emd_requested', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'tender_fees': { stepKey: 'tender_fees', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'document_checklist': { stepKey: 'document_checklist', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'costing_sheet': { stepKey: 'costing_sheets', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'costing_sheet_approval': { stepKey: 'costing_approval', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'bid_submission': { stepKey: 'bid_submission', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'tq_replied': { stepKey: 'tq_management', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'ra_management': { stepKey: 'ra_management', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'result': { stepKey: 'result', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },

    // EMD
    'pop_acc_form': { stepKey: 'pop_acc_form', workflowCode: 'EMD_WF', entityType: 'EMD' },
    'bt_acc_form': { stepKey: 'bt_acc_form', workflowCode: 'EMD_WF', entityType: 'EMD' },
    'cheque_ac_form': { stepKey: 'cheque_acc_form', workflowCode: 'EMD_WF', entityType: 'EMD' },
    'cheque_acc_form': { stepKey: 'cheque_acc_form', workflowCode: 'EMD_WF', entityType: 'EMD' },
    'dd_acc_form': { stepKey: 'dd_acc_form', workflowCode: 'EMD_WF', entityType: 'EMD' },
    'bg_acc_form': { stepKey: 'bg_acc_form', workflowCode: 'EMD_WF', entityType: 'EMD' },
    'fdr_acc_form': { stepKey: 'fdr_acc_form', workflowCode: 'EMD_WF', entityType: 'EMD' },

    // Courier
    'courier_created': { stepKey: 'courier_created', workflowCode: 'COURIER_WF', entityType: 'COURIER' },
    'courier_despatched': { stepKey: 'courier_dispatched', workflowCode: 'COURIER_WF', entityType: 'COURIER' },
    'courier_picked_up': { stepKey: 'courier_dispatched', workflowCode: 'COURIER_WF', entityType: 'COURIER' },
};

// Simplified Workflow Config (Embedded)
const WORKFLOW_DEFINITIONS: Record<string, any> = {
    'TENDERING_WF': {
        steps: [
            { stepKey: 'tender_info', stepName: 'Tender Info', stepOrder: 1, timerConfig: { type: 'FIXED_DURATION', durationHours: 72 } },
            { stepKey: 'tender_approval', stepName: 'Tender Approval', stepOrder: 2, timerConfig: { type: 'FIXED_DURATION', durationHours: 24 } },
            { stepKey: 'rfq_sent', stepName: 'RFQ Sent', stepOrder: 3, timerConfig: { type: 'FIXED_DURATION', durationHours: 24 } },
            { stepKey: 'rfq_response', stepName: 'RFQ Response', stepOrder: 4, timerConfig: { type: 'NO_TIMER' } },
            { stepKey: 'emd_requested', stepName: 'EMD Requested', stepOrder: 5, timerConfig: { type: 'FIXED_DURATION', durationHours: 24 } },
            { stepKey: 'tender_fees', stepName: 'Tender Fees', stepOrder: 6, timerConfig: { type: 'NO_TIMER' } },
            { stepKey: 'physical_docs', stepName: 'Physical Docs', stepOrder: 7, timerConfig: { type: 'FIXED_DURATION', durationHours: 48 } },
            { stepKey: 'document_checklist', stepName: 'Document Checklist', stepOrder: 8, timerConfig: { type: 'NEGATIVE_COUNTDOWN', hoursBeforeDeadline: -72 } },
            { stepKey: 'costing_sheets', stepName: 'Costing Sheets', stepOrder: 9, timerConfig: { type: 'NEGATIVE_COUNTDOWN', hoursBeforeDeadline: -72 } },
            { stepKey: 'costing_approval', stepName: 'Costing Approval', stepOrder: 10, timerConfig: { type: 'NEGATIVE_COUNTDOWN', hoursBeforeDeadline: -48 } },
            { stepKey: 'bid_submission', stepName: 'Bid Submission', stepOrder: 11, timerConfig: { type: 'NEGATIVE_COUNTDOWN', hoursBeforeDeadline: -24 } },
            { stepKey: 'tq_management', stepName: 'TQ Management', stepOrder: 12, timerConfig: { type: 'DEADLINE_BASED' } },
            { stepKey: 'ra_management', stepName: 'RA Management', stepOrder: 13, timerConfig: { type: 'NO_TIMER' } },
            { stepKey: 'result', stepName: 'Result', stepOrder: 14, timerConfig: { type: 'NO_TIMER' } },
        ]
    },
    'EMD_WF': {
        steps: [
            { stepKey: 'pop_acc_form', stepName: 'Pay on Portal', stepOrder: 1, timerConfig: { type: 'DEADLINE_BASED' } },
            { stepKey: 'bt_acc_form', stepName: 'Bank Transfer', stepOrder: 1, timerConfig: { type: 'DEADLINE_BASED' } },
            { stepKey: 'cheque_acc_form', stepName: 'Cheque', stepOrder: 1, timerConfig: { type: 'DYNAMIC' } },
            { stepKey: 'dd_acc_form', stepName: 'Demand Draft', stepOrder: 1, timerConfig: { type: 'FIXED_DURATION', durationHours: 3 } },
            { stepKey: 'fdr_acc_form', stepName: 'FDR', stepOrder: 1, timerConfig: { type: 'FIXED_DURATION', durationHours: 3 } },
            { stepKey: 'bg_acc_form', stepName: 'Bank Guarantee', stepOrder: 1, timerConfig: { type: 'DEADLINE_BASED' } },
        ]
    },
    'COURIER_WF': {
        steps: [
            { stepKey: 'courier_created', stepName: 'Courier Created', stepOrder: 1, timerConfig: { type: 'NO_TIMER' } },
            { stepKey: 'courier_dispatched', stepName: 'Courier Dispatched', stepOrder: 2, timerConfig: { type: 'FIXED_DURATION', durationHours: 2 } },
        ]
    }
};

class TimerMigration {
    private mysqlPool: mysql.Pool;
    private pgPool: ReturnType<typeof createPool>;
    private pgDb: ReturnType<typeof createDb>;

    // Caches: Old ID -> New UUID
    private tenderMap = new Map<string, { uuid: string; deadline: Date | null }>();
    private emdMap = new Map<string, string>();
    private courierMap = new Map<number, string>();
    private userMap = new Map<number, string>();

    private stats = {
        total: 0,
        migrated: 0,
        skipped: 0,
        errors: 0,
    };

    constructor() {
        this.mysqlPool = mysql.createPool({
            host: process.env.MYSQL_HOST || 'localhost',
            port: parseInt(process.env.MYSQL_PORT || '3306'),
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || '',
            database: process.env.MYSQL_DATABASE || 'laravel_db',
        });

        const pgUrl = process.env.DATABASE_URL;
        if (!pgUrl) throw new Error('DATABASE_URL is not set');
        this.pgPool = createPool(pgUrl);
        this.pgDb = createDb(this.pgPool);
    }

    async run() {
        console.log('🚀 Starting Timer Migration (Direct ID Mapping)...\n');

        try {
            await this.loadMappings();
            await this.migrateTimers();
            this.printReport();
        } catch (error) {
            console.error('❌ Migration Critical Error:', error);
        } finally {
            await this.mysqlPool.end();
            await this.pgPool.end();
        }
    }

    // ============================================
    // 1. LOAD MAPPINGS
    // ============================================
    private async loadMappings() {
        console.log('📦 Loading Entity Mappings...');

        const pgUsers = await this.pgDb.select({ id: users.id }).from(users);
        for (const u of pgUsers) {
            if (u.id) this.userMap.set(u.id, u.id.toString());
        }
        console.log(`   ✅ Mapped ${this.userMap.size} users`);

        // 2. Tenders
        const pgTenders = await this.pgDb.select({
            id: tenderInfos.id,
            tenderNo: tenderInfos.tenderNo,
            dueDate: tenderInfos.dueDate
        }).from(tenderInfos);

        for (const t of pgTenders) {
            if (t.tenderNo) {
                this.tenderMap.set(t.tenderNo.toString(), { uuid: t.id.toString(), deadline: t.dueDate });
            }
        }
        console.log(`   ✅ Mapped ${this.tenderMap.size} tenders\n`);

        // 3. EMDs
        const pgEmds = await this.pgDb.select({ id: paymentRequests.id, tenderNo: paymentRequests.tenderNo }).from(paymentRequests);
        for (const e of pgEmds) {
            if (e.tenderNo) this.emdMap.set(e.tenderNo.toString(), e.id.toString());
        }
        console.log(`   ✅ Mapped ${this.emdMap.size} EMDs`);

        // 4. Couriers
        const pgCouriers = await this.pgDb.select({ id: couriers.id }).from(couriers);
        for (const c of pgCouriers) {
            if (c.id) this.courierMap.set(c.id, c.id.toString());
        }
        console.log(`   ✅ Mapped ${this.courierMap.size} couriers`);
    }

    // ============================================
    // 2. MIGRATE TIMERS
    // ============================================
    private async migrateTimers() {
        console.log('⏱️  Processing Timer Trackers...');

        const [timers] = await this.mysqlPool.execute<any[]>(`
            SELECT id, tender_id, user_id, stage, start_time, end_time, duration_hours, remaining_time, status, created_at, updated_at
            FROM timer_trackers ORDER BY created_at ASC
        `);

        this.stats.total = timers.length;

        for (const timer of timers) {
            try {
                await this.processTimer(timer);
                this.stats.migrated++;
            } catch (error: any) {
                // console.error(`Error processing timer ${timer.id}: ${error.message}`);
                this.stats.errors++;
            }
        }
    }

    private async processTimer(timer: any) {
        // 1. Get New Stage Config
        const mapping = STAGE_MAPPING[timer.stage];
        if (!mapping) {
            this.stats.skipped++;
            return; // Unknown stage
        }

        // 2. Get Step Definition
        const stepDef = WORKFLOW_DEFINITIONS[mapping.workflowCode]?.steps.find((s: any) => s.stepKey === mapping.stepKey);
        if (!stepDef) return; // Should not happen if mapping is correct

        // 3. Resolve Entity ID (Direct Lookup)
        // The `tender_id` column in MySQL holds the ID of the specific entity (Tender, EMD, or Courier)
        let entityId: string | undefined;
        const oldEntityId = timer.tender_id; // This is the generic column name in old DB

        if (mapping.entityType === 'TENDER') {
            const tenderData = this.tenderMap.get(oldEntityId);
            if (tenderData) entityId = tenderData.uuid;
        } else if (mapping.entityType === 'EMD') {
            entityId = this.emdMap.get(oldEntityId);
        } else if (mapping.entityType === 'COURIER') {
            entityId = this.courierMap.get(oldEntityId);
        }

        if (!entityId) {
            // Entity not found in new DB (maybe deleted or not migrated)
            throw new Error(`${mapping.entityType} with ID ${oldEntityId} not found`);
        }

        // 4. Resolve User
        const userId = this.userMap.get(timer.user_id) || null;

        // 5. Calculate Timings
        const startTime = timer.start_time ? new Date(timer.start_time) : null;
        const endTime = timer.end_time ? new Date(timer.end_time) : null;
        const allocatedMs = timer.duration_hours * 3600 * 1000;

        let actualMs: number | null = null;
        if (startTime && endTime) actualMs = endTime.getTime() - startTime.getTime();

        let remainingMs = timer.remaining_time * 1000;

        // 6. Map Status
        let status: any = 'IN_PROGRESS';
        let timerStatus: any = 'RUNNING';

        if (timer.status === 'completed') {
            status = 'COMPLETED';
            timerStatus = 'COMPLETED';
        } else if (timer.status === 'timeout') {
            status = 'COMPLETED';
            timerStatus = 'OVERDUE';
        }

        // 7. Insert Step Instance
        const [newStep] = await this.pgDb.insert(stepInstances).values({
            entityType: mapping.entityType as 'TENDER' | 'COURIER' | 'EMD' | 'SERVICE' | 'OPERATION',
            entityId: parseInt(entityId),
            stepKey: mapping.stepKey,
            stepName: stepDef.stepName,
            stepOrder: stepDef.stepOrder,
            assignedToUserId: userId ? parseInt(userId) : undefined,
            assignedRole: 'TE',

            timerConfig: stepDef.timerConfig,

            status: status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'REJECTED' | 'ON_HOLD',
            timerStatus: timerStatus as 'NOT_STARTED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'OVERDUE' | 'SKIPPED' | 'CANCELLED',

            workflowCode: mapping.workflowCode,

            actualStartAt: startTime,
            actualEndAt: endTime,

            allocatedTimeMs: allocatedMs,
            actualTimeMs: actualMs,
            remainingTimeMs: remainingMs,

            dependsOnSteps: [],
            canRunInParallel: false,

            metadata: {
                migratedFromLaravel: true,
                originalTimerId: timer.id,
                laravelStage: timer.stage
            },

            createdAt: timer.created_at,
            updatedAt: timer.updated_at
        }).returning();

        // 8. Create Events
        if (startTime) {
            await this.pgDb.insert(timerEvents).values({
                stepInstanceId: newStep.id,
                eventType: 'START',
                performedByUserId: userId ? parseInt(userId) : undefined,
                newStatus: 'RUNNING',
                createdAt: startTime,
                metadata: { migration: true }
            });
        }

        if (endTime && status === 'COMPLETED') {
            await this.pgDb.insert(timerEvents).values({
                stepInstanceId: newStep.id,
                eventType: 'COMPLETE',
                performedByUserId: userId ? parseInt(userId) : undefined,
                previousStatus: 'RUNNING',
                newStatus: timerStatus,
                createdAt: endTime,
                metadata: { migration: true }
            });
        }
    }

    private printReport() {
        console.log('\n📊 Migration Report');
        console.log('-------------------');
        console.log(`Total:    ${this.stats.total}`);
        console.log(`Migrated: ${this.stats.migrated} ✅`);
        console.log(`Skipped:  ${this.stats.skipped} ⚠️`);
        console.log(`Errors:   ${this.stats.errors} ❌`);
    }
}

if (require.main === module) {
    const migration = new TimerMigration();
    migration.run().catch(console.error);
}
