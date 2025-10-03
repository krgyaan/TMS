import { useRef, type ChangeEvent } from "react";
import { Folder, FolderPlus, Upload, FileText, Save, X } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export type DocumentRow = {
    id: string;
    name: string;
    size: number;
    isFolder: boolean;
};

type CompanyDocumentsSectionProps = {
    documents: DocumentRow[];
    onDocumentsChange: (next: DocumentRow[]) => void;
    onRequestSave?: () => void;
    disabled?: boolean;
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

const CompanyDocumentsSection = ({ documents, onDocumentsChange, onRequestSave, disabled }: CompanyDocumentsSectionProps) => {
    const filePickerRef = useRef<HTMLInputElement | null>(null);

    const handleCreateFolder = () => {
        const folderName = window.prompt("Folder name", "New Folder");
        if (folderName === null) return;
        const trimmed = folderName.trim();
        if (!trimmed) return;
        onDocumentsChange([
            ...documents,
            { id: generateId(), name: trimmed, size: 0, isFolder: true },
        ]);
    };

    const handleUploadClick = () => {
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
        }));
        onDocumentsChange([...documents, ...nextDocuments]);
        event.target.value = "";
    };

    const handleRemoveDocument = (id: string) => {
        onDocumentsChange(documents.filter((doc) => doc.id !== id));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>Organize folders and files associated with the company.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" onClick={handleCreateFolder} disabled={disabled}>
                        <FolderPlus className="size-4" />
                        Create Folder
                    </Button>
                    <Button type="button" variant="outline" onClick={handleUploadClick} disabled={disabled}>
                        <Upload className="size-4" />
                        Upload Files
                    </Button>
                    <Button type="button" onClick={onRequestSave} disabled={disabled}>
                        <Save className="size-4" />
                        Save
                    </Button>
                    <input
                        ref={filePickerRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFilesSelected}
                    />
                </div>
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
                                documents.map((doc) => (
                                    <tr key={doc.id} className="border-t">
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                {doc.isFolder ? <Folder className="size-4" /> : <FileText className="size-4" />}
                                                <span>{doc.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-muted-foreground">
                                            {doc.isFolder ? "—" : formatBytes(doc.size)}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveDocument(doc.id)}
                                                disabled={disabled}
                                            >
                                                <X className="size-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};

export default CompanyDocumentsSection;
