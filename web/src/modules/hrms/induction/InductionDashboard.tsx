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
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Search,
  Users,
  CheckCircle2,
  CircleDashed,
  ListChecks,
  ClipboardList,
  Activity,
  AlertTriangle,
  Briefcase,
  Calendar,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate as formatDateString } from "@/hooks/useFormatedDate";
import {
  DEFAULT_TASKS,
  computeInductionStats,
  getAvatarColor,
  getInitials,
  getInductionStatus,
  getWorkDetailsProgress,
  mapApiEmployee,
  mapApiTask,
} from "./helpers/induction.helpers";
import type {
  EmployeeInduction,
  EmployeeInductionTab,
  InductionTask,
} from "./helpers/induction.helpers";
import {
  useInductionTrackerList,
  useEmployeeInduction,
  useUpdateInductionTask,
  useStaggeredEntrance,
} from "@/hooks/api/useInduction";
import {
  EmployeeInductionModal,
  CircularProgress,
} from "./components/EmployeeInductionModal";
import { WorkDetailsModal } from "./components/WorkDetailsModal";

// ─── CSS Keyframes ─────────────────────────────────────────────────────────────
const StyleInjector: React.FC = () => (
  <style>{`
    @keyframes ind-fade-up {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes ind-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes ind-scale-in {
      from { opacity: 0; transform: scale(0.95); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes ind-slide-down {
      from { opacity: 0; max-height: 0; }
      to   { opacity: 1; max-height: 2000px; }
    }
    @keyframes ind-check-pop {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    .ind-fade-up    { animation: ind-fade-up  0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
    .ind-fade-in    { animation: ind-fade-in  0.3s ease forwards; }
    .ind-scale-in   { animation: ind-scale-in 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }
    .ind-slide-down { animation: ind-slide-down 0.35s cubic-bezier(0.16,1,0.3,1) forwards; overflow: hidden; }
    .ind-check-pop  { animation: ind-check-pop 0.3s cubic-bezier(0.16,1,0.3,1); }
    .ind-progress-bar { transition: width 0.6s cubic-bezier(0.16,1,0.3,1); }
    .ind-glass {
      backdrop-filter: blur(12px) saturate(1.5);
      -webkit-backdrop-filter: blur(12px) saturate(1.5);
    }
  `}</style>
);

// ─── Skeleton ──────────────────────────────────────────────────────────────────
const EmployeeCardSkeleton: React.FC = () => (
  <div className="rounded-2xl border border-border/50 bg-card/80 p-5">
    <div className="flex items-start gap-4">
      <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full" />
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <div className="mt-5 pt-4 border-t grid grid-cols-2 gap-4 items-center">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    </div>
    <div className="mt-4 pt-3 border-t flex items-center justify-between">
      <Skeleton className="h-8 w-24 rounded-lg" />
      <Skeleton className="h-8 w-28 rounded-lg" />
    </div>
  </div>
);

// ─── Empty / Error States ──────────────────────────────────────────────────────
const EmptyState: React.FC<{ search: string; tab: EmployeeInductionTab }> = ({
  search,
  tab,
}) => (
  <div className="flex flex-col items-center justify-center py-20 text-center ind-fade-in">
    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
      <ListChecks className="h-8 w-8 text-muted-foreground/40" />
    </div>
    <p className="text-sm font-semibold">
      {search
        ? "No matching employees"
        : `No ${tab === "all" ? "" : tab.replace(/_/g, " ")} inductions`}
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
    <Button
      variant="outline"
      size="sm"
      onClick={onRetry}
      className="rounded-xl"
    >
      Try Again
    </Button>
  </div>
);

// ─── Work Details Mini Bar ─────────────────────────────────────────────────────
const WorkDetailsBar: React.FC<{
  pct: number;
  filled: number;
  total: number;
}> = ({ pct, filled, total }) => (
  <div className="flex flex-col gap-1 min-w-0">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <Briefcase className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="text-[10px] text-muted-foreground font-medium">
          Work Details
        </span>
      </div>
      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
        {filled}/{total}
      </span>
    </div>
    <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full ind-progress-bar",
          pct === 100
            ? "bg-emerald-500"
            : pct > 0
            ? "bg-primary"
            : "bg-muted-foreground/20"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  </div>
);

