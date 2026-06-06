import React, { useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileText, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { projectDashboardApi } from "@/services/api/project-dashboard.api";
import { Button } from "@/components/ui/button";
import type { ColDef, RowSelectedEvent } from "ag-grid-community";
import DataTable from "@/components/ui/data-table";
import { paths } from "@/app/routes/paths";

interface VersionRow {
    label: string;
    createdAt: string;
    isLatest: boolean;
    path: string;
    hash: string;
}

const parseDateFromLabel = (label: string): Date => {
    if (label === "v-original") return new Date(0);
    const match = label.match(/^v-(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/);
    if (match) {
        const [, y, m, d, h, min, s] = match.map(Number);
        return new Date(y, m - 1, d, h, min, s);
    }
    return new Date(0);
};

const formatVersionDate = (label: string): string => {
    const d = parseDateFromLabel(label);
    if (d.getTime() === 0) return "Original";
    return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const PoPdfVersionsPage: React.FC = () => {
    const { projectId, poId } = useParams<{ projectId: string; poId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewLabel, setPreviewLabel] = useState<string | null>(null);

    const poNum = Number(poId);

    const { data: poData } = useQuery({
        queryKey: ["purchase-order", poNum],
        queryFn: () => projectDashboardApi.getPurchaseOrder(poNum),
        enabled: !!poNum,
    });

    const { data: versionsData } = useQuery({
        queryKey: ["purchase-order", poNum, "pdf-versions"],
        queryFn: () => projectDashboardApi.getPurchaseOrderPdfVersions(poNum),
        enabled: !!poNum,
    });

    const rows = useMemo<VersionRow[]>(() => {
        if (!versionsData) return [];
        const entries = Object.entries(versionsData);
        const labels = entries.map(([label]) => label).sort((a, b) => {
            const da = parseDateFromLabel(a).getTime();
            const db = parseDateFromLabel(b).getTime();
            return db - da; // newest first
        });

        return labels.map((label, i) => ({
            label,
            createdAt: formatVersionDate(label),
            isLatest: i === 0,
            path: versionsData[label].path,
            hash: versionsData[label].hash,
        }));
    }, [versionsData]);

    const versionPdfUrl = useCallback(
        (label: string) => projectDashboardApi.getPurchaseOrderPdfUrl(poNum, label),
        [poNum],
    );

    const handleRowSelected = useCallback(
        (event: RowSelectedEvent) => {
            const row: VersionRow | undefined = event.data;
            if (row && event.node.isSelected()) {
                setPreviewUrl(versionPdfUrl(row.label));
                setPreviewLabel(row.label);
            }
        },
        [versionPdfUrl],
    );

    const handleDelete = useCallback(
        async (label: string) => {
            await projectDashboardApi.deletePdfVersion(poNum, label);
            queryClient.invalidateQueries({ queryKey: ["purchase-order", poNum, "pdf-versions"] });
            if (previewLabel === label) {
                setPreviewUrl(null);
                setPreviewLabel(null);
            }
        },
        [poNum, queryClient, previewLabel],
    );

    const colDefs = useMemo<ColDef<VersionRow>[]>(
        () => [
            {
                field: "label",
                headerName: "Version",
                width: 200,
                cellRenderer: (params: { value: string }) => (
                    <span className="font-mono text-xs">{params.value}</span>
                ),
            },
            {
                field: "createdAt",
                headerName: "Generated At",
                width: 200,
            },
            {
                headerName: "Status",
                width: 100,
                cellRenderer: (params: { data: VersionRow }) =>
                    params.data.isLatest ? (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            Latest
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground">Older</span>
                    ),
            },
            {
                headerName: "Actions",
                width: 130,
                cellRenderer: (params: { data: VersionRow }) => (
                    <div className="flex items-center gap-1">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                                window.open(versionPdfUrl(params.data.label), "_blank")
                            }
                        >
                            <Download className="h-3.5 w-3.5" />
                        </Button>
                        {!params.data.isLatest && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(params.data.label)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                ),
            },
        ],
        [versionPdfUrl, handleDelete],
    );

    const poNumber = poData?.poNumber ?? `PO #${poId}`;

    return (
        <div className="mx-auto max-w-7xl space-y-4 p-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                        navigate(
                            paths.operations.projectDashboard(Number(projectId)),
                        )
                    }
                >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back
                </Button>
                <div>
                    <h1 className="text-xl font-semibold">
                        PDF Versions — {poNumber}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Select a version to preview, or download directly.
                    </p>
                </div>
            </div>

            {/* Main content: table + preview */}
            <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-4 lg:grid-cols-[480px_minmax(0,1fr)]">
                {/* Table panel */}
                <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
                    <div className="border-b border-border px-5 py-4">
                        <h3 className="text-sm font-semibold text-foreground">
                            Versions
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {rows.length} version{rows.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <div className="p-2">
                        <DataTable
                            data={rows}
                            columnDefs={colDefs}
                            gridOptions={{
                                rowSelection: "single",
                                onRowSelected: handleRowSelected,
                                domLayout: "autoHeight",
                                pagination: false,
                            }}
                        />
                    </div>
                </div>

                {/* Preview panel */}
                <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
                    {previewUrl ? (
                        <>
                            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <span className="text-sm font-medium text-foreground">
                                        {previewLabel}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button asChild variant="outline" size="sm">
                                        <a href={previewUrl} target="_blank" rel="noreferrer">
                                            Open
                                        </a>
                                    </Button>
                                    <Button asChild size="sm">
                                        <a href={previewUrl} download>
                                            <Download className="mr-1 h-3.5 w-3.5" />
                                            Download
                                        </a>
                                    </Button>
                                </div>
                            </div>
                            <div className="flex-1 p-4">
                                <iframe
                                    src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                                    title="PDF Preview"
                                    className="h-full w-full rounded-xl border border-border bg-white"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                            <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
                            <h4 className="text-sm font-medium text-foreground">
                                Select a version to preview
                            </h4>
                            <p className="mt-1 max-w-md text-sm text-muted-foreground">
                                Click a row in the table to preview the PDF here.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PoPdfVersionsPage;
