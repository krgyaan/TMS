import { eq } from 'drizzle-orm';
import type { DbInstance } from '@db';
import { roles } from '@db/schemas/auth/roles.schema';
import { permissions } from '@db/schemas/auth/permissions.schema';
import { rolePermissions } from '@db/schemas/auth/role-permissions.schema';

// Define permissions for each role based on requirements
const ROLE_PERMISSION_MAP: Record<string, { module: string; action: string }[]> = {
    'Super User': [], // Gets all permissions automatically via code
    'Admin': [], // Gets all permissions automatically via code

    'Coordinator': [
        // All CRUD except delete
        { module: 'tenders', action: 'create' },
        { module: 'tenders', action: 'read' },
        { module: 'tenders', action: 'update' },
        { module: 'tenders', action: 'approve' },
        { module: 'emds', action: 'create' },
        { module: 'emds', action: 'read' },
        { module: 'emds', action: 'update' },
        { module: 'rfqs', action: 'create' },
        { module: 'rfqs', action: 'read' },
        { module: 'rfqs', action: 'update' },
        { module: 'physical-docs', action: 'create' },
        { module: 'physical-docs', action: 'read' },
        { module: 'physical-docs', action: 'update' },
        { module: 'info-sheets', action: 'create' },
        { module: 'info-sheets', action: 'read' },
        { module: 'info-sheets', action: 'update' },
        { module: 'checklists', action: 'create' },
        { module: 'checklists', action: 'read' },
        { module: 'checklists', action: 'update' },
        { module: 'costing-sheets', action: 'create' },
        { module: 'costing-sheets', action: 'read' },
        { module: 'costing-sheets', action: 'update' },
        { module: 'costing-sheets', action: 'approve' },
        { module: 'operations', action: 'create' },
        { module: 'operations', action: 'read' },
        { module: 'operations', action: 'update' },
        { module: 'shared.imprests', action: 'create' },
        { module: 'shared.imprests', action: 'read' },
        { module: 'shared.imprests', action: 'update' },
        { module: 'shared.followups', action: 'create' },
        { module: 'shared.followups', action: 'read' },
        { module: 'shared.followups', action: 'update' },
        { module: 'shared.couriers', action: 'create' },
        { module: 'shared.couriers', action: 'read' },
        { module: 'shared.couriers', action: 'update' },
        { module: 'master', action: 'read' },
    ],

    'Team Leader': [
        // Same as Coordinator (team-scoped in service layer)
        { module: 'tenders', action: 'create' },
        { module: 'tenders', action: 'read' },
        { module: 'tenders', action: 'update' },
        { module: 'tenders', action: 'approve' },
        { module: 'emds', action: 'create' },
        { module: 'emds', action: 'read' },
        { module: 'emds', action: 'update' },
        { module: 'rfqs', action: 'create' },
        { module: 'rfqs', action: 'read' },
        { module: 'rfqs', action: 'update' },
        { module: 'physical-docs', action: 'create' },
        { module: 'physical-docs', action: 'read' },
        { module: 'physical-docs', action: 'update' },
        { module: 'info-sheets', action: 'create' },
        { module: 'info-sheets', action: 'read' },
        { module: 'info-sheets', action: 'update' },
        { module: 'checklists', action: 'create' },
        { module: 'checklists', action: 'read' },
        { module: 'checklists', action: 'update' },
        { module: 'costing-sheets', action: 'create' },
        { module: 'costing-sheets', action: 'read' },
        { module: 'costing-sheets', action: 'update' },
        { module: 'operations', action: 'read' },
        { module: 'shared.imprests', action: 'create' },
        { module: 'shared.imprests', action: 'read' },
        { module: 'shared.imprests', action: 'update' },
        { module: 'shared.followups', action: 'create' },
        { module: 'shared.followups', action: 'read' },
        { module: 'shared.followups', action: 'update' },
        { module: 'shared.couriers', action: 'create' },
        { module: 'shared.couriers', action: 'read' },
        { module: 'shared.couriers', action: 'update' },
        { module: 'master', action: 'read' },
    ],

    'Executive': [
        // CRUD for assigned tenders only (self-scoped)
        { module: 'tenders', action: 'create' },
        { module: 'tenders', action: 'read' },
        { module: 'tenders', action: 'update' },
        { module: 'emds', action: 'create' },
        { module: 'emds', action: 'read' },
        { module: 'emds', action: 'update' },
        { module: 'rfqs', action: 'create' },
        { module: 'rfqs', action: 'read' },
        { module: 'rfqs', action: 'update' },
        { module: 'physical-docs', action: 'create' },
        { module: 'physical-docs', action: 'read' },
        { module: 'physical-docs', action: 'update' },
        { module: 'info-sheets', action: 'create' },
        { module: 'info-sheets', action: 'read' },
        { module: 'info-sheets', action: 'update' },
        { module: 'checklists', action: 'create' },
        { module: 'checklists', action: 'read' },
        { module: 'checklists', action: 'update' },
        { module: 'costing-sheets', action: 'read' },
        { module: 'shared.imprests', action: 'create' },
        { module: 'shared.imprests', action: 'read' },
        { module: 'shared.imprests', action: 'update' },
        { module: 'shared.followups', action: 'create' },
        { module: 'shared.followups', action: 'read' },
        { module: 'shared.followups', action: 'update' },
        { module: 'shared.couriers', action: 'create' },
        { module: 'shared.couriers', action: 'read' },
        { module: 'shared.couriers', action: 'update' },
        { module: 'master', action: 'read' },
    ],

    'Engineer': [
        // READ for assigned tender modules, CRUD for operations
        { module: 'tenders', action: 'read' },
        { module: 'emds', action: 'read' },
        { module: 'rfqs', action: 'read' },
        { module: 'physical-docs', action: 'read' },
        { module: 'info-sheets', action: 'read' },
        { module: 'checklists', action: 'read' },
        { module: 'costing-sheets', action: 'read' },
        { module: 'operations', action: 'create' },
        { module: 'operations', action: 'read' },
        { module: 'operations', action: 'update' },
        { module: 'shared.imprests', action: 'read' },
        { module: 'shared.followups', action: 'read' },
        { module: 'shared.couriers', action: 'read' },
        { module: 'master', action: 'read' },
    ],

    'Field': [
        // CRUD for shared module only
        { module: 'shared.imprests', action: 'create' },
        { module: 'shared.imprests', action: 'read' },
        { module: 'shared.imprests', action: 'update' },
        { module: 'shared.followups', action: 'create' },
        { module: 'shared.followups', action: 'read' },
        { module: 'shared.followups', action: 'update' },
        { module: 'shared.couriers', action: 'create' },
        { module: 'shared.couriers', action: 'read' },
        { module: 'shared.couriers', action: 'update' },
        { module: 'master', action: 'read' },
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
