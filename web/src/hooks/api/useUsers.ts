import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersService } from "@/services/api";
import type { CreateUserDto, UpdateUserDto } from "@/types/api.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const userKeys = {
    all: ["users"] as const,
    lists: () => [...userKeys.all, "list"] as const,
    list: (filters?: any) => [...userKeys.lists(), { filters }] as const,
    details: () => [...userKeys.all, "detail"] as const,
    detail: (id: number) => [...userKeys.details(), id] as const,
};

export const useUsers = () => {
    return useQuery({
        queryKey: userKeys.lists(),
        queryFn: () => usersService.getAll(),
    });
};

export const useUser = (id: number) => {
    return useQuery({
        queryKey: userKeys.detail(id),
        queryFn: () => usersService.getById(id),
        enabled: !!id,
    });
};

export function useUsersByRole(roleId: number) {
    return useQuery({
        queryKey: ["users", "role", roleId],
        queryFn: () => usersService.getUsersByRole(roleId),
        enabled: !!roleId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export const useCreateUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateUserDto) => usersService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
            toast.success("User created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateUserDto }) => usersService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
            queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
            toast.success("User updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => usersService.deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
            toast.success("User deleted successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useGetTeamMembers = (teamId: number) => {
    return useQuery({
        queryKey: [...userKeys.lists(), "team", teamId, "members"],
        queryFn: () => usersService.getTeamMembers(teamId),
        enabled: !!teamId,
    });
};
