import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type OnboardingRequest } from "@/services/api/onboarding.service";

export const ActionModal: React.FC<{
  open: boolean;
  type: "approved" | "rejected" | null;
  joinee: OnboardingRequest | null;
  onClose: () => void;
  onConfirm: (note: string) => void;
  isLoading?: boolean;
}> = ({
  open,
  type,
  joinee,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const [note, setNote] = useState("");
  const isApprove = type === "approved";

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        onClose();
        setNote("");
      }}
    >
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 py-5 border-b">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center",
                isApprove
                  ? "bg-emerald-50 dark:bg-emerald-500/10"
                  : "bg-red-50 dark:bg-red-500/10"
              )}
            >
              {isApprove ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <DialogTitle className="text-base">
                {isApprove ? "Approve" : "Reject"} Registration
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                {joinee?.name} · {joinee?.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isApprove
              ? "This will approve the registration and notify the joinee. You can add an optional note below."
              : "Please provide a reason for rejection. The joinee will be notified."}
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              {isApprove ? "Approval Note" : "Rejection Reason"}
              {!isApprove && (
                <span className="text-red-500 ml-0.5">*</span>
              )}
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isApprove
                  ? "Optional — e.g. Everything looks good."
                  : "e.g. Incomplete documentation — missing ID proof."
              }
              rows={3}
              className="resize-none rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              setNote("");
            }}
            disabled={isLoading}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            disabled={(!isApprove && !note.trim()) || isLoading}
            onClick={() => {
              onConfirm(note);
              setNote("");
            }}
            className={cn(
              "rounded-xl",
              isApprove
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            )}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm {isApprove ? "Approval" : "Rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};