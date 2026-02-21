import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { masterProjectsService } from "@/services/api";
import type {
    MasterProjectListRow,
    MasterProjectListParams,
    CreateMasterProjectDto,
    UpdateMasterProjectDto,
} from "@/modules/shared/master-project/helpers/masterProject.types";
import type { PaginatedResult } from "@/types/api.types";
import { toast } from "sonner";
import { handleQueryError } from "@/lib/react-query";

export const masterProjectsKey = {
    all: ["master-projects"] as const,
    lists: () => [...masterProjectsKey.all, "list"] as const,
    list: (filters?: Record<string, unknown>) => [...masterProjectsKey.lists(), { filters }] as const,
    detail: (id: number) => [...masterProjectsKey.all, "detail", id] as const,
};

export const useMasterProjects = (
    pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: "asc" | "desc" },
) => {
    const params: MasterProjectListParams = {
        page: pagination.page,
        limit: pagination.limit,
        ...(sort?.sortBy && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
        ...(pagination.search && { search: pagination.search }),
    };

    return useQuery<PaginatedResult<MasterProjectListRow>>({
        queryKey: masterProjectsKey.list({
            page: pagination.page,
            limit: pagination.limit,
            search: pagination.search ?? undefined,
            sortBy: sort?.sortBy,
            sortOrder: sort?.sortOrder,
        }),
        queryFn: () => masterProjectsService.getAll(params),
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

export const useMasterProject = (id: number | null) => {
    return useQuery<MasterProjectListRow>({
        queryKey: masterProjectsKey.detail(id ?? 0),
        queryFn: () => masterProjectsService.getById(id!),
        enabled: !!id,
    });
};

export const useCreateMasterProject = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateMasterProjectDto) => masterProjectsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: masterProjectsKey.lists() });
            toast.success("Project created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateMasterProject = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Omit<UpdateMasterProjectDto, "id"> }) =>
            masterProjectsService.update(id, data),
        onSuccess: data => {
            queryClient.invalidateQueries({ queryKey: masterProjectsKey.lists() });
            queryClient.invalidateQueries({ queryKey: masterProjectsKey.detail(data.id) });
            toast.success("Project updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteMasterProject = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => masterProjectsService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: masterProjectsKey.lists() });
            toast.success("Project deleted successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};
