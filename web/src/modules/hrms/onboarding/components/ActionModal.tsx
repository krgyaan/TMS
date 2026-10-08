import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { type OnboardingRequest } from "@/services/api/onboarding.service";

export const ActionModal: React.FC<{
  open: boolean;
  joinee: OnboardingRequest | null;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}> = ({
  open,
  joinee,
  onClose,
  onConfirm,
  isLoading,
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 py-5 border-b">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-base">
                Create user for this candidate?
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                {joinee?.name} · {joinee?.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            This will create the user account for this candidate, approve their
            registration, and notify the joinee.
          </p>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            disabled={isLoading}
            onClick={onConfirm}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create User &amp; Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};