import { lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { RouteWrapper } from "../components/RouteWrapper";

// Follow-ups
const Shared_FollowUps = lazy(() => import("@/modules/shared/follow-up/FollowUpListPage"));
const FollowUpCreatePage = lazy(() => import("@/modules/shared/follow-up/FollowUpCreatePage"));
const FollowUpEditPage = lazy(() => import("@/modules/shared/follow-up/FollowUpEditPage"));
const FollowUpShowPage = lazy(() => import("@/modules/shared/follow-up/FollowUpShowPage"));

// Courier
const Shared_Courier = lazy(() => import("@/modules/shared/courier/CourierListPage"));
const CourierCreatePage = lazy(() => import("@/modules/shared/courier/CourierCreatePage"));
const CourierDispatchPage = lazy(() => import("@/modules/shared/courier/CourierDispatchPage"));
const CourierViewPage = lazy(() => import("@/modules/shared/courier/CourierView"));
const CourierEditPage = lazy(() => import("@/modules/shared/courier/CourierEditPage"));

// Imprests
const Shared_Imprest = lazy(() => import("@/modules/imprest/UserImprestsPage"));
const ImprestCreatePage = lazy(() => import("@/modules/imprest/CreateImprestPage"));
const ImprestEditPage = lazy(() => import("@/modules/imprest/EditImprestPage"));
const ImprestPaymentHistoryPage = lazy(() => import("@/modules/imprest/PaymentHistoryPage"));
const ImprestVoucherPage = lazy(() => import("@/modules/imprest/VoucherListPage"));
const ImprestVoucherViewPage = lazy(() => import("@/modules/imprest/VoucherViewPage"));

// Maker Requests
const Shared_MakerRequests = lazy(() => import("@/modules/shared/maker-requests/MyMakerRequests"));
const MakerRequestCreatePage = lazy(() => import("@/modules/shared/maker-requests/CreateMakerRequestPage"));

export default function SharedRoutes() {
    return (
        <Routes>
            {/* Follow-up Routes */}
            <Route
                path="follow-up"
                element={
                    <RouteWrapper>
                        <Shared_FollowUps />
                    </RouteWrapper>
                }
            />
            <Route path="follow-up/create" element={<FollowUpCreatePage />} />
            <Route path="follow-up/edit/:id" element={<FollowUpEditPage />} />
            <Route path="follow-up/show/:id" element={<FollowUpShowPage />} />
            <Route path="follow-ups" element={<Navigate to="/shared/follow-up" replace />} />
            {/* Courier Routes */}
            <Route
                path="couriers"
                element={
                    <RouteWrapper>
                        <Shared_Courier />
                    </RouteWrapper>
                }
            />
            <Route path="couriers/create" element={<CourierCreatePage />} />
            <Route path="couriers/show/:id" element={<CourierViewPage />} />
            <Route path="couriers/edit/:id" element={<CourierEditPage />} />
            <Route path="couriers/dispatch/:id" element={<CourierDispatchPage />} />
            {/* Imprests Routes */}
            <Route
                path="imprests"
                element={
                    <RouteWrapper>
                        <Shared_Imprest />
                    </RouteWrapper>
                }
            />
            <Route path="imprests/user/:id" element={<Shared_Imprest />} />
            <Route path="imprests/create" element={<ImprestCreatePage />} />
            <Route path="imprests/payment-history" element={<ImprestPaymentHistoryPage />} />
            <Route path="imprests/voucher" element={<ImprestVoucherPage />} />
            <Route path="imprests/voucher/:userId" element={<ImprestVoucherPage />} />
            <Route path="imprests/voucher/view" element={<ImprestVoucherViewPage />} />
            <Route path="imprests/:id/edit" element={<RouteWrapper><ImprestEditPage /></RouteWrapper>}/>

            {/* <Route path="imprests/show/:id" element={<ImprestViewPage />} /> */}

            {/* Maker Requests Routes */}
            <Route
                path="maker-requests"
                element={
                    <RouteWrapper>
                        <Shared_MakerRequests />
                    </RouteWrapper>
                }
            />
            <Route path="maker-requests/create" element={<RouteWrapper><MakerRequestCreatePage /></RouteWrapper>} />
        </Routes>
    );
}
