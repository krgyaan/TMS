import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsService } from '@/services/api';
import type { Team, CreateTeamDto, UpdateTeamDto } from '@/types/api.types';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';

export const teamsKey = {
  all: ['teams'] as const,
  lists: () => [...teamsKey.all, 'list'] as const,
  list: (filters?: any) => [...teamsKey.lists(), { filters }] as const,
  details: () => [...teamsKey.all, 'detail'] as const,
  detail: (id: number) => [...teamsKey.details(), id] as const,
};

export const useTeams = () => {
  return useQuery({
    queryKey: teamsKey.lists(),
    queryFn: () => teamsService.getAll(),
  });
};

export const useTeam = (id: number | null) => {
  return useQuery({
    queryKey: teamsKey.detail(id!),
    queryFn: () => teamsService.getById(id!),
    enabled: !!id,
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTeamDto) => teamsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamsKey.lists() });
      toast.success('Team created successfully');
    },
    onError: (error) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTeamDto }) =>
      teamsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: teamsKey.lists() });
      queryClient.invalidateQueries({ queryKey: teamsKey.detail(variables.id) });
      toast.success('Team updated successfully');
    },
    onError: (error) => {
      toast.error(handleQueryError(error));
    },
  });
};

// export const useDeleteTeam = () => {
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: (id: number) => teamsService.delete(id),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: teamsKey.lists() });
//       toast.success('Team deleted successfully');
//     },
//     onError: (error) => {
//       toast.error(handleQueryError(error));
//     },
//   });
// };
