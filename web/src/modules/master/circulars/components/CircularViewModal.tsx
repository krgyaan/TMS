import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Circular } from "@/types/api.types";
import { Calendar, User, FileText, Download, ExternalLink, ShieldCheck, ShieldAlert } from "lucide-react";

type CircularViewModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    circular?: Circular | null;
};

const getFileUrl = (path?: string | null) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const baseUrl = import.meta.env.VITE_API_URL || "";
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
};

const formatDate = (dateStr?: string | Date | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};

export const CircularViewModal = ({ open, onOpenChange, circular }: CircularViewModalProps) => {
    if (!circular) return null;

    const fileUrl = getFileUrl(circular.file);
    const fileExt = circular.file.split(".").pop()?.toLowerCase();
    const isImage = ["jpg", "jpeg", "png", "gif"].includes(fileExt || "");
    const isPdf = fileExt === "pdf";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] p-0 gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 bg-muted/20">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <DialogTitle className="text-xl font-semibold tracking-tight">{circular.title}</DialogTitle>
                                <Badge variant={circular.status ? "default" : "secondary"} className={circular.status ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-200" : "bg-muted text-muted-foreground"}>
                                    {circular.status ? "Active Notice" : "Inactive"}
                                </Badge>
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1.5">
                                <User className="h-3.5 w-3.5" />
                                Uploaded by <span className="font-medium text-foreground">{circular.uploaded_by}</span>
                                <span className="text-muted-foreground/60">•</span>
                                <span>Uploaded on {formatDate(circular.createdAt)}</span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Separator />

                {/* Content Details */}
                <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {/* Validity Metadata */}
                    <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-muted-foreground/10">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                Valid From
                            </span>
                            <p className="text-sm font-semibold text-foreground">{formatDate(circular.valid_from)}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                Expires On
                            </span>
                            <p className="text-sm font-semibold text-foreground">{formatDate(circular.expires_on)}</p>
                        </div>
                    </div>

                    {/* Preview Section */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            Document Preview
                        </h4>
                        
                        {isPdf ? (
                            <div className="border rounded-xl overflow-hidden shadow-inner bg-muted/40 h-[350px]">
                                <iframe 
                                    src={`${fileUrl}#toolbar=0`} 
                                    className="w-full h-full" 
                                    title={circular.title}
                                />
                            </div>
                        ) : isImage ? (
                            <div className="border rounded-xl overflow-hidden shadow-inner bg-muted/10 p-2 flex items-center justify-center max-h-[350px]">
                                <img 
                                    src={fileUrl} 
                                    alt={circular.title} 
                                    className="max-w-full max-h-[330px] object-contain rounded-lg shadow-sm"
                                />
                            </div>
                        ) : (
                            <div className="border border-dashed rounded-xl p-8 flex flex-col items-center justify-center bg-muted/20 text-center">
                                <FileText className="h-12 w-12 text-muted-foreground/60 mb-2" />
                                <p className="text-sm font-medium text-foreground">Preview not available</p>
                                <p className="text-xs text-muted-foreground mt-1">This document format ({fileExt?.toUpperCase()}) cannot be previewed in the browser.</p>
                            </div>
                        )}
                    </div>
                </div>

                <Separator />

                {/* Footer Actions */}
                <DialogFooter className="px-6 py-4 bg-muted/20">
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        <Button variant="secondary" onClick={() => window.open(fileUrl, "_blank")} className="flex items-center gap-1.5">
                            <ExternalLink className="h-4 w-4" />
                            Open in New Tab
                        </Button>
                        <a href={fileUrl} download={circular.title} className="inline-block">
                            <Button className="flex items-center gap-1.5">
                                <Download className="h-4 w-4" />
                                Download File
                            </Button>
                        </a>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
