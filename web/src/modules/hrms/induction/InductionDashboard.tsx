import React, { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Users,
  Clock,
  CheckCircle2,
  CircleDashed,
  ArrowUpDown,
  ClipboardList,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TASKS,
  computeInductionStats,
  getInductionStatus,
  mapApiEmployee,
  mapApiTask,
} from "./helpers/induction.helpers";
import type { EmployeeInduction, EmployeeInductionTab, InductionTask } from "./helpers/induction.helpers";
import {
  useInductionTrackerList,
  useEmployeeInduction,
  useUpdateInductionTask,
  useStaggeredEntrance,
} from "@/hooks/api/useInduction";
import { StyleInjector } from "./components/ui-bits";
import { EmployeeRow } from "./components/EmployeeRow";
import { EmployeeInductionModal } from "./components/EmployeeInductionModal";
import { EmptyState, ErrorState } from "./components/state-views";
import { Legend } from "./components/Legend";
import { EmployeeRowSkeleton } from "./components/skeletons";

const InductionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EmployeeInductionTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "progress" | "joined" | "pending">("pending");
  const [viewEmployee, setViewEmployee] = useState<EmployeeInduction | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [remarkSavingTaskId, setRemarkSavingTaskId] = useState<string | null>(null);

  // ── API ───────────────────────────────────────────────────────────────────
  const {
    data: rawTracker,
    isLoading: isLoadingTracker,
    isError: isTrackerError,
    refetch: refetchTracker,
  } = useInductionTrackerList();

  const { data: rawEmployeeTasks, isLoading: isLoadingTasks } = useEmployeeInduction(
    viewOpen && viewEmployee ? viewEmployee.id : null
  );

  const activeOnboardingId = viewEmployee?.id ?? 0;
  const { mutate: updateTask } = useUpdateInductionTask(activeOnboardingId);

  // ── Derived data ──────────────────────────────────────────────────────────
  const employees: EmployeeInduction[] = useMemo(() => {
    if (!rawTracker) return [];
    return rawTracker.map(mapApiEmployee);
  }, [rawTracker]);

  const liveTasks: InductionTask[] | undefined = useMemo(() => {
    if (!rawEmployeeTasks) return undefined;
    return rawEmployeeTasks.map(mapApiTask);
  }, [rawEmployeeTasks]);

  // ── Global stats ──────────────────────────────────────────────────────────
  const globalStats = useMemo(() => {
    const perEmpTotal = DEFAULT_TASKS.length;
    const totalTasks = employees.length * perEmpTotal;
    const completedTasks = employees.reduce(
      (acc, e) => acc + e.tasks.filter((t) => t.status === "completed").length,
      0
    );
    const pendingTasks = totalTasks - completedTasks;
    const fullyDone = employees.filter((e) => {
      if (e.tasks.length === 0) return false;
      return computeInductionStats(e.tasks).pct === 100;
    }).length;
    return { totalTasks, completedTasks, pendingTasks, fullyDone };
  }, [employees]);

  // ── Tab counts ─────────────────────────────────────────────────────────────
  const tabCounts = useMemo(
    () => ({
      all: employees.length,
      not_started: employees.filter((e) => getInductionStatus(e) === "not_started").length,
      in_progress: employees.filter((e) => getInductionStatus(e) === "in_progress").length,
      completed: employees.filter((e) => getInductionStatus(e) === "completed").length,
    }),
    [employees]
  );

  // ── Filtered & sorted list ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = employees.filter((e) => {
      const matchTab = activeTab === "all" || getInductionStatus(e) === activeTab;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q);
      return matchTab && matchSearch;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "name")
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      if (sortBy === "progress") {
        const statsA = computeInductionStats(a.tasks.length > 0 ? a.tasks : DEFAULT_TASKS);
        const statsB = computeInductionStats(b.tasks.length > 0 ? b.tasks : DEFAULT_TASKS);
        return statsB.pct - statsA.pct;
      }
      if (sortBy === "joined")
        return new Date(a.dateOfJoining).getTime() - new Date(b.dateOfJoining).getTime();
      if (sortBy === "pending") {
        const pendA = a.tasks.length > 0 ? computeInductionStats(a.tasks).pending : DEFAULT_TASKS.length;
        const pendB = b.tasks.length > 0 ? computeInductionStats(b.tasks).pending : DEFAULT_TASKS.length;
        return pendB - pendA;
      }
      return 0;
    });

    return list;
  }, [employees, activeTab, searchQuery, sortBy]);

  const visibleItems = useStaggeredEntrance(filtered.length, 40);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleToggleTask = useCallback(
    (task: InductionTask) => {
      if (!viewEmployee) return;
      const newStatus = task.status === "completed" ? "pending" : "completed";
      setTogglingTaskId(task.id);
      updateTask(
        { taskId: Number(task.id), updates: { status: newStatus } },
        { onSettled: () => setTogglingTaskId(null) }
      );
    },
    [viewEmployee, updateTask]
  );

  const handleSaveRemark = useCallback(
    (taskId: string, remark: string) => {
      if (!viewEmployee) return;
      setRemarkSavingTaskId(taskId);
      updateTask(
        { taskId: Number(taskId), updates: { remarks: remark } },
        { onSettled: () => setRemarkSavingTaskId(null) }
      );
    },
    [viewEmployee, updateTask]
  );

  const tabs: { value: EmployeeInductionTab; label: string; icon: React.ElementType }[] = [
    { value: "all", label: "All", icon: Users },
    { value: "not_started", label: "Not Started", icon: CircleDashed },
    { value: "in_progress", label: "In Progress", icon: Activity },
    { value: "completed", label: "Completed", icon: CheckCircle2 },
  ];

  return (
    <TooltipProvider>
      <StyleInjector />
      <Card className="flex flex-col h-full min-h-0 rounded-2xl border-border/50 shadow-sm">
        {/* ── Header ── */}
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-5 flex-wrap">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2.5 text-lg tracking-tight">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-4.5 w-4.5 text-primary" />
              </div>
              Induction Tracker
            </CardTitle>
            <CardDescription className="text-sm">
              Track onboarding induction tasks for new joiners
            </CardDescription>
          </div>
          {!isLoadingTracker && globalStats.pendingTasks > 0 && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/15 border border-amber-200/50 dark:border-amber-800/25 text-xs ind-fade-in">
              <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-amber-800 dark:text-amber-300 font-medium">
                {globalStats.pendingTasks} task{globalStats.pendingTasks > 1 ? "s" : ""} pending
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 min-h-0 flex flex-col gap-5">
          {/* ── Toolbar ── */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as EmployeeInductionTab)}
              >
                <TabsList className="h-10 p-1 rounded-xl bg-muted/50">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="gap-1.5 text-xs px-3.5 rounded-lg data-[state=active]:shadow-sm transition-all"
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span
                        className={cn(
                          "ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold tabular-nums transition-colors",
                          activeTab === tab.value
                            ? "bg-background text-foreground shadow-sm"
                            : "bg-muted/60 text-muted-foreground"
                        )}
                      >
                        {isLoadingTracker ? "—" : tabCounts[tab.value]}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="h-9 w-40 text-xs rounded-xl">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Most pending</SelectItem>
                    <SelectItem value="progress">Progress</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="joined">Joining date</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-9 h-9 text-sm rounded-xl"
                    placeholder="Search name, ID, role…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <Legend />
              <p className="text-xs text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">
                  {isLoadingTracker ? "—" : filtered.length}
                </span>{" "}
                of {isLoadingTracker ? "—" : employees.length} employees
              </p>
            </div>
          </div>

          {/* ── Column Headers ── */}
          <div className="hidden lg:flex items-center gap-3 px-5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
            <div className="flex-1">Employee</div>
            <div className="w-44">Phase Progress</div>
            <div className="w-24 text-center">Progress</div>
            <div className="w-24 text-center">Required</div>
            <div className="w-24">Joining</div>
            <div className="w-8" />
          </div>

          {/* ── List ── */}
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
            {isLoadingTracker ? (
              <div className="space-y-2.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <EmployeeRowSkeleton key={i} />
                ))}
              </div>
            ) : isTrackerError ? (
              <ErrorState onRetry={refetchTracker} />
            ) : filtered.length === 0 ? (
              <EmptyState search={searchQuery} tab={activeTab} />
            ) : (
              <div className="space-y-2">
                {filtered.map((emp, idx) => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    index={idx}
                    isVisible={visibleItems.has(idx)}
                    onView={(e) => {
                      setViewEmployee(e);
                      setViewOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>

        {/* ── Modal ── */}
        <EmployeeInductionModal
          employee={viewEmployee}
          open={viewOpen}
          onClose={() => {
            setViewOpen(false);
            setViewEmployee(null);
            setTogglingTaskId(null);
          }}
          liveTasks={liveTasks}
          isLoadingTasks={isLoadingTasks}
          togglingTaskId={togglingTaskId}
          onToggleTask={handleToggleTask}
          onSaveRemark={handleSaveRemark}
          isRemarkLoading={remarkSavingTaskId !== null}
        />
      </Card>
    </TooltipProvider>
  );
};

export default InductionDashboard;
