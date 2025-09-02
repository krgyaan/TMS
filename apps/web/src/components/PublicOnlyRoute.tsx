import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";

export default function PublicOnlyRoute() {
    const location = useLocation();
    if (isAuthenticated()) {
        const redirectTo = (location.state as any)?.from?.pathname || "/";
        return <Navigate to={redirectTo} replace />;
    }
    return <Outlet />;
}
