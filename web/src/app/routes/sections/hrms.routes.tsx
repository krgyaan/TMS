import { lazy } from "react";
import { Route, Routes } from "react-router-dom";

const EmployeeRegistration = lazy(() => import("@/modules/hrms/employees/registration"));
const EmployeeProfileView = lazy(() => import("@/modules/hrms/employees/profile-view"));
const AssetAdminDashboard = lazy(() => import("@/modules/hrms/assets/dashboard"));

const AdminAssetView = lazy(() => import("@/modules/hrms/assets/AssetView"));
const AdminAssetEdit = lazy(() => import("@/modules/hrms/assets/AssetEdit"));
const AdminAssetStatus = lazy(() => import("@/modules/hrms/assets/AssetStatus"));

const AssetAssignment = lazy(() => import("@/modules/hrms/assets/assignment"));
const MyAssets = lazy(() => import("@/modules/hrms/assets/my-assets"));

export default function HrmsRoutes() {
    return (
        <Routes>
            <Route path="employees/register" element={<EmployeeRegistration />} />
            <Route path="employees/:id" element={<EmployeeProfileView />} />
            
            <Route path="assets/my" element={<MyAssets />} />
            
            <Route path="admin/assets" element={<AssetAdminDashboard />} />
            <Route path="admin/assets/view/:id" element={<AdminAssetView />} />
            <Route path="admin/assets/status/:id" element={<AdminAssetStatus />} />
            <Route path="admin/assets/edit/:id" element={<AdminAssetEdit />} />
            <Route path="admin/assets/assign" element={<AssetAssignment />} />
        </Routes>
    );
}
