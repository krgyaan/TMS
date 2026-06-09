import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { RouteWrapper } from "../components/RouteWrapper";

const Basic_Details = lazy(() => import("@/modules/operations/wo-basic-details/BasicDetailListPage"));
const Basic_Details_Create = lazy(() => import("@/modules/operations/wo-basic-details/BasicDetailCreatePage"));
const Basic_Details_Edit = lazy(() => import("@/modules/operations/wo-basic-details/BasicDetailEditPage"));
const Basic_Details_Show = lazy(() => import("@/modules/operations/wo-basic-details/BasicDetailShowPage"));
const Assign_Oe = lazy(() => import("@/modules/operations/wo-basic-details/AssignOePage"));

const Wo_Details_Create = lazy(() => import("@/modules/operations/wo-details/WoDetailCreatePage"));
const Wo_Details_Edit = lazy(() => import("@/modules/operations/wo-details/WoDetailEditPage"));
const Wo_Details_Show = lazy(() => import("@/modules/operations/wo-details/WoDetailShowPage"));

const Wo_Details_Acceptance = lazy(() => import("@/modules/operations/wo-details/WoDetailListPage"));
const Wo_Details_Acceptance_Create = lazy(() => import("@/modules/operations/wo-details/WoAcceptancePage"));
const Wo_Details_Acceptance_Edit = lazy(() => import("@/modules/operations/wo-details/WoAcceptancePage"));
const Wo_Acceptance_RaiseQuery_Create = lazy(() => import("@/modules/operations/wo-details/WoRaiseQueryPage"));
const Wo_Acceptance_RaiseQuery_Edit = lazy(() => import("@/modules/operations/wo-details/WoRaiseQueryEditPage"));
const Wo_Upload = lazy(() => import("@/modules/operations/wo-details/WoUploadPage"));

const Operations_KickOff = lazy(() => import("@/modules/operations/kick-off/KickOffListPage"));
const Operations_KickOffCreate = lazy(() => import("@/modules/operations/kick-off/KickOffCreatePage"));
const Operations_KickOffShow = lazy(() => import("@/modules/operations/kick-off/KickOffShowPage"));

const Operations_ContractAgreement = lazy(() => import("@/modules/operations/contract-agreement/ContractAgreementListPage"));
const Operations_ContractAgreementShow = lazy(() => import("@/modules/operations/contract-agreement/ContractAgreementShowPage"));

const Operations_ProjectDashboard = lazy(() => import("@/modules/operations/project-dashboard/ProjectDashboardPage"));
const Operations_ProjectShowPage = lazy(() => import("@/modules/operations/project-dashboard/ProjectShowPage"));
const Operations_RaisePoFormPage = lazy(() => import("@/modules/operations/project-dashboard/RaisePoFormPage"));
const Operations_ViewPoPage = lazy(() => import("@/modules/operations/project-dashboard/ViewPOPage"));
const Operations_EditPOPage = lazy(() => import("@/modules/operations/project-dashboard/EditPOPage"));
const Operations_PoPdfVersions = lazy(() => import("@/modules/operations/project-dashboard/PoPdfVersionsPage"));
const Operations_PurchaseOrderList = lazy(() => import("@/modules/shared/purchase-orders/PurchaseOrderListPage"));

const Operations_RaiseVendorWoFormPage = lazy(() => import("@/modules/operations/vendor-work-orders/CreateVendorWorkOrderPage"));
const Operations_EditVendorWoPage = lazy(() => import("@/modules/operations/vendor-work-orders/EditVendorWorkOrderPage"));
const Operations_VendorWorkOrderList = lazy(() => import("@/modules/operations/vendor-work-orders/VendorWorkOrderListPage"));
const Operations_VendorWoPdfVersions = lazy(() => import("@/modules/operations/vendor-work-orders/VendorWoPdfVersionsPage"));

