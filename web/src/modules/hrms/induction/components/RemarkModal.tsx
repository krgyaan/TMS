import React, { useState, useEffect } from "react";
import { MessageSquare, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "../helpers/induction.helpers";
import type { InductionTask } from "../helpers/induction.helpers";

export const RemarkModal: React.FC<{
  task: InductionTask | null;
  open: boolean;
  onClose: () => void;
  onSave: (remark: string) => void;
  isLoading?: boolean;
}> = ({ task, open, onClose, onSave, isLoading }) => {
  const [remark, setRemark] = useState(task?.remarks ?? "");

  useEffect(() => {
    if (open) setRemark(task?.remarks ?? "");
  }, [open, task]);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 py-5 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">Task Remark</DialogTitle>
              <DialogDescription className="text-xs mt-0.5 line-clamp-1">
                {task?.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              Remarks / Notes
            </label>
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Add any notes or remarks for this task…"
              rows={3}
              className="resize-none text-sm rounded-xl"
            />
          </div>
          {task?.completedAt && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Completed {formatDateTime(task.completedAt)}
              {task.completedBy && ` by ${task.completedBy}`}
            </p>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading} className="rounded-xl">
            Cancel
          </Button>
          <Button size="sm" onClick={() => onSave(remark)} disabled={isLoading} className="rounded-xl">
            {isLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Save Remark
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
