// pages/tasks/TaskDashboard.tsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import {
  Plus,
  Eye,
  FileEdit,
  AlertCircle,
  Clock,
  CheckCircle2,
  ListTodo,
  Search,
} from "lucide-react";
import type { ColDef } from "ag-grid-community";

// ─── Types ───────────────────────────────────────────────────────────────────
type TaskStatus = "Not Started" | "In Progress" | "Completed" | "Blocked";
type TaskPriority = "High" | "Medium" | "Low";
type TaskScore = "Green" | "Yellow" | "Red";

interface Task {
  id: string;
  teamMember: string;
  taskName: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  status: TaskStatus;
  score: TaskScore;
  priority: TaskPriority;
  proof?: string;
  assignedBy: string;
}

// ─── Dummy Data ───────────────────────────────────────────────────────────────
const dummyTasks: Task[] = [
  {
    id: "TASK-0001",
    teamMember: "Alice Johnson",
    taskName: "Prepare Q2 Report",
    description: "Compile and format the quarterly financial report",
    assignedDate: "2025-06-01",
    dueDate: "2025-06-20",
    status: "In Progress",
    score: "Green",
    priority: "High",
    assignedBy: "David Lee",
  },
  {
    id: "TASK-0002",
    teamMember: "Bob Smith",
    taskName: "Client Onboarding Docs",
    description: "Prepare documentation package for new client",
    assignedDate: "2025-06-03",
    dueDate: "2025-06-10",
    status: "Blocked",
    score: "Red",
    priority: "High",
    assignedBy: "Sarah Kim",
  },
  {
    id: "TASK-0003",
    teamMember: "Carol White",
    taskName: "Update CRM Records",
    description: "Sync latest contact updates into CRM system",
    assignedDate: "2025-06-05",
    dueDate: "2025-06-18",
    status: "Not Started",
    score: "Yellow",
    priority: "Medium",
    assignedBy: "David Lee",
  },
  {
    id: "TASK-0004",
    teamMember: "Alice Johnson",
    taskName: "Team Training Session",
    description: "Organize and host internal training on new tools",
    assignedDate: "2025-05-28",
    dueDate: "2025-06-08",
    status: "Completed",
    score: "Green",
    priority: "Medium",
    proof: "training_proof.pdf",
    assignedBy: "Sarah Kim",
  },
  {
    id: "TASK-0005",
    teamMember: "Daniel Brown",
    taskName: "Vendor Invoice Review",
    description: "Review and approve pending vendor invoices",
    assignedDate: "2025-06-02",
    dueDate: "2025-06-07",
    status: "Completed",
    score: "Yellow",
    priority: "Low",
    proof: "invoice_sign.pdf",
    assignedBy: "David Lee",
  },
  {
    id: "TASK-0006",
    teamMember: "Bob Smith",
    taskName: "Website Content Update",
    description: "Update product pages with new specifications",
    assignedDate: "2025-06-04",
    dueDate: "2025-06-25",
    status: "In Progress",
    score: "Green",
    priority: "Medium",
    assignedBy: "David Lee",
  },
  {
    id: "TASK-0007",
    teamMember: "Carol White",
    taskName: "Compliance Audit Prep",
    description: "Gather documents needed for upcoming compliance audit",
    assignedDate: "2025-05-30",
    dueDate: "2025-06-05",
    status: "Blocked",
    score: "Red",
    priority: "High",
    assignedBy: "Sarah Kim",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const getDueDateMeta = (
  dueDate: string,
  status: TaskStatus
): { label: string; variant: "overdue" | "today" | "soon" | "normal" } => {
  if (status === "Completed") return { label: "—", variant: "normal" };
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0)
    return { label: `${Math.abs(diffDays)}d overdue`, variant: "overdue" };
  if (diffDays === 0) return { label: "Due today", variant: "today" };
  if (diffDays <= 3)
    return { label: `${diffDays}d left`, variant: "soon" };
  return { label: `${diffDays}d left`, variant: "normal" };
};

// ─── Score Badge ──────────────────────────────────────────────────────────────
const ScoreBadge: React.FC<{ score: TaskScore }> = ({ score }) => {
  const config: Record<TaskScore, { label: string; className: string; dot: string }> = {
    Green: {
      label: "Green",
      className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      dot: "bg-emerald-500",
    },
    Yellow: {
      label: "Yellow",
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      dot: "bg-amber-500",
    },
    Red: {
      label: "Red",
      className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      dot: "bg-red-500",
    },
  };
  const { label, className, dot } = config[score];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const config: Record<TaskStatus, string> = {
    "Not Started":
      "bg-muted text-muted-foreground border-border",
    "In Progress":
      "bg-primary/10 text-primary border-primary/20",
    Completed:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    Blocked: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config[status]}`}
    >
      {status}
    </span>
  );
};

// ─── Priority Badge ───────────────────────────────────────────────────────────
const PriorityBadge: React.FC<{ priority: TaskPriority }> = ({
  priority,
}) => {
  const config: Record<TaskPriority, string> = {
    High: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    Medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    Low: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config[priority]}`}
    >
      {priority}
    </span>
  );
};

