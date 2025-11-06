import { useEffect, useState } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useCurrentUser } from "@/hooks/api/useAuth"
import { isAuthenticated, clearAuthSession } from "@/lib/auth"

export default function ProtectedRoute() {
    const location = useLocation()
    const [shouldFetch, setShouldFetch] = useState(false)

    // Check if we have local user data
    const hasLocalAuth = isAuthenticated()

    // Only fetch current user if we have local data
    // (which means we might have a valid cookie)
    const { data: user, isLoading, error } = useCurrentUser()

    useEffect(() => {
        if (!hasLocalAuth) {
            setShouldFetch(false)
            return
        }
        setShouldFetch(true)
    }, [hasLocalAuth])

    // Loading state while checking authentication
    if (hasLocalAuth && isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center text-sm text-muted-foreground">
                Restoring session... {shouldFetch}
            </div>
        )
    }

    // If there's an error or no local auth, redirect to login
    if (error || !hasLocalAuth) {
        clearAuthSession()
        return <Navigate to="/login" replace state={{ from: location }} />
    }

    // If we have a valid user, allow access
    if (user) {
        return <Outlet />
    }

    // Default: redirect to login
    return <Navigate to="/login" replace state={{ from: location }} />
}
