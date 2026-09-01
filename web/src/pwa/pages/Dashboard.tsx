import { useNavigate } from "react-router-dom";
import { QuickActionCard } from "@/modules/dashboard/components/QuickActionCard";
import { pwaNavItems } from "../nav";

export default function Dashboard() {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-sm text-muted-foreground">Pick a module to get started</p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {pwaNavItems.map(item => (
                    <QuickActionCard
                        key={item.title}
                        title={item.title}
                        subtitle={item.subtitle}
                        icon={item.icon}
                        color={item.color}
                        bgColor={item.bgColor}
                        onClick={() => navigate(item.url)}
                    />
                ))}
            </div>
        </div>
    );
}
