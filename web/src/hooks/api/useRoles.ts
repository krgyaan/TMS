import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesService } from '@/services/api';
import type { Role, CreateRoleDto, UpdateRoleDto } from '@/types/api.types';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';

export const rolesKey = {
    all: ['roles'] as const,
    lists: () => [...rolesKey.all, 'list'] as const,
    list: (filters?: any) => [...rolesKey.lists(), { filters }] as const,
    details: () => [...rolesKey.all, 'detail'] as const,
    detail: (id: number) => [...rolesKey.details(), id] as const,
};

export const useRoles = () => {
    return useQuery({
        queryKey: rolesKey.lists(),
        queryFn: () => rolesService.getAll(),
    });
};

export const useRole = (id: number | null) => {
    return useQuery({
        queryKey: rolesKey.detail(id!),
        queryFn: () => rolesService.getById(id!),
        enabled: !!id,
    });
};

export const useCreateRole = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateRoleDto) => rolesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: rolesKey.lists() });
            toast.success('Role created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateRole = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateRoleDto }) =>
            rolesService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: rolesKey.lists() });
            queryClient.invalidateQueries({ queryKey: rolesKey.detail(variables.id) });
            toast.success('Role updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteRole = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => rolesService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: rolesKey.lists() });
            toast.success('Role deleted successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
