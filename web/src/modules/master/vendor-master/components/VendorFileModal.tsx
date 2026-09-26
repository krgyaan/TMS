import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText } from "lucide-react";
import type { VendorFile } from "@/types/api.types";

export function VendorFileModal({
    open,
    onOpenChange,
    data,
    orgName,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: VendorFile[];
    orgName: string;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Files - {orgName}
                    </DialogTitle>
                    <DialogDescription>Total Files: {data.length}</DialogDescription>
                </DialogHeader>
                <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                    {data.length > 0 ? (
                        <div className="space-y-3">
                            {data.map((file, index) => {
                                return (
                                    <div key={file.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-sm font-medium text-muted-foreground w-8">{index + 1}.</span>
                                                    <div className="font-medium">{file.name}</div>
                                                </div>
                                                <div className="ml-11 space-y-1">
                                                    <div className="text-sm text-muted-foreground font-mono">{file.filePath}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mb-4 opacity-50" />
                            <p>No files found for this organization</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
