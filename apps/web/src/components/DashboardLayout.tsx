import { Outlet } from "react-router-dom";
import Dashboard from "@/modules/dashboard";

export default function DashboardLayout() {
    return (
        <Dashboard>
            <Outlet />
        </Dashboard>
    );
}
