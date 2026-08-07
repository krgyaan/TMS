import { useMemo, useState } from "react";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import {
    FileUp,
    FileSignature,
    Loader2,
    FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/ui/data-table";
import { useAmcServices } from "@/hooks/api/useAmcServices";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { AmcServiceDetail } from "@/modules/services/amc/helpers/amc.types";
import { serviceFileUrl } from "@/modules/services/amc/helpers/amc.types";
import { UploadServiceReportModal } from "./components/UploadServiceReportModal";
import type { ServicePathField } from "@/modules/services/amc/helpers/amc.types";

type ServiceTab = "pending" | "done";

const TABS: { key: ServiceTab; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "done", label: "Done" },
];

const fmtDate = (value?: string | null) =>
    value ? format(new Date(`${value}T00:00:00`), "MMM d, yyyy") : "—";

function DueDateCell({ value }: { value: string }) {
    const due = new Date(`${value}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const crossed = due.getTime() < today.getTime();
    return (
        <span className={crossed ? "font-medium text-red-600" : "font-medium"}>
            {fmtDate(value)}
        </span>
    );
}

function FileCell({ path }: { path: string | null }) {
    if (!path) {
        return <span className="text-muted-foreground">—</span>;
    }
    return (
        <a
            href={serviceFileUrl(path)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
        >
            <FileText className="h-3.5 w-3.5" /> View
        </a>
    );
}

export default function AmcServicesListPage() {
    const { data: services = [], isLoading } = useAmcServices();
    const [activeTab, setActiveTab] = useState<ServiceTab>("pending");
    const [uploadModal, setUploadModal] = useState<{
        open: boolean;
        serviceId: number | null;
        field: ServicePathField;
    }>({ open: false, serviceId: null, field: "filled-service-report" });

    const counts = useMemo(
        () => ({
            pending: services.filter(s => s.status !== "Done").length,
            done: services.filter(s => s.status === "Done").length,
        }),
        [services],
    );

    const rows = useMemo(() => {
        return services.filter(s =>
            activeTab === "done" ? s.status === "Done" : s.status !== "Done",
        );
    }, [services, activeTab]);

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
    ];

    const [colDefs] = useState<ColDef<AmcServiceDetail>[]>(() => [
        {
            colId: "projectName",
            headerName: "Project Name",
            width: 230,
            valueGetter: params => params.data?.amc?.projectName ?? "—",
            cellRenderer: (params: CustomCellRendererProps<AmcServiceDetail>) => (
                <span>{params.data?.amc?.projectName ?? "—"}</span>
            ),
        },
        {
            colId: "siteName",
            headerName: "Site Name",
            width: 180,
            valueGetter: params => params.data?.site?.name ?? "—",
            cellRenderer: (params: CustomCellRendererProps<AmcServiceDetail>) => (
                <span>{params.data?.site?.name ?? "—"}</span>
            ),
        },
        {
            colId: "contact",
            headerName: "Contact details",
            width: 190,
            cellRenderer: (params: CustomCellRendererProps<AmcServiceDetail>) => {
                const contact = params.data?.site?.contacts?.[0];
                if (!contact) return <span className="text-muted-foreground">—</span>;
                return (
                    <div className="flex flex-col">
                        <span className="font-medium">{contact.name}</span>
                        <span className="text-xs text-muted-foreground">{contact.mobile}</span>
                    </div>
                );
            },
        },
        {
            colId: "serviceNo",
            headerName: "Service No.",
            width: 100,
            valueGetter: params => params.data?.serviceNo ?? "—",
        },
        {
            colId: "serviceDueDate",
            headerName: "Service Due Date",
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
            colId: "serviceEngineer",
            headerName: "Service Engg Name",
            width: 170,
            valueGetter: params => params.data?.amc?.serviceEngineers?.[0]?.name ?? "—",
            cellRenderer: (params: CustomCellRendererProps<AmcServiceDetail>) => (
                <span>{params.data?.amc?.serviceEngineers?.[0]?.name ?? "—"}</span>
            ),
        },
        {
            colId: "teamName",
            headerName: "TE Name",
            width: 100,
            valueGetter: params => params.data?.amc?.teamName ?? "—",
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
            colId: "filledReport",
            headerName: "Filled Report",
            width: 130,
            valueGetter: params => params.data?.filledReport ?? null,
            cellRenderer: (params: CustomCellRendererProps<AmcServiceDetail>) => (
                <FileCell path={params.data?.filledReport ?? null} />
            ),
        },
        {
            colId: "signedReport",
            headerName: "Signed Report",
            width: 130,
            valueGetter: params => params.data?.signedReport ?? null,
            cellRenderer: (params: CustomCellRendererProps<AmcServiceDetail>) => (
                <FileCell path={params.data?.signedReport ?? null} />
            ),
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
    ]);

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <CardTitle>AMC Services</CardTitle>
                <CardDescription>
                    Scheduled service visits per site. Upload filled / signed reports for each visit.
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 px-0">
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg mb-4 mx-6">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                activeTab === tab.key
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {tab.label}
                            <Badge
                                variant="secondary"
                                className={cn(
                                    "text-xs h-4 min-w-4 px-1",
                                    activeTab === tab.key && "bg-primary/10 text-primary",
                                )}
                            >
                                {counts[tab.key]}
                            </Badge>
                        </button>
                    ))}
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

            <UploadServiceReportModal
                open={uploadModal.open}
                onOpenChange={open => setUploadModal(prev => ({ ...prev, open }))}
                serviceId={uploadModal.serviceId}
                field={uploadModal.field}
            />
        </Card>
    );
}
