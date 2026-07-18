import { projectDashboardApi } from "@/services/api/project-dashboard.api";
import { useQuery } from "@tanstack/react-query";

export const projectsDashboardKeys = {
    all: ["projects-dashboard"] as const,
    overview: (id: number) => [...projectsDashboardKeys.all, "overview", id] as const,
    imprests: (id: number) => [...projectsDashboardKeys.all, "imprests", id] as const,
};

export const useProjectOverview = (id: number) => {
    return useQuery({
        queryKey: projectsDashboardKeys.overview(id),
        queryFn: () => projectDashboardApi.getOverview(id),
        enabled: !!id,
    });
};

export const useProjectImprests = (id: number) => {
    return useQuery({
        queryKey: projectsDashboardKeys.imprests(id),
        queryFn: () => projectDashboardApi.getImprests(id),
        enabled: !!id,
    });
};
