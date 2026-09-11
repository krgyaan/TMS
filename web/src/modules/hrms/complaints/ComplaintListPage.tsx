import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ColDef } from "ag-grid-community";
import DataTable from "@/components/ui/data-table";
import { Plus, Search, Eye, Megaphone, RotateCcw } from "lucide-react";
import { paths } from "@/app/routes/paths";
import {
  useAllComplaints,
  useUpdateComplaintStatus,
} from "@/hooks/api/useComplaints";
import type { Complaint } from "./helpers/types";
import { COMPLAINT_TYPES, PRIORITY_CONFIG, STATUS_CONFIG } from "./helpers/types";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { UpdateStatusModal } from "./components/UpdateStatusModal";
import { formatComplaintDate } from "./helpers/types";
import { cn } from "@/lib/utils";

type ComplaintStatusTab = "all" | "open" | "in_progress" | "resolved" | "closed" | "rejected";

const STATUS_TABS: { key: ComplaintStatusTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
  { key: "rejected", label: "Rejected" },
];

const ComplaintListPage = () => {
  const navigate = useNavigate();

  const {
    activeTab,
    setActiveTab,
    search,
    setSearch,
    debouncedSearch,
    pagination,
    setPagination,
    sortModel,
    handleSortChanged,
    handlePageSizeChange,
  } = usePersistentTableState({
    storageKey: "complaints",
    defaultTab: "all" as ComplaintStatusTab,
    tabParam: "subtab",
  });

  const [statusModal, setStatusModal] = useState<{
    open: boolean;
    complaint: Complaint | null;
  }>({ open: false, complaint: null });
  const updateStatus = useUpdateComplaintStatus();

  // Tab counts (one lightweight query per status, like the leads page)
  const { data: openCountRes } = useAllComplaints({ page: 1, limit: 1, status: "open" });
  const { data: inProgressCountRes } = useAllComplaints({ page: 1, limit: 1, status: "in_progress" });
  const { data: resolvedCountRes } = useAllComplaints({ page: 1, limit: 1, status: "resolved" });
  const { data: closedCountRes } = useAllComplaints({ page: 1, limit: 1, status: "closed" });
  const { data: rejectedCountRes } = useAllComplaints({ page: 1, limit: 1, status: "rejected" });

  const getCount = (key: ComplaintStatusTab): number => {
    if (key === "all") return -1;
    const map: Record<string, number | undefined> = {
      open: openCountRes?.meta?.total,
      in_progress: inProgressCountRes?.meta?.total,
      resolved: resolvedCountRes?.meta?.total,
      closed: closedCountRes?.meta?.total,
      rejected: rejectedCountRes?.meta?.total,
    };
    return map[key] ?? 0;
  };

  const { data: apiResponse, isLoading } = useAllComplaints(
    {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: debouncedSearch || undefined,
      status: activeTab === "all" ? undefined : (activeTab as ComplaintStatusTab),
    },
    {
      sortBy: sortModel[0]?.colId,
      sortOrder: sortModel[0]?.sort,
    }
  );

  const complaints = apiResponse?.data || [];
  const totalRows = apiResponse?.meta?.total || 0;

  const complaintActions: ActionItem<Complaint>[] = useMemo(
    () => [
      {
        label: "View Complaint",
        icon: <Eye className="h-4 w-4" />,
        onClick: (row) => navigate(paths.hrms.complaints.view(row.id)),
      },
      {
        label: "Update Status",
        icon: <RotateCcw className="h-4 w-4" />,
        onClick: (row) => setStatusModal({ open: true, complaint: row }),
      },
    ],
    [navigate]
  );

  const colDefs = useMemo<ColDef<Complaint>[]>(
    () => [
      {
        field: "complaintCode",
        headerName: "Code",
        width: 120,
        cellRenderer: (params: { value?: string }) => (
          <span className="font-mono text-xs font-semibold">{params.value || "-"}</span>
        ),
      },
      {
        field: "subject",
        headerName: "Subject",
        flex: 1.4,
        cellRenderer: (params: { value?: string }) => (
          <span className="font-medium truncate">{params.value || "-"}</span>
        ),
      },
      {
        field: "complaintType",
        headerName: "Type",
        width: 160,
        valueFormatter: (params) =>
          COMPLAINT_TYPES.find((t) => t.value === params.value)?.label ||
          params.value ||
          "-",
      },
      {
        field: "complainantName",
        headerName: "Complaint By",
        width: 150,
        valueFormatter: (params) => params.value || "-",
      },
      {
        field: "complaintAgainstName",
        headerName: "Against",
        width: 150,
        valueFormatter: (params) => params.value || params.data?.complaintAgainst || "-",
      },
      {
        field: "priority",
        headerName: "Priority",
        width: 110,
        cellRenderer: (params: { value?: string }) => {
          const config = PRIORITY_CONFIG[params.value as keyof typeof PRIORITY_CONFIG];
          if (!config) return <span>-</span>;
          const PriorityIcon = config.icon;
          return (
            <Badge
              variant="outline"
              className="text-[10px] h-5 font-bold rounded-md capitalize border-0"
            >
              <PriorityIcon className="h-2.5 w-2.5 mr-1" />
              {config.label}
            </Badge>
          );
        },
      },
      {
        field: "status",
        headerName: "Status",
        width: 120,
        cellRenderer: (params: { value?: string }) => {
          const config = STATUS_CONFIG[params.value as keyof typeof STATUS_CONFIG];
          if (!config) return <span className="capitalize">{params.value || "-"}</span>;
          const StatusIcon = config.icon;
          return (
            <Badge
              variant="outline"
              className={cn("text-[10px] h-6 font-bold rounded-lg", config.className)}
            >
              <StatusIcon className="h-2.5 w-2.5 mr-1" />
              {config.label}
            </Badge>
          );
        },
      },
      {
        field: "createdAt",
        headerName: "Filed On",
        width: 130,
        valueFormatter: (params) =>
          params.value ? formatComplaintDate(params.value) : "-",
      },
      {
        headerName: "Action",
        cellRenderer: createActionColumnRenderer(complaintActions),
        pinned: "right",
        width: 80,
      },
    ],
    [complaintActions]
  );

  const handleStatusUpdate = async (
    id: number,
    status: string,
    remarks?: string
  ) => {
    await updateStatus.mutateAsync({ id, data: { status, remarks } });
  };

  return (
    <Card className="min-h-[calc(100vh-2rem)] flex flex-col">
      <CardHeader className="flex-none pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Complaints</CardTitle>
              <CardDescription>View and manage all employee complaints</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate(paths.hrms.complaints.create)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Complaint
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 px-0">
        <div className="flex items-center gap-4 px-6 pb-4">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg flex-wrap">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  activeTab === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {tab.key !== "all" && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs h-4 min-w-4 px-1",
                      activeTab === tab.key && "bg-primary/10 text-primary"
                    )}
                  >
                    {getCount(tab.key)}
                  </Badge>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 flex justify-end">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search complaints..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </div>
        <DataTable
          data={complaints}
          loading={isLoading}
          columnDefs={colDefs}
          manualPagination={true}
          rowCount={totalRows}
          paginationState={pagination}
          onPaginationChange={setPagination}
          onPageSizeChange={handlePageSizeChange}
          showTotalCount={true}
          showLengthChange={true}
          gridOptions={{
            defaultColDef: {
              filter: true,
              sortable: true,
            },
            onSortChanged: handleSortChanged,
          }}
          enableFiltering={true}
          enableSorting={true}
        />
      </CardContent>

      {/* Update Status Modal */}
      <UpdateStatusModal
        open={statusModal.open}
        onOpenChange={(open) => setStatusModal((prev) => ({ ...prev, open }))}
        complaint={statusModal.complaint}
        onConfirm={handleStatusUpdate}
      />
    </Card>
  );
};


export default ComplaintListPage;
