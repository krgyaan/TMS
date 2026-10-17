import { useQuery } from "@tanstack/react-query";
import { publicNotificationService } from "@/services/api";

export const publicNotificationKeys = {
    all: ["public-notification"] as const,
    detail: (token: string) => [...publicNotificationKeys.all, token] as const,
};

export const usePublicNotification = (token?: string) => {
    return useQuery({
        queryKey: publicNotificationKeys.detail(token ?? ""),
        queryFn: () => publicNotificationService.getByToken(token as string),
        enabled: Boolean(token),
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
    });
};
