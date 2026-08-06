import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import {
    Plus,
    Eye,
    Pencil,
    Users,
    User,
    Wrench,
    Mail,
    Phone,
    Building2,
    ExternalLink,
    Search,
    Download,
    FileUp,
    MapPin,
    FileSignature,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DataTable from "@/components/ui/data-table";
import { paths } from "@/app/routes/paths";
import { useAmcs } from "@/hooks/api/useAmc";
import { useProjectsMaster } from "@/hooks/api/useProjects";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { cn } from "@/lib/utils";
import type {
    AmcDetail,
    AmcSite,
    AmcSiteContact,
    AmcServiceEngineer,
} from "./helpers/amc.types";
import { sampleReport } from "./helpers/amc.types";
import { UploadFilledServiceReportModal } from "./components/UploadFilledServiceReportModal";
import { UploadSignedServiceReportModal } from "./components/UploadSignedServiceReportModal";

type AmcTeamTab = "AC" | "DC";
type AmcServiceTab = "due" | "missed" | "done";

const TEAM_TABS: { key: AmcTeamTab; label: string }[] = [
    { key: "AC", label: "AC" },
    { key: "DC", label: "DC" },
];

const SERVICE_SUBTABS: { key: AmcServiceTab; label: string }[] = [
    { key: "due", label: "Service Due" },
    { key: "missed", label: "Service Missed" },
    { key: "done", label: "Service Done" },
];

interface AmcSiteRow {
    key: string;
    amcId: number;
    projectName: string;
    siteName: string;
    siteAddress: string;
    siteMapLink: string | null;
    siteContacts: AmcSiteContact[];
    nextServiceDue: string | null;
    status: string | null;
    serviceEngineers: AmcServiceEngineer[];
    amc: AmcDetail;
}

function isServiceDue(nextServiceDue: string | null) {
    if (!nextServiceDue) return true;
    const due = new Date(`${nextServiceDue}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return isNaN(due.getTime()) || due.getTime() >= today.getTime();
}

function isServiceMissed(nextServiceDue: string | null) {
    if (!nextServiceDue) return false;
    const due = new Date(`${nextServiceDue}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !isNaN(due.getTime()) && due.getTime() < today.getTime();
}

function NextServiceDueCell({
    value,
}: CustomCellRendererProps<AmcSiteRow, string | null>) {
    if (!value) return <span>—</span>;
    const due = new Date(`${value}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const crossed = !isNaN(due.getTime()) && due.getTime() < today.getTime();
    return (
        <span className={crossed ? "font-medium text-red-600" : "font-medium text-green-600"}>
            {value}
        </span>
    );
}

export default function AmcListPage() {
    const navigate = useNavigate();
    const { data: amcs = [], isLoading } = useAmcs();
    const { data: projects = [] } = useProjectsMaster();

    const [activeTeam, setActiveTeam] = useState<AmcTeamTab>("AC");
    const [activeServiceTab, setActiveServiceTab] = useState<AmcServiceTab>("due");
    const [search, setSearch] = useState("");

    const [contactsModalOpen, setContactsModalOpen] = useState(false);
    const [contactsList, setContactsList] = useState<AmcSiteContact[]>([]);
    const [engineersModalOpen, setEngineersModalOpen] = useState(false);
    const [engineersList, setEngineersList] = useState<AmcServiceEngineer[]>([]);
    const [filledModal, setFilledModal] = useState<{ open: boolean; amcId: number | null }>({
        open: false,
        amcId: null,
    });
    const [signedModal, setSignedModal] = useState<{ open: boolean; amcId: number | null }>({
        open: false,
        amcId: null,
    });

    const projectMap = useMemo(
        () => new Map(projects.map(p => [p.id, p.projectName || `Project ${p.id}`])),
        [projects],
    );

    const handleOpenContacts = (list: AmcSiteContact[]) => {
        setContactsList(list ?? []);
        setContactsModalOpen(true);
    };

    const handleOpenEngineers = (list: AmcServiceEngineer[]) => {
        setEngineersList(list ?? []);
        setEngineersModalOpen(true);
    };

    const handleSampleDownload = (row: AmcSiteRow) => {
        const sample = sampleReport(row.amc.serviceReportPath);
        if (!sample) {
            toast.error("No sample service report uploaded for this AMC");
            return;
        }
        const url = `/uploads/amc/${sample}`;
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = sample;
        anchor.rel = "noopener noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    };

    const allRows = useMemo<AmcSiteRow[]>(() => {
        const result: AmcSiteRow[] = [];
        for (const amc of amcs) {
            const projectName = projectMap.get(amc.projectId) ?? `Project ${amc.projectId}`;
            const sites: AmcSite[] = amc.sites && amc.sites.length ? amc.sites : [];
            const serviceEngineers: AmcServiceEngineer[] = amc.serviceEngineers ?? [];

            if (!sites.length) {
                result.push({
                    key: `${amc.id}-0`,
                    amcId: amc.id,
                    projectName,
                    siteName: "—",
                    siteAddress: "—",
                    siteMapLink: null,
                    siteContacts: [],
                    nextServiceDue: amc.nextServiceDue,
                    status: null,
                    serviceEngineers,
                    amc,
                });
                continue;
            }

            for (const site of sites) {
                result.push({
                    key: `${amc.id}-${site.id ?? 0}`,
                    amcId: amc.id,
                    projectName,
                    siteName: site.name || "—",
                    siteAddress: site.address || "—",
                    siteMapLink: site.mapLink ?? null,
                    siteContacts: site.contacts ?? [],
                    nextServiceDue: amc.nextServiceDue,
                    status: site.status ?? "Pending",
                    serviceEngineers,
                    amc,
                });
            }
        }
        return result;
    }, [amcs, projectMap]);

    const teamCounts = useMemo<Record<AmcTeamTab, number>>(() => {
        const ac = allRows.filter(row => row.amc.teamName === "AC").length;
        const dc = allRows.filter(row => row.amc.teamName === "DC").length;
        return { AC: ac, DC: dc };
    }, [allRows]);

    const teamRows = useMemo<AmcSiteRow[]>(
        () => allRows.filter(row => row.amc.teamName === activeTeam),
        [allRows, activeTeam],
    );

    const serviceCounts = useMemo<Record<AmcServiceTab, number>>(() => {
        return {
            due: teamRows.filter(row => isServiceDue(row.nextServiceDue)).length,
            missed: teamRows.filter(row => isServiceMissed(row.nextServiceDue)).length,
            done: 0,
        };
    }, [teamRows]);

    const rows = useMemo<AmcSiteRow[]>(() => {
        const query = search.trim().toLowerCase();
        return teamRows.filter(row => {
            let matchesTab: boolean;
            if (activeServiceTab === "due") {
                matchesTab = isServiceDue(row.nextServiceDue);
            } else if (activeServiceTab === "missed") {
                matchesTab = isServiceMissed(row.nextServiceDue);
            } else {
                matchesTab = false;
            }
            if (!matchesTab) return false;
            if (!query) return true;

            const contactNames = row.siteContacts.map(c => c.name).join(" ");
            const engineerNames = row.serviceEngineers.map(e => e.name).join(" ");
            const haystack = [
                row.projectName,
                row.siteName,
                row.siteAddress,
                contactNames,
                engineerNames,
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(query);
        });
    }, [teamRows, activeServiceTab, search]);

    const amcActions: ActionItem<AmcSiteRow>[] = [
        {
            label: "View",
            onClick: row => navigate(paths.services.amcView(row.amcId)),
            icon: <Eye className="h-4 w-4" />,
        },
        {
            label: "Edit",
            onClick: row => navigate(paths.services.amcEdit(row.amcId)),
            icon: <Pencil className="h-4 w-4" />,
        },
        {
            label: "Sample Service Report Download",
            onClick: handleSampleDownload,
            icon: <Download className="h-4 w-4" />,
        },
        {
            label: "Upload Filled Service Report",
            onClick: row => setFilledModal({ open: true, amcId: row.amcId }),
            icon: <FileUp className="h-4 w-4" />,
        },
        {
            label: "Upload Signed Service Report",
            onClick: row => setSignedModal({ open: true, amcId: row.amcId }),
            icon: <FileSignature className="h-4 w-4" />,
        },
    ];

    const [colDefs] = useState<ColDef<AmcSiteRow>[]>([
        { field: "projectName", headerName: "Project Name", minWidth: 180 },

        // ── Site Name column with structured tooltip ──────────────────────────
        {
            field: "siteName",
            headerName: "Site Name",
            minWidth: 200,
            cellRenderer: (params: CustomCellRendererProps<AmcSiteRow>) => {
                const site = params.data;
                if (!site) return null;
                return (
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="cursor-help truncate block">
                                    {site.siteName}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="p-2 w-fit">
                                <div className="flex flex-col gap-1 text-[10px]">
                                    <div className="flex items-center gap-1 font-bold text-white border-b border-border/50 pb-0.5">
                                        <MapPin className="h-3 w-3" /> Site Info
                                    </div>
                                    <p>
                                        <span className="text-white">Name:</span>{" "}
                                        {site.siteName || "-"}
                                    </p>
                                    <p>
                                        <span className="text-white">Addr:</span>{" "}
                                        {site.siteAddress || "-"}
                                    </p>
                                    <p>
                                        <span className="text-white">Location:</span>{" "}
                                        {site.siteMapLink ? (
                                            <a
                                                href={site.siteMapLink}
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
            cellRenderer: (params: CustomCellRendererProps<AmcSiteRow>) => {
                const count = params.data?.siteContacts?.length ?? 0;
                if (count === 0) return <span className="text-muted-foreground">—</span>;
                return (
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                                    onClick={() =>
                                        handleOpenContacts(params.data?.siteContacts ?? [])
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
            field: "nextServiceDue",
            headerName: "Next Service Due",
            width: 170,
            sort: "asc",
            cellRenderer: NextServiceDueCell,
        },

        {
            colId: "engineers",
            headerName: "Service Engg",
            width: 142,
            sortable: false,
            cellRenderer: (params: CustomCellRendererProps<AmcSiteRow>) => {
                const count = params.data?.serviceEngineers?.length ?? 0;
                if (count === 0) return <span className="text-muted-foreground">—</span>;
                return (
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                                    onClick={() =>
                                        handleOpenEngineers(params.data?.serviceEngineers ?? [])
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
            colId: "status",
            headerName: "Status",
            width: 150,
            sortable: false,
            cellRenderer: (params: CustomCellRendererProps<AmcSiteRow>) => {
                const value = params.data?.status ?? null;
                if (!value) return <span className="text-muted-foreground">—</span>;
                const statusStyles: Record<string, string> = {
                    Pending: "bg-amber-100 text-amber-800 border-transparent",
                };
                return (
                    <Badge
                        className={cn(
                            "capitalize",
                            statusStyles[value] ??
                                "bg-muted text-muted-foreground border-transparent",
                        )}
                    >
                        {value}
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
            cellRenderer: createActionColumnRenderer(amcActions),
        },
    ]);

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <CardTitle>AMCs</CardTitle>
                        <CardDescription>All AMC / Warranty Services listed</CardDescription>
                    </div>
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
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {tab.label}
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        "text-xs h-4 min-w-4 px-1",
                                        activeTeam === tab.key && "bg-primary/10 text-primary",
                                    )}
                                >
                                    {teamCounts[tab.key]}
                                </Badge>
                            </button>
                        ))}
                    </div>
                    <Button onClick={() => navigate(paths.services.amcCreate)}>
                        <Plus className="h-4 w-4 mr-1" /> Add AMC
                    </Button>
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
                                placeholder="Search AMCs..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-8 w-64"
                            />
                        </div>
                    </div>
                </div>

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

            {/* ── Upload modals ────────────────────────────────────────────── */}
            <UploadFilledServiceReportModal
                open={filledModal.open}
                onOpenChange={open => setFilledModal(prev => ({ ...prev, open }))}
                amcId={filledModal.amcId}
            />
            <UploadSignedServiceReportModal
                open={signedModal.open}
                onOpenChange={open => setSignedModal(prev => ({ ...prev, open }))}
                amcId={signedModal.amcId}
            />
        </Card>
    );
}