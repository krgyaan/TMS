const AUTH_USER_KEY = "tms_auth_user"

export type AuthUser = {
    id: number
    name: string
    email: string
    username: string | null
    mobile: string | null
    role?: string
    designation?: string
    team?: string
}

export function getStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    if (!raw) return null
    try {
        return JSON.parse(raw) as AuthUser
    } catch (error) {
        console.warn("Failed to parse stored auth user", error)
        localStorage.removeItem(AUTH_USER_KEY)
        return null
    }
}

export function setStoredUser(user: AuthUser) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function clearStoredUser() {
    localStorage.removeItem(AUTH_USER_KEY)
}

export function isAuthenticated(): boolean {
    return Boolean(getStoredUser())
}

export function clearAuthSession() {
    clearStoredUser()
    // Note: httpOnly cookie is cleared by backend on logout
}
