import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronDown, Play, Search, Users } from "lucide-react";
import { getInitials, getUserStats } from "../helpers/training.utils";
import type { LearnerProgress } from "@/services/api/training.service";

interface LearnerProgressAccordionProps {
    groupedProgress: Record<string, { dept: string; items: LearnerProgress[] }>;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    deptFilter: string;
    onDeptFilterChange: (value: string) => void;
    departments: string[];
    expandedUsers: string[];
    onToggleUser: (userName: string) => void;
}

const LearnerProgressAccordion = ({
    groupedProgress,
    searchQuery,
    onSearchChange,
    deptFilter,
    onDeptFilterChange,
    departments,
    expandedUsers,
    onToggleUser,
}: LearnerProgressAccordionProps) => {
    const userEntries = Object.entries(groupedProgress);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 sm:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9 h-10 w-full rounded-xl"
                    />
                </div>
                <Select value={deptFilter} onValueChange={onDeptFilterChange}>
                    <SelectTrigger className="w-[180px] h-10 rounded-xl">
                        <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                        {departments.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                                {dept === "All" ? "All Departments" : dept}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {userEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                        <Users className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">No learner records found</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Assign courses to employees to track their progress</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {userEntries.map(([userName, { dept, items }]) => {
                        const isExpanded = expandedUsers.includes(userName);
                        const stats = getUserStats(items);
                        const initials = getInitials(userName);

                        return (
                            <Card
                                key={userName}
                                className={cn(
                                    "border shadow-sm rounded-2xl overflow-hidden transition-colors",
                                    isExpanded ? "border-primary/20" : ""
                                )}
                            >
                                <button
                                    onClick={() => onToggleUser(userName)}
                                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-muted/5 transition-colors text-left"
                                >
                                    <div className={cn(
                                        "h-11 w-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0",
                                        isExpanded
                                            ? "bg-primary/15 text-primary border border-primary/20"
                                            : "bg-muted/30 text-muted-foreground border border-border/30"
                                    )}>
                                        {initials}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-sm">{userName}</h3>
                                            <Badge variant="outline" className="text-[9px] font-semibold px-2 py-0 rounded-md">
                                                {dept}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-[10px] text-muted-foreground font-medium">
                                                {stats.completed}/{stats.total} completed
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-medium">
                                                Avg: {stats.avgProgress}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="hidden sm:flex items-center gap-3">
                                        <div className="w-24">
                                            <Progress
                                                value={stats.avgProgress}
                                                className={cn("h-1.5 rounded-full", stats.avgProgress === 100 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-primary")}
                                            />
                                        </div>
                                        <span className="text-xs font-bold w-10 text-right">{stats.avgProgress}%</span>
                                    </div>

                                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                                </button>

                                {isExpanded && (
                                    <div className="px-5 pb-4 pt-1 border-t">
                                        <div className="space-y-2 mt-3">
                                            {items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className={cn(
                                                        "flex items-center gap-4 p-3.5 rounded-xl border",
                                                        item.status === "Completed"
                                                            ? "bg-emerald-500/[0.03] border-emerald-500/10"
                                                            : "bg-background/50 border-border/20"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0",
                                                        item.status === "Completed" ? "bg-emerald-500/10" : "bg-primary/10"
                                                    )}>
                                                        {item.status === "Completed" ? (
                                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                        ) : (
                                                            <Play className="h-4 w-4 text-primary" />
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold truncate">{item.videoTitle}</p>
                                                        <div className="flex items-center gap-3 mt-1.5">
                                                            <div className="flex-1 max-w-[200px]">
                                                                <Progress
                                                                    value={item.progress}
                                                                    className={cn(
                                                                        "h-1.5 rounded-full",
                                                                        item.progress === 100 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-primary"
                                                                    )}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-muted-foreground w-8">{item.progress}%</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                        {item.status === "Completed" ? (
                                                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded-md font-bold">
                                                                Completed
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px] px-2 py-0.5 rounded-md font-bold">
                                                                In Progress
                                                            </Badge>
                                                        )}
                                                        {item.completedAt && (
                                                            <span className="text-[9px] text-muted-foreground/70">{item.completedAt}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default LearnerProgressAccordion;
