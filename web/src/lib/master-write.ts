import type { AuthUser } from '@/types/auth.types';

// Mirrors MASTER_WRITE_ALLOWED_USER_IDS in
// api/src/modules/master/common/master-write.guard.ts
export const MASTER_WRITE_ALLOWED_USER_IDS: readonly number[] = [7];

export function hasMasterWriteAccess(user: AuthUser | null): boolean {
    if (!user) return false;

    const role = user.role?.name;
    if (role === 'Admin' || role === 'Super User') return true;

    return MASTER_WRITE_ALLOWED_USER_IDS.includes(user.id);
}
