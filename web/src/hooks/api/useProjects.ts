import { useQuery } from "@tanstack/react-query";
import { fetchAllProjectsMaster, fetchProjectMasterById } from "../../services/api/projects-master.service";

export const projectsMasterKeys = {
    all: ["projects-master"] as const,
    lists: () => [...projectsMasterKeys.all, "list"] as const,
    detail: (id: number) => [...projectsMasterKeys.all, "detail", id] as const,
};

// Get all projects
export const useProjectsMaster = () => {
    return useQuery({
        queryKey: projectsMasterKeys.lists(),
        queryFn: fetchAllProjectsMaster,
    });
};

// Get project by ID
export const useProjectMasterById = (id: number) => {
    return useQuery({
        queryKey: projectsMasterKeys.detail(id),
        queryFn: () => fetchProjectMasterById(id),
        enabled: !!id,
    });
};
