import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import {
    FileUp,
    FileSignature,
    Loader2,
    Eye,
    Users,
    User,
    Wrench,
    Mail,
    Phone,
    Building2,
    ExternalLink,
    Search,
    MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DataTable from "@/components/ui/data-table";
import { paths } from "@/app/routes/paths";
import { useAmcServices } from "@/hooks/api/useAmcServices";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { cn } from "@/lib/utils";
import { formatDate } from "@/hooks/useFormatedDate";
import type {
    AmcServiceDetail,
    AmcSiteContact,
    AmcServiceEngineer,
} from "@/modules/services/amc/helpers/amc.types";
import { UploadServiceReportModal } from "./components/UploadServiceReportModal";
import type { ServicePathField } from "@/modules/services/amc/helpers/amc.types";

type ServiceTab = "due" | "missed" | "done";

const SERVICE_SUBTABS: { key: ServiceTab; label: string }[] = [
    { key: "due", label: "Service Due" },
    { key: "missed", label: "Service Missed" },
    { key: "done", label: "Service Done" },
];

function isMissed(service: AmcServiceDetail) {
    if (service.status === "Done" || !service.serviceDueDate) return false;
    const due = new Date(`${service.serviceDueDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !isNaN(due.getTime()) && due.getTime() < today.getTime();
}

function rowMatchesTab(row: AmcServiceDetail, tab: ServiceTab) {
    if (tab === "done") return row.status === "Done";
    if (row.status === "Done") return false;
    if (tab === "missed") return isMissed(row);
    return !isMissed(row);
}

function DueDateCell({ value }: { value: string }) {
    const due = new Date(`${value}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const crossed = due.getTime() < today.getTime();
    return (
        <span className={cn("font-medium", crossed ? "text-red-600" : "")}>
            {formatDate(value)}
        </span>
    );
}

export default function AmcServicesListPage() {
    const navigate = useNavigate();
    const { data: services = [], isLoading } = useAmcServices();

    const {
        activeTab: activeServiceTab,
        setActiveTab: setActiveServiceTab,
        search,
        setSearch,
    } = usePersistentTableState({
        storageKey: "amc-services",
        defaultTab: "due" as ServiceTab,
        tabParam: "tab",
    });

    const [contactsModalOpen, setContactsModalOpen] = useState(false);
    const [contactsList, setContactsList] = useState<AmcSiteContact[]>([]);
    const [engineersModalOpen, setEngineersModalOpen] = useState(false);
    const [engineersList, setEngineersList] = useState<AmcServiceEngineer[]>([]);

    const [uploadModal, setUploadModal] = useState<{
        open: boolean;
        serviceId: number | null;
        field: ServicePathField;
    }>({ open: false, serviceId: null, field: "filled-service-report" });

    const handleOpenContacts = (list: AmcSiteContact[]) => {
        setContactsList(list ?? []);
        setContactsModalOpen(true);
    };

    const handleOpenEngineers = (list: AmcServiceEngineer[]) => {
        setEngineersList(list ?? []);
        setEngineersModalOpen(true);
    };

    const serviceCounts = useMemo<Record<ServiceTab, number>>(() => {
        return {
            due: services.filter(row => rowMatchesTab(row, "due")).length,
            missed: services.filter(row => rowMatchesTab(row, "missed")).length,
            done: services.filter(row => rowMatchesTab(row, "done")).length,
        };
    }, [services]);

    const rows = useMemo(() => {
        const query = search.trim().toLowerCase();
        return services.filter(row => {
            if (!rowMatchesTab(row, activeServiceTab)) return false;
            if (!query) return true;

            const contactNames = (row.site?.contacts ?? []).map(c => c.name).join(" ");
            const engineerNames = (row.amc?.serviceEngineers ?? []).map(e => e.name).join(" ");
            const haystack = [
                row.amc?.projectName,
                row.site?.name,
                row.site?.address,
                contactNames,
                engineerNames,
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(query);
        });
    }, [services, activeServiceTab, search]);

    const serviceCountBySite = useMemo(() => {
        const map = new Map<number, number>();
        for (const service of services) {
            map.set(service.amcSiteId, (map.get(service.amcSiteId) ?? 0) + 1);
        }
        return map;
    }, [services]);

    const colDefs = useMemo<ColDef<AmcServiceDetail>[]>(() => {
        const actions: ActionItem<AmcServiceDetail>[] = [
            {
                label: "Upload Filled Service Report",
                onClick: row =>
                    setUploadModal({ open: true, serviceId: row.id, field: "filled-service-report" }),
                icon: <FileUp className="h-4 w-4" />,
            },
            {
                label: "Upload Signed Service Report",
                onClick: row =>
                    setUploadModal({ open: true, serviceId: row.id, field: "signed-service-report" }),
                icon: <FileSignature className="h-4 w-4" />,
            },
            {
                label: "View",
                onClick: row => navigate(paths.services.amcServiceView(row.id)),
                icon: <Eye className="h-4 w-4" />,
            },
        ];

        return [
        {
            colId: "projectName",
            headerName: "Project Name",
            width: 200,
            valueGetter: params => params.data?.amc?.projectName ?? "—",
            cellRenderer: (params: CustomCellRendererProps<AmcServiceDetail>) => (
                <span>{params.data?.amc?.projectName ?? "—"}</span>
            ),
        },
        {
            colId: "siteName",
            headerName: "Site Name",
            width: 190,
            valueGetter: params => params.data?.site?.name ?? "—",
            cellRenderer: (params: CustomCellRendererProps<AmcServiceDetail>) => {
                const row = params.data;
                if (!row) return null;
                return (
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="cursor-help truncate block">
                                    {row.site?.name ?? "—"}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="p-2 w-fit">
                                <div className="flex flex-col gap-1 text-[10px]">
                                    <div className="flex items-center gap-1 font-bold text-white border-b border-border/50 pb-0.5">
                                        <MapPin className="h-3 w-3" /> Site Info
                                    </div>
                                    <p>
                                        <span className="text-white">Name:</span>{" "}
                                        {row.site?.name || "-"}
                                    </p>
                                    <p>
                                        <span className="text-white">Addr:</span>{" "}
                                        {row.site?.address || "-"}
                                    </p>
                                    <p>
                                        <span className="text-white">Location:</span>{" "}
                                        {row.site?.mapLink ? (
                                            <a
                                                href={row.site.mapLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-0.5 text-blue-400 hover:underline"
                                            >
                                                <ExternalLink className="h-2.5 w-2.5" />
                                                Open Maps
                                            </a>
                                        ) : (
                                            "-"
                                        )}
                                    </p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            },
        },
        {
            colId: "contacts",
            headerName: "Contact Details",
            width: 140,
            sortable: false,
            cellRenderer: (params: CustomCellRendererProps<AmcServiceDetail>) => {
                const count = params.data?.site?.contacts?.length ?? 0;
                if (count === 0) return <span className="text-muted-foreground">—</span>;
                return (
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                                    onClick={() =>
                                        handleOpenContacts(params.data?.site?.contacts ?? [])
                                    }
                                >
                                    <Users className="h-3.5 w-3.5" />
                                    {count}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs font-medium">
                                View contacts
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            },
        },
        {
            colId: "engineers",
            headerName: "Service Engg",
            width: 142,
            sortable: false,
            cellRenderer: (params: CustomCellRendererProps<AmcServiceDetail>) => {
                const count = params.data?.amc?.serviceEngineers?.length ?? 0;
                if (count === 0) return <span className="text-muted-foreground">—</span>;
                return (
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                                    onClick={() =>
                                        handleOpenEngineers(params.data?.amc?.serviceEngineers ?? [])
                                    }
                                >
                                    <Wrench className="h-3.5 w-3.5" />
                                    {count}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs font-medium">
                                View engineers
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            },
        },
        {
            colId: "serviceDueDate",
            headerName: "Service Due",
            width: 140,
            sort: "asc",
            valueGetter: params => params.data?.serviceDueDate ?? "",
            cellRenderer: (params: CustomCellRendererProps<AmcServiceDetail>) =>
                params.data?.serviceDueDate ? (
                    <DueDateCell value={params.data.serviceDueDate} />
                ) : (
                    <span className="text-muted-foreground">—</span>
                ),
        },
        {
            colId: "serviceNo",
            headerName: "Service No.",
            width: 100,
            cellRenderer: (params: CustomCellRendererProps<AmcServiceDetail>) => {
                const row = params.data;
                if (!row) return null;
                const total = serviceCountBySite.get(row.amcSiteId) ?? 0;
                return (
                    <span className="font-medium tabular-nums">
                        {row.serviceNo}/{total}
                    </span>
                );
            },
        },
        {
            colId: "status",
            headerName: "Status",
            width: 130,
            valueGetter: params => params.data?.status ?? "",
            cellRenderer: (params: CustomCellRendererProps<AmcServiceDetail>) => {
                const value = params.data?.status ?? "";
                const done = value === "Done";
                return (
                    <Badge
                        variant="outline"
                        className={cn(
                            "font-medium",
                            done
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : "bg-amber-100 text-amber-800 border-amber-200",
                        )}
                    >
                        {value || "—"}
                    </Badge>
                );
            },
        },
        {
            colId: "actions",
            headerName: "Actions",
            width: 120,
            pinned: "right",
            sortable: false,
            filter: false,
            cellRenderer: createActionColumnRenderer(actions),
        },
        ];
    }, [serviceCountBySite, navigate]);

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <div>
                    <CardTitle>AMC Services</CardTitle>
                    <CardDescription>
                        Scheduled service visits per site. Upload filled / signed reports for each visit.
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent className="flex-1 px-0">
                <div className="flex items-center gap-4 px-6 pb-4">
                    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                        {SERVICE_SUBTABS.map(tab => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveServiceTab(tab.key)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                    activeServiceTab === tab.key
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {tab.label}
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        "text-xs h-4 min-w-4 px-1",
                                        activeServiceTab === tab.key &&
                                            "bg-primary/10 text-primary",
                                    )}
                                >
                                    {serviceCounts[tab.key]}
                                </Badge>
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 flex justify-end">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search services..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-8 w-64"
                            />
                        </div>
                    </div>
                </div>

                {isLoading && services.length === 0 ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <DataTable
                        data={rows}
                        loading={isLoading}
                        columnDefs={colDefs}
                        gridOptions={{
                            defaultColDef: { filter: true, sortable: true },
                            pagination: true,
                        }}
                        enablePagination={true}
                    />
                )}
            </CardContent>

            {/* ── Contacts modal ───────────────────────────────────────────── */}
            <Dialog open={contactsModalOpen} onOpenChange={setContactsModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Contact Persons</DialogTitle>
                        <DialogDescription>
                            {contactsList.length}{" "}
                            {contactsList.length === 1 ? "contact" : "contacts"} for this site
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {contactsList.length ? (
                            contactsList.map((c, i) => (
                                <div
                                    key={i}
                                    className="p-3 rounded-lg border bg-muted/30 space-y-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <User className="h-4 w-4 text-primary" />
                                        </div>
                                        <span className="font-medium text-sm">{c.name}</span>
                                    </div>
                                    <div className="space-y-1 pl-10">
                                        {c.organization && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Building2 className="h-3.5 w-3.5" />
                                                <span>{c.organization}</span>
                                            </div>
                                        )}
                                        {c.email && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Mail className="h-3.5 w-3.5" />
                                                <span>{c.email}</span>
                                            </div>
                                        )}
                                        {c.mobile && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Phone className="h-3.5 w-3.5" />
                                                <span>{c.mobile}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
                                <p className="text-sm text-muted-foreground">No contacts found</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Engineers modal ──────────────────────────────────────────── */}
            <Dialog open={engineersModalOpen} onOpenChange={setEngineersModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Service Engineers</DialogTitle>
                        <DialogDescription>
                            {engineersList.length}{" "}
                            {engineersList.length === 1 ? "engineer" : "engineers"} assigned
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {engineersList.length ? (
                            engineersList.map((e, i) => (
                                <div
                                    key={i}
                                    className="p-3 rounded-lg border bg-muted/30 space-y-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Wrench className="h-4 w-4 text-primary" />
                                        </div>
                                        <span className="font-medium text-sm">{e.name}</span>
                                    </div>
                                    <div className="space-y-1 pl-10">
                                        {e.organization && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Building2 className="h-3.5 w-3.5" />
                                                <span>{e.organization}</span>
                                            </div>
                                        )}
                                        {e.mobile && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Phone className="h-3.5 w-3.5" />
                                                <span>{e.mobile}</span>
                                            </div>
                                        )}
                                        {e.email && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Mail className="h-3.5 w-3.5" />
                                                <span>{e.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Wrench className="h-8 w-8 text-muted-foreground/50 mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    No engineers found
                                </p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <UploadServiceReportModal
                open={uploadModal.open}
                onOpenChange={open => setUploadModal(prev => ({ ...prev, open }))}
                serviceId={uploadModal.serviceId}
                field={uploadModal.field}
            />
        </Card>
    );
}
