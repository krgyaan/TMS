import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ColDef } from "ag-grid-community";
import DataTable from "@/components/ui/data-table";
import { Plus, Search, Pencil, Eye, XCircle, MapPin, FileText, MessageCircle } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useLeadEnquiries, useUpdateLeadEnquiry, useCreateSiteVisit, useUpdateSiteVisitDetails, useCreateSiteVisitContacts } from "@/hooks/api/useLeadEnquiry";
import { LeadEnquiryRejectModal } from "./components/LeadEnquiryRejectModal";
import { LeadEnquirySiteVisitModal } from "./components/LeadEnquirySiteVisitModal";
import { LeadEnquirySiteVisitDetailsModal } from "./components/LeadEnquirySiteVisitDetailsModal";

import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import type { LeadEnquiryWithNames } from "./helpers/lead-enquiry.type";
import { leadEnquiryService } from "@/services/api/lead-enquiry.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TEAM_TABS = [
    { key: 'AC', label: 'AC' },
    { key: 'DC', label: 'DC' },
    { key: 'Business Development', label: 'Business Development' },
];

const ENQUIRY_STATUS_LABELS: Record<number, string> = {
    2: 'Enquiry Info Filled',
    3: 'Enquiry Info Approved',
    29: 'Enquiry Info Sheet Incomplete',
    17: 'Quotation Submitted',
    1: 'Read Enquiry',
};


