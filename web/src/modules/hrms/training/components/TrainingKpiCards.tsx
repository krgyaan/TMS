import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Film, Eye, TrendingUp, Users } from "lucide-react";

interface KpiData {
    totalCourses: number;
    totalViews: number;
    avgCompletion: number;
    activeLearners: number;
}

const kpiConfig = [
    { label: "Total Courses", key: "totalCourses" as const, icon: Film, color: "text-blue-500", bgColor: "bg-blue-500/10", desc: "Active video courses" },
    { label: "Total Views", key: "totalViews" as const, icon: Eye, color: "text-violet-500", bgColor: "bg-violet-500/10", desc: "Cumulative watch sessions" },
    { label: "Avg. Completion", key: "avgCompletion" as const, icon: TrendingUp, color: "text-emerald-500", bgColor: "bg-emerald-500/10", desc: "Average learner progress" },
    { label: "Active Learners", key: "activeLearners" as const, icon: Users, color: "text-orange-500", bgColor: "bg-orange-500/10", desc: "Employees in training" },
];

interface TrainingKpiCardsProps {
    kpis: KpiData;
}

const TrainingKpiCards = ({ kpis }: TrainingKpiCardsProps) => {
    const getValue = (key: keyof KpiData) => {
        if (key === "avgCompletion") return `${kpis[key]}%`;
        return kpis[key];
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiConfig.map((kpi) => (
                <Card key={kpi.label} className="border shadow-sm rounded-2xl">
                    <CardContent className="">
                        <div className="flex items-start justify-between">
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
                                    {kpi.label}
                                </p>
                                <p className="text-3xl font-extrabold tracking-tight">
                                    {getValue(kpi.key)}
                                </p>
                                <p className="text-[10px] text-muted-foreground/80">{kpi.desc}</p>
                            </div>
                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", kpi.bgColor)}>
                                <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default TrainingKpiCards;
