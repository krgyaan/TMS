import React, { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  ListChecks,
  ClipboardList,
  Activity,
  AlertTriangle,
  Milestone,
  CheckCheck,
  MoreVertical,
  Briefcase,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDate as formatDateString } from "@/hooks/useFormatedDate";
import {
  DEFAULT_TASKS,
  computeInductionStats,
  getAvatarColor,
  getInitials,
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
import { EmployeeInductionModal, CircularProgress } from "./components/EmployeeInductionModal";
import { WorkDetailsModal } from "./components/WorkDetailsModal";

// ─── CSS Keyframes (injected once) ────────────────────────────────────────────

const StyleInjector: React.FC = () => (
  <style>{`
    @keyframes ind-fade-up {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes ind-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes ind-scale-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes ind-slide-down {
      from { opacity: 0; max-height: 0; }
      to { opacity: 1; max-height: 2000px; }
    }
    @keyframes ind-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes ind-pulse-soft {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    @keyframes ind-check-pop {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    .ind-fade-up {
      animation: ind-fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .ind-fade-in {
      animation: ind-fade-in 0.3s ease forwards;
    }
    .ind-scale-in {
      animation: ind-scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .ind-slide-down {
      animation: ind-slide-down 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      overflow: hidden;
    }
    .ind-check-pop {
      animation: ind-check-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ind-progress-bar {
      transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ind-glass {
      backdrop-filter: blur(12px) saturate(1.5);
      -webkit-backdrop-filter: blur(12px) saturate(1.5);
    }
  `}</style>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const EmployeeRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-border/50 bg-card/50">
    <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
    <div className="flex-1 space-y-2.5">
      <Skeleton className="h-3.5 w-44" />
      <Skeleton className="h-3 w-60" />
    </div>
    <Skeleton className="h-3 w-28 hidden lg:block" />
    <Skeleton className="h-6 w-20 hidden md:block" />
  </div>
);

// ─── States ───────────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ search: string; tab: EmployeeInductionTab }> = ({ search, tab }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center ind-fade-in">
    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
      <ListChecks className="h-8 w-8 text-muted-foreground/40" />
    </div>
    <p className="text-sm font-semibold">
      {search ? "No matching employees" : `No ${tab === "all" ? "" : tab.replace(/_/g, " ")} inductions`}
    </p>
    <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
      {search
        ? `Try adjusting your search — "${search}"`
        : "Approved employees will appear here for induction tracking."}
    </p>
  </div>
);

const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center ind-fade-in">
    <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
      <AlertTriangle className="h-8 w-8 text-destructive/50" />
    </div>
    <p className="text-sm font-semibold">Failed to load induction data</p>
    <p className="text-xs text-muted-foreground mt-1.5 mb-5">
      There was an error fetching data from the server.
    </p>
    <Button variant="outline" size="sm" onClick={onRetry} className="rounded-xl">
      Try Again
    </Button>
  </div>
);

// ─── Legend ───────────────────────────────────────────────────────────────────

const Legend: React.FC = () => (
  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
    <div className="flex items-center gap-1">
      <Milestone className="h-3 w-3" />
      <span className="text-[10px]">Before</span>
    </div>
    <div className="flex items-center gap-1">
      <CheckCheck className="h-3 w-3" />
      <span className="text-[10px]">After</span>
    </div>
  </div>
);

// ─── Phase Mini Progress ──────────────────────────────────────────────────────

