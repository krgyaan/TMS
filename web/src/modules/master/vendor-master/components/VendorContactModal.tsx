import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, MapPin, Users } from "lucide-react";
import type { Vendor } from "@/types/api.types";

export function VendorContactModal({
    open,
    onOpenChange,
    data,
    orgName,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: Vendor[];
    orgName: string;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Vendors - {orgName}
                    </DialogTitle>
                    <DialogDescription>Total Vendors: {data.length}</DialogDescription>
                </DialogHeader>
                <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                    {data.length > 0 ? (
                        <div className="space-y-3">
                            {data.map((vendor, index) => (
                                <div key={vendor.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-sm font-medium text-muted-foreground w-8">{index + 1}.</span>
                                                <div className="font-medium">{vendor.name}</div>
                                            </div>
                                            <div className="ml-11 space-y-1">
                                                {vendor.email && (
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Mail className="h-3 w-3" />
                                                        {vendor.email}
                                                    </div>
                                                )}
                                                {vendor.mobile && (
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">{vendor.mobile}</div>
                                                )}
                                                {vendor.address && (
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <MapPin className="h-3 w-3" />
                                                        {vendor.address}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Badge variant={vendor.status ? "default" : "secondary"}>{vendor.status ? "Active" : "Inactive"}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Users className="h-12 w-12 mb-4 opacity-50" />
                            <p>No vendors found for this organization</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
