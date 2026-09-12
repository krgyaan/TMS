import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Laptop, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { paths } from "@/app/routes/paths";
import { useHrmsAssetsAll } from "@/hooks/api/useHrmsAssets";
import type { EmployeeAsset } from "@/services/api/hrms-assets.service";

const todayStr = () => new Date().toISOString().split("T")[0];

const assetLabel = (a: EmployeeAsset) =>
  [a.brand, a.model].filter(Boolean).join(" ").trim();

export const LaptopAssetModal: React.FC<{
  open: boolean;
  employeeName: string;
  onClose: () => void;
  onConfirm: (asset: EmployeeAsset, assignedDate: string, note: string) => void;
  isSaving: boolean;
}> = ({ open, employeeName, onClose, onConfirm, isSaving }) => {
  const navigate = useNavigate();
  const { data: assets, isLoading } = useHrmsAssetsAll();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [assignedDate, setAssignedDate] = useState(todayStr());
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedId(null);
      setAssignedDate(todayStr());
      setNote("");
    }
  }, [open]);

  const availableLaptops = useMemo(() => {
    if (!assets) return [];
    return assets.filter((a) => {
      const type = (a.assetTypeLabel || a.assetType || "").toLowerCase();
      const status = (a.assetStatusLabel || a.assetStatus || "").toLowerCase();
      return type.includes("laptop") && (!status || status === "available");
    });
  }, [assets]);

  const selected = availableLaptops.find((a) => a.id === selectedId) ?? null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 py-5 border-b bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Laptop className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">Allot Laptop</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Select an available laptop to assign to {employeeName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4 max-h-[55vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : availableLaptops.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Laptop className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium">No laptops available in stock</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-xs">
                Add a new laptop asset first, then come back to allot it to this
                employee.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5"
                onClick={() => {
                  onClose();
                  navigate(paths.hrms.assets.create);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Laptop
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {availableLaptops.map((a) => {
                const isSelected = selectedId === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedId(isSelected ? null : a.id)}
                    className={cn(
                      "w-full text-left rounded-xl border px-3.5 py-2.5 transition-all duration-150",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border/50 hover:border-border hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-3.5 w-3.5 rounded-full border-[5px] flex-shrink-0 transition-colors",
                          isSelected
                            ? "bg-primary border-primary/25"
                            : "border-border bg-background"
                        )}
                      />
                      <span className="text-sm font-mono font-semibold">
                        {a.assetCode}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {assetLabel(a)}
                      </span>
                      <span className="ml-auto text-[10px] text-muted-foreground/70 capitalize flex-shrink-0">
                        {a.assetConditionLabel || a.assetCondition || ""}
                      </span>
                    </div>
                    {a.serialNumber && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1 pl-[22px]">
                        S/N {a.serialNumber}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {availableLaptops.length > 0 && !isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs">Assignment Date</Label>
                <Input
                  type="date"
                  value={assignedDate}
                  onChange={(e) => setAssignedDate(e.target.value)}
                  className="h-9 text-sm rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Remark (optional)</Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. issued at office"
                  className="h-9 text-sm rounded-xl"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/10 m-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="rounded-xl gap-1.5"
            disabled={!selected || !assignedDate || isSaving}
            onClick={() => selected && onConfirm(selected, assignedDate, note.trim())}
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Assign &amp; Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
