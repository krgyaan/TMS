import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
    useAddProjectClosureDocument,
    useDeleteProjectClosureDocument,
    useProjectClosureDocuments,
} from "@/hooks/api/useProjectClosure";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { fileUploadService } from "@/services/api/file-upload.service";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { FileText, Plus } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import {
    CLOSURE_DOCUMENTS,
    CLOSURE_DOCUMENT_CATEGORIES,
    TOTAL_CLOSURE_DOCUMENTS,
    type ProjectClosureDocumentRow,
} from "../helpers/projectClosure.types";
import { ProjectClosureUploadDialog } from "./ProjectClosureUploadDialog";

interface ProjectClosureSectionProps {
    projectId: number | null;
}

interface ClosureChecklistRow {
    documentName: string;
    category: string;
    row: ProjectClosureDocumentRow | null;
}

interface UploadPrefill {
    documentName?: string;
    files?: string[];
}

const DOCUMENT_CATEGORY: Record<string, string> = Object.entries(CLOSURE_DOCUMENT_CATEGORIES).reduce(
    (acc, [category, documents]) => {
        for (const document of documents) acc[document] = category;
        return acc;
    },
    {} as Record<string, string>
);

export const ProjectClosureSection: React.FC<ProjectClosureSectionProps> = ({ projectId }) => {
    const { data, isLoading } = useProjectClosureDocuments(projectId);
    const addMutation = useAddProjectClosureDocument(projectId);
    const deleteMutation = useDeleteProjectClosureDocument(projectId);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [uploadPrefill, setUploadPrefill] = useState<UploadPrefill>({});

    const checklistRows = useMemo<ClosureChecklistRow[]>(() => {
        const rowsByName = new Map((data ?? []).map(r => [r.documentName, r]));
        return CLOSURE_DOCUMENTS.map(documentName => ({
            documentName,
            category: DOCUMENT_CATEGORY[documentName],
            row: rowsByName.get(documentName) ?? null,
        }));
    }, [data]);

    const uploadedCount = useMemo(() => (data ?? []).length, [data]);

    const openUploadDialog = useCallback((prefill: UploadPrefill = {}) => {
        setUploadPrefill(prefill);
        setDialogOpen(true);
    }, []);

    const handleDialogSubmit = useCallback(
        (payload: { documentName: string; files: string[] }) => {
            addMutation.mutate(payload, {
                onSuccess: () => setDialogOpen(false),
            });
        },
        [addMutation]
    );

    const handleDelete = useCallback((row: ClosureChecklistRow) => {
        if (!row.row) return;
        if (!window.confirm(`Delete "${row.documentName}"? All uploaded files will be permanently removed.`)) return;
        deleteMutation.mutate(row.documentName);
    }, [deleteMutation]);

    const columns = useMemo<ColDef<ClosureChecklistRow>[]>(
        () => [
            {
                field: "documentName",
                headerName: "Document Name",
                sortable: true,
                filter: true,
                flex: 1,
                minWidth: 180,
                cellRenderer: (p: CustomCellRendererProps<ClosureChecklistRow>) => (
                    <span className="text-sm font-medium">{p.value}</span>
                ),
            },
            {
                headerName: "Status",
                filter: false,
                sortable: false,
                width: 110,
                cellRenderer: (p: CustomCellRendererProps<ClosureChecklistRow>) =>
                    p.data?.row ? (
                        <Badge variant="success">Uploaded</Badge>
                    ) : (
                        <Badge variant="outline">Pending</Badge>
                    ),
            },
            {
                headerName: "Files",
                filter: false,
                sortable: false,
                flex: 2,
                minWidth: 220,
                cellRenderer: (p: CustomCellRendererProps<ClosureChecklistRow>) => {
                    const files = p.data?.row?.files ?? [];
                    if (files.length === 0) return <span className="text-muted-foreground text-sm">—</span>;
                    return (
                        <div className="flex flex-wrap gap-1.5">
                            {files.map((filePath, index) => (
                                <span key={filePath}>
                                    <a
                                        href={fileUploadService.getFileUrl(filePath)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Badge
                                            variant="secondary"
                                            className="gap-1 cursor-pointer hover:bg-primary/20"
                                        >
                                            <FileText className="h-3 w-3" />
                                            file-{index + 1}
                                        </Badge>
                                    </a>
                                </span>
                            ))}
                        </div>
                    );
                },
            },
            {
                headerName: "Uploaded By",
                filter: false,
                sortable: false,
                width: 140,
                cellRenderer: (p: CustomCellRendererProps<ClosureChecklistRow>) => (
                    <span className="text-sm">{p.data?.row?.uploadedByName ?? "—"}</span>
                ),
            },
            {
                headerName: "Last Updated",
                filter: false,
                sortable: false,
                width: 160,
                cellRenderer: (p: CustomCellRendererProps<ClosureChecklistRow>) => (
                    <span className="text-sm">{formatDateTime(p.data?.row?.updatedAt)}</span>
                ),
            }
        ],
        [openUploadDialog, handleDelete]
    );

    if (!projectId) return null;

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <CardTitle className="text-base font-semibold">Project Closure Documents</CardTitle>
                        <CardDescription>
                            {uploadedCount} of {TOTAL_CLOSURE_DOCUMENTS} required documents uploaded
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={uploadedCount === TOTAL_CLOSURE_DOCUMENTS ? "success" : "secondary"}>
                            {uploadedCount}/{TOTAL_CLOSURE_DOCUMENTS}
                        </Badge>
                        <CardAction>
                            <Button size="sm" variant="default" onClick={() => openUploadDialog()}>
                                <Plus className="mr-1.5 h-4 w-4" />
                                Upload Documents
                            </Button>
                        </CardAction>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
                <DataTable
                    data={checklistRows}
                    columnDefs={columns}
                    gridOptions={{
                        domLayout: "autoHeight",
                    }}
                />
            </CardContent>
            <ProjectClosureUploadDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                projectId={projectId}
                initialDocumentName={uploadPrefill.documentName}
                initialFiles={uploadPrefill.files}
                documents={data ?? []}
                isSubmitting={addMutation.isPending}
                onSubmit={handleDialogSubmit}
            />
        </Card>
    );
};
