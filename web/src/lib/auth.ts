import type { AuthUser } from "@/types/auth.types";

const AUTH_USER_KEY = 'tms_auth_user';
const ACTIVE_TEAM_KEY = 'tms_active_team';


export function getStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as AuthUser;
    } catch (error) {
        console.warn('Failed to parse stored auth user', error);
        localStorage.removeItem(AUTH_USER_KEY);
        return null;
    }
}

export function setStoredUser(user: AuthUser) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
    localStorage.removeItem(AUTH_USER_KEY);
}

export function isAuthenticated(): boolean {
    return Boolean(getStoredUser())
}

export function getStoredActiveTeamId(): number | null {
    const raw = localStorage.getItem(ACTIVE_TEAM_KEY);
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? null : parsed;
}

export function setStoredActiveTeamId(teamId: number | null) {
    if (teamId === null) {
        localStorage.removeItem(ACTIVE_TEAM_KEY);
    } else {
        localStorage.setItem(ACTIVE_TEAM_KEY, String(teamId));
    }
}

export function clearStoredActiveTeamId() {
    localStorage.removeItem(ACTIVE_TEAM_KEY);
}

export function clearAuthSession() {
    clearStoredUser();
    clearStoredActiveTeamId();
}

// Helper to get effective team ID based on user role
export function getEffectiveTeamId(user: AuthUser | null, overrideTeamId?: number | null): number | null {
    if (!user) return null;

    // If user can switch teams and has override, use that
    if (user.role?.canSwitchTeams && overrideTeamId !== undefined) {
        return overrideTeamId;
    }

    // Otherwise use user's primary team
    return user.team?.id ?? user.profile?.primaryTeamId ?? null;
}
