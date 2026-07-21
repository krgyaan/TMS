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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";

interface LeadPriorityModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadId: number | null;
    leadName?: string;
    currentPriority?: string | null;
    onConfirm: (leadId: number, priority: string) => Promise<void>;
}

type Priority = "Cold" | "Warm" | "Hot";

interface PriorityOption {
    value: Priority;
    label: string;
    color: string;
}

const priorityOptions: PriorityOption[] = [
    {
        value: "Cold",
        label: "Cold",
        color: "text-blue-600",
    },
    {
        value: "Warm",
        label: "Warm",
        color: "text-yellow-600",
    },
    {
        value: "Hot",
        label: "Hot",
        color: "text-red-600",
    },
];

export function LeadPriorityModal({
    open,
    onOpenChange,
    leadId,
    leadName,
    currentPriority,
    onConfirm,
}: LeadPriorityModalProps) {
    const [selectedPriority, setSelectedPriority] = useState<Priority>(
        (currentPriority as Priority) || "Cold"
    );
    const [isUpdating, setIsUpdating] = useState(false);

    const handleConfirm = async () => {
        if (!leadId) return;

        setIsUpdating(true);
        try {
            await onConfirm(leadId, selectedPriority);
            handleClose();
        } catch (error) {
            console.error("Update priority failed:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Update Lead Priority</DialogTitle>
                    <DialogDescription>
                        Set the priority level for: <strong>{leadName || "this lead"}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6">
                    <RadioGroup
                        value={selectedPriority}
                        onValueChange={(value) => setSelectedPriority(value as Priority)}
                        className="space-y-3"
                    >
                        {priorityOptions.map((option) => (
                            <div
                                key={option.value}
                                className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors"
                                onClick={() => setSelectedPriority(option.value)}
                            >
                                <RadioGroupItem value={option.value} id={option.value} />
                                <Label
                                    htmlFor={option.value}
                                    className={`flex-1 cursor-pointer font-medium ${option.color}`}
                                >
                                    {option.label}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
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
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isUpdating}
                    >
                        {isUpdating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            "Update Priority"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}