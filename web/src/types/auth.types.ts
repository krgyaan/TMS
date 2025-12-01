export type RoleName =
    | 'Super User'
    | 'Admin'
    | 'Team Leader'
    | 'Coordinator'
    | 'Executive'
    | 'Engineer'
    | 'Field';

export type DataScope = 'self' | 'team' | 'all';


export const TEAM_SWITCH_ALLOWED_ROLES: RoleName[] = [
    'Super User',
    'Admin',
];

export const ROLE_DATA_SCOPE: Record<RoleName, DataScope> = {
    ['Field']: 'self',
    ['Engineer']: 'self',
    ['Executive']: 'self',
    ['Coordinator']: 'team',
    ['Team Leader']: 'team',
    ['Admin']: 'all',
    ['Super User']: 'all',
};

export interface UserRole {
    id: number;
    name: string;
    dataScope: DataScope;
    canSwitchTeams: boolean;
}

export interface Team {
    id: number;
    name: string;
    description?: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
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
    createdAt: string;
    updatedAt: string;
    profile: UserProfile | null;
    team: Team | null;
    designation: { id: number; name: string } | null;
    role: UserRole | null;
}

// Helper functions
export function canSwitchTeams(roleName: string | null | undefined): boolean {
    if (!roleName) return false;
    return TEAM_SWITCH_ALLOWED_ROLES.includes(roleName as RoleName);
}

export function getDataScope(roleName: string | null | undefined): DataScope {
    if (!roleName) return 'self';
    return ROLE_DATA_SCOPE[roleName as RoleName] ?? 'self';
}
