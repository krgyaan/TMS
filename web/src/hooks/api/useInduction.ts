import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { onboardingService } from "@/services/api/onboarding.service";
import { toast } from "sonner";

// ─── Induction data hooks ─────────────────────────────────────────────────────

/** Fetch the induction tracker list (all approved/fully completed employees + tasks) */
export const useInductionTrackerList = () => {
  return useQuery({
    queryKey: ["onboarding", "induction-tracker"],
    queryFn: onboardingService.getInductionTrackerList,
  });
};

export const useEmployeeInduction = (id: number | null) => {
  return useQuery({
    queryKey: ["onboarding", "induction", id],
    queryFn: () => onboardingService.getEmployeeInduction(id!),
    enabled: !!id,
  });
};

export const useUpdateInductionTask = (onboardingId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, updates }: { taskId: number; updates: { status?: string; remarks?: string } }) =>
      onboardingService.updateInductionTask(onboardingId, taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", "induction-tracker"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding", "induction", onboardingId] });
      toast.success("Task updated successfully");
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === "object" && "response" in error
          ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Failed to update task")
          : "Failed to update task";
      toast.error(message);
    },
  });
};

// ─── Animation hook ───────────────────────────────────────────────────────────

export const useStaggeredEntrance = (itemCount: number, baseDelay = 30) => {
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    for (let i = 0; i < itemCount; i++) {
      timers.push(
        setTimeout(() => {
          setVisibleItems((prev) => new Set([...prev, i]));
        }, i * baseDelay)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [itemCount, baseDelay]);

  return visibleItems;
};
