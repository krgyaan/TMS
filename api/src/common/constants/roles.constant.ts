export enum RoleName {
    SUPER_USER = "Super User",
    ADMIN = "Admin",
    TEAM_LEADER = "Team Leader",
    COORDINATOR = "Coordinator",
    EXECUTIVE = "Executive",
    ENGINEER = "Engineer",
    FIELD = "Field",
}

// Roles that can switch teams in UI
export const TEAM_SWITCH_ALLOWED_ROLES: RoleName[] = [RoleName.SUPER_USER, RoleName.ADMIN, RoleName.COORDINATOR];

// Role hierarchy (higher = more permissions)
export const ROLE_HIERARCHY: Record<RoleName, number> = {
    [RoleName.FIELD]: 1,
    [RoleName.ENGINEER]: 2,
    [RoleName.EXECUTIVE]: 3,
    [RoleName.COORDINATOR]: 4,
    [RoleName.TEAM_LEADER]: 5,
    [RoleName.ADMIN]: 6,
    [RoleName.SUPER_USER]: 7,
};

// Data visibility scope
export enum DataScope {
    SELF = "self", // Only own data (Executive, Engineer, Field)
    TEAM = "team", // Team data (Team Leader, Coordinator)
    ALL = "all", // All data with team switch (Admin, Super User)
}

export const ROLE_DATA_SCOPE: Record<RoleName, DataScope> = {
    [RoleName.FIELD]: DataScope.SELF,
    [RoleName.ENGINEER]: DataScope.SELF,
    [RoleName.EXECUTIVE]: DataScope.SELF,
    [RoleName.COORDINATOR]: DataScope.TEAM,
    [RoleName.TEAM_LEADER]: DataScope.TEAM,
    [RoleName.ADMIN]: DataScope.ALL,
    [RoleName.SUPER_USER]: DataScope.ALL,
};

// Helper function
export function canSwitchTeams(roleName: string): boolean {
    return TEAM_SWITCH_ALLOWED_ROLES.includes(roleName as RoleName);
}

export function getDataScope(roleName: string): DataScope {
    return ROLE_DATA_SCOPE[roleName as RoleName] ?? DataScope.SELF;
}

export function hasMinimumRole(userRole: string, requiredRole: RoleName): boolean {
    const userLevel = ROLE_HIERARCHY[userRole as RoleName] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole];
    return userLevel >= requiredLevel;
}
