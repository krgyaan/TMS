import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicOnlyRoute from "@/components/PublicOnlyRoute";
import DashboardLayout from "@/components/DashboardLayout";
import Login from "@/modules/auth/login";
import Dashboard from "@/modules/dashboard";

export default function AppRoutes() {
    return (
        <Routes>
            {/* Public auth routes */}
            <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<Login />} />
            </Route>

            {/* Protected app routes with shared dashboard layout */}
            <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Navigate to="/" replace />} />
                    {/* Future protected routes go here, all sharing the dashboard shell */}
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
