import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCurrentUser } from "@/hooks/api/useAuth";
import { getStoredUser, clearAuthSession } from "@/lib/auth";

export default function ProtectedRoute() {
    const location = useLocation();
    const { data: user, isLoading, isError } = useCurrentUser();

    const storedUser = getStoredUser();

    if (isLoading) {
        if (!storedUser) {
            return <Navigate to="/login" replace state={{ from: location }} />;
        }

        return (
            <div className="flex h-screen w-screen items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (isError || !user) {
        clearAuthSession();
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // Handle inactive users - redirect to registration
    if (!user.isActive && !location.pathname.startsWith("/hrms/registration")) {
        console.log("👤 User is inactive, redirecting to registration");
        return <Navigate to="/hrms/registration" replace />;
    }

    // Handle active users trying to access registration (optional, but good for UX)
    if (user.isActive && location.pathname.startsWith("/hrms/registration")) {
        console.log("✅ User is active, redirecting from registration to dashboard");
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
