import { useForm, useWatch } from "react-hook-form";
import { FileUploader, parseFileMeta } from "@/components/file-upload";
import { SelectField } from "@/components/form/SelectField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    useAddProjectClosureDocument,
    useDeleteProjectClosureDocument,
    useProjectClosureDocuments,
} from "@/hooks/api/useProjectClosure";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { fileUploadService } from "@/services/api/file-upload.service";
import { FileText, Save, Trash2, Upload } from "lucide-react";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
    CLOSURE_DOCUMENTS,
    CLOSURE_DOCUMENT_CATEGORIES,
    TOTAL_CLOSURE_DOCUMENTS,
    type ProjectClosureDocumentRow,
} from "../helpers/projectClosure.types";

interface ProjectClosureSectionProps {
    projectId: number | null;
}

interface ClosureChecklistRow {
    documentName: string;
    category: string;
    row: ProjectClosureDocumentRow | null;
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

    const form = useForm<{ documentName: string | undefined }>({
        defaultValues: { documentName: undefined },
    });
    const { control, handleSubmit, setValue, reset } = form;
    const documentName = useWatch({ control, name: "documentName" });

    const [files, setFiles] = useState<string[]>([]);
    const prevDocumentNameRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (documentName && documentName !== prevDocumentNameRef.current) {
            setFiles(data?.find(r => r.documentName === documentName)?.files ?? []);
        }
        prevDocumentNameRef.current = documentName;
    }, [documentName, data]);

    const documentOptions = useMemo(
        () =>
            Object.entries(CLOSURE_DOCUMENT_CATEGORIES).flatMap(([category, documents]) =>
                documents.map(document => ({ value: document, label: document, description: category }))
            ),
        []
    );

    const checklistRows = useMemo<ClosureChecklistRow[]>(() => {
        const rowsByName = new Map((data ?? []).map(r => [r.documentName, r]));
        return CLOSURE_DOCUMENTS.map(documentName => ({
            documentName,
            category: DOCUMENT_CATEGORY[documentName],
            row: rowsByName.get(documentName) ?? null,
        }));
    }, [data]);

    const uploadedCount = useMemo(() => (data ?? []).length, [data]);

    const onSubmit = handleSubmit(values => {
        if (!values.documentName) {
            toast.error("Please select a document type");
            return;
        }
        if (files.length === 0) {
            toast.error("Please upload at least one file");
            return;
        }
        addMutation.mutate(
            { documentName: values.documentName, files },
            {
                onSuccess: () => {
                    setFiles([]);
                    reset();
                },
            }
        );
    });

    const handlePrefill = useCallback((row: ClosureChecklistRow) => {
        setValue("documentName", row.documentName);
        setFiles(row.row?.files ?? []);
    }, [setValue]);

    const handleDelete = useCallback((row: ClosureChecklistRow) => {
        if (!row.row) return;
        if (!window.confirm(`Delete "${row.documentName}"? All uploaded files will be permanently removed.`)) return;
        deleteMutation.mutate(row.documentName);
    }, [deleteMutation]);

    const columns = useMemo<ColDef<ClosureChecklistRow>[]>(
        () => [
            {
                field: "category",
                headerName: "Category",
                sortable: true,
                filter: true,
                width: 130,
            },
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
                        <div className="flex flex-col gap-0.5">
                            {files.map(filePath => (
                                <a
                                    key={filePath}
                                    href={fileUploadService.getFileUrl(filePath)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-sm text-primary hover:underline truncate"
                                >
                                    <FileText className="h-3.5 w-3.5 shrink-0" />
                                    {parseFileMeta(filePath).displayName}
                                </a>
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
            },
            {
                headerName: "Actions",
                filter: false,
                sortable: false,
                width: 150,
                pinned: "right" as "right" | "left",
                cellRenderer: (p: CustomCellRendererProps<ClosureChecklistRow>) => (
                    <div className="flex items-center gap-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7"
                                        onClick={() => handlePrefill(p.data!)}
                                    >
                                        <Upload className="h-3.5 w-3.5" />
                                        Upload
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{p.data?.row ? "Add more files" : "Upload files"}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        {p.data?.row && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(p.data!)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                ),
            },
        ],
        [handlePrefill, handleDelete]
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
                    <Badge variant={uploadedCount === TOTAL_CLOSURE_DOCUMENTS ? "success" : "secondary"}>
                        {uploadedCount}/{TOTAL_CLOSURE_DOCUMENTS}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
                <form onSubmit={onSubmit} className="rounded-lg border bg-muted/30">
                    <div className="grid grid-cols-12 gap-4 p-4 items-start">
                        <div className="col-span-12 md:col-span-4">
                            <SelectField
                                control={control}
                                name="documentName"
                                label="File Type Selector"
                                options={documentOptions}
                                placeholder="Select Required Document Name"
                            />
                        </div>
                        <div className="col-span-12 md:col-span-6">
                            <FileUploader
                                context="project-closure"
                                value={files}
                                onChange={setFiles}
                                label="Upload Files"
                            />
                        </div>
                        <div className="col-span-12 md:col-span-2 md:pt-7">
                            <Button type="submit" className="w-full gap-2" disabled={addMutation.isPending}>
                                <Save className="h-4 w-4" />
                                {addMutation.isPending ? "Saving..." : "Save"}
                            </Button>
                        </div>
                    </div>
                </form>

                <DataTable
                    data={checklistRows}
                    columnDefs={columns}
                    gridOptions={{
                        domLayout: "autoHeight",
                    }}
                />
            </CardContent>
        </Card>
    );
};
