import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ColDef } from "ag-grid-community";
import DataTable from "@/components/ui/data-table";
import { Plus, Search, Pencil, Eye, XCircle, MapPin, FileText, ExternalLink, Loader2 } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useLeadEnquiries, useUpdateLeadEnquiry, useCreateSiteVisit, useUpdateSiteVisitDetails, useCreateSiteVisitContacts, useCheckDriveScopes, useCreateCostingSheet } from "@/hooks/api/useLeadEnquiry";
import { LeadEnquiryRejectModal } from "./components/LeadEnquiryRejectModal";
import { LeadEnquirySiteVisitModal } from "./components/LeadEnquirySiteVisitModal";
import { LeadEnquirySiteVisitDetailsModal } from "./components/LeadEnquirySiteVisitDetailsModal";
import { SubmitCostingSheetModal } from "../enquirycosting/components/SubmitCostingSheetModal";
import { useSubmitCostingSheet } from "@/hooks/api/useEnquiryCosting";
import { enquiryCostingService } from "@/services/api/enquirycosting.service";

import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import type { LeadEnquiryWithNames } from "./helpers/lead-enquiry.type";
import { leadEnquiryService } from "@/services/api/lead-enquiry.service";
import axiosInstance from "@/lib/axios";
import { toast } from "sonner";
import { TenderTimerDisplay } from "@/components/TenderTimerDisplay";
import { cn } from "@/lib/utils";

const TEAM_TABS = [
    { key: 'AC', label: 'AC' },
    { key: 'DC', label: 'DC' },
    { key: 'Business Development', label: 'Business Development' },
];


