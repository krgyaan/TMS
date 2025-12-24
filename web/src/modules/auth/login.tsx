import { useCallback, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { LoginForm } from "@/components/login-form"
import { useLogin, useGoogleAuthUrl } from "@/hooks/api/useAuth"
import { isAuthenticated, getStoredUser } from "@/lib/auth"
import { toast } from "sonner"

const Login = () => {
    const navigate = useNavigate()
    const location = useLocation()

    // Get redirect URL from location state (React Router) or sessionStorage (axios 401 redirect)
    const stateRedirect = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
    const storedRedirect = sessionStorage.getItem("auth_redirect")
    const redirectTo = stateRedirect || storedRedirect || "/"

    const login = useLogin(redirectTo)
    const { refetch: getGoogleUrl } = useGoogleAuthUrl()

    // Check authentication status and redirect if already logged in
    useEffect(() => {
        // console.log("🔍 Login page - checking auth status...")
        const user = getStoredUser()
        // console.log("👤 Current user:", user)

        if (isAuthenticated() && user) {
            console.log("✅ Already authenticated, redirecting to:", redirectTo)
            navigate(redirectTo, { replace: true })
        }
    }, [navigate, redirectTo]) // This will re-run if navigation target changes

    const handlePasswordLogin = useCallback(
        async (credentials: { email: string; password: string }) => {
            try {
                await login.mutateAsync(credentials)
                // Navigation is handled in the mutation's onSuccess
            } catch (error) {
                // Error is handled by the mutation's onError
                console.error("Login failed:", error)
            }
        },
        [login]
    )

    const handleGoogleLogin = useCallback(async () => {
        try {
            if (redirectTo && redirectTo !== "/") {
                sessionStorage.setItem("auth_redirect", redirectTo);
            }
            // console.log("🔍 Starting Google login...")
            const { data } = await getGoogleUrl()
            console.log("📋 Google auth URL:", data?.url)

            if (data?.url) {
                window.location.href = data.url
            } else {
                toast.error("Failed to get Google login URL")
            }
        } catch (error) {
            console.error("Google login error:", error)
            toast.error("Failed to start Google login")
        }
    }, [getGoogleUrl])

    return (
        <div className="flex h-screen w-screen items-center justify-center p-4">
            <LoginForm
                onPasswordLogin={handlePasswordLogin}
                onGoogleLogin={handleGoogleLogin}
            />
        </div>
    )
}

export default Login
