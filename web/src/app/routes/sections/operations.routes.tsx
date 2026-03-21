import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { RouteWrapper } from "../components/RouteWrapper";

const Basic_Details = lazy(() => import("@/modules/operations/wo-basic-details/BasicDetailListPage"));
const Basic_Details_Create = lazy(() => import("@/modules/operations/wo-basic-details/BasicDetailCreatePage"));
const Basic_Details_Edit = lazy(() => import("@/modules/operations/wo-basic-details/BasicDetailEditPage"));
const Basic_Details_Show = lazy(() => import("@/modules/operations/wo-basic-details/BasicDetailShowPage"));
const Wo_Details_Create = lazy(() => import("@/modules/operations/wo-details/WoDetailCreatePage"));
const Wo_Details_Edit = lazy(() => import("@/modules/operations/wo-details/WoDetailEditPage"));

const Wo_Details_Acceptance = lazy(() => import("@/modules/operations/wo-details/WoDetailListPage"));
const Wo_Details_Acceptance_Create = lazy(() => import("@/modules/operations/wo-details/WoAcceptancePage"));
const Wo_Details_Acceptance_Edit = lazy(() => import("@/modules/operations/wo-details/WoAcceptancePage"));
const Wo_Acceptance_RaiseQuery_Create = lazy(() => import("@/modules/operations/wo-details/WoRaiseQueryPage"));
const Wo_Acceptance_RaiseQuery_Edit = lazy(() => import("@/modules/operations/wo-details/WoRaiseQueryEditPage"));
const Wo_Upload = lazy(() => import("@/modules/operations/wo-details/WoUploadPage"));

const Operations_KickOff = lazy(() => import("@/modules/operations/kick-off/KickOffListPage"));
const Operations_KickOffCreate = lazy(() => import("@/modules/operations/kick-off/KickOffCreatePage"));
const Operations_KickOffEdit = lazy(() => import("@/modules/operations/kick-off/KickOffEditPage"));
const Operations_KickOffShow = lazy(() => import("@/modules/operations/kick-off/KickOffShowPage"));

const Operations_ContractAgreement = lazy(() => import("@/modules/operations/contract-agreement/ContractAgreementListPage"));
const Operations_ContractAgreementCreate = lazy(() => import("@/modules/operations/contract-agreement/ContractAgreementCreatePage"));
const Operations_ContractAgreementEdit = lazy(() => import("@/modules/operations/contract-agreement/ContractAgreementEditPage"));
const Operations_ContractAgreementShow = lazy(() => import("@/modules/operations/contract-agreement/ContractAgreementShowPage"));

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
            <Route path="work-order/details/full/create/:woBasicDetailId" element={<RouteWrapper><Wo_Details_Create /></RouteWrapper>} />
            <Route path="work-order/details/full/:id/edit" element={<RouteWrapper><Wo_Details_Edit /></RouteWrapper>} />

            <Route path="work-order/acceptance" element={<RouteWrapper><Wo_Details_Acceptance /></RouteWrapper>} />
            <Route path="work-order/acceptance/:id" element={<RouteWrapper><Wo_Details_Acceptance_Create /></RouteWrapper>} />
            <Route path="work-order/acceptance/raise-query/:id" element={<RouteWrapper><Wo_Acceptance_RaiseQuery_Create /></RouteWrapper>} />
            <Route path="work-order/acceptance/raise-query/:id/edit" element={<RouteWrapper><Wo_Acceptance_RaiseQuery_Edit /></RouteWrapper>} />
            <Route path="work-order/acceptance/:id/edit" element={<RouteWrapper><Wo_Details_Acceptance_Edit /></RouteWrapper>} />
            <Route path="work-order/acceptance/upload/:id" element={<RouteWrapper><Wo_Upload /></RouteWrapper>} />

            <Route path="kick-off" element={<RouteWrapper><Operations_KickOff /></RouteWrapper>} />
            <Route path="kick-off/create" element={<RouteWrapper><Operations_KickOffCreate /></RouteWrapper>} />
            <Route path="kick-off/:id/edit" element={<RouteWrapper><Operations_KickOffEdit /></RouteWrapper>} />
            <Route path="kick-off/:id" element={<RouteWrapper><Operations_KickOffShow /></RouteWrapper>} />

            <Route path="contract-agreement" element={<RouteWrapper><Operations_ContractAgreement /></RouteWrapper>} />
            <Route path="contract-agreement/create" element={<RouteWrapper><Operations_ContractAgreementCreate /></RouteWrapper>} />
            <Route path="contract-agreement/:id/edit" element={<RouteWrapper><Operations_ContractAgreementEdit /></RouteWrapper>} />
            <Route path="contract-agreement/:id" element={<RouteWrapper><Operations_ContractAgreementShow /></RouteWrapper>} />

            <Route path="project-dashboard" element={<RouteWrapper><Operations_ProjectDashboard /></RouteWrapper>} />
            <Route path="project-dashboard/purchase-order/create" element={<RouteWrapper><Operations_RaisePoFormPage /></RouteWrapper>} />
            <Route path="project-dashboard/purchase-order/:id/view" element={<RouteWrapper><Operations_ViewPoPage /></RouteWrapper>} />
        </Routes>
    );
}
