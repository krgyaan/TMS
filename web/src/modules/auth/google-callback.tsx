import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { setStoredUser, clearAuthSession, type AuthUser } from "@/lib/auth"
import { authKeys } from "@/hooks/api/useAuth"
import { toast } from "sonner"

const decodeUser = (value: string | null): AuthUser | null => {
    if (!value) return null
    try {
        const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
        const json = window.atob(normalized)
        return JSON.parse(json) as AuthUser
    } catch (error) {
        console.warn("Failed to decode Google login payload", error)
        return null
    }
}

const GoogleLoginCallback = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const params = useMemo(() => new URLSearchParams(location.search), [location.search])

    const [message, setMessage] = useState("Completing sign-in...")
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        console.log("🔍 Google Callback - Processing...")
        console.log("📋 URL Params:", Object.fromEntries(params.entries()))

        const status = params.get("status")

        if (status !== "success") {
            const err = params.get("error") ?? "Google sign-in failed"
            console.error("❌ Google login failed:", err)
            setError(err)
            setMessage("")
            clearAuthSession()
            toast.error(err)

            setTimeout(() => navigate("/login", { replace: true }), 2000)
            return
        }

        // Decode user data from URL
        const user = decodeUser(params.get("user"))
        console.log("👤 Decoded user:", user)

        if (user) {
            console.log("✅ Storing user data...")

            // Store user data locally
            setStoredUser(user)

            // Update React Query cache
            queryClient.setQueryData(authKeys.currentUser, user)

            console.log("✅ User stored, navigating to dashboard...")
            toast.success(`Welcome back, ${user.name}!`)

            // Use setTimeout to ensure state updates complete
            setTimeout(() => {
                navigate("/", { replace: true })
            }, 100)

        } else {
            console.error("❌ Failed to decode user data")
            setError("Failed to decode user information")
            setMessage("")
            toast.error("Failed to complete Google sign-in")
            setTimeout(() => navigate("/login", { replace: true }), 2000)
        }
    }, [navigate, params, queryClient])

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
            <div className="max-w-md text-center space-y-4">
                {message && (
                    <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                        <p className="text-muted-foreground text-sm">{message}</p>
                    </div>
                )}
                {error && (
                    <div className="text-red-500">
                        <p className="text-sm font-medium">{error}</p>
                        <p className="text-xs mt-2">Redirecting to login...</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default GoogleLoginCallback
