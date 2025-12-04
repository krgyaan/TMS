import 'dotenv/config';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';
import { createDb, createPool } from '../src/db';
import {
    wfTemplates,
    wfSteps,
    wfInstances,
    wfStepInstances,
    wfTimerEvents,
} from '../src/db/workflows.schema';

// ============================================
// TYPES
// ============================================

interface OldTimerTracker {
    id: number;
    tender_id: number;
    user_id: number;
    stage: string;
    start_time: Date | null;
    end_time: Date | null;
    duration_hours: number;
    remaining_time: number;
    status: 'running' | 'completed' | 'timeout';
    created_at: Date;
    updated_at: Date;
}

interface TenderInfo {
    id: number;
    due_date: Date | null;
    team_member: number | null;
}

interface CourierInfo {
    id: number;
    pickup_date: Date | null;
    emp_from: number | null;
}

interface MigrationStats {
    total: number;
    migrated: number;
    skipped: number;
    errors: number;
    orphaned: number;
    workflowInstancesCreated: number;
    stepInstancesCreated: number;
    timerEventsCreated: number;
}

// ============================================
// STAGE TO STEP MAPPING
// ============================================

const STAGE_TO_STEP_MAP: Record<string, {
    stepKey: string;
    workflowCode: string;
    entityType: 'TENDER' | 'COURIER' | 'OPERATION_CONTRACT';
}> = {
    // Tendering workflow
    'tender_info_sheet': { stepKey: 'tender_info_sheet', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'tender_approval': { stepKey: 'tender_approval', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'rfq': { stepKey: 'rfq', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'rfq_received': { stepKey: 'rfq_response', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'physical_docs': { stepKey: 'physical_docs', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'emd_request': { stepKey: 'emd_request', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'document_checklist': { stepKey: 'document_checklist', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'costing_sheet': { stepKey: 'costing_sheet', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'costing_sheet_approval': { stepKey: 'costing_approval', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'bid_submission': { stepKey: 'bid_submission', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'tq_replied': { stepKey: 'tq_completion', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },

    // EMD Payment stages (all map to emd_payment)
    'pop_acc_form': { stepKey: 'emd_payment', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'bt_acc_form': { stepKey: 'emd_payment', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'cheque_ac_form': { stepKey: 'emd_payment', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'dd_acc_form': { stepKey: 'emd_payment', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'bg_acc_form': { stepKey: 'emd_payment', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    'fdr_acc_form': { stepKey: 'emd_payment', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },

    // Courier workflow
    'courier_created': { stepKey: 'courier_dispatch', workflowCode: 'COURIER_WF', entityType: 'COURIER' },
    'courier_despatched': { stepKey: 'courier_dispatch', workflowCode: 'COURIER_WF', entityType: 'COURIER' },

    // Operation workflow
    'wo_details': { stepKey: 'wo_details', workflowCode: 'OPERATION_WF', entityType: 'OPERATION_CONTRACT' },
    'wo_acceptance': { stepKey: 'wo_acceptance', workflowCode: 'OPERATION_WF', entityType: 'OPERATION_CONTRACT' },
    'kickoff_meeting': { stepKey: 'kickoff_meeting', workflowCode: 'OPERATION_WF', entityType: 'OPERATION_CONTRACT' },
};

// ============================================
// STATUS MAPPING
// ============================================

function mapStatus(oldStatus: string): { status: string; timerStatus: string } {
    switch (oldStatus) {
        case 'running':
            return { status: 'IN_PROGRESS', timerStatus: 'RUNNING' };
        case 'completed':
            return { status: 'COMPLETED', timerStatus: 'COMPLETED' };
        case 'timeout':
            return { status: 'COMPLETED', timerStatus: 'OVERDUE' };
        default:
            return { status: 'PENDING', timerStatus: 'NOT_STARTED' };
    }
}

// ============================================
// MAIN MIGRATION CLASS
// ============================================

class TimerMigration {
    private mysqlPool: mysql.Pool;
    private pgPool: ReturnType<typeof createPool>;
    private pgDb: ReturnType<typeof createDb>;

    private stats: MigrationStats = {
        total: 0,
        migrated: 0,
        skipped: 0,
        errors: 0,
        orphaned: 0,
        workflowInstancesCreated: 0,
        stepInstancesCreated: 0,
        timerEventsCreated: 0,
    };

    // Caches
    private workflowTemplateCache: Map<string, number> = new Map();
    private workflowStepCache: Map<string, number> = new Map();
    private workflowInstanceCache: Map<string, number> = new Map();
    private tenderCache: Map<number, TenderInfo> = new Map();
    private courierCache: Map<number, CourierInfo> = new Map();
    private userIdMapping: Map<number, number> = new Map();

    // ID counters (for manual ID generation)
    private nextWorkflowInstanceId = 1;
    private nextStepInstanceId = 1;
    private nextTimerEventId = 1;

    // Logs
    private errorLog: { timerId: number; stage: string; entityId: number; error: string }[] = [];
    private skippedLog: { timerId: number; stage: string; entityId: number; reason: string }[] = [];

    constructor() {
        this.mysqlPool = mysql.createPool({
            host: process.env.MYSQL_HOST || 'localhost',
            port: parseInt(process.env.MYSQL_PORT || '3306'),
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || 'gyan',
            database: process.env.MYSQL_DATABASE || 'mydb',
            waitForConnections: true,
            connectionLimit: 10,
        });

        const pgUrl = process.env.DATABASE_URL || 'postgresql://postgres:gyan@localhost:5432/new_tms';
        if (!pgUrl) throw new Error('DATABASE_URL is not set');
        this.pgPool = createPool(pgUrl);
        this.pgDb = createDb(this.pgPool);
    }

    async run() {
        console.log('🚀 Starting MySQL to PostgreSQL Timer Migration\n');
        console.log('═'.repeat(60));

        try {
            await this.loadCaches();
            await this.analyzeData();
            await this.initializeIdCounters();
            await this.migrateTimers();
            await this.validate();
            this.printReport();
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        } finally {
            await this.cleanup();
        }
    }

    // ============================================
    // INITIALIZE ID COUNTERS
    // ============================================

    private async initializeIdCounters() {
        console.log('🔢 Initializing ID counters...');

        // Get max IDs from existing records
        const [instanceMax] = await this.pgDb
            .select({ maxId: sql<number>`COALESCE(MAX(id), 0)` })
            .from(wfInstances);
        this.nextWorkflowInstanceId = (instanceMax?.maxId || 0) + 1;

        const [stepInstanceMax] = await this.pgDb
            .select({ maxId: sql<number>`COALESCE(MAX(id), 0)` })
            .from(wfStepInstances);
        this.nextStepInstanceId = (stepInstanceMax?.maxId || 0) + 1;

        const [eventMax] = await this.pgDb
            .select({ maxId: sql<number>`COALESCE(MAX(id), 0)` })
            .from(wfTimerEvents);
        this.nextTimerEventId = (eventMax?.maxId || 0) + 1;

        console.log(`   Workflow Instance start ID: ${this.nextWorkflowInstanceId}`);
        console.log(`   Step Instance start ID: ${this.nextStepInstanceId}`);
        console.log(`   Timer Event start ID: ${this.nextTimerEventId}`);
        console.log('   ✅ ID counters initialized\n');
    }

    // ============================================
    // LOAD CACHES
    // ============================================

    private async loadCaches() {
        console.log('\n📦 Loading caches...\n');

        // Load workflow templates
        console.log('   Loading workflow templates...');
        const templates = await this.pgDb
            .select({ id: wfTemplates.id, code: wfTemplates.code })
            .from(wfTemplates);

        for (const t of templates) {
            this.workflowTemplateCache.set(t.code, t.id);
        }
        console.log(`   ✅ Loaded ${templates.length} workflow templates`);

        // Load workflow steps
        console.log('   Loading workflow steps...');
        const steps = await this.pgDb
            .select({
                id: wfSteps.id,
                templateId: wfSteps.workflowTemplateId,
                stepKey: wfSteps.stepKey,
            })
            .from(wfSteps);

        for (const s of steps) {
            this.workflowStepCache.set(`${s.templateId}:${s.stepKey}`, s.id);
        }
        console.log(`   ✅ Loaded ${steps.length} workflow steps`);

        // Load existing workflow instances
        console.log('   Loading existing workflow instances...');
        const instances = await this.pgDb
            .select({
                id: wfInstances.id,
                entityType: wfInstances.entityType,
                entityId: wfInstances.entityId,
            })
            .from(wfInstances);

        for (const i of instances) {
            this.workflowInstanceCache.set(`${i.entityType}:${i.entityId}`, i.id);
        }
        console.log(`   ✅ Loaded ${instances.length} existing workflow instances`);

        // Load tenders from MySQL
        console.log('   Loading tender info from MySQL...');
        const [tenders] = await this.mysqlPool.execute<mysql.RowDataPacket[]>(
            'SELECT id, due_date, team_member FROM tender_infos'
        );
        for (const t of tenders) {
            this.tenderCache.set(t.id, {
                id: t.id,
                due_date: t.due_date,
                team_member: t.team_member,
            });
        }
        console.log(`   ✅ Loaded ${tenders.length} tenders`);

        // Load couriers from MySQL
        console.log('   Loading courier info from MySQL...');
        const [couriers] = await this.mysqlPool.execute<mysql.RowDataPacket[]>(
            'SELECT id, pickup_date, emp_from FROM courier_dashboards'
        );
        for (const c of couriers) {
            this.courierCache.set(c.id, {
                id: c.id,
                pickup_date: c.pickup_date,
                emp_from: c.emp_from,
            });
        }
        console.log(`   ✅ Loaded ${couriers.length} couriers`);

        // Load user mappings
        console.log('   Loading user mappings...');
        const [users] = await this.mysqlPool.execute<mysql.RowDataPacket[]>(
            'SELECT id FROM users'
        );
        for (const u of users) {
            this.userIdMapping.set(u.id, u.id);
        }
        console.log(`   ✅ Loaded ${users.length} user mappings`);

        console.log('\n   ✅ All caches loaded\n');
    }

    // ============================================
    // ANALYZE DATA
    // ============================================

    private async analyzeData() {
        console.log('📊 Analyzing data...\n');

        const [countResult] = await this.mysqlPool.execute<mysql.RowDataPacket[]>(
            'SELECT COUNT(*) as total FROM timer_trackers'
        );
        this.stats.total = countResult[0].total;
        console.log(`   Total timer records: ${this.stats.total}`);

        const [statusCount] = await this.mysqlPool.execute<mysql.RowDataPacket[]>(
            'SELECT status, COUNT(*) as count FROM timer_trackers GROUP BY status'
        );
        console.log('   Status breakdown:');
        for (const s of statusCount) {
            console.log(`      • ${s.status}: ${s.count}`);
        }

        const [stageCount] = await this.mysqlPool.execute<mysql.RowDataPacket[]>(
            'SELECT stage, COUNT(*) as count FROM timer_trackers GROUP BY stage ORDER BY count DESC'
        );
        console.log('\n   Stage breakdown:');
        for (const s of stageCount) {
            const mapped = STAGE_TO_STEP_MAP[s.stage] ? '✓' : '✗';
            console.log(`      ${mapped} ${s.stage}: ${s.count}`);
        }

        console.log('\n   ✅ Analysis complete\n');
    }

    // ============================================
    // MIGRATE TIMERS
    // ============================================

    private async migrateTimers() {
        console.log('🔄 Migrating timers...\n');

        const batchSize = 500;
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            const [timers] = await this.mysqlPool.execute<mysql.RowDataPacket[]>(
                `SELECT * FROM timer_trackers ORDER BY id ASC LIMIT ${batchSize} OFFSET ${offset}`
            );

            if (timers.length === 0) {
                hasMore = false;
                break;
            }

            const batchNum = Math.floor(offset / batchSize) + 1;
            console.log(`   Processing batch ${batchNum} (${timers.length} records)...`);

            // Process batch
            for (const timer of timers as unknown as OldTimerTracker[]) {
                await this.migrateTimer(timer);
            }

            offset += batchSize;

            const progress = Math.min(100, Math.round((offset / this.stats.total) * 100));
            const processed = Math.min(offset, this.stats.total);
            console.log(`   Progress: ${progress}% (${processed}/${this.stats.total}) | Migrated: ${this.stats.migrated} | Errors: ${this.stats.errors}`);
        }

        console.log('\n   ✅ Timer migration complete\n');
    }

    private async migrateTimer(timer: OldTimerTracker) {
        try {
            // 1. Check if stage is mapped
            const mapping = STAGE_TO_STEP_MAP[timer.stage];
            if (!mapping) {
                this.skippedLog.push({
                    timerId: timer.id,
                    stage: timer.stage,
                    entityId: timer.tender_id,
                    reason: `Unmapped stage: ${timer.stage}`,
                });
                this.stats.skipped++;
                return;
            }

            const { stepKey, workflowCode, entityType } = mapping;

            // 2. Validate entity exists
            if (entityType === 'TENDER' || entityType === 'OPERATION_CONTRACT') {
                const tender = this.tenderCache.get(timer.tender_id);
                if (!tender) {
                    this.skippedLog.push({
                        timerId: timer.id,
                        stage: timer.stage,
                        entityId: timer.tender_id,
                        reason: `Tender ${timer.tender_id} not found`,
                    });
                    this.stats.orphaned++;
                    this.stats.skipped++;
                    return;
                }
            } else if (entityType === 'COURIER') {
                const courier = this.courierCache.get(timer.tender_id);
                if (!courier) {
                    this.skippedLog.push({
                        timerId: timer.id,
                        stage: timer.stage,
                        entityId: timer.tender_id,
                        reason: `Courier ${timer.tender_id} not found`,
                    });
                    this.stats.orphaned++;
                    this.stats.skipped++;
                    return;
                }
            }

            // 3. Get or create workflow instance
            const workflowInstanceId = await this.getOrCreateWorkflowInstance(
                entityType,
                timer.tender_id,
                workflowCode,
                timer.start_time
            );

            // 4. Get workflow step ID
            const templateId = this.workflowTemplateCache.get(workflowCode);
            if (!templateId) {
                this.skippedLog.push({
                    timerId: timer.id,
                    stage: timer.stage,
                    entityId: timer.tender_id,
                    reason: `Workflow template ${workflowCode} not found`,
                });
                this.stats.skipped++;
                return;
            }

            const stepId = this.workflowStepCache.get(`${templateId}:${stepKey}`);
            if (!stepId) {
                this.skippedLog.push({
                    timerId: timer.id,
                    stage: timer.stage,
                    entityId: timer.tender_id,
                    reason: `Step ${stepKey} not found in template ${workflowCode}`,
                });
                this.stats.skipped++;
                return;
            }

            // 5. Map user ID
            const newUserId = this.userIdMapping.get(timer.user_id) || null;

            // 6. Calculate times
            const { status, timerStatus } = mapStatus(timer.status);
            const startTime = timer.start_time;
            const endTime = timer.end_time;

            let allocatedTimeMs: number | null = null;
            let scheduledEndAt: Date | null = null;

            if (timer.duration_hours > 0) {
                allocatedTimeMs = timer.duration_hours * 3600 * 1000;
                if (startTime) {
                    scheduledEndAt = new Date(startTime.getTime() + allocatedTimeMs);
                }
            } else {
                // Duration = 0, calculate from tender due_date
                const tender = this.tenderCache.get(timer.tender_id);
                if (tender?.due_date && startTime) {
                    const dueDate = new Date(tender.due_date);
                    let hoursBeforeDeadline = 72;
                    if (timer.stage === 'costing_sheet_approval') hoursBeforeDeadline = 48;
                    if (timer.stage === 'bid_submission') hoursBeforeDeadline = 24;

                    scheduledEndAt = new Date(dueDate.getTime() - hoursBeforeDeadline * 3600 * 1000);
                    allocatedTimeMs = scheduledEndAt.getTime() - startTime.getTime();
                }
            }

            const remainingTimeMs = timer.remaining_time * 1000;

            let actualTimeMs: number | null = null;
            if (endTime && startTime) {
                actualTimeMs = endTime.getTime() - startTime.getTime();
            }

            // 7. Create step instance with explicit ID
            const stepInstanceId = this.nextStepInstanceId++;

            await this.pgDb.execute(sql`
                INSERT INTO wf_step_instances (
                    id, workflow_instance_id, workflow_step_id, status, timer_status,
                    assigned_to_user_id, scheduled_start_at, actual_start_at,
                    scheduled_end_at, actual_end_at, allocated_time_ms, actual_time_ms,
                    remaining_time_ms, metadata, created_at, updated_at
                ) VALUES (
                    ${stepInstanceId},
                    ${workflowInstanceId},
                    ${stepId},
                    ${status},
                    ${timerStatus},
                    ${newUserId},
                    ${startTime},
                    ${startTime},
                    ${scheduledEndAt},
                    ${endTime},
                    ${allocatedTimeMs},
                    ${actualTimeMs},
                    ${timer.status === 'running' ? null : remainingTimeMs},
                    ${JSON.stringify({
                migratedFromLaravel: true,
                originalTimerId: timer.id,
                laravelStage: timer.stage,
                laravelRemainingTime: timer.remaining_time,
            })},
                    NOW(),
                    NOW()
                )
            `);
            this.stats.stepInstancesCreated++;

            // 8. Create timer events
            await this.createTimerEvents(stepInstanceId, timer, newUserId);

            this.stats.migrated++;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.errorLog.push({
                timerId: timer.id,
                stage: timer.stage,
                entityId: timer.tender_id,
                error: errorMessage,
            });
            this.stats.errors++;
        }
    }

    private async getOrCreateWorkflowInstance(
        entityType: 'TENDER' | 'COURIER' | 'OPERATION_CONTRACT',
        entityId: number,
        workflowCode: string,
        startTime: Date | null
    ): Promise<number> {
        const cacheKey = `${entityType}:${entityId}`;

        // Check cache first
        const existingId = this.workflowInstanceCache.get(cacheKey);
        if (existingId) {
            return existingId;
        }

        // Get template ID
        const templateId = this.workflowTemplateCache.get(workflowCode);
        if (!templateId) {
            throw new Error(`Workflow template ${workflowCode} not found`);
        }

        // Create new instance with explicit ID
        const newId = this.nextWorkflowInstanceId++;

        await this.pgDb.execute(sql`
            INSERT INTO wf_instances (
                id, workflow_template_id, entity_type, entity_id, status,
                started_at, total_steps, completed_steps, metadata, created_at, updated_at
            ) VALUES (
                ${newId},
                ${templateId},
                ${entityType},
                ${entityId},
                'IN_PROGRESS',
                ${startTime || new Date()},
                0,
                0,
                ${JSON.stringify({ migratedFromLaravel: true })},
                NOW(),
                NOW()
            )
        `);

        // Cache and count
        this.workflowInstanceCache.set(cacheKey, newId);
        this.stats.workflowInstancesCreated++;

        return newId;
    }

    private async createTimerEvents(
        stepInstanceId: number,
        timer: OldTimerTracker,
        userId: number | null
    ) {
        // START event
        if (timer.start_time) {
            const startEventId = this.nextTimerEventId++;
            await this.pgDb.execute(sql`
                INSERT INTO wf_timer_events (
                    id, step_instance_id, event_type, performed_by_user_id,
                    previous_status, new_status, metadata, created_at
                ) VALUES (
                    ${startEventId},
                    ${stepInstanceId},
                    'START',
                    ${userId},
                    'NOT_STARTED',
                    'RUNNING',
                    ${JSON.stringify({
                migratedFromLaravel: true,
                originalTimerId: timer.id,
            })},
                    ${timer.start_time}
                )
            `);
            this.stats.timerEventsCreated++;
        }

        // COMPLETE/TIMEOUT event
        if (timer.status === 'completed' && timer.end_time) {
            const completeEventId = this.nextTimerEventId++;
            await this.pgDb.execute(sql`
                INSERT INTO wf_timer_events (
                    id, step_instance_id, event_type, performed_by_user_id,
                    previous_status, new_status, metadata, created_at
                ) VALUES (
                    ${completeEventId},
                    ${stepInstanceId},
                    'COMPLETE',
                    ${userId},
                    'RUNNING',
                    'COMPLETED',
                    ${JSON.stringify({
                migratedFromLaravel: true,
                originalTimerId: timer.id,
                remainingTimeSeconds: timer.remaining_time,
                completedEarly: timer.remaining_time > 0,
            })},
                    ${timer.end_time}
                )
            `);
            this.stats.timerEventsCreated++;
        } else if (timer.status === 'timeout' && timer.end_time) {
            const timeoutEventId = this.nextTimerEventId++;
            await this.pgDb.execute(sql`
                INSERT INTO wf_timer_events (
                    id, step_instance_id, event_type, performed_by_user_id,
                    previous_status, new_status, metadata, created_at
                ) VALUES (
                    ${timeoutEventId},
                    ${stepInstanceId},
                    'TIMEOUT',
                    ${userId},
                    'RUNNING',
                    'OVERDUE',
                    ${JSON.stringify({
                migratedFromLaravel: true,
                originalTimerId: timer.id,
                remainingTimeSeconds: timer.remaining_time,
            })},
                    ${timer.end_time}
                )
            `);
            this.stats.timerEventsCreated++;
        }
    }

    // ============================================
    // VALIDATE
    // ============================================

    private async validate() {
        console.log('✅ Validating migration...\n');

        const [instanceCount] = await this.pgDb
            .select({ count: sql<number>`count(*)` })
            .from(wfInstances)
            .where(sql`metadata->>'migratedFromLaravel' = 'true'`);

        const [stepInstanceCount] = await this.pgDb
            .select({ count: sql<number>`count(*)` })
            .from(wfStepInstances)
            .where(sql`metadata->>'migratedFromLaravel' = 'true'`);

        const [eventCount] = await this.pgDb
            .select({ count: sql<number>`count(*)` })
            .from(wfTimerEvents)
            .where(sql`metadata->>'migratedFromLaravel' = 'true'`);

        const [runningCount] = await this.pgDb
            .select({ count: sql<number>`count(*)` })
            .from(wfStepInstances)
            .where(sql`timer_status = 'RUNNING' AND metadata->>'migratedFromLaravel' = 'true'`);

        console.log('   Validation counts:');
        console.log(`      • Workflow instances created: ${instanceCount.count}`);
        console.log(`      • Step instances created: ${stepInstanceCount.count}`);
        console.log(`      • Timer events created: ${eventCount.count}`);
        console.log(`      • Running timers: ${runningCount.count}`);

        console.log('\n   ✅ Validation complete\n');
    }

    // ============================================
    // REPORT
    // ============================================

    private printReport() {
        console.log('═'.repeat(60));
        console.log('📊 MIGRATION REPORT');
        console.log('═'.repeat(60));

        console.log('\n📈 Statistics:');
        console.log(`   Total records processed: ${this.stats.total}`);
        console.log(`   Successfully migrated: ${this.stats.migrated}`);
        console.log(`   Skipped: ${this.stats.skipped}`);
        console.log(`   Orphaned (entity not found): ${this.stats.orphaned}`);
        console.log(`   Errors: ${this.stats.errors}`);

        console.log('\n📦 Created Records:');
        console.log(`   Workflow instances: ${this.stats.workflowInstancesCreated}`);
        console.log(`   Step instances: ${this.stats.stepInstancesCreated}`);
        console.log(`   Timer events: ${this.stats.timerEventsCreated}`);

        const successRate = this.stats.total > 0
            ? ((this.stats.migrated / this.stats.total) * 100).toFixed(2)
            : '0.00';
        console.log(`\n✅ Success Rate: ${successRate}%`);

        if (this.errorLog.length > 0) {
            console.log('\n❌ Errors (first 10):');
            for (const e of this.errorLog.slice(0, 10)) {
                console.log(`   Timer #${e.timerId} (${e.stage}, entity ${e.entityId}): ${e.error}`);
            }
            if (this.errorLog.length > 10) {
                console.log(`   ... and ${this.errorLog.length - 10} more errors`);
            }
        }

        if (this.skippedLog.length > 0) {
            console.log('\n⚠️  Skipped Summary:');
            const reasons = new Map<string, number>();
            for (const s of this.skippedLog) {
                const key = s.reason.split(':')[0].trim();
                reasons.set(key, (reasons.get(key) || 0) + 1);
            }
            for (const [reason, count] of reasons) {
                console.log(`   • ${reason}: ${count}`);
            }
        }

        console.log('\n' + '═'.repeat(60));
    }

    // ============================================
    // CLEANUP
    // ============================================

    private async cleanup() {
        console.log('🧹 Cleaning up connections...');
        await this.mysqlPool.end();
        await this.pgPool.end();
        console.log('✅ Done\n');
    }

    // ============================================
    // EXPORT LOGS
    // ============================================

    async exportLogs(outputDir: string = './migration-logs') {
        const fs = await import('fs/promises');
        const path = await import('path');

        await fs.mkdir(outputDir, { recursive: true });

        await fs.writeFile(
            path.join(outputDir, 'errors.json'),
            JSON.stringify(this.errorLog, null, 2)
        );

        await fs.writeFile(
            path.join(outputDir, 'skipped.json'),
            JSON.stringify(this.skippedLog, null, 2)
        );

        await fs.writeFile(
            path.join(outputDir, 'stats.json'),
            JSON.stringify(this.stats, null, 2)
        );

        console.log(`📁 Logs exported to ${outputDir}`);
    }
}

// ============================================
// RUN MIGRATION
// ============================================

async function main() {
    const migration = new TimerMigration();

    try {
        await migration.run();
        await migration.exportLogs();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

main();
