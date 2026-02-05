import 'dotenv/config';
import mysql, { Pool as MySqlPool, RowDataPacket } from 'mysql2/promise';
import { sql } from 'drizzle-orm';
import { createDb, createPool } from '../src/db';
import { stepInstances, timerEvents } from '../src/db/schemas/workflow/workflows.schema';

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

type EntityType = 'TENDER' | 'COURIER' | 'OPERATION_CONTRACT';
type WorkflowCode = 'TENDERING_WF' | 'COURIER_WF' | 'OPERATION_WF';

type OldTimerStatus = 'running' | 'completed' | 'timeout' | string;

interface StageMapping {
    stepKey: string;
    workflowCode: WorkflowCode;
    entityType: EntityType;
}

interface TimerTrackerRow extends RowDataPacket {
    id: number;
    stage: string;
    status: OldTimerStatus;
    tender_id: number;
    user_id: number | null;
    start_time: Date | null;
    end_time: Date | null;
    duration_hours: number;
    remaining_time: number;
}

interface TenderRow extends RowDataPacket {
    id: number;
    due_date: Date | null;
    team_member: number | null;
}

interface CourierRow extends RowDataPacket {
    id: number;
    pickup_date: Date | null;
    emp_from: number | null;
}

interface UserRow extends RowDataPacket {
    id: number;
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

interface SkippedLog {
    timerId: number;
    stage: string;
    entityId: number;
    reason: string;
}

interface ErrorLog {
    timerId: number;
    stage: string;
    entityId: number;
    error: string;
}

/* ------------------------------------------------------------------ */
/* Constants */
/* ------------------------------------------------------------------ */

const STAGE_TO_STEP_MAP: Record<string, StageMapping> = {
    tender_info_sheet: { stepKey: 'tender_info_sheet', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    tender_approval: { stepKey: 'tender_approval', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    rfq: { stepKey: 'rfq', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    rfq_received: { stepKey: 'rfq_response', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    physical_docs: { stepKey: 'physical_docs', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    emd_request: { stepKey: 'emd_request', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    document_checklist: { stepKey: 'document_checklist', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    costing_sheet: { stepKey: 'costing_sheet', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    costing_sheet_approval: { stepKey: 'costing_approval', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    bid_submission: { stepKey: 'bid_submission', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    tq_replied: { stepKey: 'tq_completion', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },

    pop_acc_form: { stepKey: 'emd_payment', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    bt_acc_form: { stepKey: 'emd_payment', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    cheque_ac_form: { stepKey: 'emd_payment', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    dd_acc_form: { stepKey: 'emd_payment', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    bg_acc_form: { stepKey: 'emd_payment', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },
    fdr_acc_form: { stepKey: 'emd_payment', workflowCode: 'TENDERING_WF', entityType: 'TENDER' },

    courier_created: { stepKey: 'courier_dispatch', workflowCode: 'COURIER_WF', entityType: 'COURIER' },
    courier_despatched: { stepKey: 'courier_dispatch', workflowCode: 'COURIER_WF', entityType: 'COURIER' },

    wo_details: { stepKey: 'wo_details', workflowCode: 'OPERATION_WF', entityType: 'OPERATION_CONTRACT' },
    wo_acceptance: { stepKey: 'wo_acceptance', workflowCode: 'OPERATION_WF', entityType: 'OPERATION_CONTRACT' },
    kickoff_meeting: { stepKey: 'kickoff_meeting', workflowCode: 'OPERATION_WF', entityType: 'OPERATION_CONTRACT' },
};

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */

function mapStatus(oldStatus: OldTimerStatus): { status: string; timerStatus: string } {
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

/* ------------------------------------------------------------------ */
/* Migration Class */
/* ------------------------------------------------------------------ */

class TimerMigration {
    private mysqlPool: MySqlPool;
    private pgPool;
    private pgDb;

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

    private workflowTemplateCache = new Map<string, number>();
    private workflowStepCache = new Map<string, number>();
    private workflowInstanceCache = new Map<string, number>();

    private tenderCache = new Map<number, TenderRow>();
    private courierCache = new Map<number, CourierRow>();
    private userIdMapping = new Map<number, number>();

    private nextWorkflowInstanceId = 1;
    private nextStepInstanceId = 1;
    private nextTimerEventId = 1;

    private errorLog: ErrorLog[] = [];
    private skippedLog: SkippedLog[] = [];

    constructor() {
        this.mysqlPool = mysql.createPool({
            host: process.env.MYSQL_HOST || 'localhost',
            port: Number(process.env.MYSQL_PORT || 3306),
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || 'gyan',
            database: process.env.MYSQL_DATABASE || 'mydb',
            waitForConnections: true,
            connectionLimit: 10,
        });

        const pgUrl = process.env.DATABASE_URL;
        if (!pgUrl) throw new Error('DATABASE_URL is not set');

        this.pgPool = createPool(pgUrl);
        this.pgDb = createDb(this.pgPool);
    }

    async run(): Promise<void> {
        console.log('🚀 Starting MySQL to PostgreSQL Timer Migration\n');
        try {
            await this.loadCaches();
            await this.analyzeData();
            await this.initializeIdCounters();
            await this.migrateTimers();
            await this.validate();
            this.printReport();
        } finally {
            await this.cleanup();
        }
    }

    /* ----------------------------- caches ---------------------------- */

    private async loadCaches(): Promise<void> {
        // Load workflow templates using raw SQL (wf_templates table)
        const templatesResult = await this.pgDb.execute(sql`
            SELECT id, code FROM wf_templates
        `);
        const templates = templatesResult.rows as Array<{ id: number; code: string }>;
        templates.forEach(t => this.workflowTemplateCache.set(t.code, t.id));

        // Load workflow steps using raw SQL (wf_steps table)
        const stepsResult = await this.pgDb.execute(sql`
            SELECT id, workflow_template_id, step_key FROM wf_steps
        `);
        const steps = stepsResult.rows as Array<{ id: number; workflow_template_id: number; step_key: string }>;
        steps.forEach(s => {
            this.workflowStepCache.set(`${s.workflow_template_id}:${s.step_key}`, s.id);
        });

        // Load workflow instances using raw SQL (wf_instances table)
        const instancesResult = await this.pgDb.execute(sql`
            SELECT id, entity_type, entity_id FROM wf_instances
        `);
        const instances = instancesResult.rows as Array<{ id: number; entity_type: string; entity_id: number }>;
        instances.forEach(i => {
            this.workflowInstanceCache.set(`${i.entity_type}:${i.entity_id}`, i.id);
        });

        const [tenders] = await this.mysqlPool.execute<TenderRow[]>(
            'SELECT id, due_date, team_member FROM tender_infos'
        );
        tenders.forEach(t => this.tenderCache.set(t.id, t));

        const [couriers] = await this.mysqlPool.execute<CourierRow[]>(
            'SELECT id, pickup_date, emp_from FROM courier_dashboards'
        );
        couriers.forEach(c => this.courierCache.set(c.id, c));

        const [users] = await this.mysqlPool.execute<UserRow[]>('SELECT id FROM users');
        users.forEach(u => this.userIdMapping.set(u.id, u.id));
    }

    /* ---------------------------- analysis ---------------------------- */

    private async analyzeData(): Promise<void> {
        const [countResult] = await this.mysqlPool.execute<RowDataPacket[]>(
            'SELECT COUNT(*) as total FROM timer_trackers'
        );
        this.stats.total = countResult[0].total;
    }

    /* --------------------------- migration ---------------------------- */

    private async migrateTimers(): Promise<void> {
        const batchSize = 500;
        let offset = 0;

        while (true) {
            const [timers] = await this.mysqlPool.execute<TimerTrackerRow[]>(
                `SELECT * FROM timer_trackers ORDER BY id ASC LIMIT ${batchSize} OFFSET ${offset}`
            );
            if (timers.length === 0) break;

            for (const timer of timers) {
                await this.migrateTimer(timer);
            }

            offset += batchSize;
        }
    }

    private async migrateTimer(timer: TimerTrackerRow): Promise<void> {
        try {
            const mapping = STAGE_TO_STEP_MAP[timer.stage];
            if (!mapping) {
                this.stats.skipped++;
                this.skippedLog.push({
                    timerId: timer.id,
                    stage: timer.stage,
                    entityId: timer.tender_id,
                    reason: 'Stage not mapped',
                });
                return;
            }

            const workflowInstanceId = await this.getOrCreateWorkflowInstance(
                mapping.entityType,
                timer.tender_id,
                mapping.workflowCode,
                timer.start_time
            );

            const templateId = this.workflowTemplateCache.get(mapping.workflowCode);
            if (!templateId) {
                this.stats.skipped++;
                this.skippedLog.push({
                    timerId: timer.id,
                    stage: timer.stage,
                    entityId: timer.tender_id,
                    reason: `Workflow template ${mapping.workflowCode} not found`,
                });
                return;
            }

            const stepId = this.workflowStepCache.get(`${templateId}:${mapping.stepKey}`);
            if (!stepId) {
                this.stats.skipped++;
                this.skippedLog.push({
                    timerId: timer.id,
                    stage: timer.stage,
                    entityId: timer.tender_id,
                    reason: `Step ${mapping.stepKey} not found for template ${templateId}`,
                });
                return;
            }

            // Get step details for stepName and stepOrder
            const stepDetailsResult = await this.pgDb.execute(sql`
                SELECT step_name, step_order FROM wf_steps WHERE id = ${stepId}
            `);
            const stepDetails = stepDetailsResult.rows[0] as { step_name: string; step_order: number } | undefined;
            if (!stepDetails) {
                this.stats.skipped++;
                return;
            }

            const stepInstanceId = this.nextStepInstanceId++;
            const { status, timerStatus } = mapStatus(timer.status);

            // Calculate allocated time from duration_hours if available
            const allocatedTimeMs = timer.duration_hours ? timer.duration_hours * 3600000 : null;

            // Insert into step_instances table (not wf_step_instances)
            await this.pgDb.execute(sql`
                INSERT INTO step_instances (
                    id, entity_type, entity_id,
                    step_key, step_name, step_order,
                    workflow_code,
                    assigned_to_user_id,
                    status, timer_status,
                    actual_start_at, actual_end_at,
                    remaining_time_ms, allocated_time_ms,
                    timer_config,
                    metadata, created_at, updated_at
                ) VALUES (
                    ${stepInstanceId},
                    ${mapping.entityType},
                    ${timer.tender_id},
                    ${mapping.stepKey},
                    ${stepDetails.step_name},
                    ${stepDetails.step_order},
                    ${mapping.workflowCode},
                    ${timer.user_id},
                    ${status},
                    ${timerStatus},
                    ${timer.start_time},
                    ${timer.end_time},
                    ${timer.remaining_time ? timer.remaining_time * 1000 : null},
                    ${allocatedTimeMs},
                    ${JSON.stringify({ type: 'FIXED_DURATION', durationHours: timer.duration_hours || 0 })},
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

            // Create timer event for migration
            const eventId = this.nextTimerEventId++;
            await this.pgDb.execute(sql`
                INSERT INTO timer_events (
                    id, step_instance_id, event_type,
                    performed_by_user_id, new_status,
                    metadata, created_at
                ) VALUES (
                    ${eventId},
                    ${stepInstanceId},
                    ${timerStatus === 'RUNNING' ? 'START' : timerStatus === 'COMPLETED' ? 'COMPLETE' : 'START'},
                    ${timer.user_id},
                    ${timerStatus},
                    ${JSON.stringify({ migratedFromLaravel: true, originalTimerId: timer.id })},
                    ${timer.start_time || sql`NOW()`}
                )
            `);

            this.stats.stepInstancesCreated++;
            this.stats.timerEventsCreated++;
            this.stats.migrated++;
        } catch (err: any) {
            this.stats.errors++;
            this.errorLog.push({
                timerId: timer.id,
                stage: timer.stage,
                entityId: timer.tender_id,
                error: err.message || String(err),
            });
        }
    }

    /* ----------------------- workflow instance ----------------------- */

    private async getOrCreateWorkflowInstance(
        entityType: EntityType,
        entityId: number,
        workflowCode: WorkflowCode,
        startTime: Date | null
    ): Promise<number> {
        const cacheKey = `${entityType}:${entityId}`;
        const cached = this.workflowInstanceCache.get(cacheKey);
        if (cached) return cached;

        const templateId = this.workflowTemplateCache.get(workflowCode);
        if (!templateId) throw new Error('Template not found');

        const id = this.nextWorkflowInstanceId++;

        await this.pgDb.execute(sql`
      INSERT INTO wf_instances (
        id, workflow_template_id, entity_type, entity_id,
        status, started_at, metadata, created_at, updated_at
      ) VALUES (
        ${id},
        ${templateId},
        ${entityType},
        ${entityId},
        'IN_PROGRESS',
        ${startTime ?? new Date()},
        ${JSON.stringify({ migratedFromLaravel: true })},
        NOW(),
        NOW()
      )
    `);

        this.workflowInstanceCache.set(cacheKey, id);
        this.stats.workflowInstancesCreated++;
        return id;
    }

    /* ----------------------------- misc ------------------------------ */

    private async initializeIdCounters(): Promise<void> {
        // Get max IDs using raw SQL
        const r1Result = await this.pgDb.execute(sql`SELECT COALESCE(MAX(id), 0) as max_id FROM wf_instances`);
        const r2Result = await this.pgDb.execute(sql`SELECT COALESCE(MAX(id), 0) as max_id FROM step_instances`);
        const r3Result = await this.pgDb.execute(sql`SELECT COALESCE(MAX(id), 0) as max_id FROM timer_events`);

        const r1 = r1Result.rows[0] as { max_id: number };
        const r2 = r2Result.rows[0] as { max_id: number };
        const r3 = r3Result.rows[0] as { max_id: number };

        this.nextWorkflowInstanceId = (r1?.max_id || 0) + 1;
        this.nextStepInstanceId = (r2?.max_id || 0) + 1;
        this.nextTimerEventId = (r3?.max_id || 0) + 1;
    }

    private async validate(): Promise<void> {
        console.log('\n📊 Validating migration...');

        // Count source records
        const [sourceCount] = await this.mysqlPool.execute<RowDataPacket[]>(
            'SELECT COUNT(*) as total FROM timer_trackers'
        );
        const sourceTotal = sourceCount[0].total;

        // Count migrated records
        const migratedResult = await this.pgDb.execute(sql`
            SELECT COUNT(*) as total FROM step_instances 
            WHERE metadata->>'migratedFromLaravel' = 'true'
        `);
        const migratedTotal = (migratedResult.rows[0] as { total: number })?.total || 0;

        // Count timer events
        const eventsResult = await this.pgDb.execute(sql`
            SELECT COUNT(*) as total FROM timer_events 
            WHERE metadata->>'migratedFromLaravel' = 'true'
        `);
        const eventsTotal = (eventsResult.rows[0] as { total: number })?.total || 0;

        console.log(`  Source timers:        ${sourceTotal}`);
        console.log(`  Migrated step instances: ${migratedTotal}`);
        console.log(`  Timer events created:   ${eventsTotal}`);
        console.log(`  Skipped:                ${this.stats.skipped}`);
        console.log(`  Errors:                 ${this.stats.errors}`);

        if (migratedTotal + this.stats.skipped + this.stats.errors !== sourceTotal) {
            console.warn(`  ⚠ Count mismatch: Expected ${sourceTotal}, got ${migratedTotal + this.stats.skipped + this.stats.errors}`);
        } else {
            console.log('  ✅ Validation passed');
        }
    }

    private printReport(): void {
        console.log('\n' + '═'.repeat(70));
        console.log('  TIMER MIGRATION REPORT');
        console.log('═'.repeat(70));
        console.log('');
        console.log(`  Total Source Records:        ${this.stats.total}`);
        console.log(`  Successfully Migrated:        ${this.stats.migrated}`);
        console.log(`  Skipped:                      ${this.stats.skipped}`);
        console.log(`  Errors:                       ${this.stats.errors}`);
        console.log(`  Orphaned:                     ${this.stats.orphaned}`);
        console.log('');
        console.log(`  Workflow Instances Created:   ${this.stats.workflowInstancesCreated}`);
        console.log(`  Step Instances Created:       ${this.stats.stepInstancesCreated}`);
        console.log(`  Timer Events Created:         ${this.stats.timerEventsCreated}`);
        console.log('');
        
        if (this.errorLog.length > 0) {
            console.log(`  ⚠ ${this.errorLog.length} errors logged (check errorLog)`);
        }
        if (this.skippedLog.length > 0) {
            console.log(`  ⚠ ${this.skippedLog.length} records skipped (check skippedLog)`);
        }
        
        console.log('═'.repeat(70));
    }
    private async cleanup(): Promise<void> {
        await this.mysqlPool.end();
        await this.pgPool.end();
    }

    async exportLogs(outputDir = './migration-logs'): Promise<void> {
        const fs = await import('fs/promises');
        const path = await import('path');

        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(path.join(outputDir, 'errors.json'), JSON.stringify(this.errorLog, null, 2));
        await fs.writeFile(path.join(outputDir, 'skipped.json'), JSON.stringify(this.skippedLog, null, 2));
        await fs.writeFile(path.join(outputDir, 'stats.json'), JSON.stringify(this.stats, null, 2));
    }
}

/* ------------------------------------------------------------------ */
/* Entrypoint */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
    const migration = new TimerMigration();
    try {
        await migration.run();
        await migration.exportLogs();
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

main();
