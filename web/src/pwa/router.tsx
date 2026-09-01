import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RouteWrapper } from "@/app/routes/components/RouteWrapper";
import PwaLayout from "./layout/PwaLayout";
import PwaDashboard from "./pages/Dashboard";

// ========== Profile ==========
const Profile = lazy(() => import("@/modules/profile"));

// ========== Shared / Document Dashboard Module ==========
const Shared_ClientDirectory = lazy(() => import("@/modules/shared/client-directory/ClientDirectoryListPage"));

// ========== CRM Module ==========
const CRM_Leads = lazy(() => import("@/modules/crm/leads/LeadsListPage"));
const CRM_LeadCreate = lazy(() => import("@/modules/crm/leads/LeadCreatePage"));
const CRM_LeadEdit = lazy(() => import("@/modules/crm/leads/LeadEditPage"));
const CRM_LeadShow = lazy(() => import("@/modules/crm/leads/LeadShowPage"));
const CRM_LeadFollowup = lazy(() => import("@/modules/crm/leadfollowup/LeadFollowupListPage"));
const CRM_Enquiries = lazy(() => import("@/modules/crm/lead-enquiry/LeadEnquiryListPage"));
const CRM_EnquiryCreate = lazy(() => import("@/modules/crm/lead-enquiry/LeadEnquiryCreatePage"));
const CRM_EnquiryWithLeadCreate = lazy(() => import("@/modules/crm/lead-enquiry/EnquiryWithLeadCreatePage"));
const CRM_EnquiryEdit = lazy(() => import("@/modules/crm/lead-enquiry/LeadEnquiryEditPage"));
const CRM_EnquiryShow = lazy(() => import("@/modules/crm/lead-enquiry/LeadEnquiryShowPage"));
const CRM_EnquiryQuotationFollowup = lazy(() => import("@/modules/crm/lead-enquiry/EnquiryQuotationFollowupPage"));
const CRM_HappyCalling = lazy(() => import("@/modules/crm/happy-calling/HappyCallingListPage"));
const CRM_HappyCallingCreate = lazy(() => import("@/modules/crm/happy-calling/HappyCallingCreatePage"));
const CRM_HappyCallingShow = lazy(() => import("@/modules/crm/happy-calling/HappyCallingShowPage"));
const CRM_HappyCallingEdit = lazy(() => import("@/modules/crm/happy-calling/HappyCallingEditPage"));
const CRM_HappyCallingFollowup = lazy(() => import("@/modules/crm/happy-calling/HappyCallingFollowupPage"));
const CRM_HappyCallingEnquiryCreate = lazy(() => import("@/modules/crm/happy-calling/HappyCallingEnquiryCreatePage"));

// ========== Imprest Module ==========
const Shared_Imprest = lazy(() => import("@/modules/imprest/UserImprestsPage"));
const ImprestCreatePage = lazy(() => import("@/modules/imprest/CreateImprestPage"));
const ImprestEditPage = lazy(() => import("@/modules/imprest/EditImprestPage"));
const ImprestPaymentHistory = lazy(() => import("@/modules/imprest/PaymentHistoryPage"));
const ImprestVoucherPage = lazy(() => import("@/modules/imprest/VoucherListPage"));
const ImprestVoucherViewPage = lazy(() => import("@/modules/imprest/VoucherViewPage"));

// Protected route - redirects if no permission
function PermissionRoute({
    hasAccess,
    children,
}: {
    hasAccess: boolean;
    children: React.ReactNode;
}) {
    if (!hasAccess) return <Navigate to="/" replace />;
    return <>{children}</>;
}

