import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUsers } from "@/hooks/api/useUsers";

interface LeadEnquirySiteVisitModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    enquiryId: number | null;
    enquiryName?: string;
    onConfirm: (data: {
        enquiryId: number;
        assignedTo?: number | null;
        scheduledAt?: string | null;
        information?: string | null;
    }) => Promise<void>;
}

export function LeadEnquirySiteVisitModal({
    open,
    onOpenChange,
    enquiryId,
    enquiryName,
    onConfirm,
}: LeadEnquirySiteVisitModalProps) {
    const { data: users = [] } = useUsers();
    const [assignedTo, setAssignedTo] = useState<string>("");
    const [scheduledAt, setScheduledAt] = useState("");
    const [information, setInformation] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleConfirm = async () => {
        if (!enquiryId) return;
        setIsSaving(true);
        try {
            await onConfirm({
                enquiryId,
                assignedTo: assignedTo ? Number(assignedTo) : null,
                scheduledAt: scheduledAt || null,
                information: information || null,
            });
            handleClose();
        } catch (error) {
            console.error("Site visit allocation failed:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setAssignedTo("");
        setScheduledAt("");
        setInformation("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Allocate Site Visit
                    </DialogTitle>
                    <DialogDescription>
                        Schedule a site visit for: <strong>{enquiryName || "this enquiry"}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <Alert>
                        <MapPin className="h-4 w-4" />
                        <AlertDescription>
                            Assign a person and schedule a date for the site visit.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <Label htmlFor="assignedTo">Assigned To</Label>
                        <Select value={assignedTo} onValueChange={setAssignedTo}>
                            <SelectTrigger id="assignedTo" className="w-full">
                                <SelectValue placeholder="Select a user..." />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.isArray(users) && (users as Array<{ id: number; name: string }>).map((user) => (
                                    <SelectItem key={user.id} value={String(user.id)}>
                                        {user.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="scheduledAt">Scheduled Date & Time</Label>
                        <Input
                            id="scheduledAt"
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            disabled={isSaving}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="information">Instructions / Information</Label>
                        <Textarea
                            id="information"
                            placeholder="Enter any instructions or information for the site visit..."
                            value={information}
                            onChange={(e) => setInformation(e.target.value)}
                            className="min-h-[100px]"
                            disabled={isSaving}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Allocating...
                            </>
                        ) : (
                            "Allocate Site Visit"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
