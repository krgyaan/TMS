import { lazy } from "react";
import { Route, Routes } from "react-router-dom";

const EmployeeRegistration = lazy(() => import("@/modules/hrms/employees/registration"));
const EmployeeProfileView = lazy(() => import("@/modules/hrms/employees/profile-view"));

// Assets — restructured following tendering module pattern
const AssetListPage = lazy(() => import("@/modules/hrms/assets/AssetListPage"));
const AssetCreatePage = lazy(() => import("@/modules/hrms/assets/AssetCreatePage"));
const AssetEditPage = lazy(() => import("@/modules/hrms/assets/AssetEditPage"));
const AssetShowPage = lazy(() => import("@/modules/hrms/assets/AssetShowPage"));
const AssetStatusPage = lazy(() => import("@/modules/hrms/assets/AssetStatusPage"));
const MyAssetsListPage = lazy(() => import("@/modules/hrms/assets/MyAssetsListPage"));

const OnboardingDashboard = lazy(() => import('@/modules/hrms/onboarding/OnboardingDashboard'));
const CandidateDetailPage = lazy(() => import('@/modules/hrms/onboarding/CandidateDetailPage'));
const ProfileDetailsDashboard = lazy(() => import('@/modules/hrms/onboarding/ProfileDetailsDashboard'));
const DocumentDashboard = lazy(() => import('@/modules/hrms/onboarding/DocumentDashboard'));
const InductionDashboard = lazy(() => import('@/modules/hrms/induction/InductionDashboard'))
const InductionDetailsPage = lazy(() => import('@/modules/hrms/induction/InductionDetailsPage'))
const InductionWorkDetailsPage = lazy(() => import('@/modules/hrms/induction/InductionWorkDetailsPage'))

const TrainingDashboard = lazy(() => import('@/modules/hrms/training/TrainingDashboard'))
const UploadVideo = lazy(() => import("@/modules/hrms/training/components/UploadVideo"))

// Complaints (admin)
const ComplaintListPage = lazy(() => import("@/modules/hrms/complaints/ComplaintListPage"));
const ComplaintCreatePage = lazy(() => import("@/modules/hrms/complaints/ComplaintCreatePage"));
const ComplaintViewPage = lazy(() => import("@/modules/hrms/complaints/ComplaintViewPage"));


export default function HrmsRoutes() {
    return (
        <Routes>
            <Route path="employees/register" element={<EmployeeRegistration />} />
            <Route path="employees/:id" element={<EmployeeProfileView />} />

            <Route path="onboarding/dashboard" element={<OnboardingDashboard />} />
            <Route path="onboarding/candidate/:id" element={<CandidateDetailPage />} />
            <Route path="onboarding/profile-details" element={<ProfileDetailsDashboard />} />
            <Route path="onboarding/documents" element={<DocumentDashboard />} />
            <Route path="onboarding/induction" element={<InductionDashboard />}/>
            <Route path="onboarding/induction/:id" element={<InductionDetailsPage />} />
            <Route path="onboarding/induction/:id/work-details" element={<InductionWorkDetailsPage />} />
            
            <Route path="assets/my" element={<MyAssetsListPage />} />
            
            <Route path="admin/assets" element={<AssetListPage />} />
            <Route path="admin/assets/create" element={<AssetCreatePage />} />
            <Route path="admin/assets/view/:id" element={<AssetShowPage />} />
            <Route path="admin/assets/status/:id" element={<AssetStatusPage />} />
            <Route path="admin/assets/edit/:id" element={<AssetEditPage />} />

            <Route path="training" element={<TrainingDashboard />} />
            <Route path="training/upload-video" element={ <UploadVideo />} />

            <Route path="complaints" element={<ComplaintListPage />} />
            <Route path="complaints/create" element={<ComplaintCreatePage redirectTo="/hrms/complaints" />} />
            <Route
                path="complaints/:id/view"
                element={<ComplaintViewPage backTo="/hrms/complaints" backLabel="Back to Complaints" />}
            />
        </Routes>
    );
}
