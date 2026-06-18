import { lazy } from "react";
import { Route, Routes } from "react-router-dom";

// Lazy-loaded training components
const EmployeeTrainingDashboard = lazy(() => import("@/modules/hrms/employees/EmployeeTrainingDashboard"));

// Add future nested training components here, for example:
// const TrainingVideoPlayer = lazy(() => import("@/modules/hrms/employees/TrainingVideoPlayer"));

export default function TrainingRoutes() {
    return (
        <Routes>
            {/* Main dashboard: /training */}
            <Route path="/" element={<EmployeeTrainingDashboard />} />

            {/* Example nested route: /training/videos/:id */}
            {/* <Route path="videos/:id" element={<TrainingVideoPlayer />} /> */}
        </Routes>
    );
}
