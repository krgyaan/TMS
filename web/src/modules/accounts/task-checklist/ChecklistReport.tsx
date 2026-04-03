// src/pages/accounts/checklist/ChecklistReport.tsx

import React, { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from "date-fns";

import { useChecklistTasks } from "@/modules/accounts/task-checklist/task-checklist.hooks";
import { useAuth } from "@/contexts/AuthContext";
import { useGetTeamMembers } from "@/hooks/api/useUsers"; 
import type { DayResult } from "@/modules/accounts/task-checklist/task-checklist.types";
import { cn } from "@/lib/utils";

// Types
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

// Calendar Day Component
interface CalendarDayProps {
    date: Date;
    dayData?: DayResult;
    isSelected: boolean;
    onClick: () => void;
}

const CalendarDay: React.FC<CalendarDayProps> = ({ date, dayData, isSelected, onClick }) => {
    const percentage = dayData?.percentage ?? 0;
    const hasTasks = dayData && dayData.total > 0;
    const today = isToday(date);

    // Get background gradient based on completion percentage
    const getBackgroundStyle = () => {
        if (!hasTasks) return {};
        return {
            background: `linear-gradient(to top, hsl(var(--primary) / 0.7) ${percentage}%, hsl(var(--muted)) ${percentage}%)`,
        };
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "aspect-square relative flex flex-col items-center justify-center rounded-lg border transition-all",
                "hover:border-primary hover:shadow-sm",
                isSelected && "ring-2 ring-primary ring-offset-2",
                today && !isSelected && "border-primary/50",
                !hasTasks && "bg-muted/30"
            )}
            style={getBackgroundStyle()}
        >
            <span
                className={cn(
                    "text-sm font-semibold",
                    today && "text-primary",
                    hasTasks && percentage >= 50 && "text-primary-foreground"
                )}
            >
                {format(date, "d")}
            </span>

            {hasTasks && (
                <span
                    className={cn(
                        "absolute top-1 right-1 text-[10px] font-bold",
                        percentage >= 50 ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}
                >
                    {percentage}%
                </span>
            )}

            {hasTasks && (
                <span
                    className={cn(
                        "text-[10px]",
                        percentage >= 50 ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}
                >
                    {dayData.completed}/{dayData.total}
                </span>
            )}
        </button>
    );
};

// Empty Calendar Day
const EmptyCalendarDay: React.FC = () => (
    <div className="aspect-square" />
);

// Task Table Component
interface TaskTableProps {
    tasks: TaskReport[];
    emptyMessage: string;
}

const TaskTable: React.FC<TaskTableProps> = ({ tasks, emptyMessage }) => {
    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-semibold text-sm">Task Name</th>
                        <th className="text-left p-3 font-semibold text-sm">Remark</th>
                        <th className="text-left p-3 font-semibold text-sm">Status</th>
                        <th className="text-left p-3 font-semibold text-sm">Completed At</th>
                        <th className="text-left p-3 font-semibold text-sm">File</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map((task, index) => (
                        <tr key={`${task.id}-${index}`} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                                <div>
                                    <p className="text-sm font-medium">{task.task_name}</p>
                                    <p className="text-xs text-muted-foreground">{task.frequency}</p>
                                </div>
                            </td>
                            <td className="p-3 max-w-xs">
                                <p className="text-sm truncate" title={task.remark || ""}>
                                    {task.remark || (
                                        <span className="text-muted-foreground italic">No remark</span>
                                    )}
                                </p>
                            </td>
                            <td className="p-3">
                                {task.completed_at ? (
                                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Completed
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Pending
                                    </Badge>
                                )}
                            </td>
                            <td className="p-3 text-sm">
                                {task.completed_at || (
                                    <span className="text-muted-foreground">-</span>
                                )}
                            </td>
                            <td className="p-3">
                                {task.result_file ? (
                                    <a
                                        href={`/uploads/checklist/${task.result_file}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:underline"
                                    >
                                        View File
                                    </a>
                                ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Month Picker Component
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

    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[140px] text-center">
                <input
                    type="month"
                    value={format(value, "yyyy-MM")}
                    onChange={(e) => {
                        const [year, month] = e.target.value.split("-");
                        onChange(new Date(parseInt(year), parseInt(month) - 1, 1));
                    }}
                    className="bg-transparent border-none text-center font-semibold cursor-pointer focus:outline-none"
                />
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
};

// Loading Skeleton for Calendar
const CalendarSkeleton: React.FC = () => (
    <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
    </div>
);

// Main Component
const ChecklistReport: React.FC = () => {
    const { userId: paramUserId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { user, isAdmin, isSuperUser } = useAuth();

    const isAdminUser = isAdmin || isSuperUser;

    // State
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [selectedUserId, setSelectedUserId] = useState<string>(
        paramUserId || user?.id?.toString() || ""
    );

    // Fetch users for admin dropdown
    const { data: usersData } = useGetTeamMembers(5);

    // Fetch tasks data
    const monthStr = format(currentMonth, "yyyy-MM");
    const { data: tasksData, isLoading, isError } = useChecklistTasks(
        { user: selectedUserId, month: monthStr },
        !!selectedUserId
    );

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });

        // Add empty days for alignment
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
        if (!tasksData) return { totalTasks: 0, completedTasks: 0, avgPercentage: 0 };

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
            avgPercentage: daysWithTasks > 0 ? Math.round(percentageSum / daysWithTasks) : 0,
        };
    }, [tasksData]);

    // Weekday headers
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>

            {/* Filters Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle>Account Checklists Report</CardTitle>
                    <CardDescription>
                        View task completion status by day for any team member
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isAdminUser && (
                    <div className="flex flex-wrap items-end gap-4">
                        {/* User Select (Admin only) */}
                        {isAdminUser ? (
                            <div className="space-y-2 min-w-[200px]">
                                <Label htmlFor="user-select">Team Member</Label>
                                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                    <SelectTrigger id="user-select">
                                        <SelectValue placeholder="Select member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {usersData?.map((u: any) => (
                                            <SelectItem key={u.id} value={u.id.toString()}>
                                                {u.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>Team Member</Label>
                                <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                                    <span className="text-sm font-medium">{user?.name}</span>
                                </div>
                            </div>
                        )}

                        {/* Month Picker */}
                        <div className="space-y-2">
                            <Label>Month</Label>
                            <MonthPicker value={currentMonth} onChange={setCurrentMonth} />
                        </div>
                    </div>
                    )}
                </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Calendar className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Tasks</p>
                                <p className="text-2xl font-bold">{monthlyStats.totalTasks}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Completed</p>
                                <p className="text-2xl font-bold">{monthlyStats.completedTasks}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Avg. Completion</p>
                                <p className="text-2xl font-bold">{monthlyStats.avgPercentage}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Calendar and Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <Card className="lg:col-span-1">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg">
                            {format(currentMonth, "MMMM yyyy")}
                        </CardTitle>
                        <CardDescription>Click on a day to view details</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <CalendarSkeleton />
                        ) : (
                            <>
                                {/* Weekday Headers */}
                                <div className="grid grid-cols-7 gap-2 mb-2">
                                    {weekdays.map((day) => (
                                        <div
                                            key={day}
                                            className="text-center text-xs font-semibold text-muted-foreground py-2"
                                        >
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-2">
                                    {/* Empty days */}
                                    {calendarDays.emptyDays.map((_, index) => (
                                        <EmptyCalendarDay key={`empty-${index}`} />
                                    ))}

                                    {/* Actual days */}
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
                                            />
                                        );
                                    })}
                                </div>

                                {/* Legend */}
                                <div className="mt-4 pt-4 border-t">
                                    <p className="text-xs text-muted-foreground mb-2">Completion Legend</p>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1">
                                            <div className="w-4 h-4 rounded bg-muted" />
                                            <span className="text-xs">0%</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div
                                                className="w-4 h-4 rounded"
                                                style={{
                                                    background: "linear-gradient(to top, hsl(var(--primary) / 0.7) 50%, hsl(var(--muted)) 50%)",
                                                }}
                                            />
                                            <span className="text-xs">50%</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-4 h-4 rounded bg-primary/70" />
                                            <span className="text-xs">100%</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Day Details */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            Report for{" "}
                            <Badge variant="outline" className="text-base font-normal">
                                {format(selectedDate, "EEEE, MMMM d, yyyy")}
                            </Badge>
                        </CardTitle>
                        {selectedDayData && selectedDayData.total > 0 && (
                            <CardDescription>
                                {selectedDayData.completed} of {selectedDayData.total} tasks completed (
                                {selectedDayData.percentage}%)
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="responsibility">
                            <TabsList className="w-full grid grid-cols-2 mb-4">
                                <TabsTrigger value="responsibility" className="flex items-center gap-2">
                                    Responsibility
                                    <Badge variant="secondary" className="ml-1">
                                        {responsibilityTasks.length}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger value="accountability" className="flex items-center gap-2">
                                    Accountability
                                    <Badge variant="secondary" className="ml-1">
                                        {accountabilityTasks.length}
                                    </Badge>
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="responsibility">
                                <TaskTable
                                    tasks={responsibilityTasks}
                                    emptyMessage="No responsibility tasks for this day"
                                />
                            </TabsContent>

                            <TabsContent value="accountability">
                                <TaskTable
                                    tasks={accountabilityTasks}
                                    emptyMessage="No accountability tasks for this day"
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