export default function PwaRouter() {
    const { permissions, isAdmin, isSuperUser } = useAuth();

    const hasCRM = isAdmin || isSuperUser || permissions.includes("crm:read");
    const hasImprest = isAdmin || isSuperUser || permissions.includes("imprest:read");
    const hasClientDirectory = isAdmin || isSuperUser || permissions.includes("shared.client-directory");

    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            }
        >
            <Routes>
                <Route element={<PwaLayout />}>
                    {/* Dashboard (home) */}
                    <Route
                        path="/"
                        element={
                            <PwaDashboard />
                        }
                    />

                    {/* ========== Profile ========== */}
                    <Route
                        path="profile"
                        element={
                            <RouteWrapper><Profile /></RouteWrapper>
                        }
                    />

                    {/* ========== Client Directory ========== */}
                    <Route
                        path="document-dashboard/client-directory"
                        element={
                            <PermissionRoute hasAccess={hasClientDirectory}>
                                <RouteWrapper><Shared_ClientDirectory /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />

                    {/* ========== CRM Routes ========== */}
                    <Route
                        path="crm/leads"
                        element={
                            <PermissionRoute hasAccess={hasCRM}>
                                <RouteWrapper><CRM_Leads /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="crm/leads/create"
                        element={
                            <PermissionRoute hasAccess={hasCRM}>
                                <RouteWrapper><CRM_LeadCreate /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="crm/leads/:id/edit"
                        element={
                            <PermissionRoute hasAccess={hasCRM}>
                                <RouteWrapper><CRM_LeadEdit /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="crm/leads/:id"
                        element={
                            <PermissionRoute hasAccess={hasCRM}>
                                <RouteWrapper><CRM_LeadShow /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="crm/followup/:leadId"
                        element={
                            <PermissionRoute hasAccess={hasCRM}>
                                <RouteWrapper><CRM_LeadFollowup /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="crm/enquiries"
                        element={
                            <PermissionRoute hasAccess={hasCRM}>
                                <RouteWrapper><CRM_Enquiries /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="crm/enquiries/create"
                        element={
                            <PermissionRoute hasAccess={hasCRM}>
                                <RouteWrapper><CRM_EnquiryWithLeadCreate /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="crm/enquiry/create/:leadId"
                        element={
                            <PermissionRoute hasAccess={hasCRM}>
                                <RouteWrapper><CRM_EnquiryCreate /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="crm/enquiries/:id/edit"
                        element={
                            <PermissionRoute hasAccess={hasCRM}>
                                <RouteWrapper><CRM_EnquiryEdit /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="crm/enquiries/:id/quotation-followup"
                        element={
                            <PermissionRoute hasAccess={hasCRM}>
                                <RouteWrapper><CRM_EnquiryQuotationFollowup /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="crm/enquiries/:id"
                        element={
                            <PermissionRoute hasAccess={hasCRM}>
                                <RouteWrapper><CRM_EnquiryShow /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="crm/happy-calling"
                        element={
                            <PermissionRoute hasAccess={hasCRM}>
                                <RouteWrapper><CRM_HappyCalling /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="crm/happy-calling/create/:clientId"
                        element={
                            <PermissionRoute hasAccess={hasCRM}>
                                <RouteWrapper><CRM_HappyCallingCreate /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="crm/happy-calling/enquiry/create/:id"
                        element={
                            <PermissionRoute hasAccess={hasCRM}>
                                <RouteWrapper><CRM_HappyCallingEnquiryCreate /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="crm/happy-calling/followup/:id"
                        element={
                            <PermissionRoute hasAccess={hasCRM}>
                                <RouteWrapper><CRM_HappyCallingFollowup /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="crm/happy-calling/:id"
                        element={
                            <PermissionRoute hasAccess={hasCRM}>
                                <RouteWrapper><CRM_HappyCallingShow /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="crm/happy-calling/:id/edit"
                        element={
                            <PermissionRoute hasAccess={hasCRM}>
                                <RouteWrapper><CRM_HappyCallingEdit /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />

                    {/* ========== Imprest Routes ========== */}
                    <Route
                        path="shared/imprests"
                        element={
                            <PermissionRoute hasAccess={hasImprest}>
                                <RouteWrapper><Shared_Imprest /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="shared/imprests/user/:id"
                        element={
                            <PermissionRoute hasAccess={hasImprest}>
                                <RouteWrapper><Shared_Imprest /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="shared/imprests/create"
                        element={
                            <PermissionRoute hasAccess={hasImprest}>
                                <RouteWrapper><ImprestCreatePage /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="shared/imprests/:id/edit"
                        element={
                            <PermissionRoute hasAccess={hasImprest}>
                                <RouteWrapper><ImprestEditPage /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="shared/imprests/payment-history"
                        element={
                            <PermissionRoute hasAccess={hasImprest}>
                                <RouteWrapper><ImprestPaymentHistory /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="shared/imprests/voucher"
                        element={
                            <PermissionRoute hasAccess={hasImprest}>
                                <RouteWrapper><ImprestVoucherPage /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="shared/imprests/voucher/:userId"
                        element={
                            <PermissionRoute hasAccess={hasImprest}>
                                <RouteWrapper><ImprestVoucherPage /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />
                    <Route
                        path="shared/imprests/voucher/view"
                        element={
                            <PermissionRoute hasAccess={hasImprest}>
                                <RouteWrapper><ImprestVoucherViewPage /></RouteWrapper>
                            </PermissionRoute>
                        }
                    />

                    {/* 404 fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </Suspense>
    );
}