const EnquiryListPage = () => {
    const navigate = useNavigate();
    const updateEnquiry = useUpdateLeadEnquiry();
    const createSiteVisit = useCreateSiteVisit();
    const updateSiteVisitDetails = useUpdateSiteVisitDetails();
    const createSiteVisitContacts = useCreateSiteVisitContacts();
    const { data: driveScopes, refetch: refetchDriveScopes } = useCheckDriveScopes();
    const createCostingSheet = useCreateCostingSheet();
    const submitCostingSheet = useSubmitCostingSheet();
    const pendingEnquiryId = useRef<number | null>(null);
    const [connectDriveOpen, setConnectDriveOpen] = useState(false);
    const [isConnectingDrive, setIsConnectingDrive] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTeam = searchParams.get('tab') || 'AC';

    const setActiveTeam = (team: string) => {
        const next = new URLSearchParams(searchParams);
        next.set('tab', team);
        next.delete('page');
        setSearchParams(next, { replace: true });
    };

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            if (event.data?.type !== 'GOOGLE_DRIVE_AUTH') return;

            if (event.data.status === 'success') {
                refetchDriveScopes();
                setConnectDriveOpen(false);
                toast.success('Google Drive connected!');

                if (pendingEnquiryId.current) {
                    const enquiryId = pendingEnquiryId.current;
                    pendingEnquiryId.current = null;
                    createCostingSheet.mutateAsync(enquiryId)
                        .then((result) => {
                            if (result.sheetUrl) {
                                window.open(result.sheetUrl, '_blank');
                            }
                        })
                        .catch(() => {});
                }
            } else {
                toast.error(`Failed to connect Google Drive: ${event.data.error}`);
                setIsConnectingDrive(false);
            }
        };

        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [refetchDriveScopes, createCostingSheet]);

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

    const [submitCostingModal, setSubmitCostingModal] = useState<{
        open: boolean;
        enquiryId: number | null;
        enquiryName?: string;
        initialData?: {
            finalPrice?: string | null;
            receiptPreGst?: string | null;
            budgetPreGst?: string | null;
            grossMargin?: string | null;
            remarks?: string | null;
        } | null;
    }>({ open: false, enquiryId: null });

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

    const handleConnectDrive = useCallback(async () => {
        if (isConnectingDrive) return;
        setIsConnectingDrive(true);
        try {
            const response = await axiosInstance.get('/integrations/google/drive-auth-url');
            const data = response.data;
            if (data.hasScopes) {
                toast.success('Google Drive is already connected');
                setConnectDriveOpen(false);
                return;
            }
            if (data.url && typeof data.url === 'string') {
                const w = 600, h = 700;
                const left = Math.max(0, (window.screen.width - w) / 2);
                const top = Math.max(0, (window.screen.height - h) / 2);
                window.open(data.url, 'google-drive-auth', `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,location=no`);
            }
        } catch (error) {
            toast.error('Failed to initiate Google Drive connection');
        } finally {
            setIsConnectingDrive(false);
        }
    }, [isConnectingDrive]);

    const handleCreateCostingSheet = (row: LeadEnquiryWithNames) => {
        if (!driveScopes?.hasScopes) {
            pendingEnquiryId.current = row.id;
            setConnectDriveOpen(true);
            return;
        }
        createCostingSheet.mutate(row.id);
    };

    const handleSubmitCostingConfirm = async (data: {
        enquiryId: number;
        finalPrice?: string | null;
        receiptPreGst?: string | null;
        budgetPreGst?: string | null;
        grossMargin?: string | null;
        remarks?: string | null;
    }) => {
        await submitCostingSheet.mutateAsync(data);
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
        {
            label: "Create Costing Sheet",
            icon: <FileText className="h-4 w-4" />,
            visible: (row) => !row.costingDocument,
            onClick: (row) => handleCreateCostingSheet(row),
        },
        {
            label: "Open Costing Sheet",
            icon: <ExternalLink className="h-4 w-4" />,
            visible: (row) => !!row.costingDocument,
            onClick: (row) => window.open(row.costingDocument!, '_blank'),
        },
        {
            label: "Submit Costing Sheet",
            icon: <FileText className="h-4 w-4" />,
            visible: (row) => !!row.costingDocument && !row.costingSheetStatus,
            onClick: (row) => setSubmitCostingModal({ open: true, enquiryId: row.id, enquiryName: row.enqName, initialData: null }),
        },
        {
            label: "Edit Submit Costing Sheet",
            icon: <FileText className="h-4 w-4" />,
            visible: (row) => !!row.costingDocument && (row.costingSheetStatus === 'Pending' || row.costingSheetStatus === 'Redo'),
            onClick: async (row) => {
                const costing = await enquiryCostingService.getByEnquiryId(row.id);
                setSubmitCostingModal({
                    open: true,
                    enquiryId: row.id,
                    enquiryName: row.enqName,
                    initialData: costing
                        ? {
                            finalPrice: costing.finalPrice,
                            receiptPreGst: costing.receiptPreGst,
                            budgetPreGst: costing.budgetPreGst,
                            grossMargin: costing.grossMargin,
                            remarks: costing.remarks,
                        }
                        : null,
                });
            },
        },
    ];

    const colDefs = useMemo<ColDef<LeadEnquiryWithNames>[]>(() => [
        { field: "enquiryNumber", headerName: "Enquiry No.", width: 140 },
        { field: "enqName", headerName: "Enquiry Name", width: 220 },
        { field: "createdByName", headerName: "BD Lead", width: 160 },
        { field: "organizationName", headerName: "Company Name", width: 180 },
        { field: "orgAbbName", headerName: "Organisation Name", width: 160 },
        { field: "itemName", headerName: "Item", width: 160 },
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
            field: "status",
            headerName: "Status",
            width: 160,
            cellRenderer: (params: any) => {
                const val = params.value;
                if (!val) return "-";
                const isRejected = val === 'Rejected';
                const isCosting = val === 'Costing Sheet Submitted' || val === 'Costing Sheet Created';
                return (
                    <Badge
                        variant={isRejected ? "destructive" : isCosting ? "default" : "secondary"}
                        className={cn(isCosting && "bg-amber-500 hover:bg-amber-500")}
                    >
                        {val}
                    </Badge>
                );
            },
        },
        {
            field: "tenderStage",
            headerName: "Stage",
            width: 140,
            cellRenderer: (params: any) => {
                const val: string | null | undefined = params.value;
                if (!val) return "-";
                return (
                    <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/10">
                        {val}
                    </Badge>
                );
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
            headerName: "Timer",
            width: 130,
            cellStyle: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            },
            cellRenderer: (params: any) => {
                const createdAt = params.data?.createdAt;
                if (!createdAt) {
                    return (
                        <TenderTimerDisplay
                            remainingSeconds={0}
                            status="NOT_STARTED"
                        />
                    );
                }
                return (
                    <TenderTimerDisplay
                        remainingSeconds={0}
                        status="RUNNING"
                        deadline={new Date(createdAt)}
                    />
                );
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

            <SubmitCostingSheetModal
                open={submitCostingModal.open}
                onOpenChange={(open) => setSubmitCostingModal({ ...submitCostingModal, open })}
                enquiryId={submitCostingModal.enquiryId}
                enquiryName={submitCostingModal.enquiryName}
                initialData={submitCostingModal.initialData}
                onConfirm={handleSubmitCostingConfirm}
            />

            <Dialog open={connectDriveOpen} onOpenChange={setConnectDriveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Connect Google Drive</DialogTitle>
                        <DialogDescription>
                            To create costing sheets, you need to grant access to Google Drive and Sheets.
                            This is a one-time authorization.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Required permissions:
                        </p>
                        <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                            <li>Create and edit files in Google Drive</li>
                            <li>Create and edit Google Sheets</li>
                        </ul>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConnectDriveOpen(false)}
                            disabled={isConnectingDrive}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleConnectDrive} disabled={isConnectingDrive}>
                            {isConnectingDrive ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</>
                            ) : 'Connect Google Drive'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default EnquiryListPage;
