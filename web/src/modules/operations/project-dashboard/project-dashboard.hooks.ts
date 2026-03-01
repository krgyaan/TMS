import { useQuery } from "@tanstack/react-query";
import { fetchDashboardDetailsById } from "./project-dashboard.api";

export const projectsMasterKeys = {
    all: ["projects-dashboard-master"] as const,
    lists: () => [...projectsMasterKeys.all, "list"] as const,
    detail: (id: number) => [...projectsMasterKeys.all, "detail", id] as const,
};

// Get project by ID
export const useProjectDashboardDetails = (id: number) => {
    return useQuery({
        queryKey: projectsMasterKeys.detail(id),
        queryFn: () => fetchDashboardDetailsById(id),
        enabled: !!id,
    });
};