const PhaseMiniBar: React.FC<{
  label: string;
  completed: number;
  total: number;
  icon: React.ElementType;
}> = ({ label, completed, total, icon: Icon }) => {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-default min-w-0">
            <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <div className="w-16 h-1.5 rounded-full bg-muted/60 overflow-hidden flex-shrink-0">
              <div
                className={cn(
                  "h-full rounded-full ind-progress-bar",
                  pct === 100
                    ? "bg-emerald-500"
                    : pct > 0
                    ? "bg-primary"
                    : "bg-muted-foreground/15"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground w-7 text-right flex-shrink-0">
              {pct}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{label}</p>
          <p className="text-muted-foreground">{completed}/{total} tasks</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ─── Employee Row ─────────────────────────────────────────────────────────────

const EmployeeRow: React.FC<{
  employee: EmployeeInduction;
  onView: (e: EmployeeInduction) => void;
  onWorkDetails: (e: EmployeeInduction) => void;
  index: number;
  isVisible: boolean;
}> = ({ employee, onView, onWorkDetails, index, isVisible }) => {
  const displayTasks = employee.tasks.length > 0 ? employee.tasks : DEFAULT_TASKS;
  const stats = computeInductionStats(displayTasks);
  const status = getInductionStatus(employee);

  return (
    <div
      className={cn(
        "group relative flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 rounded-2xl border border-border/40 bg-card/80 transition-all duration-300 cursor-pointer",
        "hover:bg-muted/40 hover:border-border/80 hover:shadow-md hover:shadow-black/[0.03] dark:hover:shadow-white/[0.02]",
        isVisible ? "ind-fade-up" : "opacity-0"
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={() => onView(employee)}
    >
      {/* Avatar + Info */}
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          <Avatar className="h-10 w-10 rounded-xl flex-shrink-0 ring-2 ring-background shadow-sm">
            {employee.profilePhoto && (
              <AvatarImage src={employee.profilePhoto} alt={`${employee.firstName} ${employee.lastName}`} className="object-cover" />
            )}
            <AvatarFallback
              className={cn(
                "rounded-xl text-xs font-bold",
                getAvatarColor(`${employee.firstName} ${employee.lastName}`)
              )}
            >
              {getInitials(employee.firstName, employee.lastName)}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background transition-colors",
              status === "completed"
                ? "bg-emerald-500"
                : status === "in_progress"
                ? "bg-primary"
                : "bg-muted-foreground/30"
            )}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold leading-none tracking-tight">
              {employee.firstName}{" "}
              {employee.middleName ? `${employee.middleName} ` : ""}
              {employee.lastName}
            </p>
            <span className="text-[10px] font-mono bg-muted/70 text-muted-foreground px-1.5 py-0.5 rounded-md hidden sm:inline border border-border/40">
              {employee.employeeId}
            </span>
          </div>
        </div>
      </div>

      {/* Phase Bars */}
      <div className="hidden lg:flex flex-col gap-2 w-44">
        <PhaseMiniBar label="Before Joining" completed={stats.beforeCompleted} total={stats.beforeTasks} icon={Milestone} />
        <PhaseMiniBar label="After Joining" completed={stats.afterCompleted} total={stats.afterTasks} icon={CheckCheck} />
      </div>

      {/* Circular Progress */}
      <div className="flex items-center justify-center gap-3 flex-shrink-0 w-24">
        <CircularProgress value={stats.pct} size={42} strokeWidth={3} />
        <div className="text-right">
          <p className="text-xs font-semibold tabular-nums">{stats.completed}/{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">tasks</p>
        </div>
      </div>

      {/* DOJ */}
      <div className="hidden lg:flex items-center text-xs text-muted-foreground flex-shrink-0 w-24">
        <span className="tabular-nums">{employee.dateOfJoining ? formatDateString(employee.dateOfJoining) : "—"}</span>
      </div>

      {/* Actions */}
      <div
        className="flex items-center justify-center flex-shrink-0 w-12"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={() => onView(employee)}
              className="gap-2 text-xs cursor-pointer"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Induction
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onWorkDetails(employee)}
              className="gap-2 text-xs cursor-pointer"
            >
              <Briefcase className="h-3.5 w-3.5" />
              Work Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const InductionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EmployeeInductionTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "progress" | "joined" | "pending">("pending");
  const [viewEmployee, setViewEmployee] = useState<EmployeeInduction | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [workDetailsEmployee, setWorkDetailsEmployee] = useState<EmployeeInduction | null>(null);
  const [workDetailsOpen, setWorkDetailsOpen] = useState(false);
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
          <div className="hidden lg:flex items-center gap-3 px-4 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
            <div className="flex-1">Employee</div>
            <div className="w-44">Phase Progress</div>
            <div className="w-24 text-center">Progress</div>
            <div className="w-24">Joining</div>
            <div className="w-12 text-center">Action</div>
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
                    onWorkDetails={(e) => {
                      setWorkDetailsEmployee(e);
                      setWorkDetailsOpen(true);
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

        {/* ── Work Details Modal ── */}
        <WorkDetailsModal
          employee={workDetailsEmployee}
          open={workDetailsOpen}
          onClose={() => {
            setWorkDetailsOpen(false);
            setWorkDetailsEmployee(null);
          }}
        />
      </Card>
    </TooltipProvider>
  );
};

export default InductionDashboard;
