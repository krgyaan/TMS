import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
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
    UserPlus,
    MapPin,
    User,
} from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useLeads, useDeleteLead, useUpdateLead } from "@/hooks/api/useLeads";
import type { LeadWithNames } from "@/modules/crm/leads/helpers/leads.type";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { LeadDeleteModal } from "./components/LeadDeleteModal";
import { LeadPriorityModal } from "./components/LeadPriorityModal";
import { LeadAllocationModal } from "./components/LeadAllocationModal";
import { cn } from "@/lib/utils";

type LeadTeamTab = 'AC' | 'DC' | 'Business Development';
type LeadPriorityTab = 'cold' | 'warm' | 'hot';

const TEAM_TABS: { key: LeadTeamTab; label: string }[] = [
    { key: 'AC', label: 'AC' },
    { key: 'DC', label: 'DC' },
    { key: 'Business Development', label: 'Business Development' },
];

const PRIORITY_SUBTABS: { key: LeadPriorityTab; label: string }[] = [
    { key: 'cold', label: 'Cold' },
    { key: 'warm', label: 'Warm' },
    { key: 'hot',  label: 'Hot'  },
];

const LeadListPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const deleteLead = useDeleteLead();
    const updateLead = useUpdateLead();

    const activeTeam = (searchParams.get('tab') as LeadTeamTab) || 'AC';

    const {
        activeTab: activePriority,
        setActiveTab: setActivePriorityInternal,
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
        defaultTab: 'cold' as LeadPriorityTab,
        tabParam: 'subtab',
    });

    const setActiveTeam = (team: LeadTeamTab) => {
        const next = new URLSearchParams(searchParams);
        next.set('tab', team);
        next.set('subtab', 'cold');
        next.delete('page');
        setSearchParams(next, { replace: true });
    };

    const setActivePriority = (priority: LeadPriorityTab) => {
        setActivePriorityInternal(priority);
    };

    const [deleteModal, setDeleteModal] = useState<{ 
        open: boolean; 
        leadId: number | null; 
        leadName?: string 
    }>({ 
        open: false, 
        leadId: null 
    });

    const [priorityModal, setPriorityModal] = useState<{ 
        open: boolean; 
        leadId: number | null; 
        leadName?: string; 
        currentPriority?: string | null 
    }>({ 
        open: false, 
        leadId: null 
    });

    const [allocationModal, setAllocationModal] = useState<{ 
        open: boolean; 
        leadId: number | null; 
        leadName?: string 
    }>({ 
        open: false, 
        leadId: null 
    });

    const getPriorityFilter = (tab: LeadPriorityTab): string => 
        tab.charAt(0).toUpperCase() + tab.slice(1);

    const { data: coldResponse } = useLeads({ 
        page: 1, 
        limit: 1, 
        priority: 'Cold', 
        team: activeTeam 
    });

    const { data: warmResponse } = useLeads({ 
        page: 1, 
        limit: 1, 
        priority: 'Warm', 
        team: activeTeam 
    });

    const { data: hotResponse } = useLeads({ 
        page: 1, 
        limit: 1, 
        priority: 'Hot', 
        team: activeTeam 
    });

    const coldCount = Array.isArray(coldResponse) 
        ? coldResponse.length 
        : (coldResponse?.meta?.total ?? 0);

    const warmCount = Array.isArray(warmResponse) 
        ? warmResponse.length 
        : (warmResponse?.meta?.total ?? 0);

    const hotCount = Array.isArray(hotResponse) 
        ? hotResponse.length 
        : (hotResponse?.meta?.total ?? 0);

    const getCount = (key: LeadPriorityTab) => {
        if (key === 'cold') return coldCount;
        if (key === 'warm') return warmCount;
        return hotCount;
    };

    const { data: apiResponse, isLoading } = useLeads(
        {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            search: debouncedSearch || undefined,
            priority: getPriorityFilter(activePriority as LeadPriorityTab),
            team: activeTeam,
        },
        { 
            sortBy: sortModel[0]?.colId, 
            sortOrder: sortModel[0]?.sort 
        }
    );

    const leads = Array.isArray(apiResponse) 
        ? apiResponse 
        : (apiResponse?.data || []);

    const totalRows = Array.isArray(apiResponse) 
        ? apiResponse.length 
        : (apiResponse?.meta?.total || 0);

    const handleDeleteConfirm = async (leadId: number, reason?: string) => {
        await deleteLead.mutateAsync({ id: leadId, reason });
    };

    const handlePriorityUpdate = async (leadId: number, priority: string) => {
        await updateLead.mutateAsync({ 
            id: leadId, 
            data: { leadPriority: priority as 'Cold' | 'Warm' | 'Hot' } 
        });
    };

    const leadActions: ActionItem<LeadWithNames>[] = [
        { 
            label: "Update Followup", 
            onClick: (row) => navigate(paths.crm.leadFollowup(row.id)), 
            icon: <Calendar className="h-4 w-4" /> 
        },
        { 
            label: "Lead Priority", 
            onClick: (row) => setPriorityModal({ 
                open: true, 
                leadId: row.id, 
                leadName: row.companyName || undefined, 
                currentPriority: row.leadPriority 
            }), 
            icon: <Star className="h-4 w-4" /> 
        },
        { 
            label: "Enquiry Received", 
            onClick: (row) => console.log("Enquiry for:", row.id), 
            icon: <Mail className="h-4 w-4" /> 
        },
        { 
            label: "View Lead", 
            onClick: (row) => navigate(paths.crm.leadView(row.id)), 
            icon: <Eye className="h-4 w-4" /> 
        },
        { 
            label: "Edit Lead", 
            onClick: (row) => navigate(paths.crm.leadEdit(row.id)), 
            icon: <Pencil className="h-4 w-4" /> 
        },
        { 
            label: "Allocate to TE", 
            onClick: (row) => setAllocationModal({ 
                open: true, 
                leadId: row.id, 
                leadName: row.companyName || undefined 
            }), 
            icon: <UserPlus className="h-4 w-4" /> 
        },
        { 
            label: "Disqualify", 
            className: "text-red-600", 
            onClick: (row) => setDeleteModal({ 
                open: true, 
                leadId: row.id, 
                leadName: row.companyName || undefined 
            }), 
            icon: <Trash2 className="h-4 w-4 text-red-600" /> 
        },
    ];

    const colDefs = useMemo<ColDef<LeadWithNames>[]>(() => [
        {
            field: "companyName",
            headerName: "Company",
            width: 200,
            cellRenderer: (params: any) => (
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="cursor-help font-medium">
                                {params.value || "-"}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="p-2 w-fit">
                            <div className="flex flex-col gap-1 text-[10px]">
                                <div className="flex items-center gap-1 font-bold text-white border-b border-border/50 pb-0.5">
                                    <MapPin className="h-3 w-3" /> Location
                                </div>
                                <p>
                                    <span className="text-white">Addr:</span> 
                                    {params.data.address || "-"}
                                </p>
                                <p>
                                    <span className="text-white">State:</span> 
                                    {params.data.state || "-"}
                                </p>
                                <p>
                                    <span className="text-white">Country:</span> 
                                    {params.data.country || "-"}
                                </p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        },
        {
            field: "name",
            headerName: "Contact Person",
            width: 180,
            cellRenderer: (params: any) => (
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="cursor-help">
                                {params.value || "-"}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="p-2 w-fit">
                            <div className="flex flex-col gap-1 text-[10px]">
                                <div className="flex items-center gap-1 font-bold text-white border-b border-border/50 pb-0.5">
                                    <User className="h-3 w-3" /> Contact
                                </div>
                                <p>
                                    <span className="text-white">Desig:</span> 
                                    {params.data.designation || "-"}
                                </p>
                                <p>
                                    <span className="text-white">Phone:</span> 
                                    {params.data.phone || "-"}
                                </p>
                                <p>
                                    <span className="text-white">Email:</span> 
                                    {params.data.email || "-"}
                                </p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        },
        { 
            field: "industryName", 
            headerName: "Industry", 
            width: 150, 
            valueFormatter: (params) => params.value || "-" 
        },
        { 
            field: "typeName", 
            headerName: "Lead Type", 
            width: 130, 
            valueFormatter: (params) => params.value || "-" 
        },
        { 
            field: "bdPersonName", 
            headerName: "BD Lead", 
            width: 150, 
            valueFormatter: (params) => params.value || "-" 
        },
        { 
            field: "allocatedTeName", 
            headerName: "Allocated To", 
            width: 150, 
            cellRenderer: (params: any) => {
                if (!params.value) {
                    return (
                        <span className="text-muted-foreground italic text-xs">
                            Not Allocated
                        </span>
                    );
                }
                return <span>{params.value}</span>;
            }
        },
        {
            field: "lastMailSentAt",
            headerName: "Last Follow Up",
            width: 150,
            valueFormatter: (params) => params.value 
                ? new Date(params.value).toLocaleDateString('en-IN', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                }) 
                : "-"
        },
        {
            field: "nextFollowupDate",
            headerName: "Next Follow Up",
            width: 150,
            cellRenderer: (params: any) => {
                if (!params.value) {
                    return <span className="text-muted-foreground">-</span>;
                }
                const date = new Date(params.value);
                const today = new Date(); 
                today.setHours(0,0,0,0);
                const tomorrow = new Date(today); 
                tomorrow.setDate(today.getDate() + 1);
                const formatted = date.toLocaleDateString('en-IN', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                });
                
                if (date < today) {
                    return <span className="text-red-500 font-medium">{formatted}</span>;
                }
                if (date >= today && date < tomorrow) {
                    return <span className="text-green-600 font-semibold">Today</span>;
                }
                return <span className="text-blue-500">{formatted}</span>;
            }
        },
        {
            field: "recentFollowUp",
            headerName: "Status",
            width: 130,
            cellRenderer: (params: any) => (
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="cursor-help capitalize">
                                {params.value || "-"}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="p-1 w-auto min-w-[80px]">
                            <div className="flex flex-col gap-0.5 text-[10px]">
                                <p className="font-bold text-white border-b border-border/50 pb-0.5 text-[10px]">
                                    Counts
                                </p>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-0">
                                    <span className="text-white">Mail:</span> 
                                    <span>{params.data.mailFollowupCount || 0}</span>
                                    
                                    <span className="text-white">Call:</span> 
                                    <span>{params.data.callFollowupCount || 0}</span>
                                    
                                    <span className="text-white">Visit:</span> 
                                    <span>{params.data.visitFollowupCount || 0}</span>
                                    
                                    <span className="text-white">Letter:</span> 
                                    <span>{params.data.letterSentCount || 0}</span>
                                    
                                    <span className="text-white">WhatsApp:</span> 
                                    <span>{params.data.whatsappFollowupCount || 0}</span>
                                </div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        },
        { 
            headerName: "Action", 
            cellRenderer: createActionColumnRenderer(leadActions), 
            pinned: "right", 
            width: 80 
        },
    ], [leadActions]);

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <CardTitle>Leads</CardTitle>
                        <CardDescription>Manage all leads</CardDescription>
                    </div>
                    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                        {TEAM_TABS.map(tab => (
                            <button 
                                key={tab.key} 
                                type="button" 
                                onClick={() => setActiveTeam(tab.key)} 
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                    activeTeam === tab.key 
                                        ? "bg-background text-foreground shadow-sm" 
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <Button 
                        onClick={() => navigate(paths.crm.leadCreate)} 
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" /> Add Lead
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 px-0">
                <div className="flex items-center gap-4 px-6 pb-4">
                    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                        {PRIORITY_SUBTABS.map(tab => (
                            <button 
                                key={tab.key} 
                                type="button" 
                                onClick={() => setActivePriority(tab.key)} 
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                    activePriority === tab.key 
                                        ? "bg-background text-foreground shadow-sm" 
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {tab.label}
                                <Badge 
                                    variant="secondary" 
                                    className={cn(
                                        "text-xs h-4 min-w-4 px-1",
                                        activePriority === tab.key && "bg-primary/10 text-primary"
                                    )}
                                >
                                    {getCount(tab.key)}
                                </Badge>
                            </button>
                        ))}
                    </div>
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
                            sortable: true 
                        }, 
                        onSortChanged: handleSortChanged 
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
            <LeadAllocationModal 
                open={allocationModal.open} 
                onOpenChange={(open) => setAllocationModal({ ...allocationModal, open })} 
                leadId={allocationModal.leadId} 
                leadName={allocationModal.leadName} 
            />
        </Card>
    );
};

export default LeadListPage;