const EnquiryListPage = () => {
    const navigate = useNavigate();
    const updateEnquiry = useUpdateLeadEnquiry();
    const createSiteVisit = useCreateSiteVisit();
    const updateSiteVisitDetails = useUpdateSiteVisitDetails();
    const createSiteVisitContacts = useCreateSiteVisitContacts();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTeam = searchParams.get('tab') || 'AC';

    const setActiveTeam = (team: string) => {
        const next = new URLSearchParams(searchParams);
        next.set('tab', team);
        next.delete('page');
        setSearchParams(next, { replace: true });
    };

    const {
        search, setSearch, debouncedSearch,
        pagination, setPagination,
        sortModel, handleSortChanged, handlePageSizeChange,
    } = usePersistentTableState({
        storageKey: 'lead-enquiries',
        defaultTab: 'all',
        tabParam: 'enquiryTab',
    });

    const { data: acResponse } = useLeadEnquiries({ page: 1, limit: 1, team: 'AC' });
    const { data: dcResponse } = useLeadEnquiries({ page: 1, limit: 1, team: 'DC' });
    const { data: bdResponse } = useLeadEnquiries({ page: 1, limit: 1, team: 'Business Development' });

    const acCount = acResponse?.meta?.total ?? 0;
    const dcCount = dcResponse?.meta?.total ?? 0;
    const bdCount = bdResponse?.meta?.total ?? 0;

    const getTeamCount = (key: string) => {
        if (key === 'AC') return acCount;
        if (key === 'DC') return dcCount;
        return bdCount;
    };

    const { data: apiResponse, isLoading } = useLeadEnquiries(
        { page: pagination.pageIndex + 1, limit: pagination.pageSize, search: debouncedSearch || undefined, team: activeTeam },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort }
    );

    const enquiries = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const [rejectModal, setRejectModal] = useState<{
        open: boolean;
        enquiryId: number | null;
        enquiryName?: string;
    }>({ open: false, enquiryId: null });

    const [siteVisitModal, setSiteVisitModal] = useState<{
        open: boolean;
        enquiryId: number | null;
        enquiryName?: string;
    }>({ open: false, enquiryId: null });

    const [siteVisitDetailsModal, setSiteVisitDetailsModal] = useState<{
        open: boolean;
        siteVisitId: number | null;
        initialData?: {
            information: string | null;
            conductedAt: string | null;
            documents: string | null;
            contacts: { name: string; designation: string | null; phone: string | null; email: string | null }[];
        } | null;
    }>({ open: false, siteVisitId: null });

    const handleRejectConfirm = async (enquiryId: number, reason?: string) => {
        await updateEnquiry.mutateAsync({ id: enquiryId, data: { status: "Rejected", rejectionReason: reason || null } });
    };

    const handleSiteVisitConfirm = async (data: { enquiryId: number; assignedTo?: number | null; scheduledAt?: string | null; information?: string | null }) => {
        await createSiteVisit.mutateAsync(data);
    };

    const handleSiteVisitDetailsClick = async (row: LeadEnquiryWithNames) => {
        const visit = await leadEnquiryService.getFirstSiteVisitByEnquiry(row.id);
        if (visit) {
            const contacts = await leadEnquiryService.getSiteVisitContacts(visit.id);
            setSiteVisitDetailsModal({
                open: true,
                siteVisitId: visit.id,
                initialData: {
                    information: visit.information,
                    conductedAt: visit.conductedAt,
                    documents: visit.documents,
                    contacts: contacts.map(c => ({
                        name: c.name,
                        designation: c.designation,
                        phone: c.phone,
                        email: c.email,
                    })),
                },
            });
        } else {
            toast.error("No site visit found for this enquiry");
        }
    };

    const handleSiteVisitDetailsSave = async (data: { information: string; documents: string; conductedAt: string; contacts: { name: string; designation: string; phone: string; email: string }[] }) => {
        if (!siteVisitDetailsModal.siteVisitId) return;
        await updateSiteVisitDetails.mutateAsync({
            id: siteVisitDetailsModal.siteVisitId,
            data: { information: data.information || null, documents: data.documents || null, conductedAt: data.conductedAt || null },
        });
        if (data.contacts.length > 0) {
            await createSiteVisitContacts.mutateAsync({
                siteVisitId: siteVisitDetailsModal.siteVisitId,
                contacts: data.contacts,
            });
        }
    };

    const enquiryActions: ActionItem<LeadEnquiryWithNames>[] = [
        {
            label: "Fill Info Sheet",
            onClick: (row) => {
                if (!row.tenderId) {
                    toast.error("No linked tender found for this enquiry");
                    return;
                }
                navigate(paths.tendering.infoSheetCreate(row.tenderId));
            },
            icon: <FileText className="h-4 w-4" />,
        },
        {
            label: "Quotation Followup",
            onClick: (row) => navigate(paths.crm.enquiryQuotationFollowup(row.id)),
            icon: <MessageCircle className="h-4 w-4" />,
            visible: (row) => row.tenderStatusId === 17,
        },
        {
            label: "View",
            onClick: (row) => navigate(paths.crm.enquiryView(row.id)),
            icon: <Eye className="h-4 w-4" />,
        },
        {
            label: "Edit",
            onClick: (row) => navigate(paths.crm.enquiryEdit(row.id)),
            icon: <Pencil className="h-4 w-4" />,
        },
        {
            label: "Reject Enquiry",
            className: "text-red-600",
            onClick: (row) => setRejectModal({ open: true, enquiryId: row.id, enquiryName: row.enqName }),
            icon: <XCircle className="h-4 w-4 text-red-600" />,
        },
        {
            label: "Allocate Site Visit",
            icon: <MapPin className="h-4 w-4" />,
            visible: (row) => row.siteVisitRequired === true && !row.hasSiteVisit,
            onClick: (row) => setSiteVisitModal({ open: true, enquiryId: row.id, enquiryName: row.enqName }),
        },
        {
            label: "Site Visit Details",
            icon: <MapPin className="h-4 w-4" />,
            visible: (row) => row.hasSiteVisit === true,
            onClick: handleSiteVisitDetailsClick,
        },
    ];

    const colDefs = useMemo<ColDef<LeadEnquiryWithNames>[]>(() => [
        {
            field: "enqName",
            headerName: "Enquiry Name",
            width: 240,
            cellRenderer: (params: any) => (
                <div className="flex flex-col gap-0.5">
                    <p className="text-xs">{params.value}</p>
                    {params.data?.enquiryNumber && (
                        <p className="text-xs text-[10px] text-muted-foreground truncate">{params.data.enquiryNumber}</p>
                    )}
                </div>
            ),
        },
        {
            field: "teamMemberName",
            headerName: "Team Member",
            width: 160,
            cellRenderer: (params: any) => params.value ? params.value : <span className="text-muted-foreground">-</span>,
        },
        { field: "approxValue", headerName: "Approx Value", width: 130 },
        {
            headerName: "Site Visit",
            width: 110,
            cellRenderer: (params: any) => {
                if (!params.data?.siteVisitRequired) return "No";
                if (params.data?.hasSiteVisit) return "Done";
                return "Yes";
            },
        },
        {
            field: "tenderStatusName",
            headerName: "Status",
            width: 160,
            cellRenderer: (params: any) => {
                const id = params.data?.tenderStatusId;
                const name = params.data?.tenderStatusName;
                const label = id != null ? (ENQUIRY_STATUS_LABELS[id] ?? name) : name;
                if (!label) return "-";
                return <Badge variant="secondary">{label}</Badge>;
            },
        },
        {
            field: "nextFollowupDate",
            headerName: "Next Followup",
            width: 150,
            cellRenderer: (params: any) => {
                if (!params.value) {
                    return <span className="text-muted-foreground">-</span>;
                }
                const date = new Date(params.value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                const formatted = date.toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                });
                if (date < today) {
                    return <span className="text-red-500 font-medium">{formatted}</span>;
                }
                if (date >= today && date < tomorrow) {
                    return <span className="text-green-600 font-semibold">Today</span>;
                }
                return <span className="text-blue-500">{formatted}</span>;
            },
        },
        {
            field: "latestFollowupType",
            headerName: "Last Followup",
            width: 130,
            cellRenderer: (params: any) => {
                const val: string | null | undefined = params.value;
                if (!val) return "-";
                return <Badge variant="outline" className="capitalize font-medium">{val}</Badge>;
            },
        },
        {
            field: "dueDate",
            headerName: "Due Date",
            width: 120,
            cellRenderer: (params: any) => {
                const val: string | null | undefined = params.value;
                if (!val) return "-";
                return new Date(val).toLocaleDateString("en-IN");
            },
        },
        {
            headerName: "Action",
            cellRenderer: createActionColumnRenderer(enquiryActions),
            pinned: "right",
            width: 80,
        },
    ], [enquiryActions]);

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col">
            <CardHeader className="flex-none pb-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1">
                        <CardTitle>Enquiries</CardTitle>
                        <CardDescription>Manage all enquiries</CardDescription>
                    </div>
                    <div className="flex justify-center">
                        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                            {TEAM_TABS.map(tab => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTeam(tab.key)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                        activeTeam === tab.key
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                    <Badge
                                        variant="secondary"
                                        className={cn(
                                            "text-xs h-4 min-w-4 px-1",
                                            activeTeam === tab.key && "bg-primary/10 text-primary"
                                        )}
                                    >
                                        {getTeamCount(tab.key)}
                                    </Badge>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 flex justify-end">
                        <Button onClick={() => navigate(paths.crm.enquiryCreate)} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Add Enquiry
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 px-0">
                <div className="flex items-center justify-end px-6 pb-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search enquiries..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 w-64"
                        />
                    </div>
                </div>
                <DataTable
                    data={enquiries}
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
                        defaultColDef: { filter: true, sortable: true },
                        onSortChanged: handleSortChanged,
                    }}
                    enableFiltering={true}
                    enableSorting={true}
                />
            </CardContent>

            <LeadEnquiryRejectModal
                open={rejectModal.open}
                onOpenChange={(open) => setRejectModal({ ...rejectModal, open })}
                enquiryId={rejectModal.enquiryId}
                enquiryName={rejectModal.enquiryName}
                onConfirm={handleRejectConfirm}
            />

            <LeadEnquirySiteVisitModal
                open={siteVisitModal.open}
                onOpenChange={(open) => setSiteVisitModal({ ...siteVisitModal, open })}
                enquiryId={siteVisitModal.enquiryId}
                enquiryName={siteVisitModal.enquiryName}
                onConfirm={handleSiteVisitConfirm}
            />

            <LeadEnquirySiteVisitDetailsModal
                open={siteVisitDetailsModal.open}
                onOpenChange={(open) => setSiteVisitDetailsModal({ ...siteVisitDetailsModal, open, initialData: open ? siteVisitDetailsModal.initialData : null })}
                siteVisitId={siteVisitDetailsModal.siteVisitId}
                initialData={siteVisitDetailsModal.initialData}
                onSave={handleSiteVisitDetailsSave}
            />
        </Card>
    );
};

export default EnquiryListPage;
