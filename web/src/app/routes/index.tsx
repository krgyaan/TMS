import { Routes, Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicOnlyRoute from "@/components/PublicOnlyRoute";
import DashboardLayout from "@/app/layout/DashboardLayout";
import Login from "@/modules/auth/login";
import Dashboard from "@/modules/dashboard";
import { RouteWrapper } from "./components/RouteWrapper";
import { paths } from "./paths";

// Auth
const Auth_GoogleCallback = lazy(() => import("@/modules/auth/google-callback"));

// Section Routes
const MasterRoutes = lazy(() => import("./sections/master.routes"));
const TenderingRoutes = lazy(() => import("./sections/tendering.routes"));
const OperationsRoutes = lazy(() => import("./sections/operations.routes"));
const ServicesRoutes = lazy(() => import("./sections/services.routes"));
const BIDashboardRoutes = lazy(() => import("./sections/bi-dashboard.routes"));
const AccountsRoutes = lazy(() => import("./sections/accounts.routes"));
const CRMRoutes = lazy(() => import("./sections/crm.routes"));
const PerformanceRoutes = lazy(() => import("./sections/performance.routes"));
const IntegrationsRoutes = lazy(() => import("./sections/integrations.routes"));
const SharedRoutes = lazy(() => import("./sections/shared.routes"));
const Profile = lazy(() => import("@/modules/profile"));

export default function AppRoutes() {
    return (
        <Routes>
            {/* ==================== PUBLIC ROUTES ==================== */}
            <Route
                path={paths.auth.googleCallback}
                element={
                    <RouteWrapper>
                        <Auth_GoogleCallback />
                    </RouteWrapper>
                }
            />

            <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<Login />} />
            </Route>

            {/* ==================== PROTECTED ROUTES ==================== */}
            <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                    {/* Dashboard */}
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Navigate to="/" replace />} />

                    {/* Profile */}
                    <Route
                        path="/profile"
                        element={
                            <RouteWrapper>
                                <Profile />
                            </RouteWrapper>
                        }
                    />

                    {/* Integrations */}
                    <Route
                        path="integrations/*"
                        element={
                            <RouteWrapper>
                                <IntegrationsRoutes />
                            </RouteWrapper>
                        }
                    />

                    {/* Tendering */}
                    <Route
                        path="tendering/*"
                        element={
                            <RouteWrapper>
                                <TenderingRoutes />
                            </RouteWrapper>
                        }
                    />

                    {/* Operations */}
                    <Route
                        path="operations/*"
                        element={
                            <RouteWrapper>
                                <OperationsRoutes />
                            </RouteWrapper>
                        }
                    />

                    {/* Services */}
                    <Route
                        path="services/*"
                        element={
                            <RouteWrapper>
                                <ServicesRoutes />
                            </RouteWrapper>
                        }
                    />

                    {/* BI Dashboard */}
                    <Route
                        path="bi-dashboard/*"
                        element={
                            <RouteWrapper>
                                <BIDashboardRoutes />
                            </RouteWrapper>
                        }
                    />

                    {/* Accounts */}
                    <Route
                        path="accounts/*"
                        element={
                            <RouteWrapper>
                                <AccountsRoutes />
                            </RouteWrapper>
                        }
                    />

                    {/* CRM */}
                    <Route
                        path="crm/*"
                        element={
                            <RouteWrapper>
                                <CRMRoutes />
                            </RouteWrapper>
                        }
                    />

                    {/* Performance */}
                    <Route
                        path="performance/*"
                        element={
                            <RouteWrapper>
                                <PerformanceRoutes />
                            </RouteWrapper>
                        }
                    />

                    {/* Master Data */}
                    <Route
                        path="master/*"
                        element={
                            <RouteWrapper>
                                <MasterRoutes />
                            </RouteWrapper>
                        }
                    />

                    {/* Shared */}
                    <Route
                        path="shared/*"
                        element={
                            <RouteWrapper>
                                <SharedRoutes />
                            </RouteWrapper>
                        }
                    />
                </Route>
            </Route>

            {/* ==================== 404 FALLBACK ==================== */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