// ─── Employee Card ─────────────────────────────────────────────────────────────
const EmployeeCard: React.FC<{
  employee: EmployeeInduction;
  onView: (e: EmployeeInduction) => void;
  onWorkDetails: (e: EmployeeInduction) => void;
  index: number;
  isVisible: boolean;
}> = ({ employee, onView, onWorkDetails, index, isVisible }) => {
  const displayTasks =
    employee.tasks.length > 0 ? employee.tasks : DEFAULT_TASKS;
  const stats = computeInductionStats(displayTasks);
  const status = getInductionStatus(employee);
  const wd = getWorkDetailsProgress(employee);

  const statusMeta =
    status === "completed"
      ? {
          label: "Completed",
          badge:
            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          dot: "bg-emerald-500",
        }
      : status === "in_progress"
      ? {
          label: "In Progress",
          badge: "bg-primary/10 text-primary border-primary/20",
          dot: "bg-primary",
        }
      : {
          label: "Not Started",
          badge: "bg-muted text-muted-foreground border-border/50",
          dot: "bg-muted-foreground/30",
        };

  return (
    <div
      className={cn(
        "group relative rounded-2xl border bg-card transition-all duration-200",
        "hover:shadow-lg hover:shadow-black/[0.03] hover:-translate-y-0.5 hover:border-border",
        "cursor-pointer",
        isVisible ? "ind-fade-up" : "opacity-0"
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={() => onView(employee)}
    >
      <div className="p-5">
        {/* ── Top row: avatar · name/email · status badge ── */}
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <Avatar className="h-12 w-12 rounded-xl ring-1 ring-border/50">
              {employee.profilePhoto && (
                <AvatarImage
                  src={employee.profilePhoto}
                  alt={`${employee.firstName} ${employee.lastName}`}
                  className="object-cover"
                />
              )}
              <AvatarFallback
                className={cn(
                  "rounded-xl text-sm font-bold",
                  getAvatarColor(`${employee.firstName} ${employee.lastName}`)
                )}
              >
                {getInitials(employee.firstName, employee.lastName)}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background",
                statusMeta.dot
              )}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-tight truncate">
                  {employee.firstName}{" "}
                  {employee.middleName ? `${employee.middleName} ` : ""}
                  {employee.lastName}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {employee.email}
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold flex-shrink-0",
                  statusMeta.badge
                )}
              >
                {statusMeta.label}
              </span>
            </div>
          </div>
        </div>

        {/* ── Details grid ── */}
        {/*
          Row 1: Designation (left)  |  Department (right)
          Row 2: Emp ID (left)       |  Joining date (right)
          Each cell is its own flex row so icon + text are always on one line.
        */}
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
          {/* Designation */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{employee.designation || "—"}</span>
          </div>

          {/* Department */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <Users className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{employee.department || "—"}</span>
          </div>

          {/* Employee ID */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <Hash className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-mono truncate">{employee.employeeId}</span>
          </div>

          {/* Joining date */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="tabular-nums truncate">
              {employee.dateOfJoining
                ? formatDateString(employee.dateOfJoining)
                : "—"}
            </span>
          </div>
        </div>

        {/* ── Progress section ── */}
        <div className="mt-5 pt-4 border-t grid grid-cols-2 gap-4 items-center">
          {/* Induction ring + count */}
          <div className="flex items-center gap-3">
            <CircularProgress value={stats.pct} size={42} strokeWidth={3} />
            <div>
              <p className="text-xs font-semibold tabular-nums leading-none">
                {stats.completed}/{stats.total}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                induction tasks
              </p>
            </div>
          </div>

          {/* Work details bar */}
          <WorkDetailsBar pct={wd.pct} filled={wd.filled} total={wd.total} />
        </div>
      </div>

      {/* ── Action footer ── */}
      <div className="flex items-center justify-between border-t bg-muted/20 px-5 py-3 rounded-b-2xl">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            onView(employee);
          }}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Induction
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            onWorkDetails(employee);
          }}
        >
          <Briefcase className="h-3.5 w-3.5" />
          Work Details
        </Button>
      </div>
    </div>
  );
};

