import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { statesService } from "@/services/api";
import type { CreateStateDto, UpdateStateDto } from "@/types/api.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const statesKey = {
    all: ["states"] as const,
    lists: () => [...statesKey.all, "list"] as const,
    list: (filters?: any) => [...statesKey.lists(), { filters }] as const,
    details: () => [...statesKey.all, "detail"] as const,
    detail: (id: number) => [...statesKey.details(), id] as const,
};

export const useStates = () => {
    return useQuery({
        queryKey: statesKey.lists(),
        queryFn: () => statesService.getAll(),
    });
};

export const useState = (id: number | null) => {
    return useQuery({
        queryKey: statesKey.detail(id!),
        queryFn: () => statesService.getById(id!),
        enabled: !!id,
    });
};

export const useCreateState = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateStateDto) => statesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: statesKey.lists() });
            toast.success("State created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateState = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateStateDto }) => statesService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: statesKey.lists() });
            queryClient.invalidateQueries({ queryKey: statesKey.detail(variables.id) });
            toast.success("State updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

// export const useDeleteState = () => {
//     const queryClient = useQueryClient();

//     return useMutation({
//         mutationFn: (id: number) => statesService.delete(id),
//         onSuccess: () => {
//             queryClient.invalidateQueries({ queryKey: statesKey.lists() });
//             toast.success('State deleted successfully');
//         },
//         onError: (error) => {
//             toast.error(handleQueryError(error));
//         },
//     });
// };
