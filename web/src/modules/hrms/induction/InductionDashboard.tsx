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
  MoreVertical,
  Briefcase,
  Calendar,
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
const EmployeeRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 px-4 py-4 rounded-2xl border border-border/50 bg-card/50">
    <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
    <div className="flex-1 min-w-0 space-y-2">
      <Skeleton className="h-3.5 w-36" />
      <Skeleton className="h-3 w-20" />
    </div>
    {/* work details bar skeleton */}
    <div className="hidden sm:flex flex-col gap-1.5 w-32">
      <Skeleton className="h-2.5 w-16" />
      <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
    {/* progress skeleton */}
    <Skeleton className="hidden sm:block h-10 w-10 rounded-full flex-shrink-0" />
    {/* joining skeleton */}
    <Skeleton className="hidden lg:block h-3 w-20" />
    {/* action skeleton */}
    <Skeleton className="h-8 w-8 rounded-xl flex-shrink-0" />
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
    <Button variant="outline" size="sm" onClick={onRetry} className="rounded-xl">
      Try Again
    </Button>
  </div>
);

// ─── Work Details Mini Bar ─────────────────────────────────────────────────────
const WorkDetailsBar: React.FC<{ pct: number; filled: number; total: number }> = ({
  pct,
  filled,
  total,
}) => (
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

// ─── Employee Row ──────────────────────────────────────────────────────────────
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
  const wd = getWorkDetailsProgress(employee);

  const actionMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
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
  );

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-border/40 bg-card/80 transition-all duration-300",
        "hover:bg-muted/40 hover:border-border/80 hover:shadow-md hover:shadow-black/[0.03] dark:hover:shadow-white/[0.02]",
        isVisible ? "ind-fade-up" : "opacity-0"
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* ────────────── MOBILE layout (< sm) ────────────── */}
      <div className="flex sm:hidden flex-col gap-3 px-3 py-3.5">
        {/* Top row: avatar + name/id + task count + action */}
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <Avatar className="h-10 w-10 rounded-xl ring-2 ring-background shadow-sm">
              {employee.profilePhoto && (
                <AvatarImage
                  src={employee.profilePhoto}
                  alt={`${employee.firstName} ${employee.lastName}`}
                  className="object-cover"
                />
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
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                status === "completed"
                  ? "bg-emerald-500"
                  : status === "in_progress"
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              )}
            />
          </div>

          {/* Name + ID */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-none tracking-tight truncate">
              {employee.firstName}{" "}
              {employee.middleName ? `${employee.middleName} ` : ""}
              {employee.lastName}
            </p>
            <span className="text-[10px] font-mono text-muted-foreground mt-1 inline-block bg-muted/60 px-1.5 py-0.5 rounded-md border border-border/40">
              {employee.employeeId}
            </span>
          </div>

          {/* Task count ring */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <CircularProgress value={stats.pct} size={34} strokeWidth={2.5} />
            <div className="text-right">
              <p className="text-xs font-semibold tabular-nums leading-none">
                {stats.completed}/{stats.total}
              </p>
              <p className="text-[9px] text-muted-foreground">tasks</p>
            </div>
          </div>

          {/* Action */}
          <div onClick={(e) => e.stopPropagation()}>{actionMenu}</div>
        </div>

        {/* Bottom row: work details bar + joining date */}
        <div className="flex items-end gap-3 pl-1">
          <div className="flex-1">
            <WorkDetailsBar pct={wd.pct} filled={wd.filled} total={wd.total} />
          </div>
          {employee.dateOfJoining && (
            <div className="flex items-center gap-1 flex-shrink-0 pb-0.5">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {formatDateString(employee.dateOfJoining)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ────────────── DESKTOP layout (≥ sm) ────────────── */}
      <div className="hidden sm:flex items-center gap-5 px-5 py-4">
        {/* Avatar + Name — wide employee column */}
        <div className="flex items-center gap-3.5 flex-1 min-w-0 lg:min-w-[360px] lg:max-w-[400px]">
          <div className="relative flex-shrink-0">
            <Avatar className="h-10 w-10 rounded-xl ring-2 ring-background shadow-sm">
              {employee.profilePhoto && (
                <AvatarImage
                  src={employee.profilePhoto}
                  alt={`${employee.firstName} ${employee.lastName}`}
                  className="object-cover"
                />
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
              <p className="text-sm font-semibold leading-none tracking-tight truncate">
                {employee.firstName}{" "}
                {employee.middleName ? `${employee.middleName} ` : ""}
                {employee.lastName}
              </p>
              <span className="text-[10px] font-mono bg-muted/70 text-muted-foreground px-1.5 py-0.5 rounded-md border border-border/40 flex-shrink-0">
                {employee.employeeId}
              </span>
            </div>
          </div>
        </div>

        {/* Work Details bar column */}
        <div className="flex-shrink-0 w-36">
          <WorkDetailsBar pct={wd.pct} filled={wd.filled} total={wd.total} />
        </div>

        {/* Progress ring + task count */}
        <div className="flex items-center gap-3 flex-shrink-0 w-28 ml-6">
          <CircularProgress value={stats.pct} size={42} strokeWidth={3} />
          <div>
            <p className="text-xs font-semibold tabular-nums leading-none">
              {stats.completed}/{stats.total}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">tasks</p>
          </div>
        </div>

        {/* Joining date */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 w-28">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span className="tabular-nums">
            {employee.dateOfJoining
              ? formatDateString(employee.dateOfJoining)
              : "—"}
          </span>
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-center flex-shrink-0 w-10"
          onClick={(e) => e.stopPropagation()}
        >
          {actionMenu}
        </div>
      </div>
    </div>
  );
};

// ─── Main Dashboard ────────────────────────────────────────────────────────────
const InductionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EmployeeInductionTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
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
      not_started: employees.filter((e) => getInductionStatus(e) === "not_started").length,
      in_progress: employees.filter((e) => getInductionStatus(e) === "in_progress").length,
      completed: employees.filter((e) => getInductionStatus(e) === "completed").length,
    }),
    [employees]
  );

  // ── Filtered + sorted list ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const list = employees.filter((e) => {
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
    return [...list].sort(
      (a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime()
    );
  }, [employees, activeTab, searchQuery]);

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
        </CardHeader>

        <CardContent className="flex-1 min-h-0 flex flex-col gap-5 px-3 sm:px-6">
          {/* ── Toolbar ── */}
          <div className="flex flex-col gap-2.5">
            {/* Mobile: tabs row on top, search below */}
            {/* Desktop: tabs + search on same single row */}

            {/* Row that holds tabs (and search beside them on desktop) */}
            <div className="flex items-center gap-3">
              {/* Tabs — scrollable */}
              <div className="flex-1 min-w-0 overflow-x-auto">
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as EmployeeInductionTab)}
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

              {/* Search — always visible on desktop (sm+), hidden on mobile */}
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

            {/* Mobile-only: search on its own row below tabs */}
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

          {/* ── Column Headers (desktop only) ── */}
          <div className="hidden sm:flex items-center gap-5 px-5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
            <div className="flex-1 lg:min-w-[360px] lg:max-w-[400px]">Employee</div>
            <div className="w-36">Work Details</div>
            <div className="w-28 ml-8">Progress</div>
            <div className="hidden lg:block w-28">Joining</div>
            <div className="w-10 text-center">Action</div>
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