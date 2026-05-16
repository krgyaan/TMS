import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
    ProjectMasterListRow,
    ProjectMasterListParams,
    CreateProjectMasterDto,
    UpdateProjectMasterDto,
} from "@/modules/shared/master-project/helpers/projectMaster.types";
import type { PaginatedResult } from "@/types/api.types";
import { toast } from "sonner";
import { handleQueryError } from "@/lib/react-query";
import { projectMasterService } from "@/services/api/projects-master.service";

export const projectMasterKey = {
    all: ["project-master"] as const,
    lists: () => [...projectMasterKey.all, "list"] as const,
    list: (filters?: Record<string, unknown>) => [...projectMasterKey.lists(), { filters }] as const,
    detail: (id: number) => [...projectMasterKey.all, "detail", id] as const,
};

export const useProjectMasters = (
    pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: "asc" | "desc" },
) => {
    const params: ProjectMasterListParams = {
        page: pagination.page,
        limit: pagination.limit,
        ...(sort?.sortBy && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
        ...(pagination.search && { search: pagination.search }),
    };

    return useQuery<PaginatedResult<ProjectMasterListRow>>({
        queryKey: projectMasterKey.list({
            page: pagination.page,
            limit: pagination.limit,
            search: pagination.search ?? undefined,
            sortBy: sort?.sortBy,
            sortOrder: sort?.sortOrder,
        }),
        queryFn: () => projectMasterService.getAll(params),
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

export const useProjectMaster = (id: number | null) => {
    return useQuery<ProjectMasterListRow>({
        queryKey: projectMasterKey.detail(id ?? 0),
        queryFn: () => projectMasterService.getById(id!),
        enabled: !!id,
    });
};

export const useCreateProjectMaster = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateProjectMasterDto) => projectMasterService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectMasterKey.lists() });
            toast.success("Project created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateProjectMaster = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Omit<UpdateProjectMasterDto, "id"> }) =>
            projectMasterService.update(id, data),
        onSuccess: data => {
            queryClient.invalidateQueries({ queryKey: projectMasterKey.lists() });
            queryClient.invalidateQueries({ queryKey: projectMasterKey.detail(data.id) });
            toast.success("Project updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteProjectMaster = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => projectMasterService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectMasterKey.lists() });
            toast.success("Project deleted successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};
