import { Navigate, Outlet, useLocation } from "react-router-dom"
import { isAuthenticated, getStoredUser } from "@/lib/auth"

export default function PublicOnlyRoute() {
    const location = useLocation()
    const authenticated = isAuthenticated()
    const user = getStoredUser()

    console.log("🔍 PublicOnlyRoute check:")
    console.log("  - Location:", location.pathname)
    console.log("  - Authenticated:", authenticated)
    console.log("  - User:", user)

    if (authenticated && user) {
        const redirectTo = (location.state as any)?.from?.pathname || "/"
        console.log("✅ User is authenticated, redirecting to:", redirectTo)
        return <Navigate to={redirectTo} replace />
    }

    console.log("➡️ Allowing access to public route")
    return <Outlet />
}
