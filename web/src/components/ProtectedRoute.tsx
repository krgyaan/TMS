import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCurrentUser } from "@/hooks/api/useAuth";
import { getStoredUser, clearAuthSession } from "@/lib/auth";

export default function ProtectedRoute() {
    const location = useLocation();
    const { data: user, isLoading, isError } = useCurrentUser();

    const storedUser = getStoredUser();
    const currentPath = location.pathname + location.search;

    const persistRedirectTarget = () => {
        if (currentPath && currentPath !== "/" && !location.pathname.startsWith("/login")) {
            sessionStorage.setItem("auth_redirect", currentPath);
        }
    };

    if (isLoading) {
        if (!storedUser) {
            persistRedirectTarget();
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
        persistRedirectTarget();
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return <Outlet />;
}
