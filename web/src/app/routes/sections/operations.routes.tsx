import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { RouteWrapper } from "../components/RouteWrapper";

const Operations_WorkOrder = lazy(() => import("@/modules/operations/work-order"));
const Operations_KickOff = lazy(() => import("@/modules/operations/kick-off"));
const Operations_ContractAgreement = lazy(() => import("@/modules/operations/contract-agreement"));

const Operations_ProjectDashboard = lazy(() => import("@/modules/operations/project-dashboard/ProjectDashboardPage"));
const Operations_RaisePoFormPage = lazy(() => import("@/modules/operations/project-dashboard/RaisePoFormPage"));
const Operations_ViewPoPage = lazy(() => import("@/modules/operations/project-dashboard/ViewPoPage"));

export default function OperationsRoutes() {
    return (
        <Routes>
            <Route
                path="work-order"
                element={
                    <RouteWrapper>
                        <Operations_WorkOrder />
                    </RouteWrapper>
                }
            />
            <Route
                path="kick-off"
                element={
                    <RouteWrapper>
                        <Operations_KickOff />
                    </RouteWrapper>
                }
            />
            <Route
                path="contract-agreement"
                element={
                    <RouteWrapper>
                        <Operations_ContractAgreement />
                    </RouteWrapper>
                }
            />
            <Route
                path="project-dashboard"
                element={
                    <RouteWrapper>
                        <Operations_ProjectDashboard />
                    </RouteWrapper>
                }
            />
            <Route
                path="project-dashboard/purchase-order/create"
                element={
                    <RouteWrapper>
                        <Operations_RaisePoFormPage />
                    </RouteWrapper>
                }
            />
            <Route
                path="project-dashboard/purchase-order/:id/view"
                element={
                    <RouteWrapper>
                        <Operations_ViewPoPage />
                    </RouteWrapper>
                }
            />
        </Routes>
    );
}
