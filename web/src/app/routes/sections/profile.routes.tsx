import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { RouteWrapper } from "../components/RouteWrapper";

const Profile = lazy(() => import("@/modules/profile"));

// Complaints module pages — routed here (before the Profile catch-all) so they
// render full-width with the shell's p-4 gap, bypassing ProfileLayout's container
const ComplaintCreatePage = lazy(() => import("@/modules/hrms/complaints/ComplaintCreatePage"));
const ComplaintViewPage = lazy(() => import("@/modules/hrms/complaints/ComplaintViewPage"));
const ComplaintEditPage = lazy(() => import("@/modules/hrms/complaints/ComplaintEditPage"));

export default function ProfileRoutes() {
    return (
        <Routes>
            <Route
                path="support/complaints/create"
                element={<RouteWrapper><ComplaintCreatePage /></RouteWrapper>}
            />
            <Route
                path="support/complaints/:id"
                element={<RouteWrapper><ComplaintViewPage /></RouteWrapper>}
            />
            <Route
                path="support/complaints/:id/edit"
                element={<RouteWrapper><ComplaintEditPage /></RouteWrapper>}
            />

            <Route path="*" element={<RouteWrapper><Profile /></RouteWrapper>} />
        </Routes>
    );
}
