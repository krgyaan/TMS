import { useQuery } from "@tanstack/react-query";
import { healthService } from "@/services/api/health.service";

export const healthKey = {
    all: ["system-health"] as const,
    claude: ["system-health", "claude"] as const,
    claudeTenders: (sortBy: string) => ["system-health", "claude-tenders", sortBy] as const,
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

export const useClaudeTelemetry = () => {
    return useQuery({
        queryKey: healthKey.claude,
        queryFn: () => healthService.getClaudeTelemetry(),
        refetchInterval: 15_000, // 15s auto-refresh for real-time TPM monitoring
        refetchOnWindowFocus: true,
        staleTime: 5_000,
    });
};

export const useClaudeTenders = (sortBy: 'cost' | 'tokens' | 'recent' = 'cost') => {
    return useQuery({
        queryKey: healthKey.claudeTenders(sortBy),
        queryFn: () => healthService.getClaudeTenders(sortBy),
        refetchInterval: 30_000,
        refetchOnWindowFocus: true,
        staleTime: 10_000,
    });
};

