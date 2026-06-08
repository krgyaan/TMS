import 'dotenv/config';

/**
 * Seed script disabled — permissions are managed manually via the UI.
 * No default permissions are assigned to any role.
 * Run `ts-node seed-permissions.ts` to re-enable if needed (not recommended).
 */
export async function seedRolePermissions(_db: any) {
    console.log('Seeding disabled — permissions are managed via UI');
}

async function main() {
    console.log('Seeding disabled — permissions are managed via UI');
}

if (require.main === module) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

export default seedRolePermissions;
