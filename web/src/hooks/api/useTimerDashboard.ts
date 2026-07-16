import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timerDashboardService } from "@/services/api";
import { toast } from "sonner";
import { handleQueryError } from "@/lib/react-query";

export const timerDashboardKeys = {
    all: ["timer-dashboard"] as const,
    search: (by: string, value: string) => [...timerDashboardKeys.all, "search", by, value] as const,
};

export const useTimerDashboardSearch = (by: string | null, value: string | null) => {
    return useQuery({
        queryKey: timerDashboardKeys.search(by ?? "", value ?? ""),
        queryFn: () => timerDashboardService.search(by!, value!),
        enabled: !!by && !!value && by.length > 0 && value.length > 0,
        retry: false,
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
