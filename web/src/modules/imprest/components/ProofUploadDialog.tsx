import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export const ProofUploadDialog: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    files: File[];
    setFiles: (files: File[]) => void;
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
                <label
                    htmlFor="proof-upload"
                    className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-muted/50 transition"
                >
                    <div className="text-muted-foreground">
                        <p className="font-medium">Click to upload files here</p>
                        <p className="text-xs mt-1">PNG, JPG, PDF allowed</p>
                    </div>

                    <Input
                        id="proof-upload"
                        type="file"
                        multiple
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={e => setFiles(Array.from(e.target.files ?? []))}
                    />
                </label>

                {files.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-auto border rounded-md p-3 bg-muted/30">
                        <p className="text-sm font-medium">
                            {files.length} file{files.length > 1 && "s"} selected
                        </p>

                        <ul className="text-xs space-y-1">
                            {files.map((file, idx) => (
                                <li key={idx} className="flex justify-between items-center bg-background px-2 py-1 rounded border">
                                    <span className="truncate">{file.name}</span>
                                    <span className="text-muted-foreground ml-2">{(file.size / 1024).toFixed(1)} KB</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

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