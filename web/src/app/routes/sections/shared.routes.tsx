// src/routes/SharedRoutes.tsx (or wherever your file is)
import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { RouteWrapper } from "../components/RouteWrapper";

// Follow-ups
const Shared_FollowUps = lazy(() => import("@/modules/shared/follow-up/FollowUpPage"));
const FollowUpCreatePage = lazy(() => import("@/modules/shared/follow-up/FollowUpCreatePage"));
const FollowUpEditPage = lazy(() => import("@/modules/shared/follow-up/FollowUpEditPage"));
const FollowUpShowPage = lazy(() => import("@/modules/shared/follow-up/FollowUpViewPage"));

// Courier
const Shared_Courier = lazy(() => import("@/modules/shared/courier"));
const CourierCreatePage = lazy(() => import("@/modules/shared/courier/create"));
const CourierDispatchPage = lazy(() => import("@/modules/shared/courier/dispatch"));
const CourierViewPage = lazy(() => import("@/modules/shared/courier/CourierView"));
const CourierEditPage = lazy(() => import("@/modules/shared/courier/CourierEdit"));

// Imprests
const Shared_Imprest = lazy(() => import("@/modules/shared/imprest"));
const ImprestCreatePage = lazy(() => import("@/modules/shared/imprest/create"));
const ImprestPaymentHistoryPage = lazy(() => import("@/modules/shared/imprest/ImprestPaymentHistory"));
const ImprestVoucherPage = lazy(() => import("@/modules/shared/imprest/ImprestVoucher"));
const ImprestVoucherViewPage = lazy(() => import("@/modules/shared/imprest/ImprestVoucherView"));

export default function SharedRoutes() {
    return (
        <Routes>
            {/* Follow-ups Routes */}
            <Route
                path="follow-ups"
                element={
                    <RouteWrapper>
                        <Shared_FollowUps />
                    </RouteWrapper>
                }
            />
            <Route path="follow-up/create" element={<FollowUpCreatePage />} />
            <Route path="follow-up/edit/:id" element={<FollowUpEditPage />} />
            <Route path="follow-up/show/:id" element={<FollowUpShowPage />} />
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
            <Route path="imprests/voucher/view/:id" element={<ImprestVoucherViewPage />} />
            {/* <Route path="imprests/show/:id" element={<ImprestViewPage />} /> */}
        </Routes>
    );
}
