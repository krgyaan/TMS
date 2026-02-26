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

    // Handle inactive users
    if (!user.isActive) {
        const profileStatus = user.profile?.employeeStatus;
        const isHrmsPath = location.pathname.startsWith("/hrms");
        const isRegistrationPath = location.pathname.startsWith("/hrms/registration");
        const isStatusPath = location.pathname.startsWith("/hrms/status");

        // Case 1: New user (no profile or status)
        if (!profileStatus) {
            if (!isRegistrationPath) {
                console.log("👤 New inactive user, redirecting to registration");
                return <Navigate to="/hrms/registration" replace />;
            }
        }
        // Case 2: Pending Approval
        else if (profileStatus === "Pending Approval") {
            if (!isStatusPath) {
                console.log("⏳ User pending approval, redirecting to status page");
                return <Navigate to="/hrms/status" replace />;
            }
        }
        // Case 3: Rejected
        else if (profileStatus === "Rejected") {
            // Allow both Status and Registration (for resubmission)
            if (!isStatusPath && !isRegistrationPath) {
                console.log("❌ User rejected, redirecting to status page");
                return <Navigate to="/hrms/status" replace />;
            }
        }
        // Case 4: Other inactive (shouldn't happen with HRMS flow)
        else if (!isHrmsPath) {
            return <Navigate to="/hrms/status" replace />;
        }
    }

    // Handle active users trying to access HRMS flow
    if (user.isActive && location.pathname.startsWith("/hrms")) {
        console.log("✅ User is active, redirecting from HRMS flow to dashboard");
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
