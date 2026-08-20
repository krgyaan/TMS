import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { CircularsWidget } from "./components/CircularsWidget";
import DashboardCalendar from "./components/DashboardCalendar";
import { QuickActionCard } from "./components/QuickActionCard";
import { SoonExpiringTimers } from "./components/SoonExpiringTimers";
import { quickActions } from "./helpers/dashboard.constants";

const Dashboard = () => {
    const navigate = useNavigate();
    const {teamId, isSuperUser, isAdmin} = useAuth();

    const isTenderingTeam = teamId == 1 || teamId == 2 || isSuperUser || isAdmin;

    return (
        <div className="space-y-6 p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {/* Quick Actions */}
                <div className="col-span-1 md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                        {quickActions
                            .filter(action => action.title !== "New Tender" || isTenderingTeam)
                            .map((action) => (
                            <QuickActionCard
                                key={action.title}
                                {...action}
                                onClick={() => action?.path && navigate(action.path)}
                            />
                        ))}
                    </div>
                </div>
                {/* Notice Board & Circulars Section */}
                <div className="col-span-1 md:col-span-1">
                    <CircularsWidget />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {/* Calendar Section */}
                <div className="col-span-1 md:col-span-2">
                    <DashboardCalendar />                    
                </div>

                {/* Soon Expiring Timers */}
                <div className="col-span-1 md:col-span-1">
                    <SoonExpiringTimers />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;