export default function OperationsRoutes() {
    return (
        <Routes>
            <Route path="work-order/details/basic" element={<RouteWrapper><Basic_Details /></RouteWrapper>} />
            <Route path="work-order/details/basic/create" element={<RouteWrapper><Basic_Details_Create /></RouteWrapper>} />
            <Route path="work-order/details/basic/:id/edit" element={<RouteWrapper><Basic_Details_Edit /></RouteWrapper>} />
            <Route path="work-order/details/basic/:id" element={<RouteWrapper><Basic_Details_Show /></RouteWrapper>} />
            <Route path="work-order/details/full/create/:woBasicDetailId" element={<RouteWrapper><Wo_Details_Create /></RouteWrapper>} />
            <Route path="work-order/details/full/:id/edit" element={<RouteWrapper><Wo_Details_Edit /></RouteWrapper>} />
            <Route path="work-order/details/full/:id" element={<RouteWrapper><Wo_Details_Show /></RouteWrapper>} />
            <Route path="work-order/details/assign-oe/:id" element={<RouteWrapper><Assign_Oe /></RouteWrapper>} />

            <Route path="work-order/acceptance" element={<RouteWrapper><Wo_Details_Acceptance /></RouteWrapper>} />
            <Route path="work-order/acceptance/:id" element={<RouteWrapper><Wo_Details_Acceptance_Create /></RouteWrapper>} />
            <Route path="work-order/acceptance/raise-query/:id" element={<RouteWrapper><Wo_Acceptance_RaiseQuery_Create /></RouteWrapper>} />
            <Route path="work-order/acceptance/raise-query/:id/edit" element={<RouteWrapper><Wo_Acceptance_RaiseQuery_Edit /></RouteWrapper>} />
            <Route path="work-order/acceptance/:id/edit" element={<RouteWrapper><Wo_Details_Acceptance_Edit /></RouteWrapper>} />
            <Route path="work-order/acceptance/upload/:id" element={<RouteWrapper><Wo_Upload /></RouteWrapper>} />

            <Route path="work-order/kick-off" element={<RouteWrapper><Operations_KickOff /></RouteWrapper>} />
            <Route path="work-order/kick-off/create/:id" element={<RouteWrapper><Operations_KickOffCreate /></RouteWrapper>} />
            <Route path="work-order/kick-off/:id" element={<RouteWrapper><Operations_KickOffShow /></RouteWrapper>} />

            <Route path="work-order/contract-agreement" element={<RouteWrapper><Operations_ContractAgreement /></RouteWrapper>} />
            <Route path="work-order/contract-agreement/:id" element={<RouteWrapper><Operations_ContractAgreementShow /></RouteWrapper>} />

            <Route path="project-dashboard" element={<RouteWrapper><Operations_ProjectDashboard /></RouteWrapper>} />
            <Route path="project-dashboard/:projectId" element={<RouteWrapper><Operations_ProjectDashboard /></RouteWrapper>} />
            <Route path="project-dashboard/show/:id" element={<RouteWrapper><Operations_ProjectShowPage /></RouteWrapper>} />
            <Route path="project-dashboard/:projectId/purchase-order/create" element={<RouteWrapper><Operations_RaisePoFormPage /></RouteWrapper>} />
            <Route path="project-dashboard/:projectId/purchase-order/:poId" element={<RouteWrapper><Operations_ViewPoPage /></RouteWrapper>} />
            <Route path="project-dashboard/:projectId/purchase-order/:poId/edit" element={<RouteWrapper><Operations_EditPOPage /></RouteWrapper>}></Route>
            <Route path="project-dashboard/:projectId/purchase-order/:poId/pdf-versions" element={<RouteWrapper><Operations_PoPdfVersions /></RouteWrapper>} />
            <Route path="purchase-orders" element={<RouteWrapper><Operations_PurchaseOrderList /></RouteWrapper>} />
            <Route path="vendor-work-orders" element={<RouteWrapper><Operations_VendorWorkOrderList /></RouteWrapper>} />
            <Route path="project-dashboard/:projectId/vendor-work-order/create" element={<RouteWrapper><Operations_RaiseVendorWoFormPage /></RouteWrapper>} />
            <Route path="project-dashboard/:projectId/vendor-work-order/:woId" element={<RouteWrapper><Operations_EditVendorWoPage /></RouteWrapper>} />
            <Route path="project-dashboard/:projectId/vendor-work-order/:woId/edit" element={<RouteWrapper><Operations_EditVendorWoPage /></RouteWrapper>} />
            <Route path="project-dashboard/:projectId/vendor-work-order/:woId/pdf-versions" element={<RouteWrapper><Operations_VendorWoPdfVersions /></RouteWrapper>} />
        </Routes>
    );
}
