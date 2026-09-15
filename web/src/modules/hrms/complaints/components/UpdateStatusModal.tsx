import { useState, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { STATUS_CONFIG, type Complaint } from "../helpers/types";

interface UpdateStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  complaint: Complaint | null;
  onConfirm: (id: number, status: string, remarks?: string) => Promise<void>;
}

const STATUS_OPTIONS = [
  "open",
  "in_progress",
  "resolved",
  "closed",
  "rejected",
] as const;

/**
 * HR/admin lifecycle control — moves a complaint between statuses with an
 * optional HR remark (LeadPriorityModal pattern).
 */
export function UpdateStatusModal({
  open,
  onOpenChange,
  complaint,
  onConfirm,
}: UpdateStatusModalProps) {
  const [status, setStatus] = useState<string>("open");
  const [remarks, setRemarks] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync the selection with the complaint being updated
  useEffect(() => {
    if (complaint && open) {
      setStatus(complaint.status || "open");
      setRemarks(complaint.remarks || "");
    }
  }, [complaint, open]);

  const handleConfirm = async () => {
    if (!complaint) return;
    setIsUpdating(true);
    try {
      await onConfirm(complaint.id, status, remarks.trim() || undefined);
      onOpenChange(false);
    } catch (error) {
      console.error("Update status failed:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
          <DialogDescription>
            Move{" "}
            <strong>
              {complaint?.complaintCode || "this complaint"}
            </strong>{" "}
            through the lifecycle
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <RadioGroup
            value={status}
            onValueChange={setStatus}
            className="space-y-2"
          >
            {STATUS_OPTIONS.map((value) => {
              const config =
                STATUS_CONFIG[value as keyof typeof STATUS_CONFIG] ||
                STATUS_CONFIG.open;
              const StatusIcon = config.icon;
              return (
                <div
                  key={value}
                  className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setStatus(value)}
                >
                  <RadioGroupItem value={value} id={`status-${value}`} />
                  <Label
                    htmlFor={`status-${value}`}
                    className="flex-1 cursor-pointer font-medium capitalize flex items-center gap-1.5"
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {config.label}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          <div className="space-y-2">
            <Label
              htmlFor="status-remarks"
              className="text-xs font-semibold text-muted-foreground"
            >
              HR Remark (optional)
            </Label>
            <Textarea
              id="status-remarks"
              placeholder="Add a note about this status change…"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              maxLength={10000}
              className="rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Status"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
