import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { RouteWrapper } from "../components/RouteWrapper";

const Perf_TenderExecutive = lazy(() => import("@/modules/performance/tender-executive/TenderExecutivePerformance"));
const Perf_TeamLeader = lazy(() => import("@/modules/performance/team-leader/TeamLeaderPerformance"));
const Perf_Business = lazy(() => import("@/modules/performance/business-performance/BusinessPerformanceDashboard"));
const Perf_OperationTeam = lazy(() => import("@/modules/performance/operation-team"));
const Perf_AccountTeam = lazy(() => import("@/modules/performance/account-team"));
const Perf_OEM = lazy(() => import("@/modules/performance/oem-dashboard/OemPerformancePage"));
const Perf_Customer = lazy(() => import("@/modules/performance/customer-performance/CustomerPerformanceDashboard"));
const Perf_Location = lazy(() => import("@/modules/performance/location-performance/LocationPerformanceDashboard"));

export default function PerformanceRoutes() {
    return (
        <Routes>
            <Route
                path="tender-executive"
                element={
                    <RouteWrapper permission={{ module: "performance.tender-executive", action: "read" }}>
                        <Perf_TenderExecutive />
                    </RouteWrapper>
                }
            />
            <Route
                path="team-leader"
                element={
                    <RouteWrapper permission={{ module: "performance.team-leader", action: "read" }}>
                        <Perf_TeamLeader />
                    </RouteWrapper>
                }
            />
            <Route
                path="operation-team"
                element={
                    <RouteWrapper permission={{ module: "performance.operation-team", action: "read" }}>
                        <Perf_OperationTeam />
                    </RouteWrapper>
                }
            />
            <Route
                path="account-team"
                element={
                    <RouteWrapper permission={{ module: "performance.account-team", action: "read" }}>
                        <Perf_AccountTeam />
                    </RouteWrapper>
                }
            />
            <Route
                path="oem-dashboard"
                element={
                    <RouteWrapper permission={{ module: "performance.oem-dashboard", action: "read" }}>
                        <Perf_OEM />
                    </RouteWrapper>
                }
            />
            <Route
                path="business-dashboard"
                element={
                    <RouteWrapper permission={{ module: "performance.business-dashboard", action: "read" }}>
                        <Perf_Business />
                    </RouteWrapper>
                }
            />
            <Route
                path="customer-dashboard"
                element={
                    <RouteWrapper permission={{ module: "performance.customer-dashboard", action: "read" }}>
                        <Perf_Customer />
                    </RouteWrapper>
                }
            />
            <Route
                path="location-dashboard"
                element={
                    <RouteWrapper permission={{ module: "performance.location-dashboard", action: "read" }}>
                        <Perf_Location />
                    </RouteWrapper>
                }
            />
        </Routes>
    );
}
