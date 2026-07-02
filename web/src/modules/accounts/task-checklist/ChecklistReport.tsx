// src/pages/accounts/checklist/ChecklistReport.tsx

import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
    ArrowLeft, 
    Calendar, 
    ChevronLeft, 
    ChevronRight, 
    CheckCircle2, 
    Clock, 
    Search,
    X,
    FileText,
    TrendingUp,
    Target,
    Activity,
    User,
    ChevronsLeft,
    ChevronsRight,
    ExternalLink,
    AlertCircle
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, isBefore, isAfter } from "date-fns";

import { useChecklistTasks } from "@/modules/accounts/task-checklist/task-checklist.hooks";
import { useAuth } from "@/contexts/AuthContext";
import { useGetTeamMembers } from "@/hooks/api/useUsers";
import type { DayResult } from "@/modules/accounts/task-checklist/task-checklist.types";
import { cn } from "@/lib/utils";

// ==================== Types ====================
interface TaskReport {
    id: number;
    task_name: string;
    frequency: string;
    responsible_user?: string;
    responsible_user_id: string;
    accountable_user?: string;
    accountable_user_id: string;
    completed_at?: string | null;
    remark?: string | null;
    result_file?: string | null;
}

// ==================== Circular Progress Component ====================
interface CircularProgressProps {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    className?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({ 
    percentage, 
    size = 36, 
    strokeWidth = 3,
    className 
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className={cn("relative", className)} style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-muted/30"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={cn(
                        "transition-all duration-300",
                        percentage >= 80 ? "text-green-500" :
                        percentage >= 50 ? "text-primary" :
                        percentage > 0 ? "text-amber-500" : "text-muted"
                    )}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold">{percentage}%</span>
            </div>
        </div>
    );
};

// ==================== Calendar Day Component ====================
interface CalendarDayProps {
    date: Date;
    dayData?: DayResult;
    isSelected: boolean;
    onClick: () => void;
    isCurrentMonth: boolean;
}

const CalendarDay: React.FC<CalendarDayProps> = ({ date, dayData, isSelected, onClick, isCurrentMonth }) => {
    const percentage = dayData?.percentage ?? 0;
    const hasTasks = dayData && dayData.total > 0;
    const today = isToday(date);
    const isPast = isBefore(date, new Date()) && !today;
    const isFuture = isAfter(date, new Date());

    const getStatusColor = () => {
        if (!hasTasks) return "bg-muted/20";
        if (percentage === 100) return "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800";
        if (percentage >= 50) return "bg-primary/5 border-primary/30";
        if (percentage > 0) return "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800";
        return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
    };

    const getStatusIndicator = () => {
        if (!hasTasks) return null;
        if (percentage === 100) return <CheckCircle2 className="h-3 w-3 text-green-500" />;
        if (percentage === 0 && isPast) return <AlertCircle className="h-3 w-3 text-red-500" />;
        return null;
    };

    return (
        <button
            onClick={onClick}
            disabled={!isCurrentMonth}
            className={cn(
                "relative flex flex-col items-center justify-center p-1 rounded-xl border-2 transition-all duration-200 min-h-[72px]",
                "hover:shadow-md hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/50",
                isSelected && "ring-2 ring-primary ring-offset-2 shadow-lg",
                today && "border-primary",
                !isCurrentMonth && "opacity-30 cursor-not-allowed",
                getStatusColor()
            )}
        >
            {/* Date Number */}
            <span className={cn(
                "text-sm font-semibold mb-1",
                today && "text-primary",
                !hasTasks && "text-muted-foreground"
            )}>
                {format(date, "d")}
            </span>

            {/* Progress Indicator */}
            {hasTasks ? (
                <div className="flex flex-col items-center gap-0.5">
                    <CircularProgress percentage={percentage} size={32} strokeWidth={3} />
                    <span className="text-[9px] text-muted-foreground font-medium">
                        {dayData.completed}/{dayData.total}
                    </span>
                </div>
            ) : (
                <div className="h-10 flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">No tasks</span>
                </div>
            )}

            {/* Status Indicator */}
            <div className="absolute top-1 right-1">
                {getStatusIndicator()}
            </div>

            {/* Today Indicator */}
            {today && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                    <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        TODAY
                    </span>
                </div>
            )}
        </button>
    );
};

// ==================== Empty Calendar Day ====================
const EmptyCalendarDay: React.FC = () => (
    <div className="min-h-[72px]" />
);

