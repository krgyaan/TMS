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
import type { ColDef } from "ag-grid-community";
import DataTable from "@/components/ui/data-table";
import {
    Plus,
    Pencil,
    Trash2,
    Search,
    Eye,
    Calendar,
    Star,
    Mail,
    UserPlus
} from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useLeads, useDeleteLead, useUpdateLead } from "@/hooks/api/useLeads";
import type { LeadWithNames } from "@/modules/crm/leads/helpers/leads.type";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { LeadDeleteModal } from "./components/LeadDeleteModal";
import { LeadPriorityModal } from "./components/LeadPriorityModal";

const LeadListPage = () => {
    const navigate = useNavigate();
    const deleteLead = useDeleteLead();
    const updateLead = useUpdateLead();

    const {
        search,
        setSearch,
        debouncedSearch,
        pagination,
        setPagination,
        sortModel,
        handleSortChanged,
        handlePageSizeChange,
    } = usePersistentTableState({
        storageKey: 'leads',
        defaultTab: 'all' as const,
    });

    const [deleteModal, setDeleteModal] = useState<{
        open: boolean;
        leadId: number | null;
        leadName?: string;
    }>({
        open: false,
        leadId: null,
    });

    const [priorityModal, setPriorityModal] = useState<{
        open: boolean;
        leadId: number | null;
        leadName?: string;
        currentPriority?: string | null;
    }>({
        open: false,
        leadId: null,
    });

    const { data: apiResponse, isLoading } = useLeads(
        { page: pagination.pageIndex + 1, limit: pagination.pageSize, search: debouncedSearch || undefined },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort }
    );

    const leads = Array.isArray(apiResponse)
        ? apiResponse
        : (apiResponse?.data || []);
    const totalRows = Array.isArray(apiResponse)
        ? apiResponse.length
        : (apiResponse?.meta?.total || 0);

    const handleDeleteConfirm = async (leadId: number, reason?: string) => {
        try {
            console.log("Deleting lead:", leadId, "Reason:", reason);
            await deleteLead.mutateAsync(leadId);
        } catch (error) {
            console.error("Delete failed:", error);
            throw error;
        }
    };

    const handlePriorityUpdate = async (leadId: number, priority: string) => {
        try {
            await updateLead.mutateAsync({
                id: leadId,
                data: { leadPriority: priority as 'Cold' | 'Warm' | 'Hot' },
            });
        } catch (error) {
            console.error("Update priority failed:", error);
            throw error;
        }
    };

    const leadActions: ActionItem<LeadWithNames>[] = [
        {
            label: "Update Followup",
            onClick: (row) => {
                console.log("Update followup for lead:", row.id);
            },
            icon: <Calendar className="h-4 w-4" />,
        },
        {
            label: "Lead Priority",
            onClick: (row) => {
                setPriorityModal({
                    open: true,
                    leadId: row.id,
                    leadName: row.companyName || undefined,
                    currentPriority: row.leadPriority,
                });
            },
            icon: <Star className="h-4 w-4" />,
        },
        {
            label: "Enquiry Received",
            className: "whitespace-nowrap",
            onClick: (row) => {
                console.log("Mark enquiry received for lead:", row.id);
            },
            icon: <Mail className="h-4 w-4" />,
        },
        {
            label: "View Lead",
            onClick: (row) => navigate(paths.crm.leadView(row.id)),
            icon: <Eye className="h-4 w-4" />,
        },
        {
            label: "Edit Lead",
            onClick: (row) => navigate(paths.crm.leadEdit(row.id)),
            icon: <Pencil className="h-4 w-4" />,
        },
        {
            label: "Allocate to TE",
            onClick: (row) => {
                console.log("Allocate to TE for lead:", row.id);
            },
            icon: <UserPlus className="h-4 w-4" />,
        },
        {
            label: "Delete",
            className: "text-red-600",
            onClick: (row) => {
                setDeleteModal({
                    open: true,
                    leadId: row.id,
                    leadName: row.companyName || undefined,
                });
            },
            icon: <Trash2 className="h-4 w-4 text-red-600" />,
        },
    ];

    const colDefs = useMemo<ColDef<LeadWithNames>[]>(() => [
        {
            field: "companyName",
            headerName: "Company",
            width: 150,
            filter: true,
            sortable: true,
        },
        {
            field: "name",
            headerName: "Contact Person",
            width: 180,
            filter: true,
            sortable: true,
        },
        {
            field: "industryName",
            headerName: "Industry",
            width: 150,
            filter: true,
            valueFormatter: (params) => params.value || "-",
        },
        {
            field: "state",
            headerName: "State",
            width: 130,
            filter: true,
        },
        {
            field: "typeName",
            headerName: "Lead Type",
            width: 130,
            filter: true,
            valueFormatter: (params) => params.value || "-",
        },
        {
            field: "teamName",
            headerName: "Team",
            width: 120,
            filter: true,
            valueFormatter: (params) => params.value || "-",
        },
        {
            field: "bdPersonName",
            headerName: "BD Lead",
            width: 150,
            filter: true,
            valueFormatter: (params) => params.value || "-",
        },
        {
            field: "lastMailSentAt",
            headerName: "Last Follow Up",
            width: 150,
            filter: true,
            sortable: true,
            valueFormatter: (params) => {
                if (!params.value) return "-";
                return new Date(params.value).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                });
            },
        },
        {
            field: "enquiryReceivedAt",
            headerName: "Next Follow Up",
            width: 150,
            filter: true,
            sortable: true,
            valueFormatter: (params) => {
                if (!params.value) return "-";
                return new Date(params.value).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                });
            },
        },
        {
            field: "leadPriority",
            headerName: "Lead Priority",
            width: 130,
            filter: true,
            cellRenderer: (params: any) => {
                const priority = params.value;
                if (!priority) return "-";

                const colorMap: Record<string, string> = {
                    'Hot': 'text-red-600 font-semibold',
                    'Warm': 'text-yellow-600 font-semibold',
                    'Cold': 'text-blue-600 font-semibold',
                };

                return (
                    <span className={colorMap[priority] || ''}>
                        {priority}
                    </span>
                );
            },
        },
        {
            field: "recentFollowUp",
            headerName: "Status",
            width: 120,
            filter: true,
            cellRenderer: (params: any) => {
                const status = params.value;
                return status ? (
                    <span className="capitalize">{status}</span>
                ) : "-";
            },
        },
        {
            headerName: "Action",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer(leadActions),
            pinned: "right",
            width: 80,
        },
    ], []);

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Leads</CardTitle>
                        <CardDescription>Manage all leads</CardDescription>
                    </div>
                    <Button
                        onClick={() => navigate(paths.crm.leadCreate)}
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Lead
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 px-0">
                <div className="flex items-center gap-4 px-6 pb-4">
                    <div className="flex-1 flex justify-end">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search leads..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8 w-64"
                            />
                        </div>
                    </div>
                </div>

                <DataTable
                    data={leads}
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

            <LeadDeleteModal
                open={deleteModal.open}
                onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}
                leadId={deleteModal.leadId}
                leadName={deleteModal.leadName}
                onConfirm={handleDeleteConfirm}
            />

            <LeadPriorityModal
                open={priorityModal.open}
                onOpenChange={(open) => setPriorityModal({ ...priorityModal, open })}
                leadId={priorityModal.leadId}
                leadName={priorityModal.leadName}
                currentPriority={priorityModal.currentPriority}
                onConfirm={handlePriorityUpdate}
            />
        </Card>
    );
};

export default LeadListPage;