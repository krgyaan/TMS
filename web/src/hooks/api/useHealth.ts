import { useQuery } from "@tanstack/react-query";
import { healthService } from "@/services/api/health.service";

export const healthKey = {
    all: ["system-health"] as const,
};

export const useSystemHealth = () => {
    return useQuery({
        queryKey: healthKey.all,
        queryFn: () => healthService.getSystemHealth(),
        refetchInterval: 30_000,
        refetchOnWindowFocus: true,
        staleTime: 10_000,
    });
};
