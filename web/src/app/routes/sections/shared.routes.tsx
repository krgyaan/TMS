// src/routes/SharedRoutes.tsx (or wherever your file is)
import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { RouteWrapper } from "../components/RouteWrapper";

// Follow-ups
const Shared_FollowUps = lazy(() => import("@/modules/shared/follow-up"));
const FollowUpCreatePage = lazy(() => import("@/modules/shared/follow-up/create"));
const FollowUpEditPage = lazy(() => import("@/modules/shared/follow-up/edit"));
const FollowUpShowPage = lazy(() => import("@/modules/shared/follow-up/show"));

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
// const ImprestViewPage = lazy(() => import("@/modules/shared/imprests/show"));

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
            <Route path="follow-ups/create" element={<FollowUpCreatePage />} />
            <Route path="follow-ups/edit/:id" element={<FollowUpEditPage />} />
            <Route path="follow-ups/show/:id" element={<FollowUpShowPage />} />
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
            <Route path="imprests/create" element={<ImprestCreatePage />} />
            <Route path="imprests/payment-history" element={<ImprestPaymentHistoryPage />} />
            <Route path="imprests/voucher" element={<ImprestVoucherPage />} />
            {/* <Route path="imprests/show/:id" element={<ImprestViewPage />} /> */}
        </Routes>
    );
}
