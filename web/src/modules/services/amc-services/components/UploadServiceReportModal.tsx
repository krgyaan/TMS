import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, FileUp, FileSignature } from "lucide-react";
import { useAmcService, useAmcServiceFileUpload } from "@/hooks/api/useAmcServices";
import type { ServicePathField } from "@/modules/services/amc/helpers/amc.types";
import { serviceFileUrl } from "@/modules/services/amc/helpers/amc.types";

interface UploadServiceReportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    serviceId: number | null;
    field: ServicePathField;
}

export function UploadServiceReportModal({
    open,
    onOpenChange,
    serviceId,
    field,
}: UploadServiceReportModalProps) {
    const { data: service } = useAmcService(serviceId ?? 0);
    const uploadFile = useAmcServiceFileUpload();
    const [file, setFile] = useState<File | null>(null);

    const isSigned = field === "signed-service-report";
    const existing = isSigned ? service?.signedReport : service?.filledReport;
    const pending = uploadFile.isPending;

    useEffect(() => {
        if (!open) setFile(null);
    }, [open]);

    const handleClose = () => {
        setFile(null);
        onOpenChange(false);
    };

    const handleUpload = async () => {
        if (!serviceId || !file) return;
        try {
            await uploadFile.mutateAsync({ id: serviceId, field, file });
            handleClose();
        } catch {
            // handled by hook
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isSigned ? (
                            <FileSignature className="h-5 w-5" />
                        ) : (
                            <FileUp className="h-5 w-5" />
                        )}
                        {isSigned ? "Upload Signed Service Report" : "Upload Filled Service Report"}
                    </DialogTitle>
                    <DialogDescription>
                        {isSigned
                            ? "Uploading the signed report marks this service visit as Done."
                            : "Upload the filled service report for this visit."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {existing && (
                        <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between gap-2">
                            <span className="text-sm text-muted-foreground">Current report:</span>
                            <a
                                href={serviceFileUrl(existing)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                                <FileText className="h-3.5 w-3.5" /> Open
                            </a>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="service-report-file">Select report file</Label>
                        <input
                            id="service-report-file"
                            type="file"
                            className="border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm outline-none file:mr-2 file:border-0 file:bg-transparent file:text-sm file:font-medium"
                            onChange={e => setFile(e.target.files?.[0] ?? null)}
                        />
                        {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose} disabled={pending}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleUpload} disabled={pending || !file}>
                        {pending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                            </>
                        ) : isSigned ? (
                            "Mark Done"
                        ) : (
                            "Upload"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
