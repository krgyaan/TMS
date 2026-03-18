import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { RouteWrapper } from "../components/RouteWrapper";

const Basic_Details = lazy(() => import("@/modules/operations/wo-basic-details/BasicDetailListPage"));
const Basic_Details_Create = lazy(() => import("@/modules/operations/wo-basic-details/BasicDetailCreatePage"));
const Basic_Details_Edit = lazy(() => import("@/modules/operations/wo-basic-details/BasicDetailEditPage"));
const Basic_Details_Show = lazy(() => import("@/modules/operations/wo-basic-details/BasicDetailShowPage"));

const Wo_Details = lazy(() => import("@/modules/operations/wo-details/WoDetailListPage"));
const Wo_Details_Create = lazy(() => import("@/modules/operations/wo-details/WoDetailCreatePage"));
const Wo_Details_Edit = lazy(() => import("@/modules/operations/wo-details/WoDetailEditPage"));
const Wo_Details_Show = lazy(() => import("@/modules/operations/wo-details/WoDetailShowPage"));

const Operations_KickOff = lazy(() => import("@/modules/operations/kick-off"));
const Operations_ContractAgreement = lazy(() => import("@/modules/operations/contract-agreement"));
const Operations_ProjectDashboard = lazy(() => import("@/modules/operations/project-dashboard/ProjectDashboardPage"));
const Operations_RaisePoFormPage = lazy(() => import("@/modules/operations/project-dashboard/RaisePoFormPage"));
const Operations_ViewPoPage = lazy(() => import("@/modules/operations/project-dashboard/ViewPoPage"));

export default function OperationsRoutes() {
    return (
        <Routes>
            <Route path="work-order/details/basic" element={<RouteWrapper><Basic_Details /></RouteWrapper>} />
            <Route path="work-order/details/basic/create" element={<RouteWrapper><Basic_Details_Create /></RouteWrapper>} />
            <Route path="work-order/details/basic/:id/edit" element={<RouteWrapper><Basic_Details_Edit /></RouteWrapper>} />
            <Route path="work-order/details/basic/:id" element={<RouteWrapper><Basic_Details_Show /></RouteWrapper>} />
            <Route path="work-order/details/full" element={<RouteWrapper><Wo_Details /></RouteWrapper>} />
            <Route path="work-order/details/full/create/:woBasicDetailId" element={<RouteWrapper><Wo_Details_Create /></RouteWrapper>} />
            <Route path="work-order/details/full/:id/edit" element={<RouteWrapper><Wo_Details_Edit /></RouteWrapper>} />
            <Route path="work-order/details/full/:id" element={<RouteWrapper><Wo_Details_Show /></RouteWrapper>} />

            <Route path="kick-off" element={<RouteWrapper><Operations_KickOff /></RouteWrapper>} />
            <Route path="contract-agreement" element={<RouteWrapper><Operations_ContractAgreement /></RouteWrapper>} />
            <Route path="project-dashboard" element={<RouteWrapper><Operations_ProjectDashboard /></RouteWrapper>} />
            <Route path="project-dashboard/purchase-order/create" element={<RouteWrapper><Operations_RaisePoFormPage /></RouteWrapper>} />
            <Route path="project-dashboard/purchase-order/:id/view" element={<RouteWrapper><Operations_ViewPoPage /></RouteWrapper>} />
        </Routes>
    );
}
