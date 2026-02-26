// ==================== Type Definitions ====================

export type RoleName =
    | 'Super User'
    | 'Admin'
    | 'Team Leader'
    | 'Coordinator'
    | 'Executive'
    | 'Engineer'
    | 'Field';

export type DataScope = 'self' | 'team' | 'all';

export interface UserRole {
    id: number;
    name: string;
    dataScope: DataScope;
    canSwitchTeams: boolean;
}

export interface Team {
    id: number;
    name: string;
    parentId?: number | null;
}

export interface UserProfile {
    id: number;
    userId: number;
    firstName: string | null;
    lastName: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    employeeCode: string | null;
    designationId: number | null;
    primaryTeamId: number | null;
    altEmail: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    image: string | null;
    signature: string | null;
    dateOfJoining: string | null;
    dateOfExit: string | null;
    employeeStatus: string | null;
    rejectionReason: string | null;
    timezone: string | null;
    locale: string | null;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    username: string | null;
    mobile: string | null;
    isActive: boolean;
    image: string | null;
    createdAt: string;
    updatedAt: string;
    profile: UserProfile | null;
    team: Team | null;
    designation: { id: number; name: string } | null;
    role: UserRole | null;
    permissions: string[];
}

// ==================== Constants ====================

export const TEAM_SWITCH_ALLOWED_ROLES: RoleName[] = [
    'Super User',
    'Admin',
];

export const ROLE_DATA_SCOPE: Record<RoleName, DataScope> = {
    'Field': 'self',
    'Engineer': 'self',
    'Executive': 'self',
    'Coordinator': 'team',
    'Team Leader': 'team',
    'Admin': 'all',
    'Super User': 'all',
};

export const ROLE_HIERARCHY: Record<RoleName, number> = {
    'Field': 1,
    'Engineer': 2,
    'Executive': 3,
    'Coordinator': 4,
    'Team Leader': 5,
    'Admin': 6,
    'Super User': 7,
};

// ==================== Helper Functions ====================

/**
 * Check if a role can switch between teams
 */
export function canSwitchTeams(roleName: string | null | undefined): boolean {
    if (!roleName) return false;
    return TEAM_SWITCH_ALLOWED_ROLES.includes(roleName as RoleName);
}

/**
 * Get the data scope for a role
 */
export function getDataScope(roleName: string | null | undefined): DataScope {
    if (!roleName) return 'self';
    return ROLE_DATA_SCOPE[roleName as RoleName] ?? 'self';
}

/**
 * Check if user has minimum required role level
 */
export function hasMinimumRole(userRole: string | null | undefined, requiredRole: RoleName): boolean {
    if (!userRole) return false;
    const userLevel = ROLE_HIERARCHY[userRole as RoleName] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole];
    return userLevel >= requiredLevel;
}

/**
 * Check if user is admin or super user
 */
export function isAdminOrAbove(roleName: string | null | undefined): boolean {
    if (!roleName) return false;
    return roleName === 'Admin' || roleName === 'Super User';
}

// ==================== Permission Helpers ====================

/**
 * Check if user has a specific permission
 */
export function hasPermission(
    user: AuthUser | null,
    module: string,
    action: string
): boolean {
    if (!user) return false;

    // Super User and Admin have all permissions
    if (isAdminOrAbove(user.role?.name)) {
        return true;
    }

    return user.permissions?.includes(`${module}:${action}`) ?? false;
}

/**
 * Check if user can create in a module
 */
export function canCreate(user: AuthUser | null, module: string): boolean {
    return hasPermission(user, module, 'create');
}

/**
 * Check if user can read in a module
 */
export function canRead(user: AuthUser | null, module: string): boolean {
    return hasPermission(user, module, 'read');
}

/**
 * Check if user can update in a module
 */
export function canUpdate(user: AuthUser | null, module: string): boolean {
    return hasPermission(user, module, 'update');
}

/**
 * Check if user can delete in a module
 */
export function canDelete(user: AuthUser | null, module: string): boolean {
    return hasPermission(user, module, 'delete');
}

/**
 * Check if user can approve in a module
 */
export function canApprove(user: AuthUser | null, module: string): boolean {
    return hasPermission(user, module, 'approve');
}
