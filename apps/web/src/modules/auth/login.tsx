import { LoginForm } from "@/components/login-form"
import { setAuthToken } from "@/lib/auth"
import { useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"

const Login = () => {
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        // No-op here; could auto-redirect if already authenticated via PublicOnlyRoute
    }, [])

    const handleSuccess = () => {
        setAuthToken("demo-token")
        const redirectTo = (location.state as any)?.from?.pathname || "/"
        navigate(redirectTo, { replace: true })
    }

    return <div className="flex items-center justify-center h-screen w-screen p-4">
        <LoginForm onSuccess={handleSuccess} />
    </div>
}

export default Login
