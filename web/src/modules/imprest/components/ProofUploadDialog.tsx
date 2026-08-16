import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { FileUploader } from "@/components/file-upload";

export const ProofUploadDialog: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    files: string[];
    setFiles: (files: string[]) => void;
    isPending: boolean;
    onSubmit: (e?: React.FormEvent) => void;
}> = ({ open, onOpenChange, files, setFiles, isPending, onSubmit }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle className="text-xl">Upload Proof Documents</DialogTitle>
                <DialogDescription>Drag & drop files here or click to browse. Supported: images and PDF.</DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="space-y-6">
                <FileUploader
                    context="employee-imprest"
                    value={files}
                    onChange={setFiles}
                />

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>

                    <Button type="submit" disabled={files.length === 0 || isPending}>
                        {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Upload Files
                    </Button>
                </div>
            </form>
        </DialogContent>
    </Dialog>
);
