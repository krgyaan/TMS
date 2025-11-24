import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { RouteWrapper } from "../components/RouteWrapper";

const Shared_FollowUps = lazy(() => import("@/modules/shared/follow-ups"));
const FollowUpCreatePage = lazy(() => import("@/modules/shared/follow-ups/create"));
const FollowUpEditPage = lazy(() => import("@/modules/shared/follow-ups/edit"));
const FollowUpShowPage = lazy(() => import("@/modules/shared/follow-ups/show"));
const Shared_Courier = lazy(() => import("@/modules/shared/courier"));
const CourierDispatchPage = lazy(() => import("@/modules/shared/courier/dispatch"));
const CourierCreatePage = lazy(() => import("@/modules/shared/courier/create"));
const Shared_Imprest = lazy(() => import("@/modules/shared/imprests"));

export default function SharedRoutes() {
    return (
        <Routes>
            <Route
                path="follow-ups"
                element={
                    <RouteWrapper>
                        <Shared_FollowUps />
                    </RouteWrapper>
                }
            />
            <Route path="follow-ups/create" element={<FollowUpCreatePage />} />
            <Route path="follow-up/edit" element={<FollowUpEditPage />} />
            <Route path="follow-up/show" element={<FollowUpShowPage />} />
            //Courier Routes
            <Route
                path="couriers"
                element={
                    <RouteWrapper>
                        <Shared_Courier />
                    </RouteWrapper>
                }
            />
            <Route path="couriers/dispatch" element={<CourierDispatchPage />} />
            <Route path="couriers/create" element={<CourierCreatePage />} />
            <Route
                path="imprests"
                element={
                    <RouteWrapper>
                        <Shared_Imprest />
                    </RouteWrapper>
                }
            />
        </Routes>
    );
}
