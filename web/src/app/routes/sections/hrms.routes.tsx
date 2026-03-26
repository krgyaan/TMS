import { lazy } from "react";
import { Route, Routes } from "react-router-dom";

const EmployeeRegistration = lazy(() => import("@/modules/hrms/employees/registration"));
const EmployeeProfileView = lazy(() => import("@/modules/hrms/employees/profile-view"));
const AssetAdminDashboard = lazy(() => import("@/modules/hrms/assets/dashboard"));
const AssetAssignment = lazy(() => import("@/modules/hrms/assets/assignment"));
const MyAssets = lazy(() => import("@/modules/hrms/assets/my-assets"));

export default function HrmsRoutes() {
    return (
        <Routes>
            <Route path="employees/register" element={<EmployeeRegistration />} />
            <Route path="employees/:id" element={<EmployeeProfileView />} />
            <Route path="assets" element={<AssetAdminDashboard />} />
            <Route path="assets/assign" element={<AssetAssignment />} />
            <Route path="assets/my" element={<MyAssets />} />
        </Routes>
    );
}
