import React, { useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileText, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { vendorWorkOrderApi } from "@/services/api/vendor-work-order.api";
import { Button } from "@/components/ui/button";
import { paths } from "@/app/routes/paths";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface VersionEntry {
    label: string;
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

const VendorWoPdfVersionsPage: React.FC = () => {
    const { projectId, woId } = useParams<{ projectId: string; woId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewLabel, setPreviewLabel] = useState<string | null>(null);

    const vwoNum = Number(woId);

    const { data: vwoData } = useQuery({
        queryKey: ["vendor-work-order", vwoNum],
        queryFn: () => vendorWorkOrderApi.getById(vwoNum),
        enabled: !!vwoNum,
    });

    const { data: versionsData } = useQuery({
        queryKey: ["vendor-work-order", vwoNum, "pdf-versions"],
        queryFn: () => vendorWorkOrderApi.getPdfVersions(vwoNum),
        enabled: !!vwoNum,
    });

    const sortedEntries = useMemo<VersionEntry[]>(() => {
        if (!versionsData) return [];
        return Object.entries(versionsData)
            .map(([label, v]) => ({ label, ...v }))
            .sort((a, b) => parseDateFromLabel(b.label).getTime() - parseDateFromLabel(a.label).getTime());
    }, [versionsData]);

    const versionPdfUrl = useCallback(
        (label: string) => vendorWorkOrderApi.getPdfDownloadUrl(vwoNum, label),
        [vwoNum],
    );

    const handleSelectVersion = useCallback(
        (label: string) => {
            setPreviewUrl(versionPdfUrl(label));
            setPreviewLabel(label);
        },
        [versionPdfUrl],
    );

    const handleDelete = useCallback(
        async (label: string) => {
            await vendorWorkOrderApi.deletePdfVersion(vwoNum, label);
            queryClient.invalidateQueries({ queryKey: ["vendor-work-order", vwoNum, "pdf-versions"] });
            if (previewLabel === label) {
                setPreviewUrl(null);
                setPreviewLabel(null);
            }
        },
        [vwoNum, queryClient, previewLabel],
    );

    const woNumber = vwoData?.woNumber ?? `WO #${woId}`;

    return (
        <Card>
            <CardHeader className="flex items-center justify-between">
                <div>
                    <CardTitle>
                            PDF Versions — {woNumber}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                        Select a version to preview, or download directly.
                    </CardDescription>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                        navigate(paths.operations.projectDashboard(Number(projectId)))
                    }
                >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back
                </Button>
            </CardHeader>

            <CardContent className="grid h-[calc(100vh-220px)] grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
                    <div className="border-b border-border px-5 py-4">
                        <h3 className="text-sm font-semibold text-foreground">
                            Versions
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {sortedEntries.length} version{sortedEntries.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <div className="space-y-2 overflow-y-auto p-4">
                        {sortedEntries.map((entry, i) => {
                            const active = previewLabel === entry.label;
                            const isLatest = i === 0;

                            return (
                                <button
                                    key={entry.label}
                                    type="button"
                                    onClick={() => handleSelectVersion(entry.label)}
                                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                                        active
                                            ? "border-primary bg-primary/5 shadow-sm"
                                            : "border-border bg-background hover:border-primary/40 hover:bg-accent/40"
                                    }`}
                                >
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium text-foreground">
                                            {entry.label}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {isLatest && (
                                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                                    Latest
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(versionPdfUrl(entry.label), "_blank");
                                                }}
                                                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                            </button>
                                            {!isLatest && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(entry.label);
                                                    }}
                                                    className="rounded-md p-1 text-destructive/60 hover:bg-accent hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {formatVersionDate(entry.label)}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>

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
                                Click a version from the sidebar to preview the PDF here.
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default VendorWoPdfVersionsPage;
