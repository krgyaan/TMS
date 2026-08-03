import { projectDashboardApi, type ProjectListFilters } from "@/services/api/project-dashboard.api";
import { useQuery } from "@tanstack/react-query";
import type { ProjectMasterListRow } from "@/modules/shared/master-project/helpers/projectMaster.types";
import type { PaginatedResult } from "@/types/api.types";

export const projectsDashboardKeys = {
    all: ["projects-dashboard"] as const,
    overview: (id: number) => [...projectsDashboardKeys.all, "overview", id] as const,
    imprests: (id: number) => [...projectsDashboardKeys.all, "imprests", id] as const,
    list: () => [...projectsDashboardKeys.all, "list"] as const,
    listFilters: (filters?: ProjectListFilters) => [...projectsDashboardKeys.list(), { filters }] as const,
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

export const useProjectList = (filters?: ProjectListFilters) => {
    return useQuery<PaginatedResult<ProjectMasterListRow>>({
        queryKey: projectsDashboardKeys.listFilters(filters),
        queryFn: () => projectDashboardApi.getList(filters),
        placeholderData: previousData => {
            if (
                previousData &&
                typeof previousData === "object" &&
                "data" in previousData &&
                "meta" in previousData
            ) {
                return previousData;
            }
            return undefined;
        },
    });
};
