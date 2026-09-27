import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText } from "lucide-react";
import type { VendorGst } from "@/types/api.types";

export function VendorGSTModal({
    open,
    onOpenChange,
    data,
    orgName,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: VendorGst[];
    orgName: string;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        GST Numbers - {orgName}
                    </DialogTitle>
                    <DialogDescription>Total GST Numbers: {data.length}</DialogDescription>
                </DialogHeader>
                <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                    {data.length > 0 ? (
                        <div className="space-y-3">
                            {data.map((gst, index) => (
                                <div key={gst.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-muted-foreground w-8">{index + 1}.</span>
                                            <div>
                                                <div className="font-medium">{gst.gstState}</div>
                                                <div className="text-sm text-muted-foreground font-mono mt-1">{gst.gstNo}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <Badge variant={gst.status ? "default" : "secondary"}>{gst.status ? "Active" : "Inactive"}</Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mb-4 opacity-50" />
                            <p>No GST numbers found for this organization</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
