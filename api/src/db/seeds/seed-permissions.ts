import 'dotenv/config';
import { eq } from 'drizzle-orm';
import type { DbInstance } from '@db';
import { createDb, createPool } from '@db';
import { roles } from '@db/schemas/auth/roles.schema';
import { permissions } from '@db/schemas/auth/permissions.schema';
import { rolePermissions } from '@db/schemas/auth/role-permissions.schema';

const perm = (module: string, action: string) => ({ module, action });

const cru = (module: string) => [
    perm(module, 'create'),
    perm(module, 'read'),
    perm(module, 'update'),
];

const read = (module: string) => [perm(module, 'read')];

/**
 * Team-Based Module Structure:
 *
 * AC Team & DC Team (both have same modules):
 *   - Tendering (tenders, emds, rfqs, physical-docs, info-sheets, checklists, costing-sheets, etc.)
 *   - Operations (work-orders, kick-off, contract-agreement)
 *   - Services (customers, conferences, visits, amc)
 *
 * Accounts Team:
 *   - Accounts modules (imprests, financial-docs, loan-advances, projects, checklists, etc.)
 *
 * Common Team:
 *   - Shared modules (imprests, followups, couriers)
 *   - Employee modules (employee-imprest)
 *
 * All Teams:
 *   - Master/Settings (read-only for most roles)
 *   - Performance dashboards (read-only)
 */

