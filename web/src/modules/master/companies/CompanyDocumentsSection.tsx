import { useEffect, useRef, type ChangeEvent } from "react";
import { Eye, Folder, Upload, FileText, Save, X } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedbackMessage, type FeedbackTone } from "@/components/ui/feedback-message";
import { Separator } from "@/components/ui/separator";

export type DocumentRow = {
    id: string;
    name: string;
    size: number;
    isFolder: boolean;
    file?: File | null;
    previewUrl?: string | null;
    url?: string | null;
};

type CompanyDocumentsSectionProps = {
    documents: DocumentRow[];
    onDocumentsChange: (next: DocumentRow[]) => void;
    onSave: () => void;
    saving: boolean;
    serverMessage: string | null;
    serverError: string | null;
    disabled?: boolean;
    helperText?: string | null;
};

const generateId = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatBytes = (size: number) => {
    if (!size) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const idx = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
    const value = size / Math.pow(1024, idx);
    const formatted = idx === 0 ? value.toFixed(0) : value.toFixed(1);
    return `${formatted} ${units[idx]}`;
};

const CompanyDocumentsSection = ({
    documents,
    onDocumentsChange,
    onSave,
    saving,
    serverMessage,
    serverError,
    disabled,
    helperText,
}: CompanyDocumentsSectionProps) => {
    const filePickerRef = useRef<HTMLInputElement | null>(null);
    const previewUrlsRef = useRef(new Map<string, string>());

    const toolbarDisabled = Boolean(disabled) || saving;
    const actionDisabled = saving;

    useEffect(() => {
        const currentUrls = new Map<string, string>();
        documents.forEach((doc) => {
            if (doc.previewUrl) {
                currentUrls.set(doc.id, doc.previewUrl);
            }
        });

        previewUrlsRef.current.forEach((url, id) => {
            if (!currentUrls.has(id) && url.startsWith("blob:")) {
                URL.revokeObjectURL(url);
                previewUrlsRef.current.delete(id);
            }
        });

        currentUrls.forEach((url, id) => {
            if (!previewUrlsRef.current.has(id)) {
                previewUrlsRef.current.set(id, url);
            }
        });
    }, [documents]);

    useEffect(() => {
        const storedUrls = previewUrlsRef.current;
        return () => {
            storedUrls.forEach((url) => {
                if (url.startsWith("blob:")) {
                    URL.revokeObjectURL(url);
                }
            });
            storedUrls.clear();
        };
    }, []);

    const handleUploadClick = () => {
        if (toolbarDisabled) return;
        filePickerRef.current?.click();
    };

    const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        if (files.length === 0) return;
        const nextDocuments = files.map((file) => ({
            id: generateId(),
            name: file.name,
            size: file.size,
            isFolder: false,
            file,
            previewUrl: URL.createObjectURL(file),
        }));
        onDocumentsChange([...documents, ...nextDocuments]);
        event.target.value = "";
    };

    const handleRemoveDocument = (id: string) => {
        if (actionDisabled) return;
        onDocumentsChange(documents.filter((doc) => doc.id !== id));
    };

    const handlePreviewDocument = (doc: DocumentRow) => {
        if (doc.isFolder) return;
        const target = doc.previewUrl ?? doc.url;
        if (!target) return;
        const popup = window.open(target, "_blank", "noopener,noreferrer");
        if (!popup) {
            // Fallback: attempt to copy link so the user can open it manually
            if (navigator.clipboard?.writeText) {
                void navigator.clipboard.writeText(target).catch(() => undefined);
            }
        }
    };

    const statusTone: FeedbackTone | null = serverError ? "error" : serverMessage ? "success" : null;
    const statusText = serverError ?? serverMessage ?? null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>Upload and manage files associated with the company.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" onClick={handleUploadClick} disabled={toolbarDisabled}>
                        <Upload className="size-4" />
                        Upload Files
                    </Button>
                    <Button type="button" onClick={onSave} disabled={toolbarDisabled}>
                        <Save className="size-4" />
                        {saving ? "Saving..." : "Save"}
                    </Button>
                    <input
                        ref={filePickerRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFilesSelected}
                    />
                </div>
                {helperText ? (
                    <FeedbackMessage tone="warning" description={helperText} floating={false} />
                ) : null}
                <Separator />
                <div className="overflow-hidden rounded-md border border-border">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-muted">
                            <tr>
                                <th className="px-4 py-2 font-medium">Name</th>
                                <th className="px-4 py-2 font-medium">Size</th>
                                <th className="px-4 py-2 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                                        No documents added yet.
                                    </td>
                                </tr>
                            ) : (
                                documents.map((doc) => {
                                    const canPreview = !doc.isFolder && Boolean(doc.previewUrl ?? doc.url);
                                    return (
                                        <tr key={doc.id} className="border-t">
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    {doc.isFolder ? <Folder className="size-4" /> : <FileText className="size-4" />}
                                                    <span>{doc.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-muted-foreground">
                                                {doc.isFolder ? "-" : formatBytes(doc.size)}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handlePreviewDocument(doc)}
                                                        disabled={actionDisabled || !canPreview}
                                                        aria-label={`Preview ${doc.name}`}
                                                    >
                                                        <Eye className="size-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveDocument(doc.id)}
                                                        disabled={actionDisabled}
                                                        aria-label={`Remove ${doc.name}`}
                                                    >
                                                        <X className="size-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {statusTone && statusText ? (
                    <FeedbackMessage tone={statusTone} description={statusText} />
                ) : null}
            </CardContent>
        </Card>
    );
};

export default CompanyDocumentsSection;