// ─── Summary Cards ────────────────────────────────────────────────────────────
const SummaryCards: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const overdue = tasks.filter((t) => {
    if (t.status === "Completed") return false;
    return new Date(t.dueDate) < new Date();
  }).length;
  const inProgress = tasks.filter(
    (t) => t.status === "In Progress"
  ).length;
  const blocked = tasks.filter((t) => t.status === "Blocked").length;

  const cards = [
    {
      label: "Total Tasks",
      value: total,
      icon: <ListTodo className="h-5 w-5" />,
      className: "text-foreground bg-muted/30 border-border",
    },
    {
      label: "In Progress",
      value: inProgress,
      icon: <Clock className="h-5 w-5" />,
      className: "text-primary bg-primary/10 border-primary/20",
    },
    {
      label: "Completed",
      value: completed,
      icon: <CheckCircle2 className="h-5 w-5" />,
      className: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Overdue",
      value: overdue,
      icon: <AlertCircle className="h-5 w-5" />,
      className: "text-destructive bg-destructive/10 border-destructive/20",
    },
    {
      label: "Blocked",
      value: blocked,
      icon: <AlertCircle className="h-5 w-5" />,
      className: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`flex items-center gap-3 rounded-xl border p-4 shadow-sm ${c.className}`}
        >
          <div className="p-2 rounded-lg bg-background/50 backdrop-blur-sm shrink-0">{c.icon}</div>
          <div>
            <p className="text-2xl font-bold leading-none tracking-tight">{c.value}</p>
            <p className="text-[10px] uppercase font-bold mt-1 opacity-70">{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const TaskDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMember, setFilterMember] = useState<string>("all");

  const teamMembers = useMemo(
    () => [...new Set(dummyTasks.map((t) => t.teamMember))],
    []
  );

  const tabCounts = useMemo(
    () => ({
      all: dummyTasks.length,
      active: dummyTasks.filter((t) =>
        ["Not Started", "In Progress"].includes(t.status)
      ).length,
      completed: dummyTasks.filter((t) => t.status === "Completed")
        .length,
      blocked: dummyTasks.filter((t) => t.status === "Blocked").length,
    }),
    []
  );

  const filteredData = useMemo(() => {
    let data = dummyTasks;

    // Tab filter
    if (activeTab === "active")
      data = data.filter((t) =>
        ["Not Started", "In Progress"].includes(t.status)
      );
    else if (activeTab === "completed")
      data = data.filter((t) => t.status === "Completed");
    else if (activeTab === "blocked")
      data = data.filter((t) => t.status === "Blocked");

    // Member filter
    if (filterMember !== "all")
      data = data.filter((t) => t.teamMember === filterMember);

    // Search
    if (searchTerm)
      data = data.filter(
        (t) =>
          t.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.teamMember.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.id.toLowerCase().includes(searchTerm.toLowerCase())
      );

    return data;
  }, [activeTab, filterMember, searchTerm]);

  const taskActions = useMemo(
    () => [
      {
        label: "View",
        icon: <Eye className="h-4 w-4" />,
        onClick: (row: Task) => navigate(paths.accounts.delegationView(row.id)),
      },
      {
        label: "Update",
        icon: <FileEdit className="h-4 w-4" />,
        className: "text-blue-600",
        onClick: (row: Task) => navigate(paths.accounts.delegationUpdate(row.id)),
      },
    ],
    [navigate]
  );

  const columns: ColDef[] = useMemo(
    () => [
      {
        headerName: "Task ID",
        field: "id",
        width: 120,
        cellRenderer: (p: any) => (
          <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground">
            {p.value}
          </span>
        ),
      },
      {
        headerName: "Team Member",
        field: "teamMember",
        width: 160,
        cellRenderer: (p: any) => (
          <div className="flex items-center gap-2">
            {/* <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 border border-primary/20">
              {p.value?.charAt(0)}
            </div> */}
            <span className="text-sm font-medium">{p.value}</span>
          </div>
        ),
      },
      {
        headerName: "Task Name",
        field: "taskName",
        width: 200,
        cellRenderer: (p: any) => (
          <span className="font-medium text-sm">{p.value}</span>
        ),
      },
    //   {
    //     headerName: "Priority",
    //     field: "priority",
    //     width: 100,
    //     cellRenderer: (p: any) => <PriorityBadge priority={p.value} />,
    //   },
      {
        headerName: "Assigned",
        field: "assignedDate",
        width: 120,
        valueGetter: (p: any) => formatDate(p.data?.assignedDate),
      },
      {
        headerName: "Due Date",
        field: "dueDate",
        width: 160,
        cellRenderer: (p: any) => {
          const meta = getDueDateMeta(p.data?.dueDate, p.data?.status);
          const dateLabel = formatDate(p.data?.dueDate);
          const variantClass =
            meta.variant === "overdue"
              ? "text-destructive font-bold"
              : meta.variant === "today"
              ? "text-amber-600 dark:text-amber-400 font-bold"
              : meta.variant === "soon"
              ? "text-amber-500 font-medium"
              : "text-muted-foreground";
          return (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium">{dateLabel}</span>
              {/* {meta.label !== "—" && (
                <span className={`text-[10px] uppercase ${variantClass}`}>
                  {meta.label}
                </span>
              )} */}
            </div>
          );
        },
      },
    //   {
    //     headerName: "Status",
    //     field: "status",
    //     width: 130,
    //     cellRenderer: (p: any) => <StatusBadge status={p.value} />,
    //   },
      {
        headerName: "Score",
        field: "score",
        width: 110,
        cellRenderer: (p: any) => <ScoreBadge score={p.value} />,
      },
      {
        headerName: "Proof",
        field: "proof",
        width: 80,
        cellRenderer: (p: any) =>
          p.value ? (
            <span className="text-xs font-bold text-primary hover:underline cursor-pointer">
              VIEW
            </span>
          ) : (
            <span className="text-xs text-muted-foreground opacity-50">—</span>
          ),
      },
      {
        headerName: "Actions",
        filter: false,
        sortable: false,
        cellRenderer: createActionColumnRenderer(taskActions),
        width: 100,
      },
    ],
    [taskActions]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Task Dashboard</CardTitle>
          <CardDescription>
            Monitor and manage team task assignments
          </CardDescription>
        </div>
        <Button onClick={() => navigate(paths.accounts.delegationAdd)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </CardHeader>

      <CardContent>
        {/* Summary */}
        <SummaryCards tasks={dummyTasks} />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks, members..."
              className="pl-9 bg-muted/50 border-border focus:bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterMember} onValueChange={setFilterMember}>
            <SelectTrigger className="w-full sm:w-52 bg-muted/50 border-border">
              <SelectValue placeholder="Filter by member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              {teamMembers.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-2">
                {tabCounts.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="active">
              Active
              <Badge variant="secondary" className="ml-2">
                {tabCounts.active}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed
              <Badge variant="secondary" className="ml-2">
                {tabCounts.completed}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="blocked">
              Blocked
              <Badge variant="secondary" className="ml-2">
                {tabCounts.blocked}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {["all", "active", "completed", "blocked"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <DataTable
                data={filteredData}
                loading={false}
                columnDefs={columns}
                gridOptions={{
                  defaultColDef: { filter: true, sortable: true },
                  pagination: true,
                  rowClassRules: {
                    "bg-destructive/5": (p: any) => {
                      if (p.data?.status === "Completed") return false;
                      return new Date(p.data?.dueDate) < new Date();
                    },
                  },
                }}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TaskDashboard;