const ROLE_PERMISSION_MAP: Record<string, { module: string; action: string }[]> = {
    'Super User': [], // Gets all permissions automatically via code
    'Admin': [], // Gets all permissions automatically via code

    'Coordinator': [
        // ==================== TENDERING MODULE (AC/DC Teams) ====================
        // Full CRUD access to all tendering modules (except delete)
        ...cru('tenders'),
        perm('tenders', 'approve'),
        ...cru('tender-approval'),
        ...cru('emds'),
        ...cru('rfqs'),
        ...cru('physical-docs'),
        ...cru('info-sheets'),
        ...cru('checklists'),
        ...cru('costing-sheets'),
        perm('costing-sheets', 'approve'),
        ...cru('costing-approvals'),
        ...cru('bid-submissions'),
        ...cru('tq-management'),
        ...cru('reverse-auction'),
        ...cru('tender-result'),

        // ==================== OPERATIONS MODULE (AC/DC Teams) ====================
        ...cru('operations'),
        ...cru('work-orders'),
        ...cru('kick-off'),
        ...cru('contract-agreement'),

        // ==================== SERVICES MODULE (AC/DC Teams) ====================
        ...cru('services'),
        ...cru('customers'),
        ...cru('conferences'),
        ...cru('visits'),
        ...cru('amc'),

        // ==================== ACCOUNTS MODULE (Accounts Team) ====================
        ...cru('accounts'),
        ...cru('accounts.imprests'),
        ...cru('accounts.financial-docs'),
        ...cru('accounts.loan-advances'),
        ...cru('accounts.projects'),
        ...cru('accounts.checklists'),
        ...cru('accounts.tds-checklists'),
        ...cru('accounts.gst-checklists'),
        ...cru('accounts.fixed-expenses'),

        // ==================== CRM MODULE ====================
        ...cru('crm'),
        ...cru('crm.leads'),
        ...cru('crm.enquiries'),
        ...cru('crm.costings'),
        ...cru('crm.quotations'),

        // ==================== BI DASHBOARD MODULE ====================
        ...read('bi-dashboard'),
        ...read('bi.demand-draft'),
        ...read('bi.fdr'),
        ...read('bi.cheque'),
        ...read('bi.bank-guarantee'),
        ...read('bi.bank-transfer'),
        ...read('bi.pay-on-portal'),

        // ==================== PERFORMANCE MODULE ====================
        ...read('performance'),
        ...read('performance.tender-executive'),
        ...read('performance.team-leader'),
        ...read('performance.operation-team'),
        ...read('performance.account-team'),
        ...read('performance.oem-dashboard'),
        ...read('performance.business-dashboard'),
        ...read('performance.customer-dashboard'),
        ...read('performance.location-dashboard'),

        // ==================== MASTER/SETTINGS MODULE ====================
        ...read('master'),
        ...cru('master.users'),
        ...cru('master.roles'),
        ...cru('master.permissions'),
        ...cru('master.teams'),
        ...cru('master.designations'),
        ...cru('master.statuses'),
        ...cru('master.items'),
        ...cru('master.item-headings'),
        ...cru('master.locations'),
        ...cru('master.organizations'),
        ...cru('master.companies'),
        ...cru('master.vendors'),
        ...cru('master.vendor-organizations'),
        ...cru('master.websites'),
        ...cru('master.states'),
        ...cru('master.industries'),
        ...cru('master.documents-submitted'),
        ...cru('master.tender-status'),
        ...cru('master.imprest-categories'),
        ...cru('master.followup-categories'),
        ...cru('master.lead-types'),
        ...cru('master.tq-types'),
        ...cru('master.loan-parties'),
        ...cru('master.financial-years'),
        ...cru('master.emds-responsibilities'),

        // ==================== SHARED MODULE (Common Team) ====================
        ...cru('shared.imprests'),
        ...cru('shared.followups'),
        ...cru('shared.couriers'),

        // ==================== EMPLOYEE MODULE (Common Team) ====================
        ...cru('employee-imprest'),
    ],

    'Team Leader': [
        // ==================== TENDERING MODULE (AC/DC Teams) ====================
        // Same as Coordinator but team-scoped in service layer (team name passed from Teams)
        ...cru('tenders'),
        perm('tenders', 'approve'),
        ...cru('tender-approval'),
        ...cru('emds'),
        ...cru('rfqs'),
        ...cru('physical-docs'),
        ...cru('info-sheets'),
        ...cru('checklists'),
        ...cru('costing-sheets'),
        perm('costing-sheets', 'approve'),
        ...cru('costing-approvals'),
        ...cru('bid-submissions'),
        ...cru('tq-management'),
        ...cru('reverse-auction'),
        ...cru('tender-result'),

        // ==================== OPERATIONS MODULE (AC/DC Teams) ====================
        ...read('operations'),
        ...read('work-orders'),
        ...read('kick-off'),
        ...read('contract-agreement'),

        // ==================== SERVICES MODULE (AC/DC Teams) ====================
        ...cru('services'),
        ...cru('customers'),
        ...cru('conferences'),
        ...cru('visits'),
        ...cru('amc'),

        // ==================== CRM MODULE ====================
        ...cru('crm'),
        ...cru('crm.leads'),
        ...cru('crm.enquiries'),
        ...cru('crm.costings'),
        ...cru('crm.quotations'),

        // ==================== PERFORMANCE MODULE ====================
        ...read('performance'),
        ...read('performance.tender-executive'),
        ...read('performance.team-leader'),

        // ==================== MASTER/SETTINGS MODULE ====================
        ...read('master'),
        ...read('master.vendors'),
        ...read('master.imprest-categories'),
        ...read('master.followup-categories'),
        ...read('master.lead-types'),
        ...read('master.tq-types'),

        // ==================== SHARED MODULE (Common Team) ====================
        ...cru('shared.imprests'),
        ...cru('shared.followups'),
        ...cru('shared.couriers'),

        // ==================== EMPLOYEE MODULE (Common Team) ====================
        ...cru('employee-imprest'),
    ],

    'Executive': [
        // ==================== TENDERING MODULE (AC/DC Teams) ====================
        // CRUD for assigned tenders only (self-scoped, team name passed from Teams)
        ...cru('tenders'),
        ...cru('emds'),
        ...cru('rfqs'),
        ...cru('physical-docs'),
        ...cru('info-sheets'),
        ...cru('checklists'),
        ...read('costing-sheets'),
        ...read('costing-approvals'),
        ...cru('bid-submissions'),
        ...cru('tq-management'),
        ...read('reverse-auction'),
        ...read('tender-result'),

        // ==================== SERVICES MODULE (AC/DC Teams) ====================
        ...cru('services'),
        ...cru('customers'),
        ...cru('conferences'),
        ...cru('visits'),
        ...cru('amc'),

        // ==================== CRM MODULE ====================
        ...cru('crm'),
        ...cru('crm.leads'),
        ...cru('crm.enquiries'),
        ...cru('crm.costings'),
        ...cru('crm.quotations'),

        // ==================== PERFORMANCE MODULE ====================
        ...read('performance'),
        ...read('performance.tender-executive'),

        // ==================== MASTER/SETTINGS MODULE ====================
        ...read('master'),
        ...read('master.statuses'),
        ...read('master.items'),
        ...read('master.vendors'),
        ...read('master.documents-submitted'),
        ...read('master.imprest-categories'),
        ...read('master.followup-categories'),
        ...read('master.lead-types'),
        ...read('master.tq-types'),

        // ==================== SHARED MODULE (Common Team) ====================
        ...cru('shared.imprests'),
        ...cru('shared.followups'),
        ...cru('shared.couriers'),

        // ==================== EMPLOYEE MODULE (Common Team) ====================
        ...cru('employee-imprest'),
    ],

    'Engineer': [
        // ==================== TENDERING MODULE (AC/DC Teams) ====================
        // READ for assigned tender modules (team name passed from Teams)
        ...read('tenders'),
        ...read('emds'),
        ...read('rfqs'),
        ...read('physical-docs'),
        ...read('info-sheets'),
        ...read('checklists'),
        ...read('costing-sheets'),
        ...read('costing-approvals'),
        ...read('bid-submissions'),
        ...read('tq-management'),
        ...read('reverse-auction'),
        ...read('tender-result'),

        // ==================== OPERATIONS MODULE (AC/DC Teams) ====================
        // CRUD for operations (main responsibility, team name passed from Teams)
        ...cru('operations'),
        ...cru('work-orders'),
        ...cru('kick-off'),
        ...cru('contract-agreement'),

        // ==================== SERVICES MODULE (AC/DC Teams) ====================
        ...read('services'),
        ...read('customers'),
        ...read('conferences'),
        ...read('visits'),
        ...read('amc'),

        // ==================== CRM MODULE ====================
        ...read('crm'),
        ...read('crm.leads'),
        ...read('crm.enquiries'),
        ...read('crm.costings'),
        ...read('crm.quotations'),

        // ==================== PERFORMANCE MODULE ====================
        ...read('performance'),
        ...read('performance.tender-executive'),

        // ==================== MASTER/SETTINGS MODULE ====================
        ...read('master'),
        ...read('master.imprest-categories'),
        ...read('master.followup-categories'),
        ...read('master.lead-types'),
        ...read('master.tq-types'),

        // ==================== SHARED MODULE (Common Team) ====================
        ...read('shared.imprests'),
        ...read('shared.followups'),
        ...read('shared.couriers'),

        // ==================== EMPLOYEE MODULE (Common Team) ====================
        ...read('employee-imprest'),
    ],

    'Field': [
        // ==================== SHARED MODULE (Common Team) ====================
        // CRUD for shared modules only (team name passed from Teams)
        ...cru('shared.imprests'),
        ...cru('shared.followups'),
        ...cru('shared.couriers'),

        // ==================== EMPLOYEE MODULE (Common Team) ====================
        ...cru('employee-imprest'),
    ],
};

export async function seedRolePermissions(db: DbInstance) {
    console.log('Seeding role permissions...');

    // Get all roles
    const allRoles = await db.select().from(roles);

    // Get all permissions
    const allPermissions = await db.select().from(permissions);
    const permMap = new Map(
        allPermissions.map((p) => [`${p.module}:${p.action}`, p.id])
    );

    for (const role of allRoles) {
        const permDefs = ROLE_PERMISSION_MAP[role.name];
        if (!permDefs) continue;

        // Get permission IDs
        const permIds = permDefs
            .map((p) => permMap.get(`${p.module}:${p.action}`))
            .filter((id): id is number => id !== undefined);

        if (permIds.length === 0) continue;

        // Delete existing and insert new
        await db.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));

        await db.insert(rolePermissions).values(
            permIds.map((permissionId) => ({
                roleId: role.id,
                permissionId,
            }))
        );

        console.log(`  Assigned ${permIds.length} permissions to ${role.name}`);
    }

    console.log('Role permissions seeded successfully');
}

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');

    const pool = createPool(url);
    const db = createDb(pool);

    try {
        await seedRolePermissions(db);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

export default seedRolePermissions;
