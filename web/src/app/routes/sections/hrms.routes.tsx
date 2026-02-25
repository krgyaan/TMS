import { lazy } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { paths } from "../paths";

const RegistrationPage = lazy(() => import("@/modules/hrms/pages/RegistrationPage"));

export default function HrmsRoutes() {
    return (
        <Routes>
            <Route path="registration" element={<RegistrationPage />} />
            <Route path="/" element={<Navigate to={paths.hrms.registration} replace />} />
        </Routes>
    );
}