// ==================== Pagination Component ====================
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (items: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
}) => {
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Show</span>
                <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => onItemsPerPageChange(Number(value))}
                >
                    <SelectTrigger className="h-8 w-[65px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {[5, 10, 20].map((size) => (
                            <SelectItem key={size} value={size.toString()}>
                                {size}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span>of {totalItems}</span>
            </div>

            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm">
                    {currentPage} / {totalPages || 1}
                </span>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

// ==================== Search Input ====================
interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder = "Search..." }) => {
    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pl-9 h-9"
            />
            {value && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => onChange("")}
                >
                    <X className="h-3 w-3" />
                </Button>
            )}
        </div>
    );
};

// ==================== Task Card Component ====================
interface TaskCardProps {
    task: TaskReport;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
    const isCompleted = !!task.completed_at;

    return (
        <div className={cn(
            "p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-sm",
            isCompleted 
                ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
                : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
        )}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                            <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        )}
                        <h4 className="font-semibold text-sm truncate">{task.task_name}</h4>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">
                            {task.frequency}
                        </Badge>
                        <Badge variant={isCompleted ? "default" : "secondary"} className={cn(
                            "text-xs",
                            isCompleted && "bg-green-500 hover:bg-green-600"
                        )}>
                            {isCompleted ? "Completed" : "Pending"}
                        </Badge>
                    </div>

                    {task.remark && (
                        <div className="mb-3">
                            <p className="text-xs text-muted-foreground mb-1">Remark</p>
                            <p className="text-sm bg-muted/50 rounded-lg p-2 line-clamp-2">{task.remark}</p>
                        </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {task.completed_at && (
                            <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{task.completed_at}</span>
                            </div>
                        )}
                        {task.result_file && (
                            <a
                                href={`/uploads/checklist/${task.result_file}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline"
                            >
                                <FileText className="h-3 w-3" />
                                <span>View File</span>
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==================== Task List Component ====================
interface TaskListProps {
    tasks: TaskReport[];
    emptyMessage: string;
    emptyIcon?: React.ReactNode;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, emptyMessage, emptyIcon }) => {
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    const filteredTasks = useMemo(() => {
        if (!search) return tasks;
        const searchLower = search.toLowerCase();
        return tasks.filter(t => 
            t.task_name.toLowerCase().includes(searchLower) ||
            t.remark?.toLowerCase().includes(searchLower)
        );
    }, [tasks, search]);

    const paginatedTasks = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredTasks.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredTasks, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                {emptyIcon || <Calendar className="h-16 w-16 mb-4 opacity-30" />}
                <p className="text-sm font-medium">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Search */}
            <SearchInput
                value={search}
                onChange={(value) => {
                    setSearch(value);
                    setCurrentPage(1);
                }}
                placeholder="Search tasks..."
            />

            {/* Task Cards */}
            {filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Search className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm">No matching tasks found</p>
                </div>
            ) : (
                <>
                    <div className="grid gap-3">
                        {paginatedTasks.map((task, index) => (
                            <TaskCard key={`${task.id}-${index}`} task={task} />
                        ))}
                    </div>

                    {/* Pagination */}
                    {filteredTasks.length > itemsPerPage && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredTasks.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={(items) => {
                                setItemsPerPage(items);
                                setCurrentPage(1);
                            }}
                        />
                    )}
                </>
            )}
        </div>
    );
};

// ==================== Stats Card Component ====================
interface StatsCardProps {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: React.ReactNode;
    iconBgClass?: string;
    progress?: number;
    trend?: { value: number; isPositive: boolean };
}

const StatsCard: React.FC<StatsCardProps> = ({ 
    title, 
    value, 
    subtitle, 
    icon, 
    iconBgClass = "bg-primary/10",
    progress,
    trend
}) => {
    return (
        <Card className="overflow-hidden">
            <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                    <div className={cn("p-2.5 rounded-xl", iconBgClass)}>
                        {icon}
                    </div>
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                            trend.isPositive 
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                                : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        )}>
                            <TrendingUp className={cn("h-3 w-3", !trend.isPositive && "rotate-180")} />
                            {trend.value}%
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
                    <p className="text-3xl font-bold tracking-tight">{value}</p>
                    {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
                </div>
                {progress !== undefined && (
                    <div className="mt-4">
                        <Progress value={progress} className="h-2" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// ==================== Month Picker Component ====================
interface MonthPickerProps {
    value: Date;
    onChange: (date: Date) => void;
}

const MonthPicker: React.FC<MonthPickerProps> = ({ value, onChange }) => {
    const handlePrevMonth = () => {
        const newDate = new Date(value);
        newDate.setMonth(newDate.getMonth() - 1);
        onChange(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(value);
        newDate.setMonth(newDate.getMonth() + 1);
        onChange(newDate);
    };

    const handleToday = () => {
        onChange(new Date());
    };

    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="relative">
                <input
                    type="month"
                    value={format(value, "yyyy-MM")}
                    onChange={(e) => {
                        const [year, month] = e.target.value.split("-");
                        onChange(new Date(parseInt(year), parseInt(month) - 1, 1));
                    }}
                    className="h-9 px-3 rounded-lg border bg-background text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" className="h-9" onClick={handleToday}>
                Today
            </Button>
        </div>
    );
};

// ==================== Loading Skeleton ====================
const CalendarSkeleton: React.FC = () => (
    <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="min-h-[72px] rounded-xl" />
        ))}
    </div>
);

// ==================== Main Component ====================
const ChecklistReport: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, isAdmin, isSuperUser } = useAuth();

    const isAdminUser = isAdmin || isSuperUser;

    // State
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [selectedUserId, setSelectedUserId] = useState<string>(
        isAdminUser
            ? id || ""
            : user?.id?.toString() || ""
    );

    // Fetch users for admin dropdown
    const { data: usersData } = useGetTeamMembers(5);

    // Fetch tasks data
    const monthStr = format(currentMonth, "yyyy-MM");
    const { data: tasksData, isLoading, isError } = useChecklistTasks(
        { user: selectedUserId, month: monthStr },
        !!selectedUserId
    );

    console.log("checklist data" , tasksData);

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });
        const startDayOfWeek = getDay(start);
        const emptyDays = Array(startDayOfWeek).fill(null);
        return { emptyDays, days };
    }, [currentMonth]);

    // Get selected day's data
    const selectedDayKey = format(selectedDate, "yyyy-MM-dd");
    const selectedDayData = tasksData?.[selectedDayKey];

    // Filter tasks for the selected user
    const responsibilityTasks = useMemo(() => {
        if (!selectedDayData) return [];
        return selectedDayData.tasks.filter(
            (task) => task.responsible_user_id === selectedUserId
        );
    }, [selectedDayData, selectedUserId]);

    const accountabilityTasks = useMemo(() => {
        if (!selectedDayData) return [];
        return selectedDayData.accountability_tasks || [];
    }, [selectedDayData]);

    // Calculate monthly stats
    const monthlyStats = useMemo(() => {
        if (!tasksData) return { totalTasks: 0, completedTasks: 0, avgPercentage: 0, pendingTasks: 0 };

        let totalTasks = 0;
        let completedTasks = 0;
        let daysWithTasks = 0;
        let percentageSum = 0;

        Object.values(tasksData).forEach((day) => {
            if (day.total > 0) {
                totalTasks += day.total;
                completedTasks += day.completed;
                daysWithTasks++;
                percentageSum += day.percentage;
            }
        });

        return {
            totalTasks,
            completedTasks,
            pendingTasks: totalTasks - completedTasks,
            avgPercentage: daysWithTasks > 0 ? Math.round(percentageSum / daysWithTasks) : 0,
        };
    }, [tasksData]);

    // Get selected user name
    const selectedUserName = useMemo(() => {
        if (!isAdminUser) return user?.name || "";
        const selectedUser = usersData?.find((u: any) => u.id.toString() === selectedUserId);
        return selectedUser?.name || "";
    }, [isAdminUser, usersData, selectedUserId, user?.name]);

    // Weekday headers
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Checklist Report</h1>
                        <p className="text-sm text-muted-foreground">
                            Track task completion and performance
                        </p>
                    </div>
                </div>

                {selectedUserName && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{selectedUserName}</span>
                    </div>
                )}
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-end gap-4">
                        {/* User Select (Admin only) */}
                        {isAdminUser && (
                            <div className="space-y-2 min-w-[220px]">
                                <Label htmlFor="user-select" className="text-xs font-medium text-muted-foreground">
                                    TEAM MEMBER
                                </Label>
                                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                    <SelectTrigger id="user-select" className="h-10">
                                        <SelectValue placeholder="Select member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {usersData?.map((u: any) => (
                                            <SelectItem key={u.id} value={u.id.toString()}>
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    {u.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Month Picker */}
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">MONTH</Label>
                            <MonthPicker value={currentMonth} onChange={setCurrentMonth} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Tasks"
                    value={monthlyStats.totalTasks}
                    subtitle={`For ${format(currentMonth, "MMMM yyyy")}`}
                    icon={<Target className="h-5 w-5 text-primary" />}
                    iconBgClass="bg-primary/10"
                />
                <StatsCard
                    title="Completed"
                    value={monthlyStats.completedTasks}
                    subtitle={`${monthlyStats.avgPercentage}% completion rate`}
                    icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
                    iconBgClass="bg-green-100 dark:bg-green-900/30"
                    progress={monthlyStats.avgPercentage}
                />
                <StatsCard
                    title="Pending"
                    value={monthlyStats.pendingTasks}
                    subtitle="Tasks remaining"
                    icon={<Clock className="h-5 w-5 text-amber-600" />}
                    iconBgClass="bg-amber-100 dark:bg-amber-900/30"
                />
                <StatsCard
                    title="Avg. Completion"
                    value={`${monthlyStats.avgPercentage}%`}
                    subtitle="Daily average"
                    icon={<Activity className="h-5 w-5 text-blue-600" />}
                    iconBgClass="bg-blue-100 dark:bg-blue-900/30"
                />
            </div>

            {/* Calendar and Details Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Calendar */}
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">
                                    {format(currentMonth, "MMMM yyyy")}
                                </CardTitle>
                                <CardDescription>Click a day to view task details</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <CalendarSkeleton />
                        ) : (
                            <>
                                {/* Weekday Headers */}
                                <div className="grid grid-cols-7 gap-2 mb-3">
                                    {weekdays.map((day) => (
                                        <div
                                            key={day}
                                            className="text-center text-xs font-bold text-muted-foreground py-2 uppercase tracking-wider"
                                        >
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-2">
                                    {calendarDays.emptyDays.map((_, index) => (
                                        <EmptyCalendarDay key={`empty-${index}`} />
                                    ))}

                                    {calendarDays.days.map((date) => {
                                        const dateKey = format(date, "yyyy-MM-dd");
                                        const dayData = tasksData?.[dateKey];

                                        return (
                                            <CalendarDay
                                                key={dateKey}
                                                date={date}
                                                dayData={dayData}
                                                isSelected={isSameDay(date, selectedDate)}
                                                onClick={() => setSelectedDate(date)}
                                                isCurrentMonth={true}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Legend */}
                                <div className="mt-6 pt-4 border-t">
                                    <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                                        Completion Legend
                                    </p>
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full border-2 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800" />
                                            <span className="text-xs">100%</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full border-2 bg-primary/5 border-primary/30" />
                                            <span className="text-xs">50-99%</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full border-2 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800" />
                                            <span className="text-xs">1-49%</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full border-2 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800" />
                                            <span className="text-xs">0%</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full border-2 bg-muted/20" />
                                            <span className="text-xs">No tasks</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Day Details */}
                <Card>
                    <CardHeader className="pb-4 border-b">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <CardTitle className="text-lg">
                                    {format(selectedDate, "EEEE, MMMM d")}
                                </CardTitle>
                                {selectedDayData && selectedDayData.total > 0 ? (
                                    <CardDescription className="flex items-center gap-2 mt-1">
                                        <span>{selectedDayData.completed}/{selectedDayData.total} tasks completed</span>
                                        <Badge variant={selectedDayData.percentage === 100 ? "default" : "secondary"} className={cn(
                                            selectedDayData.percentage === 100 && "bg-green-500"
                                        )}>
                                            {selectedDayData.percentage}%
                                        </Badge>
                                    </CardDescription>
                                ) : (
                                    <CardDescription>No tasks scheduled</CardDescription>
                                )}
                            </div>
                            {selectedDayData && selectedDayData.total > 0 && (
                                <CircularProgress 
                                    percentage={selectedDayData.percentage} 
                                    size={56} 
                                    strokeWidth={4} 
                                />
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <Tabs defaultValue="responsibility">
                            <TabsList className="w-full grid grid-cols-2 mb-4">
                                <TabsTrigger value="responsibility" className="flex items-center gap-2">
                                    Responsibility
                                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                                        {responsibilityTasks.length}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger value="accountability" className="flex items-center gap-2">
                                    Accountability
                                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                                        {accountabilityTasks.length}
                                    </Badge>
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="responsibility" className="mt-0">
                                <TaskList
                                    tasks={responsibilityTasks}
                                    emptyMessage="No responsibility tasks for this day"
                                    emptyIcon={<CheckCircle2 className="h-16 w-16 text-green-500/30 mb-4" />}
                                />
                            </TabsContent>

                            <TabsContent value="accountability" className="mt-0">
                                <TaskList
                                    tasks={accountabilityTasks}
                                    emptyMessage="No accountability tasks for this day"
                                    emptyIcon={<CheckCircle2 className="h-16 w-16 text-green-500/30 mb-4" />}
                                />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ChecklistReport;