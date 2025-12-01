import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamService } from '@/services/api/team.service';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';
import type { CreateTeamDto, UpdateTeamDto } from '@/types/api.types';

export const teamKeys = {
    all: ['teams'] as const,
    list: () => [...teamKeys.all, 'list'] as const,
    detail: (id: number) => [...teamKeys.all, 'detail', id] as const,
};

interface UseTeamsOptions {
    enabled?: boolean;
}

export function useTeams(options: UseTeamsOptions = {}) {
    return useQuery({
        queryKey: teamKeys.list(),
        queryFn: () => teamService.getAll(),
        enabled: options.enabled ?? true,
        staleTime: 5 * 60 * 1000, // 5 minutes - teams don't change often
    });
}

export function useTeam(id: number) {
    return useQuery({
        queryKey: teamKeys.detail(id),
        queryFn: () => teamService.getById(id),
        enabled: !!id,
    });
}

export function useCreateTeam() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateTeamDto) => teamService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: teamKeys.all });
            toast.success('Team created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
}

export function useUpdateTeam() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateTeamDto }) =>
            teamService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: teamKeys.all });
            toast.success('Team updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
}
