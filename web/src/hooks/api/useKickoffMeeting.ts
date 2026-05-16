import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kickOffMeetingApi } from '@/services/api/kick-off-meeting.api';
import type { SaveKickoffMeetingDto, UpdateKickoffMeetingMomDto } from '@/modules/operations/types/wo.types';
import { useTeamFilter } from '../useTeamFilter';
import { toast } from 'sonner';

export const KICKOFF_MEETING_KEYS = {
    all: ['kickOffMeetings'] as const,
    byWoDetailId: (id: number) => [...KICKOFF_MEETING_KEYS.all, 'woDetailId', id] as const,
    lists: () => [...KICKOFF_MEETING_KEYS.all, 'list'] as const,
    detail: (id: number) => [...KICKOFF_MEETING_KEYS.all, 'detail', id] as const,
    list: (filters?: Record<string, unknown>) => [...KICKOFF_MEETING_KEYS.lists(), { filters }] as const,
    dashboardCounts: (teamId?: number) => [...KICKOFF_MEETING_KEYS.all, 'dashboardCounts', { teamId }] as const,
};

export const useKickoffMeetings = (
    tab?: 'scheduled' | 'not_scheduled',
    pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const { teamId, userId, dataScope } = useTeamFilter();
        // Only pass teamId for Super User/Admin (dataScope === 'all') when a team is selected
        const teamIdParam = dataScope === 'all' && teamId !== null ? teamId : undefined;

        const params = {
            ...(tab && { tab }),
            page: pagination.page,
            limit: pagination.limit,
            ...(sort?.sortBy && { sortBy: sort.sortBy }),
            ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
            ...(pagination.search && { search: pagination.search }),
        };

        const queryKeyFilters = {
            tab,
            ...pagination,
            ...sort,
            dataScope,
            teamId: teamId ?? null,
            userId: userId ?? null,
        };

    return useQuery({
        queryKey: KICKOFF_MEETING_KEYS.list(queryKeyFilters),
        queryFn: () => kickOffMeetingApi.getAll(params, teamIdParam),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    });
};

export const useKickoffMeetingDashboardCounts = () => {
    const { teamId, dataScope } = useTeamFilter();
    // Only pass teamId for Super User/Admin (dataScope === 'all') when a team is selected
    const teamIdParam = dataScope === 'all' && teamId !== null ? teamId : undefined;

    return useQuery({
        queryKey: KICKOFF_MEETING_KEYS.dashboardCounts(teamIdParam),
        queryFn: () => kickOffMeetingApi.getDashboardCounts(teamIdParam),
    });
};

export const useKickoffMeeting = (id: number) => {
    return useQuery({
        queryKey: KICKOFF_MEETING_KEYS.byWoDetailId(id),
        queryFn: () => kickOffMeetingApi.getByWoDetailId(id),
        enabled: !!id,
    });
};

export const useKickoffMeetingByWoId = (woDetailId?: number) => {
    return useQuery({
        queryKey: KICKOFF_MEETING_KEYS.byWoDetailId(woDetailId!),
        queryFn: () => kickOffMeetingApi.getByWoDetailId(woDetailId!),
        enabled: !!woDetailId,
        staleTime: 5 * 60 * 1000,
    });
};

export const useSaveKickoffMeeting = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SaveKickoffMeetingDto) => kickOffMeetingApi.saveMeeting(data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: KICKOFF_MEETING_KEYS.all});
            queryClient.invalidateQueries({queryKey: KICKOFF_MEETING_KEYS.dashboardCounts()});
            // toast.success('Meeting scheduled successfully');
        },

        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to schedule meeting');
        },
    });
};

export const useUpdateKickoffMom = (id: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdateKickoffMeetingMomDto) =>
            kickOffMeetingApi.updateMom(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: KICKOFF_MEETING_KEYS.all});
            queryClient.invalidateQueries({queryKey: KICKOFF_MEETING_KEYS.dashboardCounts()});
            // toast.success('MoM updated successfully');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to update MoM');
        },
    });
};
