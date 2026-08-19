import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timerDashboardService } from "@/services/api";
import { toast } from "sonner";
import { handleQueryError } from "@/lib/react-query";

export const timerDashboardKeys = {
    all: ["timer-dashboard"] as const,
    search: (by: string, value: string) => [...timerDashboardKeys.all, "search", by, value] as const,
    expiringSoon: (hours: number, includeOverdue: boolean) => [...timerDashboardKeys.all, "expiring-soon", hours, includeOverdue] as const,
};

export const useTimerDashboardSearch = (by: string | null, value: string | null) => {
    return useQuery({
        queryKey: timerDashboardKeys.search(by ?? "", value ?? ""),
        queryFn: () => timerDashboardService.search(by!, value!),
        enabled: !!by && !!value && by.length > 0 && value.length > 0,
        retry: false,
    });
};

export const useExpiringSoonTimers = (hours: number = 12, includeOverdue: boolean = false) => {
    return useQuery({
        queryKey: timerDashboardKeys.expiringSoon(hours, includeOverdue),
        queryFn: () => timerDashboardService.expiringSoon(hours, includeOverdue),
        refetchInterval: 60000,
    });
};

export const useStopTimer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { entityType: string; entityId: number; stage: string }) =>
            timerDashboardService.stopTimer(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: timerDashboardKeys.all });
            toast.success("Timer stopped successfully");
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