// ─── Main Dashboard ────────────────────────────────────────────────────────────
const InductionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EmployeeInductionTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewEmployee, setViewEmployee] =
    useState<EmployeeInduction | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [workDetailsEmployee, setWorkDetailsEmployee] =
    useState<EmployeeInduction | null>(null);
  const [workDetailsOpen, setWorkDetailsOpen] = useState(false);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [remarkSavingTaskId, setRemarkSavingTaskId] = useState<string | null>(
    null
  );

  // ── API ───────────────────────────────────────────────────────────────────
  const {
    data: rawTracker,
    isLoading: isLoadingTracker,
    isError: isTrackerError,
    refetch: refetchTracker,
  } = useInductionTrackerList();

  const { data: rawEmployeeTasks, isLoading: isLoadingTasks } =
    useEmployeeInduction(viewOpen && viewEmployee ? viewEmployee.id : null);

  const activeOnboardingId = viewEmployee?.id ?? 0;
  const { mutate: updateTask } = useUpdateInductionTask(activeOnboardingId);

  // ── Derived data ───────────────────────────────────────────────────────────
  const employees: EmployeeInduction[] = useMemo(() => {
    if (!rawTracker) return [];
    return rawTracker.map(mapApiEmployee);
  }, [rawTracker]);

  const liveTasks: InductionTask[] | undefined = useMemo(() => {
    if (!rawEmployeeTasks) return undefined;
    return rawEmployeeTasks.map(mapApiTask);
  }, [rawEmployeeTasks]);

  // ── Tab counts ─────────────────────────────────────────────────────────────
  const tabCounts = useMemo(
    () => ({
      all: employees.length,
      not_started: employees.filter(
        (e) => getInductionStatus(e) === "not_started"
      ).length,
      in_progress: employees.filter(
        (e) => getInductionStatus(e) === "in_progress"
      ).length,
      completed: employees.filter(
        (e) => getInductionStatus(e) === "completed"
      ).length,
    }),
    [employees]
  );

  // ── Filtered + sorted list ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const list = employees.filter((e) => {
      const matchTab =
        activeTab === "all" || getInductionStatus(e) === activeTab;
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
    return [...list].sort(
      (a, b) =>
        new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime()
    );
  }, [employees, activeTab, searchQuery]);

  const visibleItems = useStaggeredEntrance(filtered.length, 40);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleToggleTask = useCallback(
    (task: InductionTask) => {
      if (!viewEmployee) return;
      const newStatus =
        task.status === "completed" ? "pending" : "completed";
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

  const tabs: {
    value: EmployeeInductionTab;
    label: string;
    icon: React.ElementType;
  }[] = [
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
        </CardHeader>

        <CardContent className="flex-1 min-h-0 flex flex-col gap-5 px-3 sm:px-6">
          {/* ── Toolbar ── */}
          <div className="flex flex-col gap-2.5">
            {/* Row: tabs (+ search beside them on desktop) */}
            <div className="flex items-center gap-3">
              {/* Tabs — horizontally scrollable */}
              <div className="flex-1 min-w-0 overflow-x-auto">
                <Tabs
                  value={activeTab}
                  onValueChange={(v) =>
                    setActiveTab(v as EmployeeInductionTab)
                  }
                >
                  <TabsList className="h-9 p-1 rounded-xl bg-muted/50 w-max">
                    {tabs.map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="gap-1.5 text-xs px-2.5 rounded-lg data-[state=active]:shadow-sm transition-all"
                      >
                        <tab.icon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="whitespace-nowrap hidden sm:inline">
                          {tab.label}
                        </span>
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded-md text-[10px] font-semibold tabular-nums transition-colors",
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
              </div>

              {/* Search — desktop only (beside tabs) */}
              <div className="relative hidden sm:block flex-shrink-0 w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-9 h-9 text-sm rounded-xl w-full"
                  placeholder="Search name, ID, role…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Search — mobile only (below tabs) */}
            <div className="relative sm:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 h-9 text-sm rounded-xl w-full"
                placeholder="Search name, ID, role…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* ── Card grid ── */}
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
            {isLoadingTracker ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <EmployeeCardSkeleton key={i} />
                ))}
              </div>
            ) : isTrackerError ? (
              <ErrorState onRetry={refetchTracker} />
            ) : filtered.length === 0 ? (
              <EmptyState search={searchQuery} tab={activeTab} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                {filtered.map((emp, idx) => (
                  <EmployeeCard
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

        {/* ── Induction Modal